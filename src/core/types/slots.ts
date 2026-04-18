/** Shared slot type — no server-only imports. */
export type AvailableSlot = {
  id: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  spotsLeft: number;
};
