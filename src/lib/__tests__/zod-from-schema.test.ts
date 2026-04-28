import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { jsonSchemaToZod } from '../zod-from-schema';

describe('jsonSchemaToZod', () => {
  it('produces a Zod schema that accepts valid input matching required string + number', () => {
    const schema = jsonSchemaToZod({
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1 },
        age: { type: 'integer', minimum: 0 },
      },
      required: ['name', 'age'],
    });

    expect(schema.parse({ name: 'Ana', age: 30 })).toEqual({ name: 'Ana', age: 30 });
  });

  it('rejects input missing a required field', () => {
    const schema = jsonSchemaToZod({
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    });

    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('treats non-required fields as optional', () => {
    const schema = jsonSchemaToZod({
      type: 'object',
      properties: { nickname: { type: 'string' } },
      // no required array
    });

    expect(schema.parse({})).toEqual({});
    expect(schema.parse({ nickname: 'A' })).toEqual({ nickname: 'A' });
  });

  it('builds an array schema with item type validation', () => {
    const schema = jsonSchemaToZod({
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['tags'],
    });

    expect(schema.parse({ tags: ['a', 'b'] })).toEqual({ tags: ['a', 'b'] });
    expect(schema.safeParse({ tags: ['a', 1] }).success).toBe(false);
  });

  it('handles nested object properties recursively', () => {
    const schema = jsonSchemaToZod({
      type: 'object',
      properties: {
        address: {
          type: 'object',
          properties: {
            city: { type: 'string' },
          },
          required: ['city'],
        },
      },
      required: ['address'],
    });

    expect(schema.parse({ address: { city: 'Murcia' } })).toEqual({ address: { city: 'Murcia' } });
    expect(schema.safeParse({ address: {} }).success).toBe(false);
  });

  it('allows null values for nullable fields (type: ["string", "null"])', () => {
    const schema = jsonSchemaToZod({
      type: 'object',
      properties: {
        notes: { type: ['string', 'null'] },
      },
      required: ['notes'],
    });

    expect(schema.parse({ notes: null })).toEqual({ notes: null });
    expect(schema.parse({ notes: 'hi' })).toEqual({ notes: 'hi' });
  });

  it('falls back to z.record(string, unknown) for object without properties (Zod 4 signature)', () => {
    // Regression guard: Zod 4 requires explicit key type for z.record().
    // Pre-bump code used z.record(z.unknown()) which compiles but errors at parse time.
    const schema = jsonSchemaToZod({
      type: 'object',
      properties: {
        metadata: { type: 'object' },
      },
      required: ['metadata'],
    });

    expect(schema.parse({ metadata: { anything: 'goes', here: 42 } })).toEqual({
      metadata: { anything: 'goes', here: 42 },
    });
  });

  it('returns a real ZodObject (so .extend, .pick, etc. work downstream)', () => {
    const schema = jsonSchemaToZod({
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    });

    expect(schema).toBeInstanceOf(z.ZodObject);
  });
});
