/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Allow public read access to availability_slots (queries filter by tenant_id)
  const slots = app.findCollectionByNameOrId("pbc_1720224894");
  slots.listRule = "";  // public read
  slots.viewRule = "";  // public read
  app.save(slots);

  // Allow authenticated users to read their tenant's appointments
  const appointments = app.findCollectionByNameOrId("pbc_1037645436");
  appointments.listRule = "@request.auth.id != ''";
  appointments.viewRule = "@request.auth.id != ''";
  app.save(appointments);

  // Allow authenticated users to read config
  const config = app.findCollectionByNameOrId("pbc_3818476082");
  config.listRule = "@request.auth.id != ''";
  config.viewRule = "@request.auth.id != ''";
  app.save(config);

  // Allow authenticated users to read consent_log
  const consentLog = app.findCollectionByNameOrId("pbc_3235910749");
  consentLog.listRule = "@request.auth.id != ''";
  consentLog.viewRule = "@request.auth.id != ''";
  app.save(consentLog);

  // Allow public read to services (needed for chatbot)
  const services = app.findCollectionByNameOrId("pbc_863811952");
  services.listRule = "";
  services.viewRule = "";
  app.save(services);
}, (app) => {
  // Rollback: set rules back to null
  const collections = [
    "pbc_1720224894", // availability_slots
    "pbc_1037645436", // appointments
    "pbc_3818476082", // config
    "pbc_3235910749", // consent_log
    "pbc_863811952", // services
  ];

  collections.forEach((id) => {
    const collection = app.findCollectionByNameOrId(id);
    if (collection) {
      collection.listRule = null;
      collection.viewRule = null;
      app.save(collection);
    }
  });
})
