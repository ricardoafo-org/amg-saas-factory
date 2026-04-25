/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const staff = app.findCollectionByNameOrId("staff");
  const existing = new Set(staff.fields.map((f) => f.name));

  if (!existing.has("tenant_id")) {
    staff.fields.push(new Field({ name: "tenant_id", type: "text", required: true }));
  }
  if (!existing.has("role")) {
    staff.fields.push(new Field({
      name: "role",
      type: "select",
      required: true,
      maxSelect: 1,
      values: ["owner", "technician", "admin"],
    }));
  }
  if (!existing.has("display_name")) {
    staff.fields.push(new Field({ name: "display_name", type: "text" }));
  }
  if (!existing.has("phone")) {
    staff.fields.push(new Field({ name: "phone", type: "text" }));
  }
  if (!existing.has("active")) {
    staff.fields.push(new Field({ name: "active", type: "bool" }));
  }

  app.save(staff);
}, (app) => {
  const staff = app.findCollectionByNameOrId("staff");
  staff.fields = staff.fields.filter(
    (f) => !["tenant_id", "role", "display_name", "phone", "active"].includes(f.name)
  );
  app.save(staff);
});
