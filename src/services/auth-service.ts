import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './api-client';
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
    throw new Error('No se pudo almacenar la sesión de forma segura en el dispositivo.');
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
      error: 'Error al acceder al almacenamiento seguro de credenciales.',
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
    hydrationError = 'Error inesperado al acceder al almacenamiento seguro.';
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
        throw new Error(errData.detail || 'Credenciales incorrectas');
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
      // Fallback para demo offline local si el backend no está encendido
      if (email.toLowerCase() === 'demo@foodai.com' && rawPassword === '123456') {
        const demoSession: AuthSession = {
          accessToken: 'local-demo-token-offline',
          expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
          user: { id: 'usr-demo-1', email: 'demo@foodai.com', name: 'Chef Demo' },
        };
        await saveSecureSession(demoSession);
        currentSession = demoSession;
        await LocalStorage.switchUser(demoSession.user.id);
        notifyListeners();
        return demoSession;
      }
      throw err;
    }
  }

  /**
   * Registra un nuevo usuario enviando la contraseña sobre TLS.
   */
  static async register(email: string, rawPassword: string, name: string): Promise<AuthSession> {
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
      throw new Error(errData.detail || 'Error al registrar usuario');
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
