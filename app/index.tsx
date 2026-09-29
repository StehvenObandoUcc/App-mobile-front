import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
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
  StaggerView,
  getBottomContentPadding,
  ActionSheetModal,
  OfflineBanner,
  Text,
  ScreenHeader,
  IconButton,
  AvatarButton,
  ScanHero,
  FeatureTile,
  TodayRecipeCard,
  SectionHeader,
  IngredientCard,
  RecipeMiniCard,
  SecondaryButton,
} from '../src/components';
import { useOutboxStatus } from '../src/hooks/useOutboxStatus';
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

  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    description?: string;
    confirmDestructive?: boolean;
    confirmText?: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
  });

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
    setConfirmModal({
      visible: true,
      title: 'Descartar sugerencia',
      description: `¿Deseas descartar la receta "${recipe.title}" de tus sugerencias?`,
      confirmDestructive: true,
      confirmText: 'Descartar',
      onConfirm: async () => {
        await deleteRecipe(recipe.id);
      },
    });
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

  // Encabezado «Mi **Cocina**» (mockup) o «Chef **Steve**» cuando hay sesión.
  const firstName = user?.name ? user.name.replace(/^chef\s+/i, '').split(' ')[0] : null;
  const headerTitle = firstName ? 'Chef' : 'Mi';
  const headerEmphasis = firstName ?? 'Cocina';

  // Ficha grande «Alimentos en despensa»: barra frescos / por vencer / sin fecha.
  const freshCount = items.filter((i) => getExpirationStatus(i.expirationDate).status === 'fresh').length;
  const unknownCount = items.filter((i) => getExpirationStatus(i.expirationDate).status === 'unknown').length;
  const openRecipe = (id: string) => router.push({ pathname: '/recipe-detail', params: { recipeId: id } });
  const openExpiring = () => router.push({ pathname: '/inventory', params: { filter: 'expiring' } });

  // Aviso Offline-First: refleja la cola Outbox (cambios pendientes de sincronizar)
  const outbox = useOutboxStatus();

  return (
    <AppScreen
      scrollable
      style={styles.screen}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: Math.max(110, getBottomContentPadding(insets.bottom)) },
      ]}
    >
      {/* ── 1. Encabezado (Inicio.dc.html) ── */}
      <StaggerView index={0}>
        <ScreenHeader
          overline="Aprovecha mejor tu despensa hoy"
          title={headerTitle}
          emphasis={headerEmphasis}
          right={
            <>
              <IconButton
                iconName="settings-outline"
                variant="surface"
                accessibilityLabel="Configuración"
                onPress={() => router.push('/settings')}
              />
              <AvatarButton
                uri={avatarUri}
                signedIn={!!user}
                accessibilityLabel={user ? `Perfil de ${user.name}` : 'Iniciar sesión o ver perfil'}
                onPress={() => router.push({ pathname: '/login', params: { view: 'profile' } })}
              />
            </>
          }
        />
      </StaggerView>

      {/* ── 1b. Aviso de sincronización (Outbox) ── */}
      {outbox.state !== 'hidden' && (
        <OfflineBanner
          state={outbox.state}
          pendingCount={outbox.pendingCount}
          stuckCount={outbox.stuckCount}
          isRetrying={outbox.isRetrying}
          onRetry={outbox.retryNow}
        />
      )}

      {/* ── 2. Escanear (hero cacao) ── */}
      <StaggerView index={1}>
        <ScanHero onPress={() => router.push('/scan')} />
      </StaggerView>

      {/* ── 3. Métricas: ficha grande + dos pequeñas ── */}
      <StaggerView index={2}>
        <View style={styles.metrics}>
          <FeatureTile
            size="lg"
            tone="fresh"
            label={'Alimentos\nen despensa'}
            value={ingredientCount}
            accessibilityLabel={`Despensa con ${ingredientCount} alimentos: ${freshCount} frescos, ${expiringCount} por vencer`}
            onPress={() => router.push('/inventory')}
            footer={
              ingredientCount > 0 ? (
                <View style={styles.tileFooter}>
                  <View style={styles.freshBar}>
                    {freshCount > 0 && <View style={[styles.freshSeg, { flexGrow: freshCount, backgroundColor: colors.difficulty.easy.segment }]} />}
                    {expiringCount > 0 && <View style={[styles.freshSeg, { flexGrow: expiringCount, backgroundColor: colors.difficulty.medium.segment }]} />}
                    {unknownCount > 0 && <View style={[styles.freshSeg, { flexGrow: unknownCount, backgroundColor: colors.borderStrong }]} />}
                  </View>
                  <Text style={styles.tileCaption}>{`${freshCount} frescos · ${expiringCount} por vencer`}</Text>
                </View>
              ) : (
                <Text style={styles.tileCaption}>Escanea o agrega tu primer alimento</Text>
              )
            }
          />
          <View style={styles.metricsCol}>
            <FeatureTile
              tone="expiring"
              label="Por vencer"
              value={expiringCount}
              accessibilityLabel={`${expiringCount} alimentos por vencer`}
              onPress={openExpiring}
            />
            <FeatureTile
              tone="brand"
              label="Por comprar"
              value={pendingItems.length}
              accessibilityLabel={`${pendingItems.length} compras pendientes`}
              onPress={() => router.push('/shopping-list')}
            />
          </View>
        </View>
      </StaggerView>

      {/* ── 4. ¿Qué cocinamos hoy? ── */}
      <StaggerView index={3}>
        <View style={styles.section}>
          <ScreenHeader title="¿Qué cocinamos" emphasis="hoy?" size="headline" />
          <TodayRecipeCard
            recipe={featuredRecipe}
            onOpen={() => featuredRecipe && openRecipe(featuredRecipe.id)}
            onEmptyAction={() => router.push('/inventory')}
          />
        </View>
      </StaggerView>

      {/* ── 5. Aprovecha primero ── */}
      <StaggerView index={4}>
        <View style={styles.sectionTight}>
          <SectionHeader
            title="Aprovecha primero"
            actionLabel={expiringCount > 0 ? `Ver todos (${expiringCount})` : undefined}
            onAction={openExpiring}
          />
          {expiringCount > 0 ? (
            expiringItems.slice(0, 3).map((item) => (
              <IngredientCard key={item.id} ingredient={item} compact onPress={openExpiring} />
            ))
          ) : (
            <View style={styles.allFresh}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.functional.fresh.text} />
              <Text style={styles.allFreshText}>Tu despensa está al día. Nada próximo a vencer.</Text>
            </View>
          )}
        </View>
      </StaggerView>

      {/* ── 6. Ideas para cocinar (carrusel) ── */}
      <StaggerView index={5}>
        <View style={styles.sectionTight}>
          <SectionHeader
            title="Ideas para cocinar"
            actionLabel={`Ver todas (${recipes.length})`}
            onAction={() => router.push('/recipes')}
          />
          {availableRecipes.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.carousel}
              contentContainerStyle={styles.carouselContent}
            >
              {availableRecipes.slice(0, 6).map((recipe) => (
                <RecipeMiniCard
                  key={recipe.id}
                  recipe={recipe}
                  onPress={() => openRecipe(recipe.id)}
                  onLongPress={() => handleLongPressRecipe(recipe)}
                />
              ))}
            </ScrollView>
          ) : (
            <SecondaryButton
              title="Generar ideas con Chef IA"
              iconName="sparkles-outline"
              variant="outline"
              onPress={() => router.push('/recipes')}
            />
          )}
        </View>
      </StaggerView>

      {/* ── Modal de confirmación (descartar sugerencia) ── */}
      <ActionSheetModal
        visible={confirmModal.visible}
        onClose={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
        title={confirmModal.title}
        description={confirmModal.description}
        variant="confirmation"
        confirmDestructive={confirmModal.confirmDestructive}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
      />
    </AppScreen>
  );
}

// Inicio.dc.html: margen lateral 20, 20 entre bloques, +8 antes de cada sección.
const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenGutter,
    paddingTop: spacing.xxl,
    gap: 20,
  },
  metrics: {
    flexDirection: 'row',
    gap: 12,
  },
  metricsCol: {
    flex: 1,
    gap: 12,
  },
  tileFooter: {
    gap: 10,
  },
  freshBar: {
    flexDirection: 'row',
    gap: 3,
  },
  freshSeg: {
    height: 10,
    borderRadius: 5,
  },
  tileCaption: {
    fontSize: typography.sizes.metadata,
    lineHeight: 18,
    fontWeight: typography.weights.medium,
    color: colors.functional.fresh.text,
  },
  section: {
    marginTop: 8,
    gap: 12,
  },
  sectionTight: {
    marginTop: 8,
    gap: 10,
  },
  allFresh: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.alerts,
    backgroundColor: colors.functional.fresh.background,
  },
  allFreshText: {
    flex: 1,
    fontSize: typography.sizes.bodySmall,
    lineHeight: 20,
    color: colors.functional.fresh.text,
  },
  carousel: {
    marginRight: -spacing.screenGutter,
  },
  carouselContent: {
    gap: 12,
    paddingRight: spacing.screenGutter,
  },
});
