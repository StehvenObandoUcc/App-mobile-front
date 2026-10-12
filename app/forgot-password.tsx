import React, { useEffect, useState } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/hooks/useAuth';
import { AppText, PrimaryButton, IconButton, IconTextField, AuthErrorBox } from '../src/components';
import { useTheme, makeStyles } from '../src/theme/ThemeProvider';
import { useI18n } from '../src/i18n';
import { AuthService } from '../src/services/auth-service';

/** Olvidé mi contraseña: pide el correo, el servidor envía un código y se sigue en reset-password. */
export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const initialEmail = String(Array.isArray(params.email) ? params.email[0] : params.email ?? '').trim();

  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) router.replace('/');
  }, [isAuthenticated]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  };

  const handleSend = async () => {
    if (busy) return;
    const mail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setError(t('screensFlow.forgotPassword.emailInvalidMessage'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await AuthService.forgotPassword(mail);
      router.push({ pathname: '/reset-password', params: { email: mail } });
    } catch (err: any) {
      setError(err?.message || t('data.auth.forgotError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.form, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 12) + 20 }]}
      >
        <IconButton iconName="chevron-back" variant="white" accessibilityLabel={t('screensFlow.forgotPassword.backA11y')} onPress={goBack} />
        <AppText weight="light" style={styles.title} accessibilityRole="header">
          {t('screensFlow.forgotPassword.titleLight')}
          <AppText weight="semibold">{t('screensFlow.forgotPassword.titleBold')}</AppText>
        </AppText>
        <AppText variant="body" color={colors.textSecondary}>
          {t('screensFlow.forgotPassword.intro')}
        </AppText>

        {error ? <AuthErrorBox title={t('screensFlow.forgotPassword.errorTitle')} message={error} /> : null}

        <IconTextField
          label={t('screensFlow.forgotPassword.emailLabel')}
          iconName="mail-outline"
          value={email}
          onChangeText={setEmail}
          placeholder={t('screensFlow.forgotPassword.emailPlaceholder')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          maxLength={100}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <PrimaryButton
          title={t('screensFlow.forgotPassword.submit')}
          onPress={handleSend}
          isLoading={busy}
          disabled={!email.trim()}
          style={styles.cta}
        />
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
}));
