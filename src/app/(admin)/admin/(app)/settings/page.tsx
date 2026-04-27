import { getStaffCtx } from '@/lib/auth';
import { SettingsTabs } from '@/core/components/admin/settings/SettingsTabs';
import { BusinessInfoForm } from '@/core/components/admin/settings/BusinessInfoForm';
import { OpeningHoursForm } from '@/core/components/admin/settings/OpeningHoursForm';
import { ServiceCatalogEditor } from '@/core/components/admin/settings/ServiceCatalogEditor';

async function getConfigValue(
  pb: Awaited<ReturnType<typeof getStaffCtx>>['pb'],
  tenantId: string,
  key: string,
  fallback = '',
): Promise<string> {
  try {
    // eslint-disable-next-line no-restricted-syntax -- TODO Week 2 / FEAT-053: migrate to getCurrentSettings() Server Action (ADR-014)
    const record = await pb
      .collection('config')
      .getFirstListItem(
        pb.filter('tenant_id = {:tenantId} && key = {:key}', { tenantId, key }),
      );
    return (record['value'] as string) ?? fallback;
  } catch {
    return fallback;
  }
}

export default async function SettingsPage() {
  const ctx = await getStaffCtx();
  const { pb, tenantId } = ctx;

  const [
    business_name,
    business_tagline,
    business_address,
    business_phone,
    business_email,
    business_whatsapp,
    opening_hours_raw,
    iva_rate_raw,
  ] = await Promise.all([
    getConfigValue(pb, tenantId, 'business_name'),
    getConfigValue(pb, tenantId, 'business_tagline'),
    getConfigValue(pb, tenantId, 'business_address'),
    getConfigValue(pb, tenantId, 'business_phone'),
    getConfigValue(pb, tenantId, 'business_email'),
    getConfigValue(pb, tenantId, 'business_whatsapp'),
    getConfigValue(pb, tenantId, 'opening_hours', '{}'),
    getConfigValue(pb, tenantId, 'iva_rate'),
  ]);

  const ivaRate = parseFloat(iva_rate_raw) || 0;

  let services: Array<{
    id: string;
    name: string;
    category: string;
    base_price: number;
    duration_minutes: number;
    description: string;
    active: boolean;
  }> = [];

  try {
    // eslint-disable-next-line no-restricted-syntax -- TODO Week 2 / FEAT-053: migrate to getCurrentSettings() Server Action (ADR-014)
    const res = await pb.collection('services').getFullList({
      filter: pb.filter('tenant_id = {:tenantId}', { tenantId }),
      sort: 'name',
    });
    services = res.map((r) => ({
      id: r.id,
      name: (r['name'] as string) ?? '',
      category: (r['category'] as string) ?? '',
      base_price: (r['base_price'] as number) ?? 0,
      duration_minutes: (r['duration_minutes'] as number) ?? 60,
      description: (r['description'] as string) ?? '',
      active: (r['active'] as boolean) ?? true,
    }));
  } catch {
    services = [];
  }

  const businessInitial = {
    business_name,
    business_tagline,
    business_address,
    business_phone,
    business_email,
    business_whatsapp,
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Ajustes del taller y preferencias
        </p>
      </div>

      <SettingsTabs>
        {(activeTab) => (
          <>
            {activeTab === 'negocio' && (
              <BusinessInfoForm initial={businessInitial} />
            )}
            {activeTab === 'horarios' && (
              <OpeningHoursForm initialHoursJson={opening_hours_raw} />
            )}
            {activeTab === 'servicios' && (
              <ServiceCatalogEditor services={services} ivaRate={ivaRate} />
            )}
            {activeTab === 'personal' && (
              <div className="glass rounded-xl p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Gestión del personal disponible próximamente.
                </p>
              </div>
            )}
            {activeTab === 'notificaciones' && (
              <div className="glass rounded-xl p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Preferencias de notificaciones disponibles próximamente.
                </p>
              </div>
            )}
          </>
        )}
      </SettingsTabs>
    </div>
  );
}
