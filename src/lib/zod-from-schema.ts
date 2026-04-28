import { z } from 'zod';

type JsonSchemaProperty = {
  type?: string | string[];
  format?: string;
  properties?: Record<string, JsonSchemaProperty>;
  items?: JsonSchemaProperty;
  required?: string[];
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
};

type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
};

function propertyToZod(prop: JsonSchemaProperty): z.ZodTypeAny {
  const types = Array.isArray(prop.type) ? prop.type : [prop.type ?? 'string'];
  const nullable = types.includes('null');
  const baseType = types.find(t => t !== 'null') ?? 'string';

  let schema: z.ZodTypeAny;

  switch (baseType) {
    case 'string':
      if (prop.format === 'email') schema = z.string().email();
      else if (prop.format === 'uri') schema = z.string().url();
      else if (prop.format === 'date' || prop.format === 'date-time') schema = z.string().datetime({ offset: true });
      else {
        let s = z.string();
        if (prop.minLength !== undefined) s = s.min(prop.minLength);
        if (prop.maxLength !== undefined) s = s.max(prop.maxLength);
        schema = s;
      }
      break;
    case 'number':
    case 'integer': {
      let n = prop.type === 'integer' ? z.number().int() : z.number();
      if (prop.minimum !== undefined) n = n.min(prop.minimum);
      if (prop.maximum !== undefined) n = n.max(prop.maximum);
      schema = n;
      break;
    }
    case 'boolean':
      schema = z.boolean();
      break;
    case 'array':
      schema = prop.items ? z.array(propertyToZod(prop.items)) : z.array(z.unknown());
      break;
    case 'object':
      schema = prop.properties ? jsonSchemaToZod({ type: 'object', properties: prop.properties, required: prop.required }) : z.record(z.string(), z.unknown());
      break;
    default:
      schema = z.unknown();
  }

  if (prop.enum) schema = z.enum(prop.enum as [string, ...string[]]);
  return nullable ? schema.nullable() : schema;
}

export function jsonSchemaToZod(schema: JsonSchema): z.ZodObject<z.ZodRawShape> {
  const shape: Record<string, z.ZodTypeAny> = {};
  const required = new Set(schema.required ?? []);

  for (const [key, prop] of Object.entries(schema.properties ?? {})) {
    const fieldSchema = propertyToZod(prop);
    shape[key] = required.has(key) ? fieldSchema : fieldSchema.optional();
  }

  return z.object(shape);
}
