import { describe, it, expect, beforeEach } from 'vitest';
import { createSession, stepFlow, registerAction } from '../engine';
import type { ChatbotFlow, FlowSession } from '../engine';

const FLOW: ChatbotFlow = {
  version: 1,
  start: 'welcome',
  nodes: {
    welcome: {
      message: 'Hola, ¿en qué puedo ayudarte?',
      options: [
        { label: 'Reservar', next: 'ask_name' },
        { label: 'Precios', next: 'pricing' },
      ],
    },
    ask_name: {
      message: '¿Cuál es tu nombre?',
      collect: 'customer_name',
      next: 'confirmation',
    },
    pricing: {
      message: 'Servicio desde 39,99 €',
    },
    confirmation: {
      message: '¡Cita registrada!',
    },
    action_node: {
      action: 'test_action',
      next: 'confirmation',
    },
  },
};

const mockPb = {} as Parameters<typeof stepFlow>[2];

describe('createSession', () => {
  it('starts at flow.start', () => {
    const session = createSession(FLOW);
    expect(session.currentNode).toBe('welcome');
    expect(session.history).toEqual([]);
    expect(session.variables).toEqual({});
  });
});

describe('stepFlow', () => {
  let session: FlowSession;

  beforeEach(() => {
    session = createSession(FLOW);
  });

  it('returns welcome message and options', async () => {
    const result = await stepFlow(FLOW, session, mockPb, 'tenant-1');
    expect(result.message).toBe('Hola, ¿en qué puedo ayudarte?');
    expect(result.options).toHaveLength(2);
    expect(result.done).toBe(false);
  });

  it('adds current node to history after step', async () => {
    await stepFlow(FLOW, session, mockPb, 'tenant-1');
    expect(session.history).toContain('welcome');
  });

  it('terminal node (no options, no next) marks done=true', async () => {
    session.currentNode = 'pricing';
    const result = await stepFlow(FLOW, session, mockPb, 'tenant-1');
    expect(result.done).toBe(true);
  });

  it('throws for unknown node', async () => {
    session.currentNode = 'nonexistent';
    await expect(stepFlow(FLOW, session, mockPb, 'tenant-1')).rejects.toThrow(/nonexistent/);
  });

  it('throws for unregistered action', async () => {
    session.currentNode = 'action_node';
    await expect(stepFlow(FLOW, session, mockPb, 'tenant-1')).rejects.toThrow(/test_action/);
  });

  it('calls registered action and advances to next node', async () => {
    registerAction('test_action', async (_params, _session, _pb, _tid) => ({
      message: 'action done',
      next: 'confirmation',
    }));
    session.currentNode = 'action_node';
    const result = await stepFlow(FLOW, session, mockPb, 'tenant-1');
    expect(result.message).toBe('action done');
    expect(session.currentNode).toBe('confirmation');
  });
});
