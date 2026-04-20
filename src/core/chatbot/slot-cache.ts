/**
 * localStorage slot cache — 30-minute TTL.
 * Pure client-side utility; no server imports.
 */
import type { AvailableSlot } from '@/core/types/slots';

const SLOT_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function slotCacheKey(tenantId: string): string {
  return `amg_slots_${tenantId}`;
}

export function readSlotCache(tenantId: string): AvailableSlot[] | null {
  try {
    const raw = localStorage.getItem(slotCacheKey(tenantId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { slots: AvailableSlot[]; cachedAt: string };
    if (Date.now() - new Date(parsed.cachedAt).getTime() > SLOT_CACHE_TTL_MS) return null;
    return parsed.slots;
  } catch {
    return null;
  }
}

export function writeSlotCache(tenantId: string, slots: AvailableSlot[]): void {
  try {
    localStorage.setItem(
      slotCacheKey(tenantId),
      JSON.stringify({ slots, cachedAt: new Date().toISOString() }),
    );
  } catch {
    // quota exceeded — silently skip
  }
}

export function clearSlotCache(tenantId: string): void {
  try {
    localStorage.removeItem(slotCacheKey(tenantId));
  } catch {
    // ignore
  }
}
