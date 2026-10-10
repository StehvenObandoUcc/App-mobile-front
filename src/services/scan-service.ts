import { t } from '../i18n';
import { ScanInput, ScanResult, IngredientCategory, IngredientUnit } from '../types';
import { scanImageWithApi } from './api-client';
import { getFriendlyErrorMessage } from '../utils/error-messages';

export interface ScanService {
  analyzeImage(input: ScanInput): Promise<ScanResult>;
}

export const mockScanService: ScanService = {
  async analyzeImage(input: ScanInput): Promise<ScanResult> {
    if (!input.imageUri) {
      throw new Error(t('data.scan.noImage'));
    }

    try {
      const apiResult = await scanImageWithApi(input.imageUri, input.base64);

      if (apiResult && Array.isArray(apiResult.ingredients)) {
        let warnings = apiResult.warnings || [];
        if (apiResult.is_food === false) {
          warnings = [t('data.scan.notFood')];
        } else if (apiResult.ingredients.length === 0 && warnings.length === 0) {
          warnings = [t('data.scan.noClearFood')];
        }

        return {
          scanId: apiResult.scan_id,
          imageUri: input.imageUri,
          analyzedAt: new Date().toISOString(),
          warnings,
          ingredients: apiResult.ingredients.map((item, idx) => ({
            id: item.id || `ingredient-${idx + 1}`,
            name: item.name,
            category: (item.category as IngredientCategory) || 'other',
            quantity: item.quantity !== undefined ? item.quantity : null,
            unit: (item.unit as IngredientUnit) || 'package',
            expirationDate: item.expirationDate || null,
            confidence: item.confidence !== undefined ? item.confidence : null,
            source: 'ai',
            confirmed: false,
          })),
        };
      }
    } catch (err: any) {
      console.warn('[ScanService] Error al comunicarse con el backend:', err);
      throw new Error(getFriendlyErrorMessage(err, 'scan'));
    }

    return {
      scanId: `scan-${Date.now()}`,
      imageUri: input.imageUri,
      analyzedAt: new Date().toISOString(),
      warnings: [t('data.scan.noFood')],
      ingredients: [],
    };
  },
};
