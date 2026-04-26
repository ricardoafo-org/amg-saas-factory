'use client';

import { useRef, useState, useCallback } from 'react';
import type { ChatbotFlow } from '@/lib/chatbot/engine';
import type { Service } from '@/core/types/adapter';
import { useContainerLayout } from '@/core/chatbot/booking/useContainerLayout';
import { BookingStepper } from '@/core/chatbot/booking/BookingStepper';
import { CartPanel } from '@/core/chatbot/booking/CartPanel';
import { MobileCartPeek } from '@/core/chatbot/booking/MobileCartPeek';
import { StepVehicle } from '@/core/chatbot/booking/steps/StepVehicle';
import { StepServices } from '@/core/chatbot/booking/steps/StepServices';
import { StepSlot } from '@/core/chatbot/booking/steps/StepSlot';
import { StepGuest } from '@/core/chatbot/booking/steps/StepGuest';
import { StepReview } from '@/core/chatbot/booking/steps/StepReview';

// Step indices
const STEP_VEHICLE = 0;
const STEP_SERVICES = 1;
const STEP_SLOT = 2;
const STEP_GUEST = 3;
const STEP_REVIEW = 4;

type VehicleData = { plate: string; model: string; year: string; km: string };
type SlotData = { slotISO: string; slotId: string };
type GuestData = { name: string; phone: string; email: string; consent: true; policyHash: string };

type BookingState = {
  vehicle?: VehicleData;
  selectedServiceIds?: string[];
  slot?: SlotData;
  guest?: GuestData;
};

type Props = {
  flow: ChatbotFlow;
  tenantId: string;
  phone: string;
  businessName: string;
  policyUrl: string;
  policyVersion: string;
  policyHash: string;
  services?: Service[];
  ivaRate: number;
  initialService?: string;
  onStepChange?: (step: number) => void;
};

/**
 * BookingApp — host component owning the 5-step state machine.
 * Two-column layout at ≥ 768 px host width (ResizeObserver, not viewport md:).
 * Cart column is a placeholder in PR-A — will be wired in PR-B.
 */
export function BookingApp({
  tenantId,
  policyUrl,
  policyVersion,
  policyHash,
  services = [],
  ivaRate,
  onStepChange,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const { layout } = useContainerLayout(hostRef);

  const [step, setStep] = useState(STEP_VEHICLE);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [booking, setBooking] = useState<BookingState>({});
  const [done, setDone] = useState(false);

  const goToStep = useCallback(
    (next: number) => {
      setStep(next);
      onStepChange?.(next);
    },
    [onStepChange],
  );

  function advance(from: number) {
    setCompletedSteps((prev) => (prev.includes(from) ? prev : [...prev, from]));
    goToStep(from + 1);
  }

  function handleJumpTo(targetStep: number) {
    // Only completed (past) steps can be jumped to
    if (!completedSteps.includes(targetStep)) return;
    goToStep(targetStep);
  }

  function handleVehicleComplete(data: VehicleData) {
    setBooking((prev) => ({ ...prev, vehicle: data }));
    advance(STEP_VEHICLE);
  }

  function handleServicesComplete(data: { selectedServiceIds: string[] }) {
    setBooking((prev) => ({ ...prev, selectedServiceIds: data.selectedServiceIds }));
    advance(STEP_SERVICES);
  }

  function handleSlotComplete(data: SlotData) {
    setBooking((prev) => ({ ...prev, slot: data }));
    advance(STEP_SLOT);
  }

  function handleGuestComplete(data: GuestData) {
    setBooking((prev) => ({ ...prev, guest: data }));
    advance(STEP_GUEST);
  }

  function handleSuccess() {
    setCompletedSteps((prev) => (prev.includes(STEP_REVIEW) ? prev : [...prev, STEP_REVIEW]));
    setDone(true);
    onStepChange?.(STEP_REVIEW);
  }

  const isDesktop = layout === 'desktop';

  // Derive cart contents from booking state — no new state field needed
  const cartContents = {
    vehicle: booking.vehicle
      ? { plate: booking.vehicle.plate, model: booking.vehicle.model }
      : undefined,
    selectedServiceIds: booking.selectedServiceIds,
    slot: booking.slot ? { slotISO: booking.slot.slotISO } : undefined,
    guest: booking.guest ? { name: booking.guest.name } : undefined,
  };

  /**
   * onEditFrom — maps a cart row click to a step jump.
   * Respects existing completedSteps guard: only completed steps can be jumped to.
   */
  function handleEditFrom(targetStep: number) {
    handleJumpTo(targetStep);
  }

  return (
    <div
      ref={hostRef}
      className="flex flex-col overflow-hidden"
      style={{ flex: 1 }}
    >
      <BookingStepper
        step={step}
        completedSteps={completedSteps}
        onJumpTo={handleJumpTo}
      />

      <div
        style={
          isDesktop
            ? {
                display: 'grid',
                gridTemplateColumns: '1.5fr 300px',
                flex: 1,
                overflow: 'hidden',
              }
            : {
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                overflow: 'hidden',
              }
        }
      >
        {/* Main step column */}
        <div className="flex flex-col overflow-y-auto">
          {!done && step === STEP_VEHICLE && (
            <StepVehicle onComplete={handleVehicleComplete} />
          )}
          {!done && step === STEP_SERVICES && (
            <StepServices services={services} onComplete={handleServicesComplete} />
          )}
          {!done && step === STEP_SLOT && (
            <StepSlot tenantId={tenantId} onComplete={handleSlotComplete} />
          )}
          {!done && step === STEP_GUEST && (
            <StepGuest
              policyUrl={policyUrl}
              policyVersion={policyVersion}
              policyHash={policyHash}
              onComplete={handleGuestComplete}
            />
          )}
          {(step === STEP_REVIEW || done) && booking.vehicle && booking.slot && booking.guest && (
            <StepReview
              tenantId={tenantId}
              vehicle={booking.vehicle}
              selectedServiceIds={booking.selectedServiceIds ?? []}
              slotISO={booking.slot.slotISO}
              slotId={booking.slot.slotId}
              guest={booking.guest}
              services={services}
              ivaRate={ivaRate}
              policyVersion={policyVersion}
              policyHash={policyHash}
              onSuccess={handleSuccess}
            />
          )}
        </div>

        {/* Cart column — wired in PR-B */}
        {isDesktop && (
          <CartPanel
            cart={cartContents}
            services={services}
            ivaRate={ivaRate}
            onEditFrom={handleEditFrom}
          />
        )}
      </div>

      {/* Mobile cart peek — floating pill at < 768 px host width */}
      {!isDesktop && (
        <MobileCartPeek
          cart={cartContents}
          services={services}
          ivaRate={ivaRate}
          currentStep={step}
          onEditFrom={handleEditFrom}
        />
      )}
    </div>
  );
}
