import { Navbar } from '@/core/components/layout/Navbar';
import { Hero } from '@/core/components/Hero';
import { ServiceGrid } from '@/core/components/ServiceGrid';
import { ItvCountdown } from '@/core/components/ItvCountdown';
import { Footer } from '@/core/components/Footer';
import { TrustStrip } from '@/core/components/TrustStrip';
import { Testimonials } from '@/core/components/Testimonials';
import { VisitSection } from '@/core/components/VisitSection';
import { ChatWidget } from '@/core/components/ChatWidget';
import { PcbMotif } from '@/core/components/brand/PcbMotif';
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
      <Navbar config={config} />
      <Hero config={config} nextSlot={nextSlot} />
      <TrustStrip />
      <PcbMotif />
      <ServiceGrid
        services={config.services}
        ivaRate={config.ivaRate}
        locale={config.locale}
        currency={config.currency}
      />

      {config.industry === 'automotive' && (
        <div id="itv">
          <ItvCountdown />
        </div>
      )}

      <PcbMotif />
      <Testimonials />
      <VisitSection config={config} />
      <Footer config={config} />

      {/* Floating chat widget — client component */}
      <ChatWidget
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
    </>
  );
}
