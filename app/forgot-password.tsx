import React, { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { PrimaryButton, IconTextField, AuthErrorBox, AuthScaffold } from '../src/components';
import { useI18n } from '../src/i18n';
import { AuthService } from '../src/services/auth-service';

/** Olvidé mi contraseña: pide el correo, el servidor envía un código y se sigue en reset-password. */
export default function ForgotPasswordScreen() {
  const router = useRouter();
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
    <AuthScaffold
      title={t('screensFlow.forgotPassword.titleLight')}
      emphasis={t('screensFlow.forgotPassword.titleBold')}
      subtitle={t('screensFlow.forgotPassword.intro')}
      onBack={goBack}
      backAccessibilityLabel={t('screensFlow.forgotPassword.backA11y')}
    >
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
      />
    </AuthScaffold>
  );
}
