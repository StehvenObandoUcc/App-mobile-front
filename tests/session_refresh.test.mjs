import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldRefreshSession, SESSION_REFRESH_BEFORE_DAYS } from '../src/utils/auth-flow.ts';

const DAY = 86_400_000;
const NOW = Date.parse('2026-11-02T12:00:00Z');
const iso = (ms) => new Date(ms).toISOString();

test('sesión con mucho tiempo por delante: no se renueva', () => {
  assert.equal(shouldRefreshSession(iso(NOW + 6 * DAY), NOW), false);
});

test('sesión que vence pronto: se renueva', () => {
  assert.equal(shouldRefreshSession(iso(NOW + (SESSION_REFRESH_BEFORE_DAYS - 1) * DAY), NOW), true);
});

test('sesión ya vencida: se intenta renovar (el servidor decide si está dentro del plazo)', () => {
  assert.equal(shouldRefreshSession(iso(NOW - 2 * DAY), NOW), true);
});

test('sin fecha o con fecha ilegible: se renueva para obtener una válida', () => {
  assert.equal(shouldRefreshSession(undefined, NOW), true);
  assert.equal(shouldRefreshSession(null, NOW), true);
  assert.equal(shouldRefreshSession('no-es-fecha', NOW), true);
});
