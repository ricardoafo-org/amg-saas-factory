import { Hero } from '@/core/components/Hero';
import { ServiceGrid } from '@/core/components/ServiceGrid';
import { ItvCountdown } from '@/core/components/ItvCountdown';
import { ChatEngine } from '@/core/chatbot/ChatEngine';
import { Footer } from '@/core/components/Footer';
import { loadClientConfig, loadChatbotFlow } from '@/lib/config';
import type { ChatbotFlow } from '@/lib/chatbot/engine';
import { getNextAvailableSlot } from '@/actions/slots';

const TENANT_ID = process.env['TENANT_ID'] ?? 'talleres-amg';

export default async function Home() {
  const config = loadClientConfig(TENANT_ID);
  const flow = loadChatbotFlow(TENANT_ID) as ChatbotFlow;
  const nextSlot = await getNextAvailableSlot(config.tenantId);

  return (
    <>
      <Hero config={config} nextSlot={nextSlot} />
      <ServiceGrid services={config.services} ivaRate={config.ivaRate} locale={config.locale} currency={config.currency} />

      {config.industry === 'automotive' && <ItvCountdown />}

      <section className="relative px-5 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/3 to-background" aria-hidden />
        <div className="relative z-10 mx-auto max-w-lg">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-mono text-primary tracking-[0.2em] uppercase">Sin esperas</p>
            <h2 className="text-4xl font-extrabold tracking-tight">
              Reserva tu <span className="gradient-text">cita</span>
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              En menos de 2 minutos. Sin llamadas, sin esperas.
            </p>
          </div>
          <ChatEngine
            flow={flow}
            tenantId={config.tenantId}
            phone={config.contact.phone}
            businessName={config.businessName}
            policyUrl={config.privacyPolicy.url}
            policyVersion={config.privacyPolicy.version}
            policyHash={config.privacyPolicy.hash}
            services={config.services}
            ivaRate={config.ivaRate}
          />
        </div>
      </section>

      <Footer config={config} />
    </>
  );
}
