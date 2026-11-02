import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRecipeAvailability,
  withLiveAvailability,
  isCookable,
  isAlmostCookable,
  planConsumption,
} from '../src/utils/consumption.ts';
import { earliestExpiry, resolveFormExpirationSource } from '../src/utils/dates.ts';

const inv = (id, name, quantity = 1, unit = 'units') => ({ id, name, quantity, unit });
const ing = (name, extra = {}) => ({ id: name, name, quantity: 1, unit: 'units', isAvailable: true, isOptional: false, substitutions: [], ...extra });
const recipe = (available, missing, matchScore = 90) => ({ id: 'r', title: 'R', availableIngredients: available, missingIngredients: missing, matchScore });

describe('Disponibilidad de recetas contra la despensa actual', () => {
  it('lo que se gastó después de generar pasa a «te falta» y baja el %', () => {
    const r = withLiveAvailability(recipe([ing('Tomate'), ing('Cebolla')], []), [inv('t', 'Tomate')]);
    assert.deepEqual(r.availableIngredients.map((i) => i.name), ['Tomate']);
    assert.deepEqual(r.missingIngredients.map((i) => i.name), ['Cebolla']);
    assert.equal(r.matchScore, 50);
    assert.equal(r.missingIngredients[0].isAvailable, false);
  });

  it('lo que compraste después pasa a «tienes» y se vincula al alimento', () => {
    const r = withLiveAvailability(recipe([], [ing('Ajo')], 60), [inv('a', 'ajo')]);
    assert.equal(r.matchScore, 100);
    assert.equal(r.availableIngredients[0].inventoryIngredientId, 'a');
    assert.equal(isCookable(r), true);
  });

  it('un agotado (cantidad 0) no cuenta como disponible', () => {
    const r = withLiveAvailability(recipe([ing('Leche')], []), [inv('l', 'Leche', 0)]);
    assert.equal(r.missingIngredients.length, 1);
    assert.equal(isCookable(r), false);
  });

  it('los opcionales no bloquean ni bajan el %', () => {
    const a = computeRecipeAvailability([ing('Arroz'), ing('Cilantro', { isOptional: true })], [inv('a', 'Arroz')]);
    assert.equal(a.missingRequired, 0);
    assert.equal(a.score, 100);
  });

  it('el % ya no se inventa: no depende del valor guardado', () => {
    const r = withLiveAvailability(recipe([ing('Pasta'), ing('Queso'), ing('Huevo')], [], 90), []);
    assert.equal(r.matchScore, 0);
  });

  it('receta sin ingredientes (datos antiguos) queda igual', () => {
    const r = recipe([], [], 42);
    assert.equal(withLiveAvailability(r, [inv('x', 'X')]), r);
  });

  it('«te falta poco» = a lo sumo 1 obligatorio', () => {
    const one = withLiveAvailability(recipe([ing('A'), ing('B')], []), [inv('a', 'A')]);
    const two = withLiveAvailability(recipe([ing('A'), ing('B'), ing('C')], []), [inv('a', 'A')]);
    assert.equal(isAlmostCookable(one), true);
    assert.equal(isAlmostCookable(two), false);
  });

  it('misma regla que el descuento: si dice que lo tienes, preparar lo descuenta de ese alimento', () => {
    const pantry = [inv('h', 'Huevos', 6)];
    const r = withLiveAvailability(recipe([], [ing('Huevo', { quantity: 2 })]), pantry);
    const plan = planConsumption(pantry, r.availableIngredients);
    assert.deepEqual(plan.updates, [{ id: 'h', quantity: 4, unit: 'units' }]);
  });
});

describe('Origen de la fecha de vencimiento', () => {
  it('cambiar la fecha en el formulario la vuelve manual', () => {
    assert.equal(resolveFormExpirationSource({ expirationDate: '2026-10-30', expirationSource: 'estimated' }, '2026-11-02'), 'manual');
  });

  it('dejarla igual conserva el origen (estimada sigue estimada)', () => {
    assert.equal(resolveFormExpirationSource({ expirationDate: '2026-10-30', expirationSource: 'estimated' }, '2026-10-30'), 'estimated');
  });

  it('sin fecha es unknown y una nueva escrita a mano es manual', () => {
    assert.equal(resolveFormExpirationSource(null, null), 'unknown');
    assert.equal(resolveFormExpirationSource(null, '2026-10-30'), 'manual');
  });

  it('al juntar lotes gana la fecha más próxima con SU origen', () => {
    assert.deepEqual(
      earliestExpiry({ expirationDate: '2026-10-28', expirationSource: 'manual' }, { expirationDate: '2026-11-05', expirationSource: 'estimated' }),
      { expirationDate: '2026-10-28', expirationSource: 'manual' }
    );
    assert.deepEqual(
      earliestExpiry({ expirationDate: null }, { expirationDate: '2026-11-05', expirationSource: 'label' }),
      { expirationDate: '2026-11-05', expirationSource: 'label' }
    );
  });
});
