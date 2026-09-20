import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useInventory } from '../src/hooks/useInventory';
import { useRecipes } from '../src/hooks/useRecipes';
import { Recipe } from '../src/types';
import { getExpirationStatus } from '../src/components/IngredientCard';
import { AppScreen, RecipeCard, PrimaryButton } from '../src/components';
import { useAuth } from '../src/hooks/useAuth';
import { useShoppingList } from '../src/hooks/useShoppingList';

export default function HomeScreen() {
  const router = useRouter();
  const { items } = useInventory();
  const { recipes, toggleSave, deleteRecipe } = useRecipes();
  const { pendingItems } = useShoppingList();
  const { user } = useAuth();

  const handleLongPressRecipe = (recipe: Recipe) => {
    Alert.alert(
      'Descartar sugerencia',
      `¿Deseas descartar la receta "${recipe.title}" de tus sugerencias?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: async () => {
            await deleteRecipe(recipe.id);
          },
        },
      ]
    );
  };

  // Estadísticas reales calculadas reactivamente
  const ingredientCount = items.length;
  const expiringCount = items.filter((item) => {
    const s = getExpirationStatus(item.expirationDate);
    return s.status === 'expiringSoon' || s.status === 'expired';
  }).length;
  const availableRecipes = recipes.filter((r) => r.matchScore >= 75);

  return (
    <AppScreen scrollable style={styles.screen}>
      {/* ── Header Estilo Delivery App ── */}
      <View style={styles.header}>
        <View>
          <View style={styles.locationRow}>
            <Ionicons name="sparkles" size={15} color="#10B981" style={{ marginRight: 4 }} />
            <Text style={styles.locationText}>
              {user ? `Chef ${user.name}` : 'Mi Cocina Inteligente'}
            </Text>
          </View>
          <Text style={styles.welcomeText}>Food AI Assistant</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Pressable
            style={[styles.avatarButton, user && styles.avatarButtonLoggedIn]}
            onPress={() => router.push('/login')}
            accessibilityRole="button"
            accessibilityLabel={user ? `Sesión de ${user.name}` : 'Iniciar sesión'}
          >
            <Ionicons name={user ? 'person' : 'person-outline'} size={20} color="#10B981" />
            {user && (
              <View style={styles.onlineDot} />
            )}
          </Pressable>

          <Pressable
            style={styles.avatarButton}
            onPress={() => router.push('/inventory')}
            accessibilityRole="button"
            accessibilityLabel="Ver perfil e inventario"
          >
            <Ionicons name="basket" size={20} color="#10B981" />
            {ingredientCount > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{ingredientCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* ── Banner Principal Hero (Estilo "Special Offers" de Foodu) ── */}
      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <View style={styles.bannerTag}>
              <Text style={styles.bannerTagText}>VISIÓN ARTIFICIAL</Text>
            </View>
            <Text style={styles.bannerTitle}>¿Qué tienes en tu nevera hoy?</Text>
            <Text style={styles.bannerSubtitle}>
              Toma una foto y la IA identificará automáticamente tus ingredientes.
            </Text>
            <Pressable
              style={styles.bannerCta}
              onPress={() => router.push('/scan')}
              accessibilityRole="button"
              accessibilityLabel="Escanear alimentos con la cámara"
            >
              <Ionicons name="camera" size={18} color="#059669" style={{ marginRight: 6 }} />
              <Text style={styles.bannerCtaText}>Escanear ahora</Text>
            </Pressable>
          </View>

          <View style={styles.bannerGraphic}>
            <Ionicons name="restaurant" size={54} color="rgba(255,255,255,0.85)" />
          </View>
        </LinearGradient>
      </View>

      {/* ── Estadísticas Rápidas de la Despensa ── */}
      <View style={styles.statsRow}>
        <Pressable
          style={styles.statCard}
          onPress={() =>
            router.push({
              pathname: '/inventory',
              params: { filter: 'all' },
            })
          }
          accessibilityRole="button"
        >
          <Text style={styles.statNum}>{ingredientCount}</Text>
          <Text style={styles.statLabel}>En Inventario</Text>
        </Pressable>

        <Pressable
          style={[styles.statCard, { backgroundColor: '#FFFBEB', borderColor: '#FEF3C7' }]}
          onPress={() =>
            router.push({
              pathname: '/inventory',
              params: { filter: 'expiring' },
            })
          }
          accessibilityRole="button"
        >
          <Text style={[styles.statNum, { color: '#D97706' }]}>{expiringCount}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Ionicons name="time-outline" size={12} color="#B45309" style={{ marginRight: 3 }} />
            <Text style={[styles.statLabel, { color: '#B45309', marginTop: 0 }]}>Por vencer</Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.statCard, { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' }]}
          onPress={() => router.push('/recipes')}
          accessibilityRole="button"
        >
          <Text style={[styles.statNum, { color: '#059669' }]}>{recipes.length}</Text>
          <Text style={[styles.statLabel, { color: '#065F46' }]}>Recetas posibles</Text>
        </Pressable>
      </View>

      {/* ── Acciones Rápidas (Icon Grid estilo Delivery) ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
      </View>
      <View style={styles.quickGrid}>
        <Pressable
          style={styles.quickAction}
          onPress={() => router.push('/scan')}
          accessibilityRole="button"
        >
          <View style={[styles.quickIconCircle, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="camera-outline" size={24} color="#10B981" />
          </View>
          <Text style={styles.quickActionText}>Escanear</Text>
        </Pressable>

        <Pressable
          style={styles.quickAction}
          onPress={() => router.push('/inventory')}
          accessibilityRole="button"
        >
          <View style={[styles.quickIconCircle, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="basket-outline" size={24} color="#2563EB" />
          </View>
          <Text style={styles.quickActionText}>Inventario</Text>
        </Pressable>

        <Pressable
          style={styles.quickAction}
          onPress={() => router.push('/recipes')}
          accessibilityRole="button"
          accessibilityLabel="Abrir recetas y generador con Inteligencia Artificial"
        >
          <View style={[styles.quickIconCircle, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="sparkles" size={22} color="#10B981" />
          </View>
          <Text style={styles.quickActionText}>Chef IA</Text>
        </Pressable>

        <Pressable
          style={styles.quickAction}
          onPress={() => router.push('/shopping-list')}
          accessibilityRole="button"
          accessibilityLabel="Abrir lista de compras"
        >
          <View style={[styles.quickIconCircle, { backgroundColor: '#FFFBEB', position: 'relative' }]}>
            <Ionicons name="cart-outline" size={24} color="#D97706" />
            {pendingItems.length > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{pendingItems.length}</Text>
              </View>
            )}
          </View>
          <Text style={styles.quickActionText}>Compras</Text>
        </Pressable>
      </View>

      {/* ── Recetas Recomendadas para Hoy ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recetas Sugeridas para ti</Text>
        <Pressable onPress={() => router.push('/recipes')}>
          <Text style={styles.seeAllText}>Ver todas ({recipes.length})</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        {availableRecipes.slice(0, 2).map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onPress={() =>
              router.push({
                pathname: '/recipe-detail',
                params: { recipeId: recipe.id },
              })
            }
            onSave={() => toggleSave(recipe.id)}
            onLongPress={() => handleLongPressRecipe(recipe)}
          />
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  avatarButtonLoggedIn: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  onlineDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#10B981',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  bannerContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  banner: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  bannerTag: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  bannerTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 6,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
    marginBottom: 16,
  },
  bannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  bannerCtaText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '700',
  },
  bannerGraphic: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  quickGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    width: '22%',
  },
  quickIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
});
