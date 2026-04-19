// Passthrough layout for (admin) route group.
// Auth protection is handled by middleware.ts (redirects /admin/** to /admin/login).
// The AdminLayout with sidebar/topbar lives in (admin)/admin/(app)/layout.tsx.
export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
