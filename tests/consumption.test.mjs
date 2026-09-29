import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planConsumption, convertQuantity, tidyQuantity } from '../src/utils/consumption.ts';

const inv = (id, name, quantity, unit) => ({ id, name, quantity, unit });
const req = (name, quantity, unit, inventoryIngredientId = null) => ({ name, quantity, unit, inventoryIngredientId });

test('500 g de cebolla sobre 1 kg deja 500 g (bug reportado)', () => {
  const plan = planConsumption([inv('c', 'Cebolla', 1, 'kilograms')], [req('Cebolla', 500, 'grams')]);
  assert.deepEqual(plan.updates, [{ id: 'c', quantity: 500, unit: 'grams' }]);
  assert.deepEqual(plan.deletes, []);
  assert.deepEqual(plan.consumed, ['Cebolla']);
});

test('usar todo o más deja el alimento en 0 (Sin stock), no lo borra', () => {
  const plan = planConsumption([inv('c', 'Cebolla', 1, 'kilograms')], [req('cebolla', 1200, 'grams')]);
  assert.deepEqual(plan.deletes, []);
  assert.deepEqual(plan.depleted, ['c']);
  assert.deepEqual(plan.updates, [{ id: 'c', quantity: 0, unit: 'kilograms' }]);
});

test('un alimento agotado (0) no se vuelve a descontar', () => {
  const plan = planConsumption([inv('c', 'Cebolla', 0, 'kilograms')], [req('Cebolla', 100, 'grams')]);
  assert.deepEqual(plan.updates, []);
  assert.deepEqual(plan.consumed, []);
});

test('misma unidad descuenta directo y conserva la unidad', () => {
  const plan = planConsumption([inv('h', 'Huevos', 6, 'units')], [req('Huevo', 2, 'units')]);
  assert.deepEqual(plan.updates, [{ id: 'h', quantity: 4, unit: 'units' }]);
});

test('litros y mililitros se convierten; sobrante ≥ 1 L queda en litros', () => {
  const plan = planConsumption([inv('l', 'Leche', 2, 'liters')], [req('Leche', 250, 'milliliters')]);
  assert.deepEqual(plan.updates, [{ id: 'l', quantity: 1.75, unit: 'liters' }]);
});

test('unidades incompatibles o sin cantidad no se tocan y se reportan', () => {
  const plan = planConsumption(
    [inv('c', 'Cebolla', 1, 'kilograms'), inv('s', 'Sal', null, 'grams')],
    [req('Cebolla', 2, 'units'), req('Sal', 5, 'grams'), req('Pimienta', null, 'grams')]
  );
  assert.deepEqual(plan.updates, []);
  assert.deepEqual(plan.deletes, []);
  assert.deepEqual(plan.skipped, ['Cebolla', 'Sal']);
});

test('prefiere el id enlazado y luego el nombre exacto sin tildes', () => {
  const items = [inv('a', 'Cebolla morada', 3, 'units'), inv('b', 'Cebolla', 3, 'units')];
  assert.deepEqual(planConsumption(items, [req('cebolla', 1, 'units')]).updates, [{ id: 'b', quantity: 2, unit: 'units' }]);
  assert.deepEqual(planConsumption(items, [req('cebolla', 1, 'units', 'a')]).updates, [{ id: 'a', quantity: 2, unit: 'units' }]);
  assert.deepEqual(planConsumption([inv('p', 'Plátano', 2, 'units')], [req('platano', 1, 'units')]).updates, [
    { id: 'p', quantity: 1, unit: 'units' },
  ]);
});

test('dos ingredientes de la receta descuentan del mismo alimento acumulando', () => {
  const plan = planConsumption([inv('c', 'Cebolla', 1, 'kilograms')], [req('Cebolla', 300, 'grams'), req('Cebolla', 300, 'grams')]);
  assert.deepEqual(plan.updates, [{ id: 'c', quantity: 400, unit: 'grams' }]);
});

test('unidad desconocida de la IA se asume igual a la de la despensa', () => {
  assert.equal(convertQuantity(2, 'unknown', 'units'), 2);
  assert.equal(convertQuantity(1, 'units', 'grams'), null);
  assert.deepEqual(tidyQuantity(0.25, 'liters'), { quantity: 250, unit: 'milliliters' });
});
