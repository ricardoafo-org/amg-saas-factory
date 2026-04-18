import 'server-only';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { LocalBusiness } from '@/core/types/adapter';

export function loadClientConfig(tenantId: string): LocalBusiness {
  const path = join(process.cwd(), 'clients', tenantId, 'config.json');
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as LocalBusiness;
}

export function loadChatbotFlow(tenantId: string): unknown {
  const path = join(process.cwd(), 'clients', tenantId, 'chatbot_flow.json');
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw);
}
