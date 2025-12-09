import { expect } from '@playwright/test';

export function env() {
  const base = process.env.VITE_API_BASE || process.env.API_BASE || 'http://127.0.0.1:8081/api';
  const token = process.env.VITE_ACCESS_TOKEN || process.env.ACCESS_TOKEN || '';
  return { base, token };
}

export async function apiRequest(request, method, path, data) {
  const { base, token } = env();
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const url = `${base}${path}${token ? (path.includes('?') ? '&' : '?') + 'access_token=' + encodeURIComponent(token) : ''}`;
  const resp = await request.fetch(url, { method, headers, data: data ? JSON.stringify(data) : undefined });
  return resp;
}

export async function apiCreateCustomer(request, payloadOverrides = {}) {
  const def = {
    name: 'E2E Customer',
    email: `e2e+${Date.now()}@test.com`,
    phone: '+1-555-0000',
    address: { street: '1 Test', city: 'City', state: 'ST', zip: '00000', country: 'US' },
    contact_person: 'Tester',
    notes: 'Created by E2E'
  };
  const resp = await apiRequest(request, 'POST', '/customers', { ...def, ...payloadOverrides });
  expect(resp.ok()).toBeTruthy();
  return await resp.json();
}
