'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Check } from 'lucide-react';
import type { ChatbotFlow, FlowOption } from '@/lib/chatbot/engine';
import type { Service } from '@/core/types/adapter';
import { saveAppointment, saveQuoteRequest } from '@/actions/chatbot';
import { getAvailableSlots, bookSlot, type AvailableSlot } from '@/actions/slots';
import { calcOilRecommendation, estimateOilDate } from '@/lib/oil';
import { matchOptionByNlp, classifyIntent } from '@/lib/nlp/classifier';
import { resolveWithClaude } from '@/actions/nlp';

type FlowNodeAny = {
  message?: string;
  options?: FlowOption[];
  multi_select?: boolean;
  collect?: string;
  action?: string;
  params?: Record<string, string>;
  next?: string;
};

type MessageItem = { role: 'bot' | 'user'; text: string; key: string };

type Props = {
  flow: ChatbotFlow;
  tenantId: string;
  phone: string;
  policyUrl: string;
  policyVersion: string;
  policyHash: string;
  services?: Service[];
  ivaRate?: number;
};

let msgCounter = 0;
function mkKey() { return `msg-${++msgCounter}`; }

export function ChatEngine({ flow, tenantId, phone, policyUrl, policyVersion, policyHash, services = [], ivaRate = 0.21 }: Props) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string>(flow.start);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [nlpInput, setNlpInput] = useState('');
  // Multi-select service state
  const [selectedServiceValues, setSelectedServiceValues] = useState<string[]>([]);
  const [showServiceSummary, setShowServiceSummary] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const currentNode = flow.nodes[currentNodeId] as FlowNodeAny | undefined;

  const addBotMessage = useCallback((text: string, delay = 400) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, { role: 'bot', text, key: mkKey() }]);
    }, delay);
  }, []);

  function addUserMessage(text: string) {
    setMessages((prev) => [...prev, { role: 'user', text, key: mkKey() }]);
  }

  const goToNode = useCallback((nodeId: string, vars: Record<string, string> = variables) => {
    const node = flow.nodes[nodeId] as FlowNodeAny | undefined;
    if (!node) { setDone(true); return; }

    if (node.action === 'save_appointment') {
      handleSave(nodeId, node, vars);
      return;
    }

    if (node.action === 'save_quote') {
      handleSaveQuote(nodeId, node, vars);
      return;
    }

    if (node.action === 'calc_oil_change') {
      const oilType = vars['oil_ask_fuel'] ?? 'unknown';
      const kmLast = parseInt(vars['oil_km_last'] ?? '0', 10);
      const kmNow = parseInt(vars['oil_km_now'] ?? '0', 10);
      const rec = calcOilRecommendation(oilType, kmLast, kmNow);
      const newVars = { ...vars, oil_result_message: rec.message, oil_km_left: String(rec.kmLeft) };
      setVariables(newVars);

      // Show result message then load slots
      addBotMessage(rec.message, 500);
      const estimatedDate = estimateOilDate(rec.kmLeft, kmNow, kmLast);
      const fromDate = new Date();
      // If already overdue, start from today
      if (rec.kmLeft <= 0) fromDate.setDate(fromDate.getDate());
      else fromDate.setTime(Math.min(estimatedDate.getTime(), Date.now() + 7 * 86400000));

      setTimeout(() => {
        setLoadingSlots(true);
        getAvailableSlots(tenantId, fromDate.toISOString().split('T')[0], 14)
          .then((available) => {
            setSlots(available);
            setLoadingSlots(false);
            if (available.length > 0) {
              addBotMessage('Aquí tienes las próximas fechas disponibles. ¿Cuál te viene mejor?', 300);
            } else {
              addBotMessage(`No hay huecos disponibles — llámanos al ${phone}`, 300);
            }
            if (node.next) {
              setCurrentNodeId(node.next);
            }
          })
          .catch(() => {
            setLoadingSlots(false);
            if (node.next) setCurrentNodeId(node.next);
          });
      }, 900);
      return;
    }

    if (node.action === 'load_slots') {
      const today = new Date().toISOString().split('T')[0];
      setLoadingSlots(true);
      setCurrentNodeId(nodeId);
      getAvailableSlots(tenantId, today, 14)
        .then((available) => {
          setSlots(available);
          setLoadingSlots(false);
          if (available.length > 0) {
            addBotMessage('Aquí tienes las próximas fechas disponibles. ¿Cuál te viene mejor?', 300);
          } else {
            addBotMessage(`No hay huecos disponibles — llámanos al ${phone}`, 300);
            if (node.next) setCurrentNodeId(node.next);
          }
        })
        .catch(() => {
          setLoadingSlots(false);
          if (node.next) setCurrentNodeId(node.next);
        });
      return;
    }

    if (node.message) addBotMessage(node.message, 350);
    setCurrentNodeId(nodeId);
    if (!node.options && !node.collect && !node.action) setDone(true);
  }, [variables, flow, tenantId, addBotMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(nodeId: string, node: FlowNodeAny, vars: Record<string, string>) {
    setSaving(true);
    const slotId = vars['selected_slot_id'];
    // service_ids stored as JSON array in vars; fallback to single 'service' for backwards compat
    const rawServiceIds = vars['service_ids'];
    const serviceIds: string[] = rawServiceIds
      ? (JSON.parse(rawServiceIds) as string[])
      : vars['service']
        ? [vars['service']]
        : [];
    try {
      await saveAppointment({
        tenantId,
        matricula: vars['matricula'] ?? '',
        fuelType: vars['fuel'] ?? '',
        fechaPreferida: vars['fecha_preferida'] ?? vars['selected_slot_date'] ?? '',
        customerName: vars['customer_name'] ?? '',
        customerPhone: vars['customer_phone'] ?? '',
        customerEmail: vars['customer_email'] ?? '',
        serviceIds,
        policyVersion,
        policyHash,
        userAgent: navigator.userAgent,
      });
      if (slotId) await bookSlot(slotId, tenantId).catch(() => null);
      if (node.next) goToNode(node.next, vars);
      else setDone(true);
    } catch {
      addBotMessage('Lo sentimos, hubo un error al registrar tu cita. Por favor llámanos directamente.', 200);
      setDone(true);
    } finally {
      setSaving(false);
    }
  }

  function handleOptionSelect(option: FlowOption & { value?: string }) {
    addUserMessage(option.label);
    const newVars = { ...variables };
    if (option.value) {
      if (currentNodeId === 'ask_fuel') newVars['fuel'] = option.value;
      if (currentNodeId === 'oil_ask_fuel') newVars['oil_ask_fuel'] = option.value;
      if (currentNodeId === 'quote_ask_service_type') newVars['quote_service_type'] = option.value;
    }
    setVariables(newVars);
    setSlots([]);
    goToNode(option.next, newVars);
  }

  async function handleSaveQuote(nodeId: string, node: FlowNodeAny, vars: Record<string, string>) {
    setSaving(true);
    try {
      await saveQuoteRequest({
        tenantId,
        customerName: vars['quote_customer_name'] ?? '',
        customerPhone: vars['quote_customer_phone'] ?? '',
        customerEmail: vars['quote_customer_email'] ?? '',
        vehicleDescription: vars['quote_vehicle'] ?? '',
        problemDescription: vars['quote_problem'] ?? '',
        serviceType: vars['quote_service_type'] ?? vars['quote_service'] ?? '',
        policyVersion,
        policyHash,
        userAgent: navigator.userAgent,
      });
      if (node.next) goToNode(node.next, vars);
      else setDone(true);
    } catch {
      addBotMessage('Lo sentimos, hubo un error al registrar tu solicitud. Por favor llámanos directamente.', 200);
      setDone(true);
    } finally {
      setSaving(false);
    }
  }

  function handleServiceCheckboxToggle(value: string) {
    setSelectedServiceValues((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  function handleConfirmServiceSelection() {
    if (selectedServiceValues.length === 0) return;
    const node = flow.nodes['ask_service'] as FlowNodeAny | undefined;
    if (!node?.options) return;

    // Build labels for display
    const selectedOptions = (node.options as Array<FlowOption & { value?: string }>).filter(
      (o) => o.value && selectedServiceValues.includes(o.value),
    );
    const labels = selectedOptions.map((o) => o.label).join(', ');
    addUserMessage(labels);

    // Determine the next node from first option's next (all point to ask_matricula)
    const nextNodeId = selectedOptions[0]?.next ?? node.next ?? 'ask_matricula';

    // Store service IDs as JSON array in variables; also keep legacy 'service' for single-service compat
    const newVars: Record<string, string> = {
      ...variables,
      service_ids: JSON.stringify(selectedServiceValues),
      service: selectedServiceValues[0] ?? '',
      _service_summary_next: nextNodeId,
    };
    setVariables(newVars);
    setSelectedServiceValues([]);
    setShowServiceSummary(true);
    // keep currentNodeId at ask_service so summary renders
    setCurrentNodeId('ask_service');
  }

  function handleServiceSummaryConfirm() {
    setShowServiceSummary(false);
    const nextNodeId = variables['_service_summary_next'] ?? 'ask_matricula';
    goToNode(nextNodeId, variables);
  }

  function handleSlotSelect(slot: AvailableSlot) {
    const label = `${new Date(slot.slotDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${slot.startTime}`;
    addUserMessage(label);
    const newVars = {
      ...variables,
      fecha_preferida: slot.slotDate,
      selected_slot_id: slot.id,
      selected_slot_date: slot.slotDate,
    };
    setVariables(newVars);
    setSlots([]);
    const nextNodeId = currentNode?.next ?? 'ask_name';
    goToNode(nextNodeId, newVars);
  }

  function handleTextSubmit() {
    const val = inputValue.trim();
    if (!val || !currentNode?.collect) return;
    addUserMessage(val);
    const newVars = { ...variables, [currentNode.collect]: val };
    setVariables(newVars);
    setInputValue('');
    if (currentNode.next) goToNode(currentNode.next, newVars);
  }

  function handleConsentSubmit() {
    if (!consentChecked) return;
    addUserMessage('Acepto la política de privacidad');
    if (currentNode?.next) goToNode(currentNode.next);
  }

  async function handleNlpSubmit() {
    const val = nlpInput.trim();
    if (!val || !currentNode?.options) return;
    const options = currentNode.options as Array<FlowOption & { value?: string }>;
    addUserMessage(val);
    setNlpInput('');

    // Meta-questions: user is asking what the bot can do
    const { intent } = classifyIntent(val);
    if (intent === 'help') {
      addBotMessage('Puedo ayudarte con cualquiera de las opciones que ves abajo. ¿Cuál te interesa?', 300);
      return;
    }

    const local = matchOptionByNlp(val, options);
    if (local) {
      handleOptionSelect(local.option as FlowOption & { value?: string });
      return;
    }

    // Tier-2: Claude fallback — silent degradation on rate limit / no key
    setIsTyping(true);
    const remote = await resolveWithClaude(val, options, currentNodeId);
    setIsTyping(false);
    if (remote) {
      handleOptionSelect(options[remote.index] as FlowOption & { value?: string });
    } else {
      addBotMessage('No te he entendido. Por favor, elige una de las opciones.', 200);
    }
  }

  function start() {
    setStarted(true);
    const node = flow.nodes[flow.start] as FlowNodeAny;
    if (node?.message) {
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages([{ role: 'bot', text: node.message!, key: mkKey() }]);
        }, 600);
      }, 200);
    }
    setCurrentNodeId(flow.start);
  }

  const isLopdNode = currentNode?.action === 'collect_lopd_consent';
  const showSlots = slots.length > 0 && !loadingSlots;
  const isMultiSelectNode = !!(currentNode?.options && currentNode?.multi_select);
  const showMultiSelect = isMultiSelectNode && !loadingSlots && slots.length === 0 && !showServiceSummary;
  const showOptions = !!(currentNode?.options && !currentNode?.multi_select && !loadingSlots && slots.length === 0);

  // For summary after confirmation (when showServiceSummary is true)
  const confirmedServiceIds: string[] = (() => {
    try { return JSON.parse(variables['service_ids'] ?? '[]') as string[]; }
    catch { return []; }
  })();
  const confirmedServicesData = services.filter((s) => confirmedServiceIds.includes(s.id));
  const confirmedBaseTotal = confirmedServicesData.reduce((acc, s) => acc + s.basePrice, 0);
  const confirmedIva = confirmedBaseTotal * ivaRate;
  const confirmedTotal = confirmedBaseTotal + confirmedIva;

  return (
    <div className="flex flex-col rounded-[--radius-xl] overflow-hidden w-full max-w-md mx-auto glass-strong border border-primary/15" style={{ boxShadow: '0 0 40px hsl(349 90% 52% / 0.08)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-primary/90 to-primary/70 border-b border-primary/30">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary-foreground/20 border border-primary-foreground/30">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary-foreground leading-none">Asistente AMG</p>
            <p className="text-[10px] text-primary-foreground/60 mt-0.5 font-mono">
              {started && !done ? 'En línea' : done ? 'Conversación finalizada' : 'Listo para ayudarte'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4 min-h-[320px] max-h-[440px] scroll-smooth">
        {!started && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full gap-4 py-8"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center">
              <Bot className="h-8 w-8 text-primary/70" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-semibold text-sm">Hola, soy el asistente de Talleres AMG</p>
              <p className="text-xs text-muted-foreground">Puedo ayudarte a reservar cita, calcular el cambio de aceite y mucho más.</p>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.key}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'bot' && (
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center mb-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary/80" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'glass border border-border/60 text-foreground rounded-bl-sm'
                }`}
              >
                {msg.text}
              </div>
              {msg.role === 'user' && (
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center mb-0.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-end gap-2 justify-start"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center">
                <Bot className="h-3.5 w-3.5 text-primary/80" />
              </div>
              <div className="glass border border-border/60 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 typing-dot" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 typing-dot" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 typing-dot" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {done && !isTyping && (
          <p className="text-center text-[11px] text-muted-foreground/50 py-2 font-mono">— fin de la conversación —</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {!started && (
        <div className="border-t border-border/50 p-4">
          <button
            onClick={start}
            className="w-full h-11 rounded-[--radius-lg] bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all duration-200"
            style={{ boxShadow: '0 0 16px hsl(349 90% 52% / 0.2)' }}
          >
            Iniciar conversación
          </button>
        </div>
      )}

      {started && !done && (
        <AnimatePresence mode="wait">
          {(saving || loadingSlots) && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="border-t border-border/50 p-4 text-center"
            >
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-4 h-4 rounded-full border border-transparent border-t-primary animate-spin" />
                {saving ? 'Guardando tu cita…' : 'Buscando disponibilidad…'}
              </div>
            </motion.div>
          )}

          {!saving && !loadingSlots && currentNode && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="border-t border-border/50 p-4 space-y-3"
            >
              {/* Slot picker */}
              {showSlots && (
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Fechas disponibles</p>
                  <div className="grid grid-cols-2 gap-2">
                    {slots.slice(0, 6).map((slot) => {
                      const d = new Date(slot.slotDate + 'T00:00:00');
                      return (
                        <button
                          key={slot.id}
                          onClick={() => handleSlotSelect(slot)}
                          className="group flex flex-col items-start p-2.5 rounded-[--radius-lg] border border-border/60 bg-background/40 hover:border-primary/50 hover:bg-primary/5 transition-all duration-150 text-left min-h-[44px]"
                        >
                          <span className="text-[10px] text-muted-foreground font-mono group-hover:text-primary/70 transition-colors capitalize">
                            {d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                          <span className="text-sm font-semibold mt-0.5">{slot.startTime}</span>
                          <span className="text-[10px] text-muted-foreground/60 mt-0.5">
                            {slot.spotsLeft} {slot.spotsLeft === 1 ? 'hueco' : 'huecos'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Multi-select service checkboxes */}
              {showMultiSelect && (
                <div className="space-y-2.5">
                  <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Selecciona uno o más servicios</p>
                  <div className="space-y-1.5">
                    {(currentNode!.options as Array<FlowOption & { value?: string }>).map((opt) => {
                      const isChecked = opt.value ? selectedServiceValues.includes(opt.value) : false;
                      return (
                        <button
                          key={opt.next + opt.label}
                          onClick={() => opt.value && handleServiceCheckboxToggle(opt.value)}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[--radius-lg] border text-xs font-medium text-left transition-all duration-150 ${
                            isChecked
                              ? 'border-primary/60 bg-primary/10 text-primary'
                              : 'border-border/60 bg-background/40 text-foreground hover:border-primary/30 hover:bg-primary/5'
                          }`}
                        >
                          <div className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isChecked ? 'bg-primary border-primary' : 'border-border'
                          }`}>
                            {isChecked && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                          </div>
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  {selectedServiceValues.length === 0 && (
                    <p className="text-[10px] text-muted-foreground/60">Selecciona al menos un servicio para continuar</p>
                  )}
                  {selectedServiceValues.length > 0 && (
                    <button
                      onClick={handleConfirmServiceSelection}
                      className="w-full h-10 rounded-[--radius-lg] bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all"
                    >
                      Confirmar selección ({selectedServiceValues.length})
                    </button>
                  )}
                </div>
              )}

              {/* Service booking summary (shown after multi-select confirmation) */}
              {showServiceSummary && currentNodeId === 'ask_service' && (
                <div className="space-y-3">
                  <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Resumen de servicios</p>
                  <div className="rounded-[--radius-lg] border border-border/60 bg-background/40 overflow-hidden">
                    {confirmedServicesData.length > 0 ? (
                      <div className="divide-y divide-border/40">
                        {confirmedServicesData.map((s) => (
                          <div key={s.id} className="flex justify-between items-center px-3.5 py-2 text-xs">
                            <span className="text-foreground">{s.name}</span>
                            <span className="text-muted-foreground font-mono">{s.basePrice.toFixed(2)} €</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-3.5 py-2 text-xs text-muted-foreground">Servicios seleccionados</div>
                    )}
                    <div className="border-t border-border/60 px-3.5 py-2 space-y-1 text-xs bg-background/20">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Base imponible</span>
                        <span className="font-mono">{confirmedBaseTotal.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>IVA ({(ivaRate * 100).toFixed(0)}%)</span>
                        <span className="font-mono">{confirmedIva.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between font-semibold text-foreground pt-1 border-t border-border/40">
                        <span>Total estimado</span>
                        <span className="font-mono gradient-text">{confirmedTotal.toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60">
                    Precio orientativo. IVA incluido. El presupuesto definitivo puede variar según el diagnóstico.
                  </p>
                  <p className="text-[10px] text-muted-foreground/50 border-t border-border/30 pt-2 mt-1">
                    Todo trabajo está sujeto a presupuesto previo según RD 1457/1986.
                  </p>
                  <button
                    onClick={handleServiceSummaryConfirm}
                    className="w-full h-10 rounded-[--radius-lg] bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all"
                  >
                    Continuar con la reserva
                  </button>
                </div>
              )}

              {/* Option buttons + NLP free-text */}
              {showOptions && (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap gap-2">
                    {currentNode!.options!.map((opt) => (
                      <button
                        key={opt.next + opt.label}
                        onClick={() => handleOptionSelect(opt as FlowOption & { value?: string })}
                        className="rounded-full border border-primary/30 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-primary/90 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-150"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={nlpInput}
                      onChange={(e) => setNlpInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNlpSubmit()}
                      placeholder="O escribe tu mensaje…"
                      className="flex-1 h-9 rounded-[--radius-lg] bg-background/60 border border-border/60 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 placeholder:text-muted-foreground/30"
                    />
                    <button
                      onClick={handleNlpSubmit}
                      disabled={!nlpInput.trim()}
                      className="flex items-center justify-center w-9 h-9 rounded-[--radius-lg] bg-primary/10 text-primary border border-primary/25 disabled:opacity-30 hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Text input */}
              {currentNode?.collect && (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                    placeholder="Escribe aquí…"
                    className="flex-1 h-10 rounded-[--radius-lg] bg-background/60 border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 placeholder:text-muted-foreground/40"
                  />
                  <button
                    onClick={handleTextSubmit}
                    disabled={!inputValue.trim()}
                    className="flex items-center justify-center w-10 h-10 rounded-[--radius-lg] bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* LOPD consent */}
              {isLopdNode && !currentNode?.collect && !currentNode?.options && (
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative mt-0.5 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={consentChecked}
                        onChange={(e) => setConsentChecked(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="w-4 h-4 rounded border border-border peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center">
                        {consentChecked && (
                          <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      Acepto el tratamiento de mis datos conforme a la{' '}
                      <a href={policyUrl} target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">
                        Política de Privacidad
                      </a>{' '}
                      (v{policyVersion}) — LOPDGDD.
                    </span>
                  </label>
                  <button
                    onClick={handleConsentSubmit}
                    disabled={!consentChecked}
                    className="w-full h-10 rounded-[--radius-lg] bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 hover:bg-primary/90 transition-all"
                  >
                    Confirmar y continuar
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
