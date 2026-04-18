import 'server-only';
import PocketBase from 'pocketbase';
import { cookies } from 'next/headers';

const PB_URL = process.env.POCKETBASE_URL ?? 'http://127.0.0.1:8090';

// One PocketBase instance per request — never share across requests (auth state leaks)
export async function getPb(): Promise<PocketBase> {
  const pb = new PocketBase(PB_URL);
  const cookieStore = await cookies();
  pb.authStore.loadFromCookie(cookieStore.toString());
  return pb;
}
