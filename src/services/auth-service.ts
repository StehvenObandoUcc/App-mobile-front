import { t } from '../i18n';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, registerAuthTokenProvider } from './api-client';
import { AuthSession } from '../types';
import { LocalStorage } from '../storage/local-storage';
import { parseAuthError } from '../utils/auth-flow';
import { setPending, clearPending } from './pending-auth';

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

/** Códigos de error del backend que tienen mensaje propio en i18n (data.auth.errors.<code>). */
const KNOWN_ERROR_CODES = [
  'email_taken',
  'weak_password',
  'invalid_code',
  'same_password',
  'email_not_verified',
  'password_reset_required',
  'account_conflict',
  'rate_limited',
  'auth_unavailable',
  'not_available',
  'invalid_credentials',
];

/** En verificar/reenviar, `not_available` habla de la verificación por correo, no de la recuperación. */
const VERIFY_CODE_KEYS = { not_available: 'data.auth.verifyNotAvailable' };

/** Error de autenticación con el `code` del servidor (si lo hay) y un mensaje listo para mostrar. */
export class AuthError extends Error {
  code?: string;
  status: number;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.code = code;
  }
}

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
   * Llamada JSON a /api/v1/auth/<path>. Devuelve el estado y el cuerpo; si la respuesta no es 2xx
   * lanza un AuthError con el `code` del servidor y un mensaje ya traducido. No registra datos sensibles.
   */
  private static async post(
    path: string,
    body: Record<string, unknown>,
    fallbackKey: string,
    codeKeys: Record<string, string> = {}
  ) {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/api/v1/auth/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      throw new AuthError(t('data.network.connectionError'), 0);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const parsed = parseAuthError(response.status, data);
      let code = parsed.code;
      if (!code && response.status === 404) code = 'not_available';
      if (!code && response.status === 429) code = 'rate_limited';
      let message: string;
      if (code && codeKeys[code]) message = t(codeKeys[code]);
      else if (code && KNOWN_ERROR_CODES.includes(code)) message = t(`data.auth.errors.${code}`);
      else message = parsed.message || t(fallbackKey);
      throw new AuthError(message, response.status, code);
    }
    return { status: response.status, data };
  }

  /** Guarda la sesión (SecureStore + memoria + usuario local) a partir de un TokenResponse. */
  private static async startSession(data: any): Promise<AuthSession> {
    if (typeof data?.access_token !== 'string' || !data.access_token || !data?.user?.id) {
      throw new AuthError(t('data.auth.invalidResponse'), 0);
    }
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
    clearPending();
    notifyListeners();
    return session;
  }

  /**
   * Inicia sesión transmitiendo la contraseña en texto plano en la capa de aplicación sobre TLS/HTTPS.
   * El backend se encarga de aplicar exclusivamente PBKDF2-HMAC-SHA256 (600,000 iteraciones).
   * Lanza AuthError; `email_not_verified` además guarda las credenciales pendientes en memoria.
   */
  static async login(email: string, rawPassword: string): Promise<{ kind: 'session'; session: AuthSession }> {
    const mail = email.trim().toLowerCase();
    try {
      const { data } = await AuthService.post('login', { email: mail, password: rawPassword }, 'data.auth.invalidCredentials');
      const session = await AuthService.startSession(data);
      return { kind: 'session', session };
    } catch (err) {
      if (err instanceof AuthError && err.code === 'email_not_verified') setPending(mail, rawPassword);
      throw err;
    }
  }

  /**
   * Registra un nuevo usuario enviando la contraseña sobre TLS.
   * 201 → sesión (modo local); 202 → hay que verificar el correo (guarda credenciales pendientes en memoria).
   */
  static async register(
    email: string,
    rawPassword: string,
    name: string
  ): Promise<{ kind: 'session'; session: AuthSession } | { kind: 'verify'; email: string }> {
    const mail = email.trim().toLowerCase();
    const { status, data } = await AuthService.post(
      'register',
      { email: mail, password: rawPassword, name: name.trim() || 'Chef de Cocina' },
      'data.auth.registerError'
    );
    if (status === 202 || data?.status === 'verification_required') {
      const verifyMail = typeof data?.email === 'string' && data.email ? data.email.trim().toLowerCase() : mail;
      setPending(verifyMail, rawPassword);
      return { kind: 'verify', email: verifyMail };
    }
    const session = await AuthService.startSession(data);
    return { kind: 'session', session };
  }

  /** Confirma el correo con el código de 6 dígitos y deja la sesión iniciada. */
  static async verifyEmail(email: string, code: string, password: string): Promise<AuthSession> {
    const { data } = await AuthService.post(
      'verify-email',
      { email: email.trim().toLowerCase(), code, password },
      'data.auth.verifyError',
      VERIFY_CODE_KEYS
    );
    return AuthService.startSession(data);
  }

  /** Pide un código de verificación nuevo (el servidor siempre responde igual). */
  static async resendCode(email: string): Promise<void> {
    await AuthService.post('resend-code', { email: email.trim().toLowerCase() }, 'data.auth.resendError', VERIFY_CODE_KEYS);
  }

  /** Pide el código de recuperación (respuesta genérica; 404 not_available si el servidor está en modo local). */
  static async forgotPassword(email: string): Promise<void> {
    await AuthService.post('forgot-password', { email: email.trim().toLowerCase() }, 'data.auth.forgotError');
  }

  /** Cambia la contraseña con el código recibido y deja la sesión iniciada. */
  static async resetPassword(email: string, code: string, newPassword: string): Promise<AuthSession> {
    const { data } = await AuthService.post(
      'reset-password',
      { email: email.trim().toLowerCase(), code, new_password: newPassword },
      'data.auth.resetError'
    );
    return AuthService.startSession(data);
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

