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
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/hooks/useAuth';
import { AppScreen, PrimaryButton, SecondaryButton, M3Dialog, ProfileCard } from '../src/components';
import { colors, radii, spacing, typography, elevations } from '../src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isGuest, login, register, continueAsGuest, logout, status, error } = useAuth();

  // 'welcome' muestra el onboarding visual hero; 'form' muestra el formulario de login/registro
  const [screenView, setScreenView] = useState<'welcome' | 'form'>('welcome');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'name' | 'email' | 'password' | null>(null);
  const [tabsWidth, setTabsWidth] = useState(0);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

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

  useEffect(() => {
    return () => {
      indicatorAnim.stopAnimation();
      formAnim.stopAnimation();
    };
  }, [indicatorAnim, formAnim]);

  const handleModeChange = (newMode: 'login' | 'register') => {
    if (newMode === mode) return;
    if (newMode === 'login') {
      nameInputRef.current?.blur();
    }
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
  };

  const handleContinueAsGuest = async () => {
    try {
      await continueAsGuest();
      router.replace('/');
    } catch (err: any) {
      setDialogConfig({
        visible: true,
        title: 'Error de modo local',
        message: err?.message || 'No se pudo iniciar el modo invitado.',
        type: 'error',
        onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
      });
    }
  };

  const handleQuickDemoLogin = async () => {
    try {
      await login('demo@foodai.com', '123456');
      setDialogConfig({
        visible: true,
        title: '¡Bienvenido Chef Demo!',
        message: 'Has iniciado sesión con la cuenta de prueba oficial.',
        type: 'success',
        onConfirm: () => {
          setDialogConfig((prev) => ({ ...prev, visible: false }));
          router.replace('/');
        },
      });
    } catch (err: any) {
      setDialogConfig({
        visible: true,
        title: 'Error de conexión',
        message: err?.message || 'No se pudo iniciar sesión demo.',
        type: 'error',
        onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
      });
    }
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

  useEffect(() => {
    if (user?.id) {
      AsyncStorage.getItem(`@food_ai_avatar_${user.id}`).then((saved) => {
        if (saved) setAvatarUri(saved);
      }).catch(() => {});
    } else {
      setAvatarUri(null);
    }
  }, [user?.id]);

  const handlePickAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permiso necesario',
          'Se requiere acceso a tus fotos para personalizar tu foto de perfil.',
          [{ text: 'Entendido' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]?.base64 && user?.id) {
        const mime = result.assets[0].mimeType || 'image/jpeg';
        const dataUri = `data:${mime};base64,${result.assets[0].base64}`;
        setAvatarUri(dataUri);
        await AsyncStorage.setItem(`@food_ai_avatar_${user.id}`, dataUri);
      }
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo seleccionar la foto: ' + (err?.message || 'Error desconocido'));
    }
  };

  const handleRemoveAvatar = () => {
    if (!user?.id) return;
    Alert.alert(
      'Eliminar foto',
      '¿Deseas quitar tu foto de perfil actual?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setAvatarUri(null);
            await AsyncStorage.removeItem(`@food_ai_avatar_${user.id}`);
          },
        },
      ]
    );
  };

  // ─── Estado 1: Usuario ya autenticado ───────────────────────────────────────
  if (isAuthenticated && user) {
    if (isGuest) {
      return (
        <AppScreen style={styles.screen}>
          <ScrollView contentContainerStyle={styles.profileScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.guestCard}>
              <View style={styles.guestIconBadge}>
                <Ionicons name="person-circle-outline" size={64} color={colors.primary} />
              </View>
              <Text style={styles.guestTitle}>Modo Invitado Activo</Text>
              <Text style={styles.guestSubtitle}>
                Estás usando la app de manera local. Tus recetas y alimentos se guardan de forma privada en la memoria de este dispositivo.
              </Text>
              <View style={styles.guestPill}>
                <Ionicons name="cloud-offline-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={styles.guestPillText}>Almacenamiento Local (Sin Nube)</Text>
              </View>

              <View style={{ width: '100%', marginTop: spacing.xl, gap: spacing.md }}>
                <PrimaryButton
                  title="Crear cuenta para sincronizar"
                  iconName="cloud-upload-outline"
                  onPress={async () => {
                    await logout();
                    setScreenView('form');
                    setMode('register');
                  }}
                />
                <SecondaryButton
                  title="Iniciar sesión existente"
                  iconName="log-in-outline"
                  variant="outline"
                  onPress={async () => {
                    await logout();
                    setScreenView('form');
                    setMode('login');
                  }}
                />
                <Pressable
                  onPress={() => router.replace('/')}
                  style={({ pressed }) => [styles.guestReturnBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.guestReturnText}>Volver a mi cocina</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </AppScreen>
      );
    }

    return (
      <AppScreen style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.profileScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ProfileCard
            user={user}
            avatarUri={avatarUri}
            onPickAvatar={handlePickAvatar}
            onRemoveAvatar={handleRemoveAvatar}
            onReturnToKitchen={() => router.replace('/')}
            onRequestLogout={() => setIsLogoutConfirmOpen(true)}
          />
        </ScrollView>

        <M3Dialog
          visible={isLogoutConfirmOpen}
          title="¿Cerrar sesión?"
          message="¿Estás seguro de que deseas salir de tu cuenta? Tus datos locales se conservarán en este dispositivo."
          type="warning"
          iconName="log-out-outline"
          confirmText="Cerrar sesión"
          cancelText="Cancelar"
          onCancel={() => setIsLogoutConfirmOpen(false)}
          onConfirm={async () => {
            setIsLogoutConfirmOpen(false);
            await logout();
            setScreenView('welcome');
          }}
        />
      </AppScreen>
    );
  }

  // ─── Estado 2: Pantalla de Bienvenida / Onboarding (Matching Reference) ────
  if (screenView === 'welcome') {
    return (
      <AppScreen style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.welcomeScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Branding */}
          <View style={styles.welcomeHero}>
            <View style={styles.brandIconCircle}>
              <Ionicons name="restaurant" size={38} color={colors.primary} />
            </View>
            <Text style={styles.brandTitle}>Food AI</Text>
            <Text style={styles.brandTagline}>Tu cocina inteligente. Hecha para ti.</Text>
            <Text style={styles.brandDescription}>
              Aprovecha al máximo cada ingrediente, reduce el desperdicio y crea recetas deliciosas al instante con Inteligencia Artificial.
            </Text>
          </View>

          {/* Tarjetas de Beneficios */}
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <View style={[styles.featureIconBox, { backgroundColor: colors.primaryContainer }]}>
                <Ionicons name="camera" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>Escaneo visual con IA</Text>
                <Text style={styles.featureDesc}>Identifica ingredientes de tu nevera con una sola fotografía.</Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="sparkles" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>Recetas personalizadas</Text>
                <Text style={styles.featureDesc}>Genera sugerencias deliciosas basadas en lo que tienes.</Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIconBox, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="cart" size={20} color="#15803D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>Lista de compras conectada</Text>
                <Text style={styles.featureDesc}>Agrega faltantes y sincroniza tus compras con tu despensa.</Text>
              </View>
            </View>
          </View>

          {/* Botones de Entrada Principal */}
          <View style={styles.welcomeActions}>
            <PrimaryButton
              title="Iniciar sesión o Registrarse"
              iconName="log-in-outline"
              onPress={() => setScreenView('form')}
            />

            <SecondaryButton
              title="Continuar como invitado (Modo Local)"
              iconName="person-outline"
              variant="outline"
              onPress={handleContinueAsGuest}
            />

            <Pressable
              style={({ pressed }) => [styles.demoButton, pressed && { opacity: 0.8 }]}
              onPress={handleQuickDemoLogin}
              accessibilityRole="button"
              accessibilityLabel="Entrar como Chef Demo"
            >
              <Ionicons name="flash-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.demoButtonText}>Acceso rápido con Chef Demo (1 toque)</Text>
            </Pressable>

            {/* Aviso Legal Referencia */}
            <Text style={styles.legalDisclaimer}>
              Al continuar, estás indicando que has leído y aceptas nuestros{' '}
              <Text style={styles.legalLink}>Términos</Text> y{' '}
              <Text style={styles.legalLink}>Política de privacidad</Text>.
            </Text>
          </View>
        </ScrollView>

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

  // ─── Estado 3: Formulario de Autenticación (Login / Registro) ──────────────
  return (
    <AppScreen style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Navegación Superior Retorno a Bienvenida */}
          <View style={styles.formTopNav}>
            <Pressable
              onPress={() => setScreenView('welcome')}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Volver al menú de bienvenida"
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.formNavTitle}>
              {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Selector de Modo (Login / Registro) con Píldora Animada */}
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

          {/* Formulario */}
          <View style={styles.formCard}>
            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={colors.error.text} style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Campo "Tu Nombre" en modo Registro */}
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

            <View style={{ height: spacing.lg }} />
            <Pressable
              onPress={handleContinueAsGuest}
              style={({ pressed }) => [styles.guestButton, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Explorar sin cuenta"
            >
              <Ionicons name="arrow-forward-outline" size={18} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.guestButtonText}>Continuar como invitado (Modo Local)</Text>
            </Pressable>
          </View>
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
  welcomeScrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.section,
    alignItems: 'center',
  },
  welcomeHero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  brandIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...elevations.sm,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
    textAlign: 'center',
  },
  brandDescription: {
    fontSize: typography.sizes.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
    maxWidth: 320,
  },
  featuresList: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radii.containers,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
    marginBottom: spacing.xl,
    ...elevations.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.buttons,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: typography.sizes.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  featureDesc: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  welcomeActions: {
    width: '100%',
    gap: spacing.md,
    alignItems: 'center',
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.circular,
    backgroundColor: colors.surfaceVariant,
    marginTop: spacing.xs,
  },
  demoButtonText: {
    fontSize: typography.sizes.bodySmall,
    color: colors.primary,
    fontWeight: '700',
  },
  legalDisclaimer: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 16,
    paddingHorizontal: spacing.lg,
  },
  legalLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  formTopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formNavTitle: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.section,
  },
  profileScrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.section,
  },
  guestCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.containers,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    alignItems: 'center',
    ...elevations.md,
  },
  guestIconBadge: {
    marginBottom: spacing.md,
  },
  guestTitle: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: typography.sizes.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  guestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.circular,
    marginTop: spacing.md,
  },
  guestPillText: {
    fontSize: typography.sizes.label,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  guestReturnBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  guestReturnText: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceVariant,
    borderRadius: radii.buttons,
    padding: 4,
    marginBottom: spacing.xl,
    position: 'relative',
    height: 48,
    alignItems: 'center',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    backgroundColor: colors.surface,
    borderRadius: radii.buttons - 2,
    ...elevations.sm,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 1,
  },
  tabButtonText: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.textPrimary,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.containers,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    ...elevations.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error.background,
    borderRadius: radii.buttons,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.error.text,
    fontSize: typography.sizes.bodySmall,
    flex: 1,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.buttons,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: typography.sizes.body,
    color: colors.textPrimary,
    height: '100%',
  },
  cryptoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  cryptoNoticeText: {
    fontSize: typography.sizes.label,
    color: colors.textSecondary,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  guestButtonText: {
    fontSize: typography.sizes.bodySmall,
    color: colors.primary,
    fontWeight: '700',
  },
});
