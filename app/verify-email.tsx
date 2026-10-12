import React, { useEffect, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/hooks/useAuth';
import { useCountdown } from '../src/hooks/useCountdown';
import {
  AppText,
  PrimaryButton,
  SecondaryButton,
  IconButton,
  IconTextField,
  InlineErrorCard,
  CodeField,
  AuthErrorBox,
} from '../src/components';
import { useTheme, makeStyles } from '../src/theme/ThemeProvider';
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
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.form, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 12) + 20 }]}
      >
        <IconButton iconName="chevron-back" variant="white" accessibilityLabel={t('screensFlow.verifyEmail.backA11y')} onPress={goBack} />
        <AppText weight="light" style={styles.title} accessibilityRole="header">
          {t('screensFlow.verifyEmail.titleLight')}
          <AppText weight="semibold">{t('screensFlow.verifyEmail.titleBold')}</AppText>
        </AppText>
        <AppText variant="body" color={colors.textSecondary}>
          {t('screensFlow.verifyEmail.intro', { email })}
        </AppText>

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
          style={styles.cta}
        />
        <SecondaryButton
          title={seconds > 0 ? t('screensFlow.verifyEmail.resendIn', { seconds }) : t('screensFlow.verifyEmail.resend')}
          variant="outline"
          onPress={handleResend}
          isLoading={resending}
          disabled={seconds > 0}
        />
        <View style={styles.center}>
          <AppText
            variant="body"
            weight="semibold"
            color={colors.primary}
            onPress={goRegister}
            accessibilityRole="link"
            style={styles.link}
          >
            {t('screensFlow.verifyEmail.otherEmail')}
          </AppText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  form: {
    flexGrow: 1,
    paddingHorizontal: 24,
    gap: 18,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
  },
  cta: {
    minHeight: 56,
  },
  center: {
    alignItems: 'center',
  },
  link: {
    paddingVertical: 12,
  },
}));
