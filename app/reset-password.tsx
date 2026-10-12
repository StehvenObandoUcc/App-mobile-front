import React, { useEffect, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  CodeField,
  AuthErrorBox,
} from '../src/components';
import { useTheme, makeStyles } from '../src/theme/ThemeProvider';
import { useI18n } from '../src/i18n';
import { AuthService } from '../src/services/auth-service';
import { RESEND_SECONDS, isStrongEnough, isValidCode } from '../src/utils/auth-flow';

/** Nueva contraseña con el código recibido por correo. `reason=required`: el servidor exige cambiarla. */
export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const params = useLocalSearchParams<{ email?: string | string[]; reason?: string | string[] }>();
  const first = (v?: string | string[]) => String(Array.isArray(v) ? v[0] : v ?? '').trim();
  const email = first(params.email).toLowerCase();
  const required = first(params.reason) === 'required';

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [errorTitle, setErrorTitle] = useState('');
  const [notice, setNotice] = useState('');
  const { seconds, restart } = useCountdown(RESEND_SECONDS);

  useEffect(() => {
    if (isAuthenticated) router.replace('/');
  }, [isAuthenticated]);

  useEffect(() => {
    if (!email) router.replace('/login');
  }, [email]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  };

  const canSubmit = isValidCode(code) && password.length > 0 && confirm.length > 0;

  const handleSave = async () => {
    if (busy || !isValidCode(code)) return;
    if (!isStrongEnough(password)) {
      setErrorTitle(t('screensFlow.resetPassword.errorTitle'));
      setError(t('screensFlow.resetPassword.passwordShortMessage'));
      return;
    }
    if (password !== confirm) {
      setErrorTitle(t('screensFlow.resetPassword.errorTitle'));
      setError(t('screensFlow.resetPassword.mismatchMessage'));
      return;
    }
    setBusy(true);
    setError('');
    setErrorTitle(t('screensFlow.resetPassword.errorTitle'));
    setNotice('');
    try {
      await AuthService.resetPassword(email, code, password);
      // Con la sesión iniciada, el efecto de arriba lleva a Inicio.
    } catch (err: any) {
      setError(err?.message || t('data.auth.resetError'));
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (seconds > 0 || resending) return;
    setResending(true);
    setError('');
    setErrorTitle(t('screensFlow.resetPassword.resendErrorTitle'));
    setNotice('');
    try {
      await AuthService.forgotPassword(email);
      setNotice(t('screensFlow.resetPassword.resendDone'));
      restart();
    } catch (err: any) {
      setError(err?.message || t('data.auth.forgotError'));
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.form, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 12) + 20 }]}
      >
        <IconButton iconName="chevron-back" variant="white" accessibilityLabel={t('screensFlow.resetPassword.backA11y')} onPress={goBack} />
        <AppText weight="light" style={styles.title} accessibilityRole="header">
          {t('screensFlow.resetPassword.titleLight')}
          <AppText weight="semibold">{t('screensFlow.resetPassword.titleBold')}</AppText>
        </AppText>
        {required ? (
          <View style={styles.reason}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.functional.fresh.text} />
            <AppText variant="metadata" weight="regular" color={colors.functional.fresh.text} style={styles.flex}>
              {t('screensFlow.resetPassword.requiredReason')}
            </AppText>
          </View>
        ) : null}
        <AppText variant="body" color={colors.textSecondary}>
          {t('screensFlow.resetPassword.intro', { email })}
        </AppText>

        {error ? (
          <AuthErrorBox title={errorTitle} message={error} />
        ) : notice ? (
          <View accessibilityLiveRegion="polite">
            <AppText variant="metadata" weight="regular" color={colors.functional.fresh.text}>
              {notice}
            </AppText>
          </View>
        ) : null}

        <CodeField
          label={t('screensFlow.resetPassword.codeLabel')}
          accessibilityLabel={t('screensFlow.resetPassword.codeA11y')}
          value={code}
          onChangeText={setCode}
          autoFocus
        />
        <IconTextField
          label={t('screensFlow.resetPassword.newPasswordLabel')}
          iconName="lock-closed-outline"
          secure
          value={password}
          onChangeText={setPassword}
          placeholder={t('screensFlow.resetPassword.passwordPlaceholder')}
          autoCapitalize="none"
          autoComplete="new-password"
          maxLength={128}
          returnKeyType="next"
        />
        <IconTextField
          label={t('screensFlow.resetPassword.confirmPasswordLabel')}
          iconName="lock-closed-outline"
          secure
          value={confirm}
          onChangeText={setConfirm}
          placeholder={t('screensFlow.resetPassword.passwordPlaceholder')}
          autoCapitalize="none"
          autoComplete="new-password"
          maxLength={128}
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />

        <PrimaryButton
          title={t('screensFlow.resetPassword.submit')}
          onPress={handleSave}
          isLoading={busy}
          disabled={!canSubmit}
          style={styles.cta}
        />
        <SecondaryButton
          title={seconds > 0 ? t('screensFlow.resetPassword.resendIn', { seconds }) : t('screensFlow.resetPassword.resend')}
          variant="outline"
          onPress={handleResend}
          isLoading={resending}
          disabled={seconds > 0}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
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
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cta: {
    minHeight: 56,
  },
}));
