import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildExpiryReminderPlan, parseLocalDate } from '../src/utils/expiry-reminders.ts';

const now = new Date(2026, 8, 28, 14, 0, 0); // 28 sep 2026, 2:00 p. m. local

describe('Avisos de vencimiento', () => {
  it('interpreta YYYY-MM-DD como fecha local, no UTC', () => {
    const d = parseLocalDate('2026-10-02');
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 9);
    assert.equal(d.getDate(), 2);
  });

  it('avisa N días antes a las 9:00 y agrupa por día', () => {
    const plan = buildExpiryReminderPlan(
      [
        { name: 'Espinaca', expirationDate: '2026-10-02' },
        { name: 'Tomate', expirationDate: '2026-10-02' },
        { name: 'Leche', expirationDate: '2026-10-05' },
      ],
      { daysBefore: 2, now }
    );
    assert.equal(plan.length, 2);
    assert.equal(plan[0].dayKey, '2026-09-30');
    assert.equal(plan[0].fireAt.getHours(), 9);
    assert.deepEqual(plan[0].itemNames, ['Espinaca', 'Tomate']);
    assert.equal(plan[0].title, '2 alimentos vencen en 2 días');
    assert.equal(plan[1].title, 'Leche vence en 2 días');
  });

  it('nunca programa avisos en el pasado ni para alimentos sin fecha', () => {
    const plan = buildExpiryReminderPlan(
      [
        { name: 'Pollo', expirationDate: '2026-09-29' }, // aviso sería el 27 → pasado
        { name: 'Arroz', expirationDate: null },
        { name: 'Queso', expirationDate: 'fecha-invalida' },
      ],
      { daysBefore: 2, now }
    );
    assert.equal(plan.length, 0);
  });

  it('respeta el tope de avisos y el orden cronológico', () => {
    const items = Array.from({ length: 40 }, (_, i) => ({
      name: `Alimento ${i}`,
      expirationDate: new Date(2026, 9, 1 + i).toISOString().slice(0, 10),
    }));
    const plan = buildExpiryReminderPlan(items, { daysBefore: 1, now, maxEntries: 30 });
    assert.equal(plan.length, 30);
    for (let i = 1; i < plan.length; i++) {
      assert.ok(plan[i].fireAt > plan[i - 1].fireAt);
    }
  });

  it('usa «mañana» cuando se avisa con 1 día y resume listas largas', () => {
    const plan = buildExpiryReminderPlan(
      ['A', 'B', 'C', 'D', 'E'].map((n) => ({ name: n, expirationDate: '2026-10-03' })),
      { daysBefore: 1, now }
    );
    assert.equal(plan[0].title, '5 alimentos vencen mañana');
    assert.match(plan[0].body, /^A, B, C y 2 más\./);
  });
});
