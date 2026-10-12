import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
  AppText,
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
import { useAvatar } from '../src/hooks/useAvatar';
import { useAuth } from '../src/hooks/useAuth';
import { useShoppingList } from '../src/hooks/useShoppingList';
import { radii, spacing, typography, elevations } from '../src/theme';
import { useTheme, makeStyles } from '../src/theme/ThemeProvider';
import { useI18n } from '../src/i18n';

/**
 * Sin sesión no se monta Inicio: antes se cargaban despensa, recetas y compras (y una llamada al servidor)
 * solo para redirigir al login después. Ahora se redirige de inmediato.
 */
export default function HomeScreen() {
  const { isAuthenticated, isHydrated } = useAuth();
  if (!isHydrated) return null;
  if (!isAuthenticated) return <Redirect href="/login" />;
  return <HomeContent />;
}

function HomeContent() {
  const { colors } = useTheme();
  const { t, tp } = useI18n();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items } = useInventory();
  const { recipes, toggleSave, deleteRecipe } = useRecipes();
  const { pendingItems } = useShoppingList();
  const { user } = useAuth();
  const { uri: avatarUri } = useAvatar(user?.id);

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


  const handleLongPressRecipe = (recipe: Recipe) => {
    setConfirmModal({
      visible: true,
      title: t('screensMain.home.discardTitle'),
      description: t('screensMain.home.discardDescription', { title: recipe.title }),
      confirmDestructive: true,
      confirmText: t('screensMain.home.discardConfirm'),
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
  const headerTitle = firstName ? t('screensMain.home.headerChef') : t('screensMain.home.headerMine');
  const headerEmphasis = firstName ?? t('screensMain.home.headerKitchen');

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
          overline={t('screensMain.home.overline')}
          title={headerTitle}
          emphasis={headerEmphasis}
          right={
            <>
              <IconButton
                iconName="settings-outline"
                variant="surface"
                accessibilityLabel={t('screensMain.home.settingsA11y')}
                onPress={() => router.push('/settings')}
              />
              <AvatarButton
                uri={avatarUri}
                accessibilityLabel={user ? t('screensMain.home.profileA11y', { name: user.name }) : t('screensMain.home.loginOrProfileA11y')}
                onPress={() => router.push('/profile')}
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
            label={t('screensMain.home.pantryTitle')}
            value={ingredientCount}
            accessibilityLabel={t('screensMain.home.pantryA11y', { total: ingredientCount, foodNoun: tp('screensMain.shared.food', ingredientCount), fresh: freshCount, freshNoun: tp('screensMain.shared.fresh', freshCount), expiring: expiringCount })}
            onPress={() => router.navigate('/inventory')}
            footer={
              ingredientCount > 0 ? (
                <View style={styles.tileFooter}>
                  <View style={styles.freshBar}>
                    {freshCount > 0 && <View style={[styles.freshSeg, { flexGrow: freshCount, backgroundColor: colors.secondary }]} />}
                    {expiringCount > 0 && <View style={[styles.freshSeg, { flexGrow: expiringCount, backgroundColor: colors.warning }]} />}
                    {unknownCount > 0 && <View style={[styles.freshSeg, { flexGrow: unknownCount, backgroundColor: colors.borderStrong }]} />}
                  </View>
                  <AppText variant="metadata" color={colors.functional.fresh.text}>{t('screensMain.home.pantrySummary', { fresh: freshCount, freshNoun: tp('screensMain.shared.fresh', freshCount), expiring: expiringCount })}</AppText>
                </View>
              ) : (
                <AppText variant="metadata" color={colors.functional.fresh.text}>{t('screensMain.home.pantryEmpty')}</AppText>
              )
            }
          />
          <View style={styles.metricsCol}>
            <FeatureTile
              tone="expiring"
              label={t('screensMain.home.expiringTitle')}
              value={expiringCount}
              accessibilityLabel={tp('screensMain.home.expiringA11y', expiringCount)}
              onPress={openExpiring}
            />
            <FeatureTile
              tone="brand"
              label={t('screensMain.home.shoppingTitle')}
              value={pendingItems.length}
              accessibilityLabel={tp('screensMain.home.shoppingA11y', pendingItems.length)}
              onPress={() => router.navigate('/shopping-list')}
            />
          </View>
        </View>
      </StaggerView>

      {/* ── 4. ¿Qué cocinamos hoy? ── */}
      <StaggerView index={3}>
        <View style={styles.section}>
          <ScreenHeader title={t('screensMain.home.cookTodayTitle')} emphasis={t('screensMain.home.cookTodayEmphasis')} size="headline" />
          <TodayRecipeCard
            recipe={featuredRecipe}
            onOpen={() => featuredRecipe && openRecipe(featuredRecipe.id)}
            onEmptyAction={() => router.navigate('/inventory')}
          />
        </View>
      </StaggerView>

      {/* ── 5. Aprovecha primero ── */}
      <StaggerView index={4}>
        <View style={styles.sectionTight}>
          <SectionHeader
            title={t('screensMain.home.useFirstTitle')}
            actionLabel={expiringCount > 0 ? t('screensMain.home.seeAllExpiring', { count: expiringCount }) : undefined}
            onAction={openExpiring}
          />
          {expiringCount > 0 ? (
            expiringItems.slice(0, 3).map((item) => (
              <IngredientCard key={item.id} ingredient={item} compact onPress={openExpiring} />
            ))
          ) : (
            <View style={styles.allFresh}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.functional.fresh.text} />
              <AppText variant="bodySmall" color={colors.functional.fresh.text} style={styles.allFreshText}>{t('screensMain.home.allFresh')}</AppText>
            </View>
          )}
        </View>
      </StaggerView>

      {/* ── 6. Ideas para cocinar (carrusel) ── */}
      <StaggerView index={5}>
        <View style={styles.sectionTight}>
          <SectionHeader
            title={t('screensMain.home.ideasTitle')}
            actionLabel={t('screensMain.home.seeAllRecipes', { count: recipes.length })}
            onAction={() => router.navigate('/recipes')}
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
              title={t('screensMain.home.generateIdeas')}
              iconName="sparkles-outline"
              variant="outline"
              onPress={() => router.navigate('/recipes')}
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
const useStyles = makeStyles((colors) => ({
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
  },
  carousel: {
    marginRight: -spacing.screenGutter,
  },
  carouselContent: {
    gap: 12,
    paddingRight: spacing.screenGutter,
  },
}));
