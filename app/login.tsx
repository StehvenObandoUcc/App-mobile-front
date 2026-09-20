import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../src/hooks/useAuth';
import { AppScreen, PrimaryButton, SecondaryButton } from '../src/components';

export default function LoginScreen() {
  const router = useRouter();
  const { user, isAuthenticated, login, register, logout, status, error } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
    setMode('login');
  };

  if (isAuthenticated && user) {
    return (
      <AppScreen style={styles.screen}>
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Ionicons name="person" size={40} color="#10B981" />
          </View>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>

          <View style={styles.securityTag}>
            <Ionicons name="shield-checkmark" size={16} color="#059669" style={{ marginRight: 6 }} />
            <Text style={styles.securityTagText}>Sesión activa con Token JWT seguro</Text>
          </View>

          <View style={{ height: 28, width: '100%' }} />
          <Pressable
            onPress={async () => {
              await logout();
              setEmail('');
              setPassword('');
              setMode('login');
              Alert.alert('Sesión cerrada', 'Has cerrado tu sesión correctamente.');
            }}
            style={styles.logoutButton}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
          >
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
          </Pressable>

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
              <Ionicons name="restaurant" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>Food AI Assistant</Text>
            <Text style={styles.heroSubtitle}>
              Tu despensa inteligente y recetas personalizadas
            </Text>
          </View>

          {/* ── Selector de Modo (Login / Registro) ── */}
          <View style={styles.tabsContainer}>
            <Pressable
              onPress={() => setMode('login')}
              style={[styles.tabButton, mode === 'login' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabButtonText, mode === 'login' && styles.tabButtonTextActive]}>
                Iniciar Sesión
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('register')}
              style={[styles.tabButton, mode === 'register' && styles.tabButtonActive]}
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

            {mode === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tu Nombre</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Ej. Chef Carlos"
                    placeholderTextColor="#9CA3AF"
                    style={styles.textInput}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Correo Electrónico</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="tu@correo.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.textInput}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contraseña</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={styles.textInput}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#6B7280"
                  />
                </Pressable>
              </View>
            </View>

            {/* Aviso de seguridad amigable */}
            <View style={styles.cryptoNotice}>
              <Ionicons name="shield-checkmark" size={14} color="#059669" style={{ marginRight: 6 }} />
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
                <Ionicons name="information-circle-outline" size={16} color="#059669" style={{ marginRight: 6 }} />
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
  screen: { backgroundColor: '#F9FAFB' },
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
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#10B981',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabButtonTextActive: {
    color: '#111827',
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#B91C1C',
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
    color: '#374151',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    color: '#111827',
  },
  cryptoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  cryptoNoticeText: {
    fontSize: 11,
    color: '#065F46',
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
    color: '#059669',
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
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  securityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 14,
  },
  securityTagText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    shadowColor: '#DC2626',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
