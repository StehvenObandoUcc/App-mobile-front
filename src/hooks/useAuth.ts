import { t } from '../i18n';
import { useState, useEffect, useCallback } from 'react';
import { AuthService } from '../services/auth-service';
import { AuthSession, User, AsyncStatus } from '../types';

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(AuthService.getSession());
  const [isHydrated, setIsHydrated] = useState<boolean>(AuthService.isHydrated());
  const [status, setStatus] = useState<AsyncStatus>(AuthService.getHydrationError() ? 'error' : 'idle');
  const [error, setError] = useState<string | null>(AuthService.getHydrationError());

  useEffect(() => {
    const unsubscribe = AuthService.subscribe((current) => {
      setSession(current);
      setIsHydrated(AuthService.isHydrated());
      const hydrErr = AuthService.getHydrationError();
      if (hydrErr) {
        setError(hydrErr);
        setStatus('error');
      }
    });
    setIsHydrated(AuthService.isHydrated());
    const hydrErr = AuthService.getHydrationError();
    if (hydrErr) {
      setError(hydrErr);
      setStatus('error');
    }
    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, rawPass: string) => {
    setStatus('loading');
    setError(null);
    try {
      const res = await AuthService.login(email, rawPass);
      setStatus('success');
      return res;
    } catch (err: any) {
      // Estos dos casos no son un fallo: la pantalla lleva a verificar el correo o a crear contraseña nueva.
      if (err?.code === 'email_not_verified' || err?.code === 'password_reset_required') {
        setStatus('idle');
        throw err;
      }
      const msg = err?.message || t('data.auth.loginError');
      setError(msg);
      setStatus('error');
      throw err;
    }
  }, []);

  const register = useCallback(async (email: string, rawPass: string, name: string) => {
    setStatus('loading');
    setError(null);
    try {
      const res = await AuthService.register(email, rawPass, name);
      setStatus('success');
      return res;
    } catch (err: any) {
      const msg = err?.message || t('data.auth.createAccountError');
      setError(msg);
      setStatus('error');
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setSession(null);
    setStatus('idle');
    setError(null);
    await AuthService.logout();
  }, []);

  return {
    user: session?.user || null,
    token: session?.accessToken || null,
    isAuthenticated: !!session,
    isHydrated,
    status,
    error,
    login,
    register,
    logout,
  };
}
