import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldCaptureHorizontal,
  directionOf,
  dragTranslate,
  resolveSwipe,
} from '../src/utils/swipe.ts';
import { computeScrollDelta } from '../src/utils/keyboard-scroll.ts';

test('swipe: solo reclama el gesto si |dx| > 12 y |dx| > |dy| × 1.5', () => {
  assert.equal(shouldCaptureHorizontal(12, 0), false);
  assert.equal(shouldCaptureHorizontal(13, 0), true);
  assert.equal(shouldCaptureHorizontal(-30, 10), true);
  assert.equal(shouldCaptureHorizontal(30, 20), false);
  assert.equal(shouldCaptureHorizontal(30, 20.1), false);
  assert.equal(shouldCaptureHorizontal(31, 20), true);
  assert.equal(shouldCaptureHorizontal(5, 40), false);
});

test('swipe: izquierda = +1 (siguiente), derecha = -1 (anterior)', () => {
  assert.equal(directionOf(-40), 1);
  assert.equal(directionOf(40), -1);
  assert.equal(directionOf(0), 0);
});

test('swipe: el arrastre lleva resistencia 0.35 y tope ±60', () => {
  assert.equal(dragTranslate(100), 35);
  assert.equal(dragTranslate(-100), -35);
  assert.equal(dragTranslate(1000), 60);
  assert.equal(dragTranslate(-1000), -60);
});

test('swipe: al soltar cambia con 25 % del ancho o velocidad > 0.5', () => {
  assert.equal(resolveSwipe(-100, 0, 400), 0); // justo 25 %: el umbral es estricto
  assert.equal(resolveSwipe(-100.5, 0, 400), 1);
  assert.equal(resolveSwipe(-99, 0, 400), 0);
  assert.equal(resolveSwipe(120, 0, 400), -1);
  assert.equal(resolveSwipe(-30, -0.6, 400), 1); // corto pero rápido
  assert.equal(resolveSwipe(30, 0.5, 400), 0); // 0.5 no supera el umbral
  assert.equal(resolveSwipe(30, 0.51, 400), -1);
  assert.equal(resolveSwipe(0, 2, 400), 0);
});

test('teclado: campo ya visible no desplaza', () => {
  assert.equal(computeScrollDelta({ top: 100, height: 56, viewportHeight: 400 }), 0);
  assert.equal(computeScrollDelta({ top: 320, height: 56, viewportHeight: 400 }), 0); // 320+56+24 = 400
});

test('teclado: campo tapado se sube con margen de 24', () => {
  assert.equal(computeScrollDelta({ top: 380, height: 56, viewportHeight: 400 }), 60);
});

test('teclado: campo por encima del área visible se baja con margen', () => {
  assert.equal(computeScrollDelta({ top: -10, height: 56, viewportHeight: 400 }), -34);
  assert.equal(computeScrollDelta({ top: 10, height: 56, viewportHeight: 400 }), -14);
});

test('teclado: campo más alto que el área visible prioriza su parte superior', () => {
  assert.equal(computeScrollDelta({ top: 100, height: 500, viewportHeight: 300 }), 76);
});

test('teclado: sin alto de área visible no hace nada', () => {
  assert.equal(computeScrollDelta({ top: 500, height: 56, viewportHeight: 0 }), 0);
});
