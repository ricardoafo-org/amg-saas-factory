import { Sidebar } from '@/core/components/admin/Sidebar';
import { Topbar } from '@/core/components/admin/Topbar';
import { getStaffCtx } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getStaffCtx();

  // Read display_name from PB record — fall back to staff ID prefix
  const record = ctx.pb.authStore.record;
  const displayName = (record?.['display_name'] as string | undefined)
    || (record?.['email'] as string | undefined)?.split('@')[0]
    || 'Staff';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <Sidebar displayName={displayName} role={ctx.role} />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar displayName={displayName} />

        {/* Page content — scrollable */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
