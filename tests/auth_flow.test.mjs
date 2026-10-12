import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAuthError,
  sanitizeCode,
  isValidCode,
  isStrongEnough,
  secondsLeft,
} from '../src/utils/auth-flow.ts';
import { setPending, getPending, clearPending } from '../src/services/pending-auth.ts';

test('parseAuthError lee detail como objeto {code, message}', () => {
  const r = parseAuthError(400, { detail: { code: 'invalid_code', message: 'Código incorrecto' } });
  assert.deepEqual(r, { status: 400, code: 'invalid_code', message: 'Código incorrecto' });
});

test('parseAuthError lee detail como texto (modo local) sin code', () => {
  const r = parseAuthError(401, { detail: 'Credenciales incorrectas' });
  assert.equal(r.status, 401);
  assert.equal(r.code, undefined);
  assert.equal(r.message, 'Credenciales incorrectas');
});

test('parseAuthError con cuerpo vacío o sin detail usa el mensaje de respaldo', () => {
  assert.deepEqual(parseAuthError(500, {}, 'Error genérico'), { status: 500, message: 'Error genérico' });
  assert.deepEqual(parseAuthError(500, { detail: '  ' }, 'Error genérico'), { status: 500, message: 'Error genérico' });
  assert.deepEqual(parseAuthError(503, { detail: { code: 'auth_unavailable' } }, 'x'), {
    status: 503,
    code: 'auth_unavailable',
    message: 'x',
  });
});

test('parseAuthError tolera status sin cuerpo (null, undefined, texto)', () => {
  assert.deepEqual(parseAuthError(502, undefined), { status: 502, message: '' });
  assert.deepEqual(parseAuthError(502, null, 'fallo'), { status: 502, message: 'fallo' });
  assert.deepEqual(parseAuthError(502, 'Bad Gateway', 'fallo'), { status: 502, message: 'fallo' });
});

test('sanitizeCode deja solo dígitos y máximo 6', () => {
  assert.equal(sanitizeCode('12a3-4 5'), '12345');
  assert.equal(sanitizeCode('1234567890'), '123456');
  assert.equal(sanitizeCode(''), '');
  assert.equal(sanitizeCode('abc'), '');
});

test('isValidCode exige exactamente 6 dígitos', () => {
  assert.equal(isValidCode('123456'), true);
  assert.equal(isValidCode('12345'), false);
  assert.equal(isValidCode('1234567'), false);
  assert.equal(isValidCode('12345a'), false);
  assert.equal(isValidCode(''), false);
});

test('isStrongEnough pide al menos 8 caracteres', () => {
  assert.equal(isStrongEnough('1234567'), false);
  assert.equal(isStrongEnough('12345678'), true);
  assert.equal(isStrongEnough(''), false);
});

test('secondsLeft redondea hacia arriba y nunca es negativo', () => {
  assert.equal(secondsLeft(60_000, 0), 60);
  assert.equal(secondsLeft(60_000, 100), 60);
  assert.equal(secondsLeft(60_000, 59_001), 1);
  assert.equal(secondsLeft(60_000, 60_000), 0);
  assert.equal(secondsLeft(60_000, 90_000), 0);
});

test('pending-auth guarda por correo, ignora mayúsculas y se limpia', () => {
  clearPending();
  assert.equal(getPending('a@b.co'), null);
  setPending('  Ana@Correo.com ', 'secreta123');
  assert.deepEqual(getPending('ana@correo.com'), { email: 'ana@correo.com', password: 'secreta123' });
  assert.equal(getPending('otra@correo.com'), null);
  clearPending();
  assert.equal(getPending('ana@correo.com'), null);
});
