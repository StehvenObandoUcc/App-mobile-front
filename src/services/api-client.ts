import { Platform } from 'react-native';
import Constants from 'expo-constants';

const API_PORT = '8000';

function resolveApiBaseUrl(): string {
  // 1. Variable de entorno explícita (máxima prioridad)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }

  // 2. IP del host de desarrollo provista por Expo Go
  const expoHost =
    Constants.expoConfig?.hostUri?.split(':')[0] ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost?.split(':')[0];

  if (expoHost && expoHost !== 'localhost' && expoHost !== '127.0.0.1') {
    return `http://${expoHost}:${API_PORT}`;
  }

  // 3. Emulador Android de Android Studio (comunica con localhost del host vía 10.0.2.2)
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${API_PORT}`;
  }

  // 4. Fallback para iOS Simulator o Web
  return `http://localhost:${API_PORT}`;
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

import { Ingredient } from '../types';

let getAuthTokenFn: (() => string | null) | null = null;

/**
 * Registra una función proveedora de token de autenticación para que las llamadas
 * a la API incluyan automáticamente el encabezado Bearer token.
 */
export function registerAuthTokenProvider(fn: () => string | null) {
  getAuthTokenFn = fn;
}

async function requestJson<T = any>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    const token = getAuthTokenFn ? getAuthTokenFn() : null;
    const baseHeaders: Record<string, string> = {};
    if (!(options?.body instanceof FormData)) {
      baseHeaders['Content-Type'] = 'application/json';
    }
    if (token) {
      baseHeaders['Authorization'] = `Bearer ${token}`;
    }
    const mergedHeaders = {
      ...baseHeaders,
      ...(options?.headers || {}),
    };
    response = await fetch(url, { ...options, headers: mergedHeaders });
  } catch (err: any) {
    throw new ApiError(
      'No se pudo conectar con el servidor. Revisa tu conexión a internet o verifica que el backend esté iniciado.',
      0,
      true
    );
  }

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    const detail = errorJson?.detail || 'Error en la solicitud al servidor';
    throw new ApiError(detail, response.status, false);
  }

  return response.json();
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
    return requestJson<ApiScanResponse>(`${API_BASE_URL}/api/v1/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: b64,
        mime_type: mimeType,
      }),
    });
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

    return requestJson<ApiScanResponse>(`${API_BASE_URL}/api/v1/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: cleanB64,
        mime_type: mimeType,
      }),
    });
  } catch (convErr: any) {
    if (convErr instanceof ApiError) throw convErr;
    // 3. Fallback con FormData si la conversión previa fallase
    const formData = new FormData();
    formData.append('image', {
      uri: photoUri,
      name: `scan_${Date.now()}.${fileExtension}`,
      type: mimeType,
    } as any);

    return requestJson<ApiScanResponse>(`${API_BASE_URL}/api/v1/scan`, {
      method: 'POST',
      body: formData,
    });
  }
}

/**
 * Consulta sugerencias de recetas al backend de FastAPI si está disponible.
 */
export async function fetchRecipesFromApi(): Promise<any[]> {
  return requestJson<any[]>(`${API_BASE_URL}/api/v1/recipes`);
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
  return requestJson<any[]>(`${API_BASE_URL}/api/v1/recipes/generate`, {
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
  const data = await requestJson<{ steps: string[] }>(`${API_BASE_URL}/api/v1/recipes/steps`, {
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

  return data.steps || [];
}

/**
 * Obtiene el inventario completo del usuario desde el backend (conectado a Supabase).
 */
export async function fetchInventoryFromApi(): Promise<Ingredient[]> {
  const data = await requestJson<any[]>(`${API_BASE_URL}/api/v1/inventory`);
  return (data || []).map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category || 'other',
    quantity: item.quantity !== undefined ? item.quantity : null,
    unit: item.unit || 'units',
    expirationDate: item.expirationDate || item.expiration_date || null,
    confidence: item.confidence,
    source: item.source || 'manual',
    confirmed: item.confirmed ?? true,
    imageUri: item.imageUri || item.image_uri,
    notes: item.notes,
  }));
}

/**
 * Persiste un nuevo alimento en la base de datos (Supabase) a través de la API.
 */
export async function createInventoryItemWithApi(item: Partial<Ingredient>): Promise<Ingredient> {
  const payload = {
    id: item.id,
    name: item.name,
    category: item.category || 'other',
    quantity: item.quantity,
    unit: item.unit || 'units',
    expirationDate: item.expirationDate || null,
    confidence: item.confidence,
    source: item.source || 'manual',
    confirmed: item.confirmed ?? true,
    imageUri: item.imageUri,
    notes: item.notes,
  };
  const created = await requestJson<any>(`${API_BASE_URL}/api/v1/inventory`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return {
    id: created.id,
    name: created.name,
    category: created.category || 'other',
    quantity: created.quantity !== undefined ? created.quantity : null,
    unit: created.unit || 'units',
    expirationDate: created.expirationDate || created.expiration_date || null,
    confidence: created.confidence,
    source: created.source || 'manual',
    confirmed: created.confirmed ?? true,
    imageUri: created.imageUri || created.image_uri,
    notes: created.notes,
  };
}

/**
 * Actualiza un alimento en la base de datos (Supabase) a través de la API.
 */
export async function updateInventoryItemWithApi(
  id: string,
  updates: Partial<Ingredient>
): Promise<Ingredient> {
  const payload: Record<string, any> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.quantity !== undefined) payload.quantity = updates.quantity;
  if (updates.unit !== undefined) payload.unit = updates.unit;
  if (updates.expirationDate !== undefined) payload.expirationDate = updates.expirationDate;
  if (updates.confirmed !== undefined) payload.confirmed = updates.confirmed;
  if (updates.notes !== undefined) payload.notes = updates.notes;

  const updated = await requestJson<any>(`${API_BASE_URL}/api/v1/inventory/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return {
    id: updated.id,
    name: updated.name,
    category: updated.category || 'other',
    quantity: updated.quantity !== undefined ? updated.quantity : null,
    unit: updated.unit || 'units',
    expirationDate: updated.expirationDate || updated.expiration_date || null,
    confidence: updated.confidence,
    source: updated.source || 'manual',
    confirmed: updated.confirmed ?? true,
    imageUri: updated.imageUri || updated.image_uri,
    notes: updated.notes,
  };
}

/**
 * Elimina físicamente un alimento de la base de datos a través de la API.
 */
export async function deleteInventoryItemWithApi(id: string): Promise<boolean> {
  await requestJson(`${API_BASE_URL}/api/v1/inventory/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return true;
}

/**
 * Elimina un lote de alimentos de la base de datos a través de la API.
 */
export async function batchDeleteInventoryItemsWithApi(ids: string[]): Promise<boolean> {
  await requestJson(`${API_BASE_URL}/api/v1/inventory/batch-delete`, {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
  return true;
}



