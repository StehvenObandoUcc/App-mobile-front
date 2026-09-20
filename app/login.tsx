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
  Platform,
  UIManager,
  LayoutAnimation,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../src/hooks/useAuth';
import { AppScreen, PrimaryButton, SecondaryButton } from '../src/components';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function LoginScreen() {
  const router = useRouter();
  const { user, isAuthenticated, login, register, logout, status, error } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tabsWidth, setTabsWidth] = useState(0);

  const nameInputRef = useRef<TextInput>(null);
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const logoutScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      indicatorAnim.stopAnimation();
      formAnim.stopAnimation();
      logoutScale.stopAnimation();
    };
  }, [indicatorAnim, formAnim, logoutScale]);

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
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Campos incompletos', 'Por favor ingresa tu correo y contraseña.');
      return;
    }

    try {
      if (mode === 'login') {
        await login(email, password);
        Alert.alert('¡Bienvenido!', 'Sesión iniciada correctamente.');
        router.replace('/');
      } else {
        await register(email, password, name);
        Alert.alert('¡Cuenta creada!', 'Tu cuenta ha sido registrada con éxito.');
        router.replace('/');
      }
    } catch (err: any) {
      // El hook useAuth ya maneja el estado de error
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
            <Ionicons name="person" size={40} color="#B94E35" />
          </View>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>

          <View style={styles.securityTag}>
            <Ionicons name="shield-checkmark" size={16} color="#66534A" style={{ marginRight: 6 }} />
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
                Alert.alert('Sesión cerrada', 'Has cerrado tu sesión correctamente.');
              }}
              style={styles.logoutButton}
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
            >
              <Ionicons name="log-out-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
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
              <Ionicons name="restaurant" size={30} color="#B94E35" />
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

          {/* ── Formulario ── */}
          <View style={styles.formCard}>
            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 6 }} />
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
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#66534A" style={styles.inputIcon} />
                <TextInput
                  ref={nameInputRef}
                  value={name}
                  onChangeText={setName}
                  placeholder="Ej. Chef Carlos"
                  placeholderTextColor="#96857C"
                  style={styles.textInput}
                  autoFocus={false}
                  editable={mode === 'register'}
                />
              </View>
            </Animated.View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Correo Electrónico</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#66534A" style={styles.inputIcon} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="tu@correo.com"
                  placeholderTextColor="#96857C"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.textInput}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contraseña</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#66534A" style={styles.inputIcon} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#96857C"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={styles.textInput}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#66534A"
                  />
                </Pressable>
              </View>
            </View>

            {/* Aviso de seguridad amigable */}
            <View style={styles.cryptoNotice}>
              <Ionicons name="shield-checkmark" size={14} color="#66534A" style={{ marginRight: 6 }} />
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

            {/* Acceso Rápido Cuenta Demo */}
            {mode === 'login' && (
              <Pressable onPress={handleFillDemo} style={styles.demoButton}>
                <Ionicons name="sparkles" size={15} color="#B94E35" style={{ marginRight: 6 }} />
                <Text style={styles.demoButtonText}>
                  Usar credenciales de prueba (<Text style={{ fontWeight: '700' }}>demo@foodai.com</Text>)
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#FFF9F2' },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FBE9E2',
    borderWidth: 1.5,
    borderColor: '#F5D6C8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#2B211D',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2B211D',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#66534A',
    marginTop: 4,
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8EDE2',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#2B211D',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    zIndex: 1,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#66534A',
  },
  tabButtonTextActive: {
    color: '#B94E35',
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EBDDD2',
    shadowColor: '#2B211D',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBE5E3',
    borderWidth: 1,
    borderColor: '#F4BCB8',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#A93632',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2B211D',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9F2',
    borderWidth: 1,
    borderColor: '#EBDDD2',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#2B211D',
  },
  cryptoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8EDE2',
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  cryptoNoticeText: {
    fontSize: 11,
    color: '#66534A',
    flex: 1,
    lineHeight: 16,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: 8,
  },
  demoButtonText: {
    fontSize: 13,
    color: '#B94E35',
  },
  profileCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  avatarLarge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FBE9E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#B94E35',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2B211D',
  },
  profileEmail: {
    fontSize: 14,
    color: '#66534A',
    marginTop: 4,
  },
  securityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8EDE2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 14,
  },
  securityTagText: {
    fontSize: 12,
    color: '#66534A',
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B94E35',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    shadowColor: '#2B211D',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
