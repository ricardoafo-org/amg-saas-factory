/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const appointments = app.findCollectionByNameOrId("appointments");
  const existing = new Set(appointments.fields.map((f) => f.name));

  if (!existing.has("customer_id")) {
    const customers = app.findCollectionByNameOrId("customers");
    appointments.fields.push(new Field({
      name: "customer_id",
      type: "relation",
      collectionId: customers.id,
      required: false,
      cascadeDelete: false,
    }));
    app.save(appointments);
  }
}, (app) => {
  const appointments = app.findCollectionByNameOrId("appointments");
  appointments.fields = appointments.fields.filter((f) => f.name !== "customer_id");
  app.save(appointments);
});
