import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { useCountdown } from '../src/hooks/useCountdown';
import {
  AppText,
  PrimaryButton,
  SecondaryButton,
  IconTextField,
  InlineErrorCard,
  CodeField,
  AuthErrorBox,
  AuthScaffold,
} from '../src/components';
import { useTheme } from '../src/theme/ThemeProvider';
import { useI18n } from '../src/i18n';
import { AuthService } from '../src/services/auth-service';
import { getPending, clearPending } from '../src/services/pending-auth';
import { RESEND_SECONDS, isStrongEnough, isValidCode } from '../src/utils/auth-flow';

/**
 * Verificar correo: código de 6 dígitos enviado al registrarse (o al iniciar sesión sin verificar).
 * La contraseña pendiente vive solo en memoria; si la app se reinició se vuelve a pedir aquí.
 */
export default function VerifyEmailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const email = String(Array.isArray(params.email) ? params.email[0] : params.email ?? '').trim().toLowerCase();

  const [hasPending, setHasPending] = useState(() => !!getPending(email));
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [notice, setNotice] = useState('');
  const { seconds, restart } = useCountdown(RESEND_SECONDS);

  useEffect(() => {
    if (isAuthenticated) router.replace('/');
  }, [isAuthenticated]);

  useEffect(() => {
    if (!email) router.replace('/login');
  }, [email]);

  // Las credenciales pendientes no sobreviven a esta pantalla.
  useEffect(() => clearPending, []);

  const goRegister = () => {
    clearPending();
    router.replace({ pathname: '/login', params: { mode: 'register' } });
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  };

  const canSubmit = isValidCode(code) && (hasPending || password.length > 0);

  const handleVerify = async () => {
    if (busy || !isValidCode(code)) return;
    // Se vuelve a consultar: el pendiente puede haberse perdido desde que se abrió la pantalla.
    const pending = getPending(email);
    if (!pending) {
      setHasPending(false);
      if (!isStrongEnough(password)) {
        setError({ message: t('screensFlow.verifyEmail.passwordShortMessage') });
        return;
      }
    }
    setBusy(true);
    setError(null);
    setNotice('');
    try {
      const pwd = pending?.password ?? password;
      await AuthService.verifyEmail(email, code, pwd);
      // Con la sesión iniciada, el efecto de arriba lleva a Inicio.
    } catch (err: any) {
      if (err?.code === 'auth_unavailable') {
        setError({ message: t('screensFlow.verifyEmail.unavailable'), code: err.code });
      } else {
        setError({ message: err?.message || t('data.auth.verifyError'), code: err?.code });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (seconds > 0 || resending) return;
    setResending(true);
    setError(null);
    setNotice('');
    try {
      await AuthService.resendCode(email);
      setNotice(t('screensFlow.verifyEmail.resendDone'));
      restart();
    } catch (err: any) {
      setError({ message: err?.message || t('data.auth.resendError'), code: err?.code });
    } finally {
      setResending(false);
    }
  };

  const unavailable = error?.code === 'auth_unavailable';

  return (
    <AuthScaffold
      title={t('screensFlow.verifyEmail.titleLight')}
      emphasis={t('screensFlow.verifyEmail.titleBold')}
      subtitle={t('screensFlow.verifyEmail.intro', { email })}
      onBack={goBack}
      backAccessibilityLabel={t('screensFlow.verifyEmail.backA11y')}
    >
      {error && unavailable ? (
        <InlineErrorCard
          title={t('screensFlow.verifyEmail.errorTitle')}
          message={error.message}
          onRetry={goRegister}
          retryLabel={t('screensFlow.verifyEmail.unavailableAction')}
        />
      ) : error ? (
        <AuthErrorBox message={error.message} />
      ) : notice ? (
        <View accessibilityLiveRegion="polite">
          <AppText variant="metadata" weight="regular" color={colors.functional.fresh.text}>
            {notice}
          </AppText>
        </View>
      ) : null}

      <CodeField
        label={t('screensFlow.verifyEmail.codeLabel')}
        accessibilityLabel={t('screensFlow.verifyEmail.codeA11y')}
        value={code}
        onChangeText={setCode}
        onSubmitEditing={handleVerify}
        autoFocus
      />

      {!hasPending && (
        <IconTextField
          label={t('screensFlow.verifyEmail.passwordLabel')}
          iconName="lock-closed-outline"
          secure
          value={password}
          onChangeText={setPassword}
          placeholder={t('screensFlow.verifyEmail.passwordPlaceholder')}
          autoCapitalize="none"
          autoComplete="new-password"
          maxLength={128}
          returnKeyType="done"
          onSubmitEditing={handleVerify}
        />
      )}

      <PrimaryButton
        title={t('screensFlow.verifyEmail.submit')}
        onPress={handleVerify}
        isLoading={busy}
        disabled={!canSubmit}
        accessibilityHint={t('screensFlow.verifyEmail.submitA11yHint')}
      />
      <SecondaryButton
        title={seconds > 0 ? t('screensFlow.verifyEmail.resendIn', { seconds }) : t('screensFlow.verifyEmail.resend')}
        variant="outline"
        onPress={handleResend}
        isLoading={resending}
        disabled={seconds > 0}
      />
      <SecondaryButton title={t('screensFlow.verifyEmail.otherEmail')} variant="text" onPress={goRegister} />
    </AuthScaffold>
  );
}
