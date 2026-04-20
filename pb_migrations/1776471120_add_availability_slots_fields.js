/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1720224894");

  // Add slot_date field
  collection.fields.push(
    new Field({
      "name": "slot_date",
      "type": "date",
      "required": true,
    })
  );

  // Add start_time field
  collection.fields.push(
    new Field({
      "name": "start_time",
      "type": "text",
      "required": true,
    })
  );

  // Add end_time field
  collection.fields.push(
    new Field({
      "name": "end_time",
      "type": "text",
      "required": true,
    })
  );

  // Add capacity field
  collection.fields.push(
    new Field({
      "name": "capacity",
      "type": "number",
      "required": true,
      "min": 1,
    })
  );

  // Add booked field
  collection.fields.push(
    new Field({
      "name": "booked",
      "type": "number",
      "required": true,
      "min": 0,
    })
  );

  // Add tenant_id field
  collection.fields.push(
    new Field({
      "name": "tenant_id",
      "type": "text",
      "required": true,
    })
  );

  return app.save(collection);
}, (app) => {
  // Rollback: remove fields we added (keep only id)
  const collection = app.findCollectionByNameOrId("pbc_1720224894");
  collection.fields = collection.fields.filter(f => f.name === "id");
  return app.save(collection);
})
