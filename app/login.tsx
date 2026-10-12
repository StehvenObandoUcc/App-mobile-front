import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  Keyboard,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/hooks/useAuth';
import {
  AppText,
  PrimaryButton,
  SecondaryButton,
  PagerDots,
  OnboardingSlide,
  IconTextField,
  SegmentedControl,
  AuthScaffold,
  AuthErrorBox,
  PhotoTagSpec,
} from '../src/components';
import { useTheme, makeStyles } from '../src/theme/ThemeProvider';
import { useReduceMotion } from '../src/hooks/useReduceMotion';
import { useHorizontalSwipe } from '../src/hooks/useHorizontalSwipe';
import { useI18n, type t as TFn, type tp as TpFn } from '../src/i18n';
import { isStrongEnough } from '../src/utils/auth-flow';

/**
 * Bienvenida (Bienvenida-Fotos.dc.html) + Formulario (Login-Formulario.dc.html).
 * Bienvenida: 3 pasos con foto real, etiquetas de alimentos, puntos, «Saltar / Siguiente»;
 * el último paso lleva «Crear cuenta», «Ya tengo cuenta» y los enlaces legales.
 * El perfil vive ahora en /profile.
 */
type Slide = {
  photo: number;
  alt: string;
  title: string;
  emphasis: string;
  text: string;
  focusX?: number;
  tags: PhotoTagSpec[];
};

// Coordenadas tomadas del mockup (lienzo de 390 × 470).
function buildSlides(t: typeof TFn, tp: typeof TpFn): Slide[] {
  return [
    {
      photo: require('../assets/onboarding/onboarding-escanea.jpg'),
      alt: t('screensFlow.login.slide1Alt'),
      title: t('screensFlow.login.slide1Title'),
      emphasis: t('screensFlow.login.slide1Emphasis'),
      text: t('screensFlow.login.slide1Text'),
      tags: [
        { label: tp('screensFlow.login.tagCabbage', 6), pill: [180, 4], line: [324, 38, 14] },
        { label: tp('screensFlow.login.tagSpinach', 2), pill: [96, 52], line: [161, 86, 74] },
        { label: tp('screensFlow.login.tagCarrot', 5), pill: [6, 96], line: [44, 130, 40] },
        { label: tp('screensFlow.login.tagBroccoli', 4), pill: [236, 104], line: [267, 138, 22] },
        { label: t('screensFlow.login.tagEggs'), pill: [262, 196], line: [355, 230, 88] },
        { label: tp('screensFlow.login.tagCheese', 3), pill: [6, 210], line: [65, 244, 38] },
        { label: tp('screensFlow.login.tagTomatoSauce', 5), pill: [130, 256], line: [209, 290, 12] },
      ],
    },
    {
      photo: require('../assets/onboarding/onboarding-cocina.jpg'),
      alt: t('screensFlow.login.slide2Alt'),
      title: t('screensFlow.login.slide2Title'),
      emphasis: t('screensFlow.login.slide2Emphasis'),
      text: t('screensFlow.login.slide2Text'),
      tags: [
        { label: t('screensFlow.login.tagPantryMatch'), pill: [20, 24], tone: 'ai' },
        { label: tp('screensFlow.login.tagAsparagus', 2), pill: [120, 76], line: [149, 110, 46] },
        { label: tp('screensFlow.login.tagBroccoli', 4), pill: [6, 128], line: [57, 162, 28] },
        { label: t('screensFlow.login.tagChickenWings'), pill: [228, 130], line: [334, 164, 48] },
        { label: tp('screensFlow.login.tagRice', 2), pill: [120, 250], line: [179, 284, 38] },
      ],
    },
    {
      photo: require('../assets/onboarding/onboarding-compra.jpg'),
      alt: t('screensFlow.login.slide3Alt'),
      title: t('screensFlow.login.slide3Title'),
      emphasis: t('screensFlow.login.slide3Emphasis'),
      text: t('screensFlow.login.slide3Text'),
      focusX: 0.3,
      tags: [
        { label: tp('screensFlow.login.tagSquash', 3), pill: [150, 100], line: [210, 134, 92] },
        { label: tp('screensFlow.login.tagZucchini', 1), pill: [8, 170], line: [39, 204, 54] },
        { label: tp('screensFlow.login.tagTomato', 7), pill: [150, 262], line: [189, 296, 54] },
      ],
    },
  ];
}

type Mode = 'login' | 'register';
type FormError = { title?: string; message: string };

/** «Falta tu» + «nombre» → «Falta tu nombre». */
const joinTitle = (lead: string, emphasis: string) => `${lead.trim()} ${emphasis.trim()}`.trim();

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height: screenH } = useWindowDimensions();
  const { isAuthenticated, login, register, status, error, clearError } = useAuth();
  const { t, tp } = useI18n();
  const reduceMotion = useReduceMotion();
  const SLIDES = buildSlides(t, tp);

  useEffect(() => {
    if (isAuthenticated) router.replace('/');
  }, [isAuthenticated]);

  // Otras pantallas (p. ej. «Usar otro correo») pueden abrir el formulario directo con ?mode=register|login.
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const modeParam = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const startMode: Mode | null = modeParam === 'login' || modeParam === 'register' ? modeParam : null;

  const [screenView, setScreenView] = useState<'welcome' | 'form'>(startMode ? 'form' : 'welcome');
  const [page, setPage] = useState(0);
  const pagerRef = useRef<ScrollView>(null);
  const [mode, setMode] = useState<Mode>(startMode ?? 'register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  // Validación y fallos del servidor se muestran en línea (AuthErrorBox), como en las otras pantallas de acceso.
  const [formError, setFormError] = useState<FormError | null>(null);
  const nameAnim = useRef(new Animated.Value(startMode === 'login' ? 0 : 1)).current;

  // Foto: 470 del lienzo de 390, sin pasar del 56 % del alto del teléfono.
  const photoH = Math.min(470 * (width / 390), screenH * 0.56);

  const goTo = (i: number) => {
    pagerRef.current?.scrollTo({ x: i * width, animated: !reduceMotion });
    setPage(i);
  };
  const onPagerEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));

  const openForm = (m: Mode) => {
    setMode(m);
    setFormError(null);
    nameAnim.setValue(m === 'register' ? 1 : 0);
    setScreenView('form');
  };

  // Cambio real de modo: cierra el teclado y limpia los errores de validación.
  const applyMode = (m: Mode) => {
    Keyboard.dismiss();
    setFormError(null);
    clearError();
    setMode(m);
    // El campo «Nombre» entra en 220 ms (instantáneo con «Reducir movimiento»); al salir se desmonta sin animar.
    if (m === 'register' && !reduceMotion) {
      nameAnim.setValue(0);
      Animated.timing(nameAnim, { toValue: 1, duration: 220, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: true }).start();
    } else {
      nameAnim.setValue(m === 'register' ? 1 : 0);
    }
  };

  // Deslizar a la izquierda → «Crear cuenta»; a la derecha → «Iniciar sesión».
  const swipe = useHorizontalSwipe({
    enabled: screenView === 'form',
    width,
    reduceMotion,
    canSwipe: (dir) => (dir === 1 ? mode === 'login' : mode === 'register'),
    onSwipe: (dir) => applyMode(dir === 1 ? 'register' : 'login'),
  });

  // Tocar el SegmentedControl anima igual que el deslizamiento.
  const changeMode = (m: Mode) => {
    if (m === mode) return;
    swipe.run(m === 'register' ? 1 : -1, () => applyMode(m));
  };

  const warn = (title: string, titleEmphasis: string, message: string) => setFormError({ title: joinTitle(title, titleEmphasis), message });

  // Si ya hay un formulario abierto y llega ?mode=..., se ajusta a ese modo.
  useEffect(() => {
    if (startMode) {
      setMode(startMode);
      setFormError(null);
      nameAnim.setValue(startMode === 'register' ? 1 : 0);
      setScreenView('form');
    }
  }, [startMode]);

  const handleSubmit = async () => {
    const mail = email.trim();
    setFormError(null);
    if (mode === 'register' && name.trim().length < 2) return warn(t('screensFlow.login.nameMissingTitle'), t('screensFlow.login.nameMissingEmphasis'), t('screensFlow.login.nameMissingMessage'));
    if (!mail || !password) return warn(t('screensFlow.login.fieldsMissingTitle'), t('screensFlow.login.fieldsMissingEmphasis'), t('screensFlow.login.fieldsMissingMessage'));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return warn(t('screensFlow.login.emailInvalidTitle'), t('screensFlow.login.emailInvalidEmphasis'), t('screensFlow.login.emailInvalidMessage'));
    if (mode === 'register' && !isStrongEnough(password)) return warn(t('screensFlow.login.passwordShortTitle'), t('screensFlow.login.passwordShortEmphasis'), t('screensFlow.login.passwordShortMessage'));

    try {
      if (mode === 'login') await login(mail, password);
      else {
        const res = await register(mail, password, name.trim());
        if (res.kind === 'verify') {
          router.push({ pathname: '/verify-email', params: { email: res.email } });
          return;
        }
      }
      // Al quedar autenticado, el efecto de arriba lleva a Inicio.
    } catch (err: any) {
      if (mode === 'login' && err?.code === 'email_not_verified') {
        // La contraseña queda pendiente en memoria; el servidor ya reenvió el código.
        router.push({ pathname: '/verify-email', params: { email: mail.toLowerCase() } });
        return;
      }
      if (mode === 'login' && err?.code === 'password_reset_required') {
        router.push({ pathname: '/reset-password', params: { email: mail.toLowerCase(), reason: 'required' } });
        return;
      }
      setFormError({
        title:
          mode === 'login'
            ? joinTitle(t('screensFlow.login.loginFailTitle'), t('screensFlow.login.loginFailEmphasis'))
            : joinTitle(t('screensFlow.login.registerFailTitle'), t('screensFlow.login.registerFailEmphasis')),
        message: err?.message || t('screensFlow.login.failFallback'),
      });
    }
  };

  // ── Bienvenida con fotos ──
  if (screenView === 'welcome') {
    const last = page === SLIDES.length - 1;
    return (
      <View style={styles.screen}>
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onPagerEnd}
          // Al volver del formulario se remonta en el paso donde estaba (si no, foto y puntos no coinciden).
          contentOffset={{ x: page * width, y: 0 }}
          style={styles.pager}
        >
          {SLIDES.map((s) => (
            <View key={s.alt} style={{ width }}>
              <OnboardingSlide
                photo={s.photo}
                tags={s.tags}
                width={width}
                height={photoH}
                focusX={s.focusX}
                accessibilityLabel={s.alt}
              />
              <View style={styles.slideText}>
                <PagerDots count={SLIDES.length} index={page} />
                <AppText weight="light" align="center" style={styles.slideTitle} accessibilityRole="header">
                  {`${s.title} `}
                  <AppText weight="semibold">{s.emphasis}</AppText>
                </AppText>
                <AppText variant="body" color={colors.textSecondary} align="center" style={styles.slideBody}>
                  {s.text}
                </AppText>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.welcomeActions, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}>
          {last ? (
            <>
              <PrimaryButton title={t('screensFlow.login.createAccount')} onPress={() => openForm('register')} />
              <SecondaryButton title={t('screensFlow.login.haveAccount')} variant="outline" onPress={() => openForm('login')} />
              <AppText variant="caption" weight="regular" color={colors.textSecondary} align="center" style={styles.legal}>
                {t('screensFlow.login.legalPrefix')}
                <AppText
                  variant="caption"
                  weight="semibold"
                  color={colors.primary}
                  onPress={() => router.push({ pathname: '/legal', params: { tab: 'terms' } })}
                  accessibilityRole="link"
                >
                  {t('screensFlow.login.legalTerms')}
                </AppText>
                {t('screensFlow.login.legalAnd')}
                <AppText
                  variant="caption"
                  weight="semibold"
                  color={colors.primary}
                  onPress={() => router.push({ pathname: '/legal', params: { tab: 'privacy' } })}
                  accessibilityRole="link"
                >
                  {t('screensFlow.login.legalPrivacy')}
                </AppText>
                {t('screensFlow.login.legalEnd')}
              </AppText>
            </>
          ) : (
            <View style={styles.row}>
              <SecondaryButton
                title={t('screensFlow.login.skip')}
                variant="text"
                onPress={() => goTo(SLIDES.length - 1)}
                accessibilityLabel={t('screensFlow.login.skipA11y')}
              />
              <PrimaryButton title={t('screensFlow.login.next')} onPress={() => goTo(page + 1)} style={styles.flex} />
            </View>
          )}
        </View>
      </View>
    );
  }

  // ── Formulario ──
  const register_ = mode === 'register';
  const shownError: FormError | null = formError ?? (error ? { message: error } : null);
  return (
    <AuthScaffold
      title={register_ ? t('screensFlow.login.formTitleRegister') : t('screensFlow.login.formTitleLogin')}
      emphasis={register_ ? t('screensFlow.login.formTitleRegisterBold') : t('screensFlow.login.formTitleLoginBold')}
      onBack={() => setScreenView('welcome')}
      backAccessibilityLabel={t('screensFlow.login.backToWelcomeA11y')}
    >
      <SegmentedControl
        role="tab"
        rail="container"
        accessibilityLabel={t('screensFlow.login.modeA11y')}
        value={mode}
        onChange={changeMode}
        options={[
          { value: 'login', label: t('screensFlow.login.tabLogin') },
          { value: 'register', label: t('screensFlow.login.tabRegister') },
        ]}
      />

      <Animated.View style={[styles.swipeArea, swipe.animatedStyle]} {...swipe.panHandlers}>
        {shownError ? <AuthErrorBox title={shownError.title} message={shownError.message} /> : null}

        {register_ && (
          <Animated.View
            style={{ opacity: nameAnim, transform: [{ translateY: nameAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }}
          >
            <IconTextField
              label={t('screensFlow.login.nameLabel')}
              iconName="person-outline"
              value={name}
              onChangeText={setName}
              placeholder={t('screensFlow.login.namePlaceholder')}
              maxLength={50}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </Animated.View>
        )}
        <IconTextField
          label={t('screensFlow.login.emailLabel')}
          iconName="mail-outline"
          value={email}
          onChangeText={setEmail}
          placeholder={t('screensFlow.login.emailPlaceholder')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          maxLength={100}
          returnKeyType="next"
        />
        <IconTextField
          label={t('screensFlow.login.passwordLabel')}
          iconName="lock-closed-outline"
          secure
          value={password}
          onChangeText={setPassword}
          placeholder={t('screensFlow.login.passwordPlaceholder')}
          autoCapitalize="none"
          maxLength={128}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
        {!register_ && (
          <AppText
            variant="body"
            weight="semibold"
            color={colors.primary}
            onPress={() => router.push({ pathname: '/forgot-password', params: { email: email.trim() } })}
            accessibilityRole="link"
            style={styles.forgot}
          >
            {t('screensFlow.login.forgotLink')}
          </AppText>
        )}

        <View style={styles.secure}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.functional.fresh.text} />
          <AppText variant="metadata" weight="regular" color={colors.functional.fresh.text}>
            {t('screensFlow.login.secure')}
          </AppText>
        </View>

        <View style={styles.flex} />
        <PrimaryButton
          title={register_ ? t('screensFlow.login.submitRegister') : t('screensFlow.login.submitLogin')}
          onPress={handleSubmit}
          isLoading={status === 'loading'}
        />
      </Animated.View>
    </AuthScaffold>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pager: {
    flex: 1,
  },
  slideText: {
    paddingHorizontal: 24,
    gap: 12,
  },
  slideTitle: {
    marginTop: 6,
    fontSize: 34,
    lineHeight: 40,
  },
  slideBody: {
    fontSize: 16,
    lineHeight: 23,
  },
  welcomeActions: {
    paddingHorizontal: 24,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  legal: {
    lineHeight: 18,
  },
  swipeArea: {
    flex: 1,
    gap: 18,
  },
  forgot: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  secure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
}));

