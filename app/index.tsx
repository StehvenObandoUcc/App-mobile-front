import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInventory } from '../src/hooks/useInventory';
import { useRecipes } from '../src/hooks/useRecipes';
import { useScanQuota } from '../src/hooks/useScanQuota';
import { getExpirationStatus } from '../src/utils/expiration';
import { isAlmostCookable, missingRequiredOf } from '../src/utils/consumption';
import {
  AppScreen,
  StaggerView,
  getBottomContentPadding,
  OfflineBanner,
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
  joinTitle,
} from '../src/components';
import { useOutboxStatus } from '../src/hooks/useOutboxStatus';
import { useAvatar } from '../src/hooks/useAvatar';
import { useAuth } from '../src/hooks/useAuth';
import { useShoppingList } from '../src/hooks/useShoppingList';
import { spacing } from '../src/theme';
import { makeStyles } from '../src/theme/ThemeProvider';
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
  const { t, tp } = useI18n();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items } = useInventory();
  const { recipes } = useRecipes();
  const scanQuota = useScanQuota();
  const { pendingItems } = useShoppingList();
  const { user } = useAuth();
  const { uri: avatarUri } = useAvatar(user?.id);

  // Estadísticas reales calculadas reactivamente
  const ingredientCount = items.length;
  const expiringItems = items.filter((item) => {
    const s = getExpirationStatus(item.expirationDate);
    return s.status === 'expiringSoon' || s.status === 'expired';
  }).sort((a, b) => (a.expirationDate ?? '9999').localeCompare(b.expirationDate ?? '9999')); // el más urgente primero
  const expiringCount = expiringItems.length;
  // Misma regla que el filtro «Con lo que tienes» de Recetas: te falta a lo sumo 1 ingrediente obligatorio.
  // Primero las que puedes cocinar ya; luego por mayor % de ingredientes que tienes (ambos calculados con la despensa de hoy).
  const availableRecipes = recipes
    .filter((r) => isAlmostCookable(r))
    .sort((a, b) => missingRequiredOf(a) - missingRequiredOf(b) || b.matchScore - a.matchScore);
  const featuredRecipe = availableRecipes.length > 0 ? availableRecipes[0] : null;
  // La sugerencia del día no se repite en el carrusel.
  const moreIdeas = availableRecipes.slice(1, 6);
  const hasPantry = ingredientCount > 0;

  // Encabezado «Mi **Cocina**» (mockup) o «Chef **Steve**» cuando hay sesión.
  const firstName = user?.name ? user.name.replace(/^chef\s+/i, '').split(' ')[0] : null;
  const headerTitle = firstName ? t('screensMain.home.headerChef') : t('screensMain.home.headerMine');
  const headerEmphasis = firstName ?? t('screensMain.home.headerKitchen');

  // Solo para el lector de pantalla de la ficha «Alimentos en despensa».
  const freshCount = items.filter((i) => getExpirationStatus(i.expirationDate).status === 'fresh').length;
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
      {/* 1. Encabezado (Inicio.dc.html) */}
      <StaggerView index={0}>
        <ScreenHeader
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

      {/* 1b. Aviso de sincronización (Outbox) */}
      {outbox.state !== 'hidden' && (
        <OfflineBanner
          state={outbox.state}
          pendingCount={outbox.pendingCount}
          stuckCount={outbox.stuckCount}
          isRetrying={outbox.isRetrying}
          onRetry={outbox.retryNow}
        />
      )}

      {/*
        Inicio según el estado: cada dato aparece una sola vez.
        - Despensa vacía: tarjeta grande de escaneo; la sugerencia explica que sale de lo que agregues.
        - Con alimentos: lo que vence → escanear (fila compacta) → qué cocinar → fichas de despensa y compras
          (las fichas repiten pestañas, por eso van al final).
        - «Por vencer» ya no es ficha: lo dice «Aprovecha primero», que solo aparece si hay algo por vencer.
        - «¿Qué cocinamos hoy?» y las ideas son una sola sección: la sugerencia y, debajo, las demás.
        - Las ideas no se borran con pulsación larga (en el resto de la app eso selecciona); se borran en Recetas.
      */}
      {expiringCount > 0 && (
        <StaggerView index={1}>
          <View style={styles.sectionTight}>
            <SectionHeader
              title={t('screensMain.home.useFirstTitle')}
              actionLabel={expiringCount > 1 ? t('screensMain.home.seeAllExpiring', { count: expiringCount }) : undefined}
              onAction={openExpiring}
            />
            {expiringItems.slice(0, 1).map((item) => (
              <IngredientCard key={item.id} ingredient={item} compact onPress={openExpiring} />
            ))}
          </View>
        </StaggerView>
      )}

      {/* Escanear: tarjeta grande con la despensa vacía; fila compacta cuando ya hay alimentos */}
      <StaggerView index={2}>
        <ScanHero
          onPress={() => router.push('/scan')}
          remaining={scanQuota.loaded ? scanQuota.remaining : undefined}
          onAddByHand={() => router.push({ pathname: '/inventory', params: { add: '1' } })}
          compact={hasPantry}
        />
      </StaggerView>

      <StaggerView index={3}>
        <View style={styles.sectionTight}>
          <SectionHeader
            title={joinTitle(t('screensMain.home.cookTodayTitle'), t('screensMain.home.cookTodayEmphasis'))}
            actionLabel={recipes.length > 0 ? t('screensMain.home.seeAllRecipes', { count: recipes.length }) : undefined}
            onAction={() => router.navigate('/recipes')}
          />
          {featuredRecipe ? (
            <>
              <TodayRecipeCard
                recipe={featuredRecipe}
                onOpen={() => openRecipe(featuredRecipe.id)}
                onEmptyAction={() => router.navigate('/inventory')}
              />
              {moreIdeas.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.carousel}
                  contentContainerStyle={styles.carouselContent}
                >
                  {moreIdeas.map((recipe) => (
                    <RecipeMiniCard
                      key={recipe.id}
                      recipe={recipe}
                      onPress={() => openRecipe(recipe.id)}
                    />
                  ))}
                </ScrollView>
              )}
            </>
          ) : !hasPantry ? (
            // Despensa vacía: la tarjeta explica que la sugerencia sale de lo que agregues.
            <TodayRecipeCard recipe={null} onOpen={() => {}} onEmptyAction={() => router.navigate('/inventory')} />
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

      {/* Con despensa y compras en cero las fichas solo dirían «0» y quedarían bajo la barra: aparecen al haber algo. */}
      {(ingredientCount > 0 || pendingItems.length > 0) && (
      <StaggerView index={4}>
        <View style={styles.metrics}>
          <View style={styles.metric}>
            <FeatureTile
              tone="fresh"
              size="inline"
              label={t('screensMain.home.pantryTitle')}
              value={ingredientCount}
              accessibilityLabel={t('screensMain.home.pantryA11y', { total: ingredientCount, foodNoun: tp('screensMain.shared.food', ingredientCount), fresh: freshCount, freshNoun: tp('screensMain.shared.fresh', freshCount), expiring: expiringCount })}
              onPress={() => router.navigate('/inventory')}
            />
          </View>
          <View style={styles.metric}>
            <FeatureTile
              tone="brand"
              size="inline"
              label={t('screensMain.home.shoppingTitle')}
              value={pendingItems.length}
              accessibilityLabel={tp('screensMain.home.shoppingA11y', pendingItems.length)}
              onPress={() => router.navigate('/shopping-list')}
            />
          </View>
        </View>
      </StaggerView>
      )}

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
  metric: {
    flex: 1,
  },
  sectionTight: {
    marginTop: 8,
    gap: 10,
  },
  carousel: {
    marginRight: -spacing.screenGutter,
  },
  carouselContent: {
    gap: 12,
    paddingRight: spacing.screenGutter,
  },
}));
