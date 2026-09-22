import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
  Animated,
  LayoutAnimation,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/hooks/useAuth';
import { AppScreen, PrimaryButton, SecondaryButton, M3Dialog } from '../src/components';
import { colors, radii, spacing, typography, elevations } from '../src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { user, isAuthenticated, login, register, logout, status, error } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'name' | 'email' | 'password' | null>(null);
  const [tabsWidth, setTabsWidth] = useState(0);

  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'info' | 'warning' | 'error';
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {},
  });

  const nameInputRef = useRef<TextInput>(null);
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const demoAnim = useRef(new Animated.Value(1)).current;
  const formPulseAnim = useRef(new Animated.Value(1)).current;
  const logoutScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      indicatorAnim.stopAnimation();
      formAnim.stopAnimation();
      demoAnim.stopAnimation();
      formPulseAnim.stopAnimation();
      logoutScale.stopAnimation();
    };
  }, [indicatorAnim, formAnim, demoAnim, formPulseAnim, logoutScale]);

  const handleModeChange = (newMode: 'login' | 'register') => {
    if (newMode === mode) return;
    if (newMode === 'login') {
      nameInputRef.current?.blur();
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMode(newMode);

    indicatorAnim.stopAnimation();
    Animated.spring(indicatorAnim, {
      toValue: newMode === 'login' ? 0 : 1,
      friction: 8,
      tension: 70,
      useNativeDriver: true,
    }).start();

    formAnim.stopAnimation();
    Animated.timing(formAnim, {
      toValue: newMode === 'login' ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();

    demoAnim.stopAnimation();
    Animated.timing(demoAnim, {
      toValue: newMode === 'login' ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    formPulseAnim.setValue(0.98);
    Animated.spring(formPulseAnim, {
      toValue: 1,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handleSubmit = async () => {
    const emailTrimmed = email.trim();
    if (!emailTrimmed || !password) {
      setDialogConfig({
        visible: true,
        title: 'Campos incompletos',
        message: 'Por favor ingresa tu correo electrónico y contraseña para continuar.',
        type: 'warning',
        onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setDialogConfig({
        visible: true,
        title: 'Correo inválido',
        message: 'Por favor introduce un correo electrónico válido (ejemplo: usuario@correo.com).',
        type: 'warning',
        onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    if (password.length < 6) {
      setDialogConfig({
        visible: true,
        title: 'Contraseña muy corta',
        message: 'La contraseña debe tener al menos 6 caracteres por seguridad.',
        type: 'warning',
        onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    if (mode === 'register' && name.trim().length < 2) {
      setDialogConfig({
        visible: true,
        title: 'Nombre requerido',
        message: 'Por favor ingresa tu nombre (al menos 2 caracteres).',
        type: 'warning',
        onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    try {
      if (mode === 'login') {
        await login(emailTrimmed, password);
        setDialogConfig({
          visible: true,
          title: '¡Bienvenido!',
          message: 'Sesión iniciada correctamente. Todo listo en tu cocina.',
          type: 'success',
          onConfirm: () => {
            setDialogConfig((prev) => ({ ...prev, visible: false }));
            router.replace('/');
          },
        });
      } else {
        await register(emailTrimmed, password, name.trim());
        setDialogConfig({
          visible: true,
          title: '¡Cuenta creada!',
          message: 'Tu cuenta ha sido registrada con éxito. ¡Bienvenido a Food AI!',
          type: 'success',
          onConfirm: () => {
            setDialogConfig((prev) => ({ ...prev, visible: false }));
            router.replace('/');
          },
        });
      }
    } catch (err: any) {
      setDialogConfig({
        visible: true,
        title: 'No se pudo iniciar sesión',
        message: err?.message || 'Verifica tus credenciales e intenta nuevamente.',
        type: 'error',
        onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
      });
    }
  };

  const handleFillDemo = () => {
    setEmail('demo@foodai.com');
    setPassword('123456');
    handleModeChange('login');
  };

  if (isAuthenticated && user) {
    return (
      <AppScreen style={styles.screen}>
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Ionicons name="person" size={40} color={colors.primary} />
          </View>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>

          <View style={styles.securityTag}>
            <Ionicons name="shield-checkmark" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.securityTagText}>Sesión activa con token seguro</Text>
          </View>

          <View style={{ height: 28, width: '100%' }} />
          <Animated.View style={{ transform: [{ scale: logoutScale }], width: '100%' }}>
            <Pressable
              onPressIn={() => {
                Animated.spring(logoutScale, {
                  toValue: 0.96,
                  useNativeDriver: true,
                }).start();
              }}
              onPressOut={() => {
                Animated.spring(logoutScale, {
                  toValue: 1.0,
                  friction: 4,
                  tension: 80,
                  useNativeDriver: true,
                }).start();
              }}
              onPress={async () => {
                await logout();
                setEmail('');
                setPassword('');
                handleModeChange('login');
                setDialogConfig({
                  visible: true,
                  title: 'Sesión cerrada',
                  message: 'Has cerrado tu sesión correctamente.',
                  type: 'info',
                  onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
                });
              }}
              style={styles.logoutButton}
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
            >
              <Ionicons name="log-out-outline" size={20} color={colors.surface} style={{ marginRight: spacing.sm }} />
              <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
            </Pressable>
          </Animated.View>

          <View style={{ height: 12 }} />
          <SecondaryButton
            title="Volver a mi cocina"
            variant="outline"
            iconName="restaurant-outline"
            onPress={() => router.replace('/')}
          />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen style={styles.screen}>
      <KeyboardAvoidingView
        behavior="height"
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Cabecera Hero ── */}
          <View style={styles.heroSection}>
            <View style={styles.iconCircle}>
              <Ionicons name="restaurant" size={30} color={colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Food AI Assistant</Text>
            <Text style={styles.heroSubtitle}>
              Tu despensa inteligente y recetas personalizadas
            </Text>
          </View>

          {/* ── Selector de Modo (Login / Registro) con Píldora Animada ── */}
          <View
            style={styles.tabsContainer}
            onLayout={(e) => setTabsWidth(e.nativeEvent.layout.width)}
          >
            {tabsWidth > 0 && (
              <Animated.View
                style={[
                  styles.tabIndicator,
                  {
                    width: (tabsWidth - 8) / 2,
                    transform: [
                      {
                        translateX: indicatorAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, (tabsWidth - 8) / 2],
                        }),
                      },
                    ],
                  },
                ]}
              />
            )}
            <Pressable
              onPress={() => handleModeChange('login')}
              style={styles.tabButton}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'login' }}
              accessibilityLabel="Iniciar Sesión"
            >
              <Text style={[styles.tabButtonText, mode === 'login' && styles.tabButtonTextActive]}>
                Iniciar Sesión
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleModeChange('register')}
              style={styles.tabButton}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'register' }}
              accessibilityLabel="Crear Cuenta"
            >
              <Text style={[styles.tabButtonText, mode === 'register' && styles.tabButtonTextActive]}>
                Crear Cuenta
              </Text>
            </Pressable>
          </View>

          {/* ── Formulario con pulso coreografiado ── */}
          <Animated.View style={[styles.formCard, { transform: [{ scale: formPulseAnim }] }]}>
            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={colors.error.text} style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Campo "Tu Nombre" con control estricto de foco, accesibilidad y animación */}
            <Animated.View
              style={[
                styles.inputGroup,
                {
                  height: mode === 'register' ? undefined : 0,
                  overflow: 'hidden',
                  opacity: formAnim,
                  transform: [
                    {
                      translateY: formAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-8, 0],
                      }),
                    },
                  ],
                },
              ]}
              pointerEvents={mode === 'register' ? 'auto' : 'none'}
              importantForAccessibility={mode === 'register' ? 'auto' : 'no-hide-descendants'}
              accessibilityElementsHidden={mode !== 'register'}
              aria-hidden={mode !== 'register'}
            >
              <Text style={styles.inputLabel}>Tu Nombre</Text>
              <View style={[styles.inputWrapper, focusedField === 'name' && styles.inputWrapperFocused]}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={focusedField === 'name' ? colors.primary : colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={nameInputRef}
                  value={name}
                  onChangeText={setName}
                  placeholder="Ej. Chef Carlos"
                  placeholderTextColor={colors.textMuted}
                  maxLength={50}
                  style={styles.textInput}
                  autoFocus={false}
                  editable={mode === 'register'}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </Animated.View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Correo Electrónico</Text>
              <View style={[styles.inputWrapper, focusedField === 'email' && styles.inputWrapperFocused]}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={focusedField === 'email' ? colors.primary : colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="tu@correo.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  maxLength={100}
                  style={styles.textInput}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contraseña</Text>
              <View style={[styles.inputWrapper, focusedField === 'password' && styles.inputWrapperFocused]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={focusedField === 'password' ? colors.primary : colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  maxLength={128}
                  style={styles.textInput}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={focusedField === 'password' ? colors.primary : colors.textSecondary}
                  />
                </Pressable>
              </View>
            </View>

            {/* Aviso de seguridad amigable */}
            <View style={styles.cryptoNotice}>
              <Ionicons name="shield-checkmark" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.cryptoNoticeText}>
                Tus datos viajan cifrados y protegidos.
              </Text>
            </View>

            <View style={{ height: 16 }} />

            <PrimaryButton
              title={mode === 'login' ? 'Iniciar Sesión' : 'Registrar Cuenta'}
              onPress={handleSubmit}
              isLoading={status === 'loading'}
              iconName={mode === 'login' ? 'log-in-outline' : 'person-add-outline'}
            />

            {/* Acceso Rápido Cuenta Demo con transición animada suave */}
            <Animated.View
              style={{
                height: mode === 'login' ? undefined : 0,
                overflow: 'hidden',
                opacity: demoAnim,
                transform: [
                  {
                    translateY: demoAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                ],
              }}
              pointerEvents={mode === 'login' ? 'auto' : 'none'}
            >
              <Pressable onPress={handleFillDemo} style={styles.demoButton}>
                <Ionicons name="sparkles" size={15} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.demoButtonText}>
                  Usar credenciales de prueba (<Text style={{ fontWeight: '700' }}>demo@foodai.com</Text>)
                </Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <M3Dialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        onConfirm={dialogConfig.onConfirm}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.section,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radii.floatingNav,
    backgroundColor: colors.primaryContainer,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  heroTitle: {
    fontSize: typography.sizes.headline,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: typography.sizes.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceVariant,
    borderRadius: radii.cards,
    padding: spacing.xs,
    marginBottom: spacing.xl,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    backgroundColor: colors.surface,
    borderRadius: radii.chips,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.chips,
    zIndex: 1,
  },
  tabButtonText: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.containers,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevations.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    borderRadius: radii.buttons,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.error.text,
    fontSize: typography.sizes.metadata,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.sizes.metadata,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.buttons,
    paddingHorizontal: 14,
    height: 50,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: typography.sizes.body,
    color: colors.textPrimary,
  },
  cryptoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    padding: 10,
    borderRadius: radii.chips,
    marginTop: spacing.xs,
  },
  cryptoNoticeText: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: spacing.sm,
  },
  demoButtonText: {
    fontSize: typography.sizes.metadata,
    color: colors.primary,
  },
  profileCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  avatarLarge: {
    width: 84,
    height: 84,
    borderRadius: radii.circular,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  profileName: {
    fontSize: typography.sizes.headline,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  profileEmail: {
    fontSize: typography.sizes.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  securityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.circular,
    marginTop: 14,
  },
  securityTagText: {
    fontSize: typography.sizes.label,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.buttons,
    paddingVertical: 14,
    paddingHorizontal: spacing.xxl,
    width: '100%',
    ...elevations.md,
  },
  logoutButtonText: {
    color: colors.textInverse,
    fontSize: typography.sizes.body,
    fontWeight: '700',
  },
});
