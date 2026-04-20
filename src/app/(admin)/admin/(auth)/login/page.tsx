import { LoginForm } from './LoginForm';

export const metadata = {
  title: 'Iniciar sesión — AMG Admin',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight gradient-text">AMG Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Panel de gestión del taller</p>
        </div>

        <div className="glass rounded-xl p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-6">Iniciar sesión</h2>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
