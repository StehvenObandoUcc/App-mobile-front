import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { ApiError } from '../src/utils/delete-helpers.ts';
import { misc as esMisc } from '../src/i18n/es/misc.ts';
import { misc as enMisc } from '../src/i18n/en/misc.ts';

// error-messages.ts importa '../i18n' (React), que Node puro no resuelve: se transpila el archivo real
// y se le inyecta un `t` mínimo que resuelve claves sobre el diccionario es.
const require = createRequire(import.meta.url);
const ts = require('typescript');
const src = readFileSync(new URL('../src/utils/error-messages.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const t = (key) => key.split('.').reduce((o, k) => o?.[k], { misc: esMisc });
const shim = (id) => (id === '../i18n' ? { t } : id.endsWith('/es/misc') ? { misc: esMisc } : { misc: enMisc });
const mod = { exports: {} };
new Function('require', 'module', 'exports', js)(shim, mod, mod.exports);
const { getFriendlyErrorMessage } = mod.exports;

const dict = () => esMisc;

test('ApiError guarda el código (o null)', () => {
  assert.equal(new ApiError('x', 429, false, 'daily_recipe_limit').code, 'daily_recipe_limit');
  assert.equal(new ApiError('x', 500).code, null);
});

test('daily_recipe_limit muestra el mensaje del tope diario (generar y pasos)', () => {
  const err = new ApiError('Llegaste al límite diario de recetas. Vuelve mañana.', 429, false, 'daily_recipe_limit');
  assert.equal(getFriendlyErrorMessage(err, 'recipes'), dict().errors.dailyRecipeLimit);
  assert.notEqual(getFriendlyErrorMessage(err, 'recipes'), dict().errors.rateLimit);
});

test('no_coherent_recipe pide elegir otros alimentos', () => {
  const err = new ApiError('No encontramos una combinación clara…', 422, false, 'no_coherent_recipe');
  assert.equal(getFriendlyErrorMessage(err, 'recipes'), dict().errors.noCoherentRecipe);
});

test('un 429 sin código sigue siendo rateLimit y un 422 sin código el genérico', () => {
  assert.equal(getFriendlyErrorMessage(new ApiError('x', 429), 'recipes'), dict().errors.rateLimit);
  assert.equal(getFriendlyErrorMessage(new ApiError('x', 422), 'recipes'), dict().errors.recipesGenerate);
});

test('los textos nuevos existen en es y en', () => {
  assert.equal(esMisc.errors.dailyRecipeLimit, 'Llegaste al límite diario de recetas. Vuelve mañana.');
  assert.equal(enMisc.errors.dailyRecipeLimit, "You've reached today's recipe limit. Come back tomorrow.");
  assert.ok(esMisc.errors.noCoherentRecipe.includes('2 a 6'));
  assert.ok(enMisc.errors.noCoherentRecipe.includes('2 to 6'));
});
