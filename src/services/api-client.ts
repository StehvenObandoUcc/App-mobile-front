import Constants from 'expo-constants';

const API_PORT = '8000';

function resolveApiBaseUrl(): string {
  // Extrae la IP de desarrollo automáticamente desde Expo (ej. 192.168.x.x) para Android
  const host =
    Constants.expoConfig?.hostUri?.split(':')[0] ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost?.split(':')[0] ||
    '192.168.1.12';
  return `http://${host}:${API_PORT}`;
}

export const API_BASE_URL = resolveApiBaseUrl();

export class ApiError extends Error {
  constructor(message: string, public status: number, public isNetworkError: boolean = false) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiScanResponse {
  scan_id: string;
  is_food: boolean;
  warnings?: string[];
  ingredients: {
    id: string;
    name: string;
    category: string;
    quantity: number | null;
    unit: string | null;
    expirationDate: string | null;
    confidence?: number | null;
    source?: 'ai' | 'manual';
    confirmed?: boolean;
  }[];
}

/**
 * Verifica si el backend está disponible.
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/health`);
    return response.ok;
  } catch (error) {
    console.warn('[API] Backend no disponible en:', API_BASE_URL, error);
    return false;
  }
}

/**
 * Envía una imagen al endpoint /api/v1/scan de FastAPI.
 * Usa JSON con base64 para máxima confiabilidad y compatibilidad universal en Android/iOS.
 */
export async function scanImageWithApi(
  photoUri: string,
  base64Data?: string
): Promise<ApiScanResponse> {
  const fileExtension = photoUri.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';

  let b64 = base64Data;
  if (!b64 && photoUri.startsWith('data:')) {
    b64 = photoUri.split(',')[1];
  }

  // 1. Envío directo JSON si tenemos base64 (cero bugs de FormData en Android)
  if (b64) {
    const response = await fetch(`${API_BASE_URL}/api/v1/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: b64,
        mime_type: mimeType,
      }),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => null);
      const detail = errorJson?.detail || 'Error en el análisis';
      throw new ApiError(detail, response.status);
    }

    return response.json();
  }

  // 2. Si es una URI local file://, convertir a base64 mediante FileReader estándar
  try {
    const fileRes = await fetch(photoUri);
    const blob = await fileRes.blob();
    const cleanB64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = (reader.result as string) || '';
        resolve(res.includes(',') ? res.split(',')[1] : res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const response = await fetch(`${API_BASE_URL}/api/v1/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: cleanB64,
        mime_type: mimeType,
      }),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => null);
      const detail = errorJson?.detail || 'Error en el análisis';
      throw new ApiError(detail, response.status);
    }

    return response.json();
  } catch (convErr: any) {
    if (convErr instanceof ApiError) throw convErr;
    // 3. Fallback con FormData si la conversión previa fallase
    const formData = new FormData();
    formData.append('image', {
      uri: photoUri,
      name: `scan_${Date.now()}.${fileExtension}`,
      type: mimeType,
    } as any);

    const response = await fetch(`${API_BASE_URL}/api/v1/scan`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => null);
      const detail = errorJson?.detail || 'Error en el análisis';
      throw new ApiError(detail, response.status);
    }

    return response.json();
  }
}

/**
 * Consulta sugerencias de recetas al backend de FastAPI si está disponible.
 */
export async function fetchRecipesFromApi(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/recipes`);
  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new ApiError(errorJson?.detail || 'Error obteniendo recetas', response.status);
  }
  return response.json();
}

/**
 * Envía el inventario actual y preferencias al endpoint de IA /api/v1/recipes/generate (Fase 1: Resumen liviano).
 */
export async function generateRecipesWithApi(
  ingredients: any[],
  maxPrepTime: number = 30,
  focus: string = 'waste_reduction',
  count: number = 2,
  difficulty: string = 'any'
): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/recipes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ingredients,
      max_prep_time: maxPrepTime,
      focus,
      count,
      difficulty,
    }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new ApiError(errorJson?.detail || 'Error generando recetas', response.status);
  }
  return response.json();
}

/**
 * Fase 2 (Opción A Stateless): Solicita los pasos detallados de preparación para una receta específica.
 */
export async function getRecipeStepsWithApi(recipe: {
  title: string;
  description?: string;
  availableIngredients: any[];
  missingIngredients: any[];
  difficulty?: string;
}): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/recipes/steps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: recipe.title,
      description: recipe.description || '',
      availableIngredients: recipe.availableIngredients,
      missingIngredients: recipe.missingIngredients,
      difficulty: recipe.difficulty || 'easy',
    }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new ApiError(errorJson?.detail || 'Error obteniendo los pasos de la receta', response.status);
  }
  const data = await response.json();
  return data.steps || [];
}



