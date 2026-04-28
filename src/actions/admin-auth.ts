'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PocketBase from 'pocketbase';
import { z } from 'zod';

const PB_URL = process.env.POCKETBASE_URL ?? 'http://127.0.0.1:8090';

const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

export type LoginResult =
  | { success: true }
  | { success: false; error: string };

export async function loginStaff(_prevState: LoginResult, formData: FormData): Promise<LoginResult> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  const pb = new PocketBase(PB_URL);

  try {
    await pb.collection('staff').authWithPassword(parsed.data.email, parsed.data.password);
  } catch {
    return { success: false, error: 'Credenciales incorrectas. Verifica tu email y contraseña.' };
  }

  if (!pb.authStore.isValid || !pb.authStore.token) {
    return { success: false, error: 'Error al iniciar sesión. Inténtalo de nuevo.' };
  }

  const cookieStore = await cookies();
  // httpOnly cookie, 30 days
  cookieStore.set('pb_auth', pb.authStore.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect('/admin/today');
}

export async function logoutStaff(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('pb_auth');
  redirect('/admin/login');
}
