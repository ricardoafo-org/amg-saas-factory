import { Navbar } from '@/core/components/layout/Navbar';
import { Hero } from '@/core/components/Hero';
import { ServiceGrid } from '@/core/components/ServiceGrid';
import { ItvCountdown } from '@/core/components/ItvCountdown';
import { Footer } from '@/core/components/Footer';
import { TrustStrip } from '@/core/components/TrustStrip';
import { Testimonials } from '@/core/components/Testimonials';
import { VisitSection } from '@/core/components/VisitSection';
import { UrgencyBand } from '@/core/components/UrgencyBand';
import { ChatWidget } from '@/core/components/ChatWidget';
import { MobileContactBar } from '@/core/components/MobileContactBar';
import { RuleDivider } from '@/core/components/brand/RuleDivider';
import { loadClientConfig, loadChatbotFlow } from '@/lib/config';
import { getTenantId } from '@/lib/tenant';
import type { ChatbotFlow } from '@/lib/chatbot/engine';
import { getNextAvailableSlot } from '@/actions/slots';

const TENANT_ID = getTenantId();

export default async function Home() {
  const config = loadClientConfig(TENANT_ID);
  const flow = loadChatbotFlow(TENANT_ID) as ChatbotFlow;
  const nextSlot = await getNextAvailableSlot(config.tenantId);

  return (
    <>
      <Navbar config={config} />
      <Hero config={config} nextSlot={nextSlot} />
      <TrustStrip
        yearsOperating={new Date().getFullYear() - config.foundingYear}
        reviewRating={config.reviewRating ?? 4.9}
        reviewCount={config.reviewCount ?? 0}
      />
      <RuleDivider />
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

      <Testimonials />
      <VisitSection config={config} />
      <UrgencyBand config={config} />
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

      {/* Mobile-only sticky contact bar (Llamar / WhatsApp / Reservar). */}
      <MobileContactBar
        phone={config.contact.phone}
        whatsapp={config.contact.whatsapp}
      />
    </>
  );
}
