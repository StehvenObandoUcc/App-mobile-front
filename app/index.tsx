import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInventory } from '../src/hooks/useInventory';
import { useRecipes } from '../src/hooks/useRecipes';
import { Recipe } from '../src/types';
import { getExpirationStatus } from '../src/components/IngredientCard';
import {
  AppScreen,
  RecipeCard,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  StaggerView,
  getBottomContentPadding,
} from '../src/components';
import { useAuth } from '../src/hooks/useAuth';
import { useShoppingList } from '../src/hooks/useShoppingList';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const expiringItems = items.filter((item) => {
    const s = getExpirationStatus(item.expirationDate);
    return s.status === 'expiringSoon' || s.status === 'expired';
  });
  const expiringCount = expiringItems.length;
  const availableRecipes = recipes.filter((r) => r.matchScore >= 75);
  const featuredRecipe = availableRecipes.length > 0 ? availableRecipes[0] : null;

  const displayName = user?.name
    ? user.name.toLowerCase().startsWith('chef')
      ? user.name
      : `Chef ${user.name.split(' ')[0]}`
    : 'Mi Cocina';

  return (
    <AppScreen
      scrollable
      style={styles.screen}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: Math.max(110, getBottomContentPadding(insets.bottom)) },
      ]}
    >
      {/* ── 1. Header Editorial ── */}
      <StaggerView index={0}>
        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.subtitle}>Aprovecha mejor tu despensa hoy</Text>
            <Text style={styles.title}>{displayName}</Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [
                styles.avatarButton,
                user && styles.avatarButtonActive,
                pressed && styles.cardPressed,
              ]}
              onPress={() => router.push('/login')}
              accessibilityRole="button"
              accessibilityLabel={user ? `Sesión de ${user.name}` : 'Iniciar sesión'}
            >
              <Ionicons name={user ? 'person' : 'person-outline'} size={20} color="#B94E35" />
              {user && <View style={styles.onlineDot} />}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.avatarButton,
                pressed && styles.cardPressed,
              ]}
              onPress={() => router.push('/inventory')}
              accessibilityRole="button"
              accessibilityLabel="Ver despensa"
            >
              <Ionicons name="basket-outline" size={20} color="#B94E35" />
              {ingredientCount > 0 && (
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeCountText}>{ingredientCount}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </StaggerView>

      {/* ── 2. Acción Principal: Escanear Alimentos (Hero Editorial Card) ── */}
      <StaggerView index={1}>
        <View style={styles.heroActionCard}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles" size={11} color="#863626" style={{ marginRight: 4 }} />
              <Text style={styles.heroBadgeText}>IA DE VISIÓN</Text>
            </View>
            <Text style={styles.heroActionTitle}>Escanea tus alimentos</Text>
            <Text style={styles.heroActionSubtitle}>
              Toma una foto para detectar ingredientes y actualizar tu despensa al instante.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.scanCircularButton,
              pressed && styles.scanCircularButtonPressed,
            ]}
            onPress={() => router.push('/scan')}
            accessibilityRole="button"
            accessibilityLabel="Escanear alimentos con la cámara"
          >
            <Ionicons name="camera" size={26} color="#FFFFFF" />
          </Pressable>
        </View>
      </StaggerView>

      {/* ── 3. Resumen de Despensa Táctil (3 Tarjetas Material You) ── */}
      <StaggerView index={2}>
        <View style={styles.pantryGrid}>
          <Pressable
            style={({ pressed }) => [
              styles.pantryCard,
              styles.pantryCardItems,
              pressed && styles.cardPressed,
            ]}
            onPress={() => router.push('/inventory')}
            accessibilityRole="button"
            accessibilityLabel={`Inventario con ${ingredientCount} alimentos`}
          >
            <View style={[styles.pantryIconBadge, { backgroundColor: '#FAD8C7' }]}>
              <Ionicons name="cube" size={18} color="#B94E35" />
            </View>
            <Text style={styles.pantryNum}>{ingredientCount}</Text>
            <Text style={styles.pantryLabel}>Alimentos</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.pantryCard,
              expiringCount > 0 ? styles.pantryCardAlert : styles.pantryCardExpiringNormal,
              pressed && styles.cardPressed,
            ]}
            onPress={() =>
              router.push({
                pathname: '/inventory',
                params: { filter: 'expiring' },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`${expiringCount} alimentos por vencer`}
          >
            <View
              style={[
                styles.pantryIconBadge,
                { backgroundColor: expiringCount > 0 ? '#FFE6A8' : '#EBDCD2' },
              ]}
            >
              <Ionicons
                name="time"
                size={18}
                color={expiringCount > 0 ? '#8A5A00' : '#66534A'}
              />
            </View>
            <Text style={[styles.pantryNum, expiringCount > 0 && { color: '#8A5A00' }]}>
              {expiringCount}
            </Text>
            <Text style={[styles.pantryLabel, expiringCount > 0 && { color: '#8A5A00' }]}>
              Por vencer
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.pantryCard,
              styles.pantryCardShopping,
              pressed && styles.cardPressed,
            ]}
            onPress={() => router.push('/shopping-list')}
            accessibilityRole="button"
            accessibilityLabel={`${pendingItems.length} compras pendientes`}
          >
            <View style={[styles.pantryIconBadge, { backgroundColor: '#FEDBB4' }]}>
              <Ionicons name="cart" size={18} color="#C46814" />
            </View>
            <Text style={[styles.pantryNum, { color: '#C46814' }]}>{pendingItems.length}</Text>
            <Text style={[styles.pantryLabel, { color: '#A04E08' }]}>Por comprar</Text>
          </Pressable>
        </View>
      </StaggerView>

      {/* ── 4. Sección Contextual: "Para hoy" ── */}
      <StaggerView index={3}>
        <View style={styles.contextualCard}>
          <View style={styles.contextualHeader}>
            <Text style={styles.contextualTag}>PARA HOY</Text>
            {featuredRecipe && (
              <View style={styles.matchPill}>
                <Ionicons name="sparkles" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.matchPillText}>{featuredRecipe.matchScore}% con tu despensa</Text>
              </View>
            )}
          </View>

          {featuredRecipe ? (
            <View>
              <Text style={styles.contextualTitle}>{featuredRecipe.title}</Text>
              <Text style={styles.contextualDesc} numberOfLines={2}>
                {featuredRecipe.description}
              </Text>

              <View style={styles.contextualFooter}>
                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={14} color="#66534A" style={{ marginRight: 4 }} />
                  <Text style={styles.metaText}>{featuredRecipe.prepTimeMinutes || 25} min</Text>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.contextualButton, pressed && styles.cardPressed]}
                  onPress={() =>
                    router.push({
                      pathname: '/recipe-detail',
                      params: { recipeId: featuredRecipe.id },
                    })
                  }
                >
                  <Text style={styles.contextualButtonText}>Ver receta</Text>
                  <Ionicons name="arrow-forward" size={15} color="#B94E35" style={{ marginLeft: 4 }} />
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.contextualEmpty}>
              <View style={styles.contextualEmptyHeader}>
                <View style={styles.contextualIconCircle}>
                  <Ionicons name="restaurant-outline" size={24} color="#B94E35" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.contextualEmptyTitle}>¿Qué cocinamos hoy?</Text>
                  <Text style={styles.contextualEmptyText}>
                    Agrega ingredientes a tu despensa para sugerirte la receta ideal para ti.
                  </Text>
                </View>
              </View>
              <View style={{ marginTop: 14 }}>
                <SecondaryButton
                  title="Ver despensa"
                  variant="outline"
                  iconName="basket-outline"
                  onPress={() => router.push('/inventory')}
                />
              </View>
            </View>
          )}
        </View>
      </StaggerView>

      {/* ── 5. Sección: "Aprovecha primero" (Productos por vencer) ── */}
      <StaggerView index={4}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Aprovecha primero</Text>
          {expiringCount > 0 && (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/inventory',
                  params: { filter: 'expiring' },
                })
              }
            >
              <Text style={styles.seeAllText}>Ver todos ({expiringCount})</Text>
            </Pressable>
          )}
        </View>

        {expiringCount > 0 ? (
          <View style={styles.expiringContainer}>
            {expiringItems.slice(0, 3).map((item) => {
              const expiry = getExpirationStatus(item.expirationDate);
              return (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [styles.expiringRow, pressed && styles.cardPressed]}
                  onPress={() =>
                    router.push({
                      pathname: '/inventory',
                      params: { filter: 'expiring' },
                    })
                  }
                  accessibilityRole="button"
                >
                  <View style={styles.expiringDot} />
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text style={styles.expiringName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.quantity !== null && (
                      <Text style={styles.expiringQty}>
                        {item.quantity} {item.unit}
                      </Text>
                    )}
                  </View>
                  <StatusBadge status={expiry.status} label={expiry.label} />
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.freshBanner}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#28613C" style={{ marginRight: 8 }} />
            <Text style={styles.freshBannerText}>
              Tu despensa está al día. No tienes productos próximos a vencer.
            </Text>
          </View>
        )}
      </StaggerView>

      {/* ── 6. Sección: "Ideas para cocinar" ── */}
      <StaggerView index={5}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ideas para cocinar</Text>
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
      </StaggerView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FFF9F2',
  },
  scrollContent: {
    paddingBottom: 90,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    color: '#66534A',
    fontWeight: '500',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2B211D',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EBDDD2',
    position: 'relative',
  },
  avatarButtonActive: {
    backgroundColor: '#FBE9E2',
    borderColor: '#F5D6C8',
  },
  onlineDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B94E35',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeCount: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#B94E35',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  heroActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FBE9E2',
    borderRadius: 28,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 8,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2EA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#863626',
    letterSpacing: 0.8,
  },
  heroActionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#863626',
    marginBottom: 4,
  },
  heroActionSubtitle: {
    fontSize: 13,
    color: '#66534A',
    lineHeight: 18,
  },
  scanCircularButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#B94E35',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B94E35',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  scanCircularButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.94 }],
  },
  pantryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 14,
  },
  pantryCard: {
    flex: 1,
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2B211D',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  pantryCardItems: {
    backgroundColor: '#FFF0E6',
  },
  pantryCardExpiringNormal: {
    backgroundColor: '#F5EBE1',
  },
  pantryCardAlert: {
    backgroundColor: '#FFF2D7',
  },
  pantryCardShopping: {
    backgroundColor: '#FFF1E0',
  },
  pantryIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pantryNum: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2B211D',
    letterSpacing: -1,
  },
  pantryLabel: {
    fontSize: 10,
    color: '#66534A',
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  contextualCard: {
    backgroundColor: '#FFF1E3',
    borderRadius: 28,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 14,
  },
  contextualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  contextualTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B26223',
    letterSpacing: 0.8,
  },
  matchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B94E35',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  matchPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  contextualTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2B211D',
    marginBottom: 4,
  },
  contextualDesc: {
    fontSize: 13,
    color: '#66534A',
    lineHeight: 18,
    marginBottom: 12,
  },
  contextualFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2D8C7',
  },
  contextualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBE9E2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  contextualButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B94E35',
  },
  contextualEmpty: {
    paddingVertical: 4,
  },
  contextualEmptyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contextualIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FBE9E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextualEmptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2B211D',
    marginBottom: 2,
  },
  contextualEmptyText: {
    fontSize: 12,
    color: '#66534A',
    lineHeight: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2B211D',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B94E35',
  },
  expiringContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  expiringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EBDDD2',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  expiringDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8A5A00',
  },
  expiringName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B211D',
  },
  expiringQty: {
    fontSize: 12,
    color: '#66534A',
    marginTop: 1,
  },
  freshBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF4ED',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#C2DFCB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
  },
  freshBannerText: {
    fontSize: 13,
    color: '#28613C',
    fontWeight: '600',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    color: '#66534A',
    fontWeight: '500',
  },
});
