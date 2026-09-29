import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import type { TextInput as RNTextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/hooks/useAuth';
import {
  AppText,
  PrimaryButton,
  SecondaryButton,
  IconButton,
  M3Dialog,
  PagerDots,
  OnboardingSlide,
  IconTextField,
  SegmentedControl,
  PhotoTagSpec,
} from '../src/components';
import { colors } from '../src/theme';

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
const SLIDES: Slide[] = [
  {
    photo: require('../assets/onboarding/onboarding-escanea.jpg'),
    alt: 'Nevera abierta con verduras frescas',
    title: 'Tu despensa,',
    emphasis: 'entendida por IA',
    text: 'Toma una foto y reconocemos tus alimentos con su fecha de vencimiento.',
    tags: [
      { label: 'Repollo morado · 6 días', pill: [180, 4], line: [324, 38, 14] },
      { label: 'Espinaca · 2 días', pill: [96, 52], line: [161, 86, 74] },
      { label: 'Zanahoria · 5 días', pill: [6, 96], line: [44, 130, 40] },
      { label: 'Brócoli · 4 días', pill: [236, 104], line: [267, 138, 22] },
      { label: 'Huevos · frescos', pill: [262, 196], line: [355, 230, 88] },
      { label: 'Queso fresco · 3 días', pill: [6, 210], line: [65, 244, 38] },
      { label: 'Salsa de tomate · 5 días', pill: [130, 256], line: [209, 290, 12] },
    ],
  },
  {
    photo: require('../assets/onboarding/onboarding-cocina.jpg'),
    alt: 'Plato de arroz, pollo asado y verduras',
    title: 'Recetas con',
    emphasis: 'lo que ya tienes',
    text: 'El Chef IA cocina ideas con lo que vence primero, para que nada se pierda.',
    tags: [
      { label: '92 % con tu despensa', pill: [20, 24], tone: 'ai' },
      { label: 'Espárragos · 2 días', pill: [120, 76], line: [149, 110, 46] },
      { label: 'Brócoli · 4 días', pill: [6, 128], line: [57, 162, 28] },
      { label: 'Alitas de pollo', pill: [228, 130], line: [334, 164, 48] },
      { label: 'Arroz · 2 tazas', pill: [120, 250], line: [179, 284, 38] },
    ],
  },
  {
    photo: require('../assets/onboarding/onboarding-compra.jpg'),
    alt: 'Canasta con tomates, calabacín y verduras',
    title: 'Compra',
    emphasis: 'solo lo que falta',
    text: 'Te avisamos antes de que algo venza y armamos tu lista de compras.',
    focusX: 0.3,
    tags: [
      { label: 'Zapallo amarillo · 3 u', pill: [150, 100], line: [210, 134, 92] },
      { label: 'Calabacín · 1 u', pill: [8, 170], line: [39, 204, 54] },
      { label: 'Tomate · 7 u', pill: [150, 262], line: [189, 296, 54] },
    ],
  },
];

type DialogState = {
  visible: boolean;
  title: string;
  titleEmphasis?: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  confirmText?: string;
  onConfirm: () => void;
};

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height: screenH } = useWindowDimensions();
  const { isAuthenticated, login, register, status, error } = useAuth();

  useEffect(() => {
    if (isAuthenticated) router.replace('/');
  }, [isAuthenticated]);

  const [screenView, setScreenView] = useState<'welcome' | 'form'>('welcome');
  const [page, setPage] = useState(0);
  const pagerRef = useRef<ScrollView>(null);
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [dialog, setDialog] = useState<DialogState>({ visible: false, title: '', message: '', onConfirm: () => {} });
  const closeDialog = () => setDialog((p) => ({ ...p, visible: false }));
  const nameRef = useRef<RNTextInput>(null);
  const nameAnim = useRef(new Animated.Value(1)).current;

  // Foto: 470 del lienzo de 390, sin pasar del 56 % del alto del teléfono.
  const photoH = Math.min(470 * (width / 390), screenH * 0.56);

  const goTo = (i: number) => {
    pagerRef.current?.scrollTo({ x: i * width, animated: true });
    setPage(i);
  };
  const onPagerEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));

  const openForm = (m: 'login' | 'register') => {
    setMode(m);
    nameAnim.setValue(m === 'register' ? 1 : 0);
    setScreenView('form');
  };

  const changeMode = (m: 'login' | 'register') => {
    if (m === mode) return;
    if (m === 'login') nameRef.current?.blur();
    setMode(m);
    Animated.timing(nameAnim, {
      toValue: m === 'register' ? 1 : 0,
      duration: 220,
      easing: Easing.bezier(0.2, 0, 0, 1),
      useNativeDriver: true,
    }).start();
  };

  const warn = (title: string, titleEmphasis: string, message: string) =>
    setDialog({ visible: true, title, titleEmphasis, message, type: 'warning', onConfirm: closeDialog });

  const handleSubmit = async () => {
    const mail = email.trim();
    if (mode === 'register' && name.trim().length < 2) return warn('Falta tu', 'nombre', 'Escribe tu nombre (al menos 2 letras).');
    if (!mail || !password) return warn('Faltan', 'datos', 'Escribe tu correo y tu contraseña para continuar.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return warn('Correo', 'no válido', 'Revisa tu correo (ejemplo: usuario@correo.com).');
    if (password.length < 6) return warn('Contraseña muy', 'corta', 'Usa al menos 6 caracteres.');

    try {
      if (mode === 'login') await login(mail, password);
      else await register(mail, password, name.trim());
      // Al quedar autenticado, el efecto de arriba lleva a Inicio.
    } catch (err: any) {
      setDialog({
        visible: true,
        title: mode === 'login' ? 'No pudimos' : 'No pudimos crear',
        titleEmphasis: mode === 'login' ? 'iniciar sesión' : 'tu cuenta',
        message: err?.message || 'Revisa tus datos e inténtalo de nuevo.',
        type: 'error',
        onConfirm: closeDialog,
      });
    }
  };

  const dialogEl = (
    <M3Dialog
      visible={dialog.visible}
      title={dialog.title}
      titleEmphasis={dialog.titleEmphasis}
      message={dialog.message}
      type={dialog.type}
      confirmText={dialog.confirmText}
      onConfirm={dialog.onConfirm}
    />
  );

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
              <PrimaryButton title="Crear cuenta" onPress={() => openForm('register')} style={styles.cta} />
              <SecondaryButton title="Ya tengo cuenta" variant="outline" onPress={() => openForm('login')} />
              <AppText variant="caption" weight="regular" color={colors.textSecondary} align="center" style={styles.legal}>
                {'Al continuar aceptas los '}
                <AppText
                  variant="caption"
                  weight="semibold"
                  color={colors.primary}
                  onPress={() => router.push({ pathname: '/legal', params: { tab: 'terms' } })}
                  accessibilityRole="link"
                >
                  Términos y condiciones
                </AppText>
                {' y la '}
                <AppText
                  variant="caption"
                  weight="semibold"
                  color={colors.primary}
                  onPress={() => router.push({ pathname: '/legal', params: { tab: 'privacy' } })}
                  accessibilityRole="link"
                >
                  Política de privacidad
                </AppText>
                .
              </AppText>
            </>
          ) : (
            <View style={styles.row}>
              <Pressable
                onPress={() => goTo(SLIDES.length - 1)}
                style={({ pressed }) => [styles.skip, pressed && styles.skipPressed]}
                accessibilityRole="button"
                accessibilityLabel="Saltar la bienvenida"
              >
                <AppText variant="body" weight="semibold">
                  Saltar
                </AppText>
              </Pressable>
              <PrimaryButton title="Siguiente" onPress={() => goTo(page + 1)} style={[styles.flex, styles.cta]} />
            </View>
          )}
        </View>
        {dialogEl}
      </View>
    );
  }

  // ── Formulario ──
  const register_ = mode === 'register';
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.form, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 12) + 20 }]}
      >
        <IconButton iconName="chevron-back" variant="white" accessibilityLabel="Volver a la bienvenida" onPress={() => setScreenView('welcome')} />
        <AppText weight="light" style={styles.formTitle} accessibilityRole="header">
          {register_ ? 'Crea tu ' : 'Inicia '}
          <AppText weight="semibold">{register_ ? 'cuenta' : 'sesión'}</AppText>
        </AppText>

        <SegmentedControl
          role="tab"
          rail="container"
          accessibilityLabel="Modo de acceso"
          value={mode}
          onChange={changeMode}
          options={[
            { value: 'login', label: 'Iniciar sesión' },
            { value: 'register', label: 'Crear cuenta' },
          ]}
        />

        {error ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Ionicons name="alert-circle-outline" size={18} color={colors.m3.onErrorContainer} />
            <AppText variant="metadata" weight="regular" color={colors.m3.onErrorContainer} style={styles.flex}>
              {error}
            </AppText>
          </View>
        ) : null}

        {register_ && (
          <Animated.View
            style={{ opacity: nameAnim, transform: [{ translateY: nameAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }}
          >
            <IconTextField
              ref={nameRef}
              label="Tu nombre"
              iconName="person-outline"
              value={name}
              onChangeText={setName}
              placeholder="Ej. Chef Carlos"
              maxLength={50}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </Animated.View>
        )}
        <IconTextField
          label="Correo electrónico"
          iconName="mail-outline"
          value={email}
          onChangeText={setEmail}
          placeholder="tu@correo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          maxLength={100}
          returnKeyType="next"
        />
        <IconTextField
          label="Contraseña"
          iconName="lock-closed-outline"
          secure
          value={password}
          onChangeText={setPassword}
          placeholder="Mínimo 6 caracteres"
          autoCapitalize="none"
          maxLength={128}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        <View style={styles.secure}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.functional.fresh.text} />
          <AppText variant="metadata" weight="regular" color={colors.functional.fresh.text}>
            Tus datos viajan cifrados y protegidos.
          </AppText>
        </View>

        <View style={styles.flex} />
        <PrimaryButton
          title={register_ ? 'Registrar cuenta' : 'Iniciar sesión'}
          onPress={handleSubmit}
          isLoading={status === 'loading'}
          style={styles.cta}
        />
      </ScrollView>
      {dialogEl}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  skip: {
    height: 56,
    paddingHorizontal: 22,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipPressed: {
    backgroundColor: colors.surfaceVariant,
  },
  cta: {
    minHeight: 56,
  },
  legal: {
    lineHeight: 18,
  },
  form: {
    flexGrow: 1,
    paddingHorizontal: 24,
    gap: 18,
  },
  formTitle: {
    fontSize: 32,
    lineHeight: 40,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.m3.errorContainer,
  },
  secure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

