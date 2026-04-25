import type PocketBase from 'pocketbase';

export type FlowOption = { label: string; next: string };

export type FlowNode =
  | { message: string; options?: FlowOption[]; collect?: string; next?: string }
  | { action: string; params?: Record<string, string>; next?: string };

export type ChatbotFlow = {
  version: 1;
  start: string;
  nodes: Record<string, FlowNode>;
};

export type FlowSession = {
  currentNode: string;
  history: string[];
  variables: Record<string, string>;
};

export type ActionHandler = (
  params: Record<string, string>,
  session: FlowSession,
  pb: PocketBase,
  tenantId: string,
) => Promise<{ message: string; next?: string }>;

const ACTION_REGISTRY = new Map<string, ActionHandler>();

export function registerAction(name: string, handler: ActionHandler): void {
  ACTION_REGISTRY.set(name, handler);
}

// Resolves {{config.key}} tokens from PocketBase config collection
async function resolveTokens(
  text: string,
  pb: PocketBase,
  tenantId: string,
  session: FlowSession,
): Promise<string> {
  const configKeys = [...text.matchAll(/\{\{config\.(\w+)\}\}/g)].map(m => m[1]);
  if (configKeys.length === 0) return text;

  const placeholders = configKeys.map((_, i) => `key = {:k${i}}`).join(' || ');
  const params: Record<string, string> = { tenantId };
  configKeys.forEach((k, i) => { params[`k${i}`] = k!; });
  const filter = pb.filter(`tenant_id = {:tenantId} && (${placeholders})`, params);
  const records = await pb.collection('config').getList(1, 50, { filter });
  const configMap = Object.fromEntries(records.items.map(r => [r['key'], r['value']]));

  return text
    .replace(/\{\{config\.(\w+)\}\}/g, (_, key) => configMap[key] ?? `{{config.${key}}}`)
    .replace(/\{\{session\.(\w+)\}\}/g, (_, key) => session.variables[key] ?? '');
}

export async function stepFlow(
  flow: ChatbotFlow,
  session: FlowSession,
  pb: PocketBase,
  tenantId: string,
): Promise<{ message: string; options?: FlowOption[]; done: boolean }> {
  const node = flow.nodes[session.currentNode];
  if (!node) throw new Error(`Flow node "${session.currentNode}" not found`);

  if ('action' in node) {
    const handler = ACTION_REGISTRY.get(node.action);
    if (!handler) throw new Error(`Unregistered action: "${node.action}"`);
    const params = Object.fromEntries(
      Object.entries(node.params ?? {}).map(([k, v]) => [
        k,
        v.replace(/\{\{config\.(\w+)\}\}/g, (_, key) => session.variables[key] ?? v),
      ]),
    );
    const result = await handler(params, session, pb, tenantId);
    session.history.push(session.currentNode);
    session.currentNode = result.next ?? node.next ?? '__end__';
    return { message: result.message, done: session.currentNode === '__end__' };
  }

  const message = await resolveTokens(node.message, pb, tenantId, session);
  session.history.push(session.currentNode);

  if (!node.options && node.next) {
    session.currentNode = node.next;
  }

  return {
    message,
    options: node.options,
    done: !node.options && !node.next,
  };
}

export function createSession(flow: ChatbotFlow): FlowSession {
  return { currentNode: flow.start, history: [], variables: {} };
}
