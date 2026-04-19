'use client';

import { useActionState } from 'react';
import { loginStaff, type LoginResult } from '@/actions/admin-auth';
import { cn } from '@/lib/cn';

const initialState: LoginResult = { success: true };

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginResult, FormData>(loginStaff, initialState);

  return (
    <form action={action} className="space-y-4">
      {/* Error message */}
      {!state.success && (
        <div
          role="alert"
          className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
        >
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="admin@talleramg.es"
          className={cn(
            'w-full h-10 px-3 rounded-lg border border-border bg-muted text-sm text-foreground',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
            'transition-colors',
          )}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className={cn(
            'w-full h-10 px-3 rounded-lg border border-border bg-muted text-sm text-foreground',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
            'transition-colors',
          )}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className={cn(
          'w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold',
          'transition-opacity hover:opacity-90',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'mt-2',
        )}
      >
        {pending ? 'Iniciando sesión…' : 'Iniciar sesión'}
      </button>
    </form>
  );
}
