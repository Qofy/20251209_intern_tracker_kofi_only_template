import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Helper to dynamically import entities
async function importEntity(name) {
  const modulePath = path.resolve(process.cwd(), `src/entities/${name}.js`);
  return await import(modulePath);
}

test.describe('Frontend Entity Tests', () => {

  test.describe('Entity Structure Tests', () => {
    test('All entity modules should export expected classes/functions', async () => {
      const entities = ['Customer', 'Quote', 'Invoice', 'InternCertificate', 'Company', 'Product', 'User'];

      for (const entityName of entities) {
        const module = await importEntity(entityName);
        const EntityClass = module[entityName];

        expect(EntityClass).toBeDefined();
        expect(typeof EntityClass.list).toBe('function');
        expect(typeof EntityClass.get).toBe('function');
        expect(typeof EntityClass.create).toBe('function');
        expect(typeof EntityClass.update).toBe('function');
        expect(typeof EntityClass.delete).toBe('function');
      }
    });
    });


});