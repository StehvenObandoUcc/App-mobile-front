import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeCloudRecipe, normalizeGeneratedRecipe, parseRecipeImageCredit, readRecipeImage } from '../src/utils/recipe-merge.ts';

const CREDIT = {
  source: 'unsplash',
  name: 'Ana Fotógrafa',
  profileUrl: 'https://unsplash.com/@ana',
  sourceUrl: 'https://unsplash.com/photos/123',
};
const PHOTO = 'https://images.unsplash.com/photo-123';

const base = { id: 'r1', title: 'Arroz', description: '', steps: [], createdAt: '2026-01-01T00:00:00Z' };

describe('mezcla nube -> local de la foto', () => {
  it('conserva la foto y el crédito locales si la nube no los trae', () => {
    const local = { ...base, imageUri: PHOTO, imageCredit: CREDIT };
    const remote = { ...base, createdAt: 'otro formato' };
    const merged = mergeCloudRecipe(remote, local);
    assert.equal(merged.imageUri, PHOTO);
    assert.deepEqual(merged.imageCredit, CREDIT);
    assert.equal(merged.createdAt, '2026-01-01T00:00:00Z');
  });

  it('usa la foto de la nube cuando la trae', () => {
    const remote = { ...base, imageUri: 'https://images.unsplash.com/otra', imageCredit: CREDIT };
    const merged = mergeCloudRecipe(remote, { ...base, imageUri: PHOTO, imageCredit: null });
    assert.equal(merged.imageUri, 'https://images.unsplash.com/otra');
    assert.deepEqual(merged.imageCredit, CREDIT);
  });

  it('sin receta local ni foto no inventa claves', () => {
    const merged = mergeCloudRecipe({ ...base }, undefined);
    assert.equal('imageUri' in merged, false);
    assert.equal('imageCredit' in merged, false);
  });
});

describe('validación del crédito', () => {
  it('acepta un crédito https válido', () => {
    assert.deepEqual(parseRecipeImageCredit(CREDIT), CREDIT);
  });
  it('rechaza URLs no https o sin nombre', () => {
    assert.equal(parseRecipeImageCredit({ ...CREDIT, profileUrl: 'http://unsplash.com/@ana' }), null);
    assert.equal(parseRecipeImageCredit({ ...CREDIT, profileUrl: 'javascript:alert(1)' }), null);
    assert.equal(parseRecipeImageCredit({ ...CREDIT, name: '' }), null);
    assert.equal(parseRecipeImageCredit(null), null);
    assert.equal(parseRecipeImageCredit('texto'), null);
  });
});

describe('lectura de la foto desde la API', () => {
  it('lee camelCase y snake_case (con crédito JSON serializado)', () => {
    assert.deepEqual(readRecipeImage({ imageUri: PHOTO, imageCredit: CREDIT }), { imageUri: PHOTO, imageCredit: CREDIT });
    assert.deepEqual(readRecipeImage({ image_uri: PHOTO, image_credit: JSON.stringify(CREDIT) }), {
      imageUri: PHOTO,
      imageCredit: CREDIT,
    });
  });
  it('descarta fotos no https y crédito inválido', () => {
    assert.deepEqual(readRecipeImage({ imageUri: 'http://x.com/a.jpg', imageCredit: CREDIT }), {});
    assert.deepEqual(readRecipeImage({ imageUri: PHOTO, imageCredit: { ...CREDIT, profileUrl: 'http://x' } }), {
      imageUri: PHOTO,
      imageCredit: null,
    });
    assert.deepEqual(readRecipeImage({ title: 'sin foto' }), {});
  });
});

describe('normalizeGeneratedRecipe (camino de generación)', () => {
  it('descarta foto no https y crédito crudo', () => {
    const out = normalizeGeneratedRecipe({ ...base, imageUri: 'http://x.com/a.jpg', imageCredit: CREDIT, image_uri: 'http://y' });
    assert.equal('imageUri' in out, false);
    assert.equal('imageCredit' in out, false);
    assert.equal('image_uri' in out, false);
    assert.equal(out.title, 'Arroz');
  });
  it('crédito inválido -> null y no se cuela el crudo', () => {
    const bad = { ...CREDIT, profileUrl: 'http://x' };
    const out = normalizeGeneratedRecipe({ ...base, imageUri: PHOTO, imageCredit: bad, image_credit: bad });
    assert.equal(out.imageUri, PHOTO);
    assert.equal(out.imageCredit, null);
    assert.equal('image_credit' in out, false);
  });
  it('conserva foto y crédito válidos', () => {
    const out = normalizeGeneratedRecipe({ ...base, imageUri: PHOTO, imageCredit: CREDIT });
    assert.deepEqual(out.imageCredit, CREDIT);
  });
});
