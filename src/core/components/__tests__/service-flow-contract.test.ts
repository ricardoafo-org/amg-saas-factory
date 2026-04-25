import { describe, it, expect } from 'vitest';
import { BUNDLE_SERVICES } from '@/core/components/ServiceGrid';
import flow from '../../../../clients/talleres-amg/chatbot_flow.json';

describe('ServiceGrid ↔ chatbot_flow contract', () => {
  it('every BUNDLE_SERVICES id is present in ask_service.options[].value', () => {
    const flowValues = flow.nodes.ask_service.options.map(
      (o: { value: string }) => o.value,
    );
    for (const svc of BUNDLE_SERVICES) {
      expect(flowValues, `"${svc.id}" not found in ask_service options`).toContain(svc.id);
    }
  });
});
