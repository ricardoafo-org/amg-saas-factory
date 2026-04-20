/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // ===== APPOINTMENTS COLLECTION =====
  const appointments = app.findCollectionByNameOrId("pbc_1037645436");
  appointments.fields.push(
    new Field({
      "name": "tenant_id",
      "type": "text",
      "required": true,
    }),
    new Field({
      "name": "customer_name",
      "type": "text",
      "required": true,
    }),
    new Field({
      "name": "customer_email",
      "type": "email",
      "required": true,
    }),
    new Field({
      "name": "customer_phone",
      "type": "text",
    }),
    new Field({
      "name": "service_ids",
      "type": "json",
      "required": false,
    }),
    new Field({
      "name": "scheduled_at",
      "type": "text",
      "required": true,
    }),
    new Field({
      "name": "notes",
      "type": "text",
    }),
    new Field({
      "name": "status",
      "type": "text",
      "required": true,
    }),
    new Field({
      "name": "base_amount",
      "type": "number",
      "required": true,
    }),
    new Field({
      "name": "iva_rate",
      "type": "number",
      "required": true,
    }),
    new Field({
      "name": "total_amount",
      "type": "number",
      "required": true,
    })
  );
  app.save(appointments);

  // ===== CONFIG COLLECTION =====
  const config = app.findCollectionByNameOrId("pbc_3818476082");
  config.fields.push(
    new Field({
      "name": "tenant_id",
      "type": "text",
      "required": true,
    }),
    new Field({
      "name": "key",
      "type": "text",
      "required": true,
    }),
    new Field({
      "name": "value",
      "type": "text",
      "required": true,
    })
  );
  app.save(config);

  // ===== CONSENT_LOG COLLECTION =====
  const consentLog = app.findCollectionByNameOrId("pbc_3235910749");
  consentLog.fields.push(
    new Field({
      "name": "tenant_id",
      "type": "text",
      "required": true,
    }),
    new Field({
      "name": "subject_email",
      "type": "email",
      "required": true,
    }),
    new Field({
      "name": "policy_version",
      "type": "text",
      "required": true,
    }),
    new Field({
      "name": "policy_hash",
      "type": "text",
      "required": true,
    }),
    new Field({
      "name": "consented",
      "type": "bool",
      "required": true,
    }),
    new Field({
      "name": "consented_at",
      "type": "text",
      "required": true,
    }),
    new Field({
      "name": "ip_address",
      "type": "text",
    }),
    new Field({
      "name": "user_agent",
      "type": "text",
    }),
    new Field({
      "name": "form_context",
      "type": "text",
    })
  );
  app.save(consentLog);

  // ===== SERVICES COLLECTION =====
  const services = app.findCollectionByNameOrId("pbc_863811952");
  services.fields.push(
    new Field({
      "name": "tenant_id",
      "type": "text",
      "required": true,
    }),
    new Field({
      "name": "name",
      "type": "text",
      "required": true,
    }),
    new Field({
      "name": "base_price",
      "type": "number",
      "required": true,
    }),
    new Field({
      "name": "description",
      "type": "text",
    }),
    new Field({
      "name": "duration",
      "type": "number",
    }),
    new Field({
      "name": "category",
      "type": "text",
    })
  );
  app.save(services);

  // ===== TENANTS COLLECTION =====
  const tenants = app.findCollectionByNameOrId("pbc_699394385");
  tenants.fields.push(
    new Field({
      "name": "name",
      "type": "text",
      "required": true,
    }),
    new Field({
      "name": "slug",
      "type": "text",
      "required": true,
    }),
    new Field({
      "name": "plan",
      "type": "text",
      "required": false,
    }),
    new Field({
      "name": "active",
      "type": "bool",
      "required": true,
    })
  );
  app.save(tenants);
}, (app) => {
  // Rollback: remove all fields except id
  const collectionIds = [
    "pbc_1037645436", // appointments
    "pbc_3818476082", // config
    "pbc_3235910749", // consent_log
    "pbc_863811952",  // services
    "pbc_699394385",  // tenants
  ];

  collectionIds.forEach((id) => {
    const collection = app.findCollectionByNameOrId(id);
    if (collection) {
      collection.fields = collection.fields.filter(f => f.name === "id");
      app.save(collection);
    }
  });
})
