import { t } from '../i18n';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, registerAuthTokenProvider } from './api-client';
import { AuthSession } from '../types';
import { LocalStorage } from '../storage/local-storage';

const SESSION_SECURE_KEY = 'food_ai_session_v1';

// Estado de sesión en memoria
let currentSession: AuthSession | null = null;
let isHydrated = false;
const authListeners = new Set<(session: AuthSession | null) => void>();

function notifyListeners() {
  authListeners.forEach((listener) => listener(currentSession));
}

/**
 * Persistencia segura de sesión en Android usando exclusivamente expo-secure-store (Android Keystore).
 * Si setItemAsync falla, lanza error y no permite marcar al usuario como autenticado.
 */
async function saveSecureSession(session: AuthSession): Promise<void> {
  try {
    await SecureStore.setItemAsync(SESSION_SECURE_KEY, JSON.stringify(session));
  } catch (err) {
    console.error('[Auth] Error crítico guardando sesión en SecureStore:', err);
    throw new Error(t('data.auth.saveError'));
  }
}

type SecureSessionResult = {
  session: AuthSession | null;
  error: string | null;
};

/**
 * Lee la sesión desde SecureStore distinguiendo sesión inexistente (null) de excepción de hardware/cifrado.
 */
async function getSecureSession(): Promise<SecureSessionResult> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_SECURE_KEY);
    if (!raw) {
      return { session: null, error: null }; // No existe sesión previa
    }
    return { session: JSON.parse(raw), error: null };
  } catch (err: any) {
    console.error('[Auth] Error crítico leyendo sesión desde SecureStore:', err);
    return {
      session: null,
      error: t('data.auth.secureReadError'),
    };
  }
}

async function removeSecureSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SESSION_SECURE_KEY);
  } catch (err) {
    console.warn('[Auth] Error eliminando sesión en SecureStore:', err);
  }
}

let hydrationError: string | null = null;

// Carga asíncrona de sesión persistente desde SecureStore en Android
async function hydrateAuth() {
  if (isHydrated) return;
  try {
    const { session, error } = await getSecureSession();
    if (error) {
      console.error('[Auth] Fallo en SecureStore durante hidratación:', error);
      hydrationError = error;
      currentSession = null;
    } else if (session && session.user?.id) {
      currentSession = session;
      hydrationError = null;
      await LocalStorage.switchUser(session.user.id);
    } else {
      currentSession = null;
      hydrationError = null;
    }
  } catch (err) {
    console.error('[Auth] Error inesperado en hydrateAuth:', err);
    hydrationError = t('data.auth.hydrationError');
    currentSession = null;
  } finally {
    isHydrated = true;
    notifyListeners();
  }
}

hydrateAuth();

export class AuthService {
  static getSession(): AuthSession | null {
    return currentSession;
  }

  static getHydrationError(): string | null {
    return hydrationError;
  }

  static isHydrated(): boolean {
    return isHydrated;
  }

  static async waitForHydration(): Promise<void> {
    if (isHydrated) return;
    return new Promise((resolve) => {
      const check = () => {
        if (isHydrated) resolve();
        else setTimeout(check, 20);
      };
      check();
    });
  }

  static subscribe(callback: (session: AuthSession | null) => void): () => void {
    authListeners.add(callback);
    callback(currentSession);
    return () => authListeners.delete(callback);
  }

  /**
   * Inicia sesión transmitiendo la contraseña en texto plano en la capa de aplicación sobre TLS/HTTPS.
   * El backend se encarga de aplicar exclusivamente PBKDF2-HMAC-SHA256 (600,000 iteraciones).
   */
  static async login(email: string, rawPassword: string): Promise<AuthSession> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password: rawPassword }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || t('data.auth.invalidCredentials'));
      }

      const data = await response.json();
      const session: AuthSession = {
        accessToken: data.access_token,
        expiresAt: data.expires_at,
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
        },
      };

      await saveSecureSession(session);
      currentSession = session;
      await LocalStorage.switchUser(session.user.id);
      notifyListeners();
      return session;
    } catch (err: any) {
      const isNetwork =
        (err instanceof TypeError && String(err.message).toLowerCase().includes('network')) ||
        String(err?.message || '').toLowerCase().includes('network request failed');
      if (isNetwork) {
        throw new Error(t('data.network.connectionError'));
      }
      throw err;
    }
  }

  /**
   * Registra un nuevo usuario enviando la contraseña sobre TLS.
   */
  static async register(email: string, rawPassword: string, name: string): Promise<AuthSession> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: rawPassword,
          name: name.trim() || 'Chef de Cocina',
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || t('data.auth.registerError'));
      }

      const data = await response.json();
      const session: AuthSession = {
        accessToken: data.access_token,
        expiresAt: data.expires_at,
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
        },
      };

      await saveSecureSession(session);
      currentSession = session;
      await LocalStorage.switchUser(session.user.id);
      notifyListeners();
      return session;
    } catch (err: any) {
      const isNetwork =
        (err instanceof TypeError && String(err.message).toLowerCase().includes('network')) ||
        String(err?.message || '').toLowerCase().includes('network request failed');
      if (isNetwork) {
        throw new Error(t('data.network.connectionError'));
      }
      throw err;
    }
  }

  /**
   * Elimina para siempre la cuenta y todos sus datos en el servidor (pide la contraseña actual).
   * Si sale bien, borra también la copia local (despensa, recetas, compras y cola de sincronización)
   * y cierra la sesión. Errores: 'wrong_password' (contraseña errada) o mensaje de red.
   */
  static async deleteAccount(rawPassword: string, finalize: boolean = true): Promise<void> {
    const token = currentSession?.accessToken;
    if (!token) throw new Error(t('data.auth.noSession'));
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/api/v1/auth/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: rawPassword }),
      });
    } catch {
      throw new Error(t('data.network.connectionError'));
    }
    if (response.status === 401) throw new Error('wrong_password');
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || t('data.auth.deleteAccountError'));
    }
    if (finalize) await AuthService.finishAccountDeletion();
  }

  /** Limpia la copia local de la cuenta ya eliminada y cierra la sesión (la pantalla lo llama tras avisar al usuario). */
  static async finishAccountDeletion(): Promise<void> {
    try {
      await LocalStorage.clearAllUserData();
    } catch (err) {
      console.warn('[Auth] No se pudo limpiar la copia local tras eliminar la cuenta:', err);
    }
    await AuthService.logout();
  }

  /**
   * Cierra la sesión activa:
   * - Elimina la sesión de SecureStore
   * - Limpia el estado en memoria de LocalStorage (conservando datos en AsyncStorage)
   * - Notifica a los observadores
   */
  static async logout(): Promise<void> {
    currentSession = null;
    await removeSecureSession();
    LocalStorage.clearActiveUser();
    notifyListeners();
  }
}

registerAuthTokenProvider(() => currentSession?.accessToken || null);

