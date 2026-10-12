import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildExpiryReminderPlan } from '../src/utils/expiry-reminders.ts';

const now = new Date(2026, 8, 28, 8, 0, 0);
const fake = (key, p = {}) => `${key}|${Object.entries(p).map(([k, v]) => `${k}=${v}`).join(',')}`;

test('el plan usa la función de traducción recibida (título y cuerpo)', () => {
  const plan = buildExpiryReminderPlan(
    [{ name: 'Leche', expirationDate: '2026-10-05' }],
    { daysBefore: 2, now, translate: fake }
  );
  assert.equal(plan[0].title, 'misc.notifications.expiry.titleOne|name=Leche,when=misc.notifications.expiry.whenDays|days=2');
  assert.equal(plan[0].body, 'misc.notifications.expiry.bodyOne|');
});

test('con varios alimentos y «mañana» usa las claves de plural y el resto', () => {
  const items = ['A', 'B', 'C', 'D', 'E'].map((name) => ({ name, expirationDate: '2026-10-05' }));
  const plan = buildExpiryReminderPlan(items, { daysBefore: 1, now, translate: fake });
  assert.equal(plan[0].title, 'misc.notifications.expiry.titleMany|count=5,when=misc.notifications.expiry.whenTomorrow|');
  assert.ok(plan[0].body.includes('shown=A, B, C'));
  assert.ok(plan[0].body.includes('extra=misc.notifications.expiry.extraMore|count=2'));
});

test('cada clave que usa el plan existe en los diccionarios reales es y en', async () => {
  const { readFileSync } = await import('node:fs');
  const { misc: esMisc } = await import('../src/i18n/es/misc.ts');
  const { misc: enMisc } = await import('../src/i18n/en/misc.ts');
  const src = readFileSync(new URL('../src/utils/expiry-reminders.ts', import.meta.url), 'utf8');
  const keys = [...new Set([...src.matchAll(/'(misc\.notifications\.expiry\.[A-Za-z]+)'/g)].map((m) => m[1]))];
  assert.ok(keys.length >= 7);
  const get = (root, key) => key.split('.').slice(1).reduce((o, k) => (o == null ? undefined : o[k]), root);
  for (const key of keys) {
    assert.equal(typeof get(esMisc, key), 'string', `falta en es: ${key}`);
    assert.equal(typeof get(enMisc, key), 'string', `falta en en: ${key}`);
  }
});
