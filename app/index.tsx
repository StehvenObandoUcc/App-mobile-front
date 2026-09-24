import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInventory } from '../src/hooks/useInventory';
import { useRecipes } from '../src/hooks/useRecipes';
import { Recipe } from '../src/types';
import { getExpirationStatus } from '../src/utils/expiration';
import {
  AppScreen,
  RecipeCard,
  PrimaryButton,
  SecondaryButton,
  Chip,
  StaggerView,
  getBottomContentPadding,
} from '../src/components';
import { useAuth } from '../src/hooks/useAuth';
import { useShoppingList } from '../src/hooks/useShoppingList';
import { colors, radii, spacing, typography, elevations } from '../src/theme';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items } = useInventory();
  const { recipes, toggleSave, deleteRecipe } = useRecipes();
  const { pendingItems } = useShoppingList();
  const { user } = useAuth();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        AsyncStorage.getItem(`@food_ai_avatar_${user.id}`).then((uri) => {
          setAvatarUri(uri || null);
        }).catch(() => {});
      } else {
        setAvatarUri(null);
      }
    }, [user?.id])
  );

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
          <View style={{ flex: 1, marginRight: spacing.md }}>
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
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={{ width: 38, height: 38, borderRadius: radii.circular, overflow: 'hidden' }}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name={user ? 'person' : 'person-outline'} size={20} color={colors.primary} />
              )}
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
              <Ionicons name="basket-outline" size={20} color={colors.primary} />
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
          <View style={{ flex: 1, paddingRight: spacing.lg }}>
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles" size={11} color={colors.primaryDark} style={{ marginRight: spacing.xs }} />
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
            <Ionicons name="camera" size={26} color={colors.surface} />
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
            <View style={[styles.pantryIconBadge, { backgroundColor: colors.primaryContainer }]}>
              <Ionicons name="cube" size={18} color={colors.primary} />
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
                { backgroundColor: expiringCount > 0 ? colors.functional.expiringSoon.background : colors.surfaceVariant },
              ]}
            >
              <Ionicons
                name="time"
                size={18}
                color={expiringCount > 0 ? colors.functional.expiringSoon.text : colors.textSecondary}
              />
            </View>
            <Text style={[styles.pantryNum, expiringCount > 0 && { color: colors.functional.expiringSoon.text }]}>
              {expiringCount}
            </Text>
            <Text style={[styles.pantryLabel, expiringCount > 0 && { color: colors.functional.expiringSoon.text }]}>
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
            <View style={[styles.pantryIconBadge, { backgroundColor: colors.secondaryContainer }]}>
              <Ionicons name="cart" size={18} color={colors.secondaryDark} />
            </View>
            <Text style={[styles.pantryNum, { color: colors.secondaryDark }]}>{pendingItems.length}</Text>
            <Text style={[styles.pantryLabel, { color: colors.secondaryDark }]}>Por comprar</Text>
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
                <Ionicons name="sparkles" size={12} color={colors.surface} style={{ marginRight: spacing.xs }} />
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
                  <Ionicons name="time-outline" size={14} color={colors.textSecondary} style={{ marginRight: spacing.xs }} />
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
                  <Ionicons name="arrow-forward" size={15} color={colors.primary} style={{ marginLeft: spacing.xs }} />
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.contextualEmpty}>
              <View style={styles.contextualEmptyHeader}>
                <View style={styles.contextualIconCircle}>
                  <Ionicons name="restaurant-outline" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
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
                  <Chip variant="status" status={expiry.status} label={expiry.label} />
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.freshBanner}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.functional.fresh.text} style={{ marginRight: spacing.sm }} />
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

        <View style={{ paddingHorizontal: spacing.lg }}>
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
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  subtitle: {
    fontSize: typography.sizes.metadata,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  title: {
    fontSize: typography.sizes.headline,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: radii.containers,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  avatarButtonActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.border,
  },
  onlineDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: radii.xs,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeCount: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: colors.primary,
    minWidth: 18,
    height: 18,
    borderRadius: radii.chips,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCountText: {
    color: colors.textInverse,
    fontSize: typography.sizes.micro,
    fontWeight: '700',
  },
  heroActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryContainer,
    borderRadius: radii.containers,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: radii.circular,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  heroBadgeText: {
    fontSize: typography.sizes.micro,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.8,
  },
  heroActionTitle: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: '800',
    color: colors.primaryDark,
    marginBottom: spacing.xs,
  },
  heroActionSubtitle: {
    fontSize: typography.sizes.metadata,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  scanCircularButton: {
    width: 60,
    height: 60,
    borderRadius: radii.circular,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
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
    marginHorizontal: spacing.lg,
    marginTop: 14,
  },
  pantryCard: {
    flex: 1,
    borderRadius: radii.containers,
    paddingVertical: 18,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevations.sm,
  },
  pantryCardItems: {
    backgroundColor: colors.primaryContainer,
  },
  pantryCardExpiringNormal: {
    backgroundColor: colors.surfaceVariant,
  },
  pantryCardAlert: {
    backgroundColor: colors.functional.expiringSoon.background,
  },
  pantryCardShopping: {
    backgroundColor: colors.secondaryContainer,
  },
  pantryIconBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.buttons,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  pantryNum: {
    fontSize: typography.sizes.screenTitle,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  pantryLabel: {
    fontSize: typography.sizes.micro,
    color: colors.textSecondary,
    fontWeight: '800',
    marginTop: spacing.xs,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  contextualCard: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: 28,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    marginTop: 14,
  },
  contextualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  contextualTag: {
    fontSize: typography.sizes.caption,
    fontWeight: '800',
    color: colors.secondaryDark,
    letterSpacing: 0.8,
  },
  matchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: radii.circular,
  },
  matchPillText: {
    color: colors.textInverse,
    fontSize: typography.sizes.caption,
    fontWeight: '700',
  },
  contextualTitle: {
    fontSize: typography.sizes.cardTitle,
    lineHeight: typography.lineHeights.cardTitle,
    fontWeight: typography.weights.heavy,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  contextualDesc: {
    fontSize: typography.sizes.metadata,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  contextualFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  contextualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    borderRadius: radii.circular,
  },
  contextualButtonText: {
    fontSize: typography.sizes.metadata,
    fontWeight: '700',
    color: colors.primary,
  },
  contextualEmpty: {
    paddingVertical: spacing.xs,
  },
  contextualEmptyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contextualIconCircle: {
    width: 44,
    height: 44,
    borderRadius: radii.containers,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextualEmptyTitle: {
    fontSize: typography.sizes.body,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  contextualEmptyText: {
    fontSize: typography.sizes.label,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: typography.sizes.sectionTitle,
    lineHeight: typography.lineHeights.sectionTitle,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  seeAllText: {
    fontSize: typography.sizes.metadata,
    fontWeight: '600',
    color: colors.primary,
  },
  expiringContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  expiringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
  },
  expiringDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.functional.expiringSoon.text,
  },
  expiringName: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  expiringQty: {
    fontSize: typography.sizes.label,
    color: colors.textSecondary,
    marginTop: 1,
  },
  freshBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.functional.fresh.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.functional.fresh.border,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
  },
  freshBannerText: {
    fontSize: typography.sizes.metadata,
    color: colors.functional.fresh.text,
    fontWeight: '600',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: typography.sizes.metadata,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
