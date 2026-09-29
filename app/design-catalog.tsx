import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppText,
  PrimaryButton,
  SecondaryButton,
  IconButton,
  CountBadge,
  Chip,
  SearchInput,
  ScreenHeader,
  IngredientCard,
  RecipeCard,
  EmptyState,
  ErrorState,
} from '../src/components';
import type { Ingredient, Recipe } from '../src/types';
import { addDaysISO } from '../src/utils/dates';
import { colors, spacing, radii } from '../src/theme';

/**
 * Catálogo de diseño (BETA) — muestra los átomos tal como están en Componentes.dc.html
 * y Fundamentos.dc.html para compararlos lado a lado. Solo se entra desde Configuración › Pruebas.
 */
// ── Datos de ejemplo (los mismos del tablero Organismos) ──
const inDays = (d: number) => addDaysISO(d);
const ing = (id: string, name: string, category: Ingredient['category'], quantity: number, unit: Ingredient['unit'], days: number | null): Ingredient => ({
  id, name, category, quantity, unit,
  expirationDate: days === null ? null : inDays(days),
  confidence: null, source: 'manual', confirmed: true,
});
const SAMPLE_INGREDIENTS: Ingredient[] = [
  ing('s1', 'Espinaca', 'vegetable', 250, 'grams', 2),
  ing('s2', 'Yogur natural', 'dairy', 1, 'liters', 12),
  ing('s3', 'Pechuga de pollo', 'protein', 500, 'grams', -1),
  ing('s4', 'Arroz blanco', 'grain', 1, 'kilograms', null),
];
const rIng = (id: string, name: string) => ({ id, name, quantity: 1, unit: 'units' as const, isAvailable: true, isOptional: false, substitutions: [] });
const SAMPLE_RECIPE: Recipe = {
  id: 'demo-arroz', title: 'Arroz con pollo y verduras',
  description: 'Usa la espinaca antes de que venza; listo en una sola olla.',
  prepTimeMinutes: 35, servings: 4, difficulty: 'easy', matchScore: 92,
  availableIngredients: Array.from({ length: 7 }, (_, i) => rIng(`a${i}`, `Ingrediente ${i + 1}`)),
  missingIngredients: [rIng('m1', 'Pimentón')],
  steps: [], isSaved: false, isPrepared: false,
};

export default function DesignCatalogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('tomate');
  const [emptyQuery, setEmptyQuery] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [selected, setSelected] = useState(true);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <IconButton iconName="chevron-back" variant="surface" accessibilityLabel="Volver" onPress={() => router.back()} />
        <AppText variant="sectionTitle">Catálogo de diseño</AppText>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}>
        {/* ── Tipografía ── */}
        <Section title="Escala tipográfica · Outfit">
          <Row note="displayNumber · 44/48 · 500">
            <AppText variant="displayNumber">
              3 <AppText variant="sectionTitle" weight="regular" color={colors.textSecondary}>días</AppText>
            </AppText>
          </Row>
          <Row note="screenTitle · 32/40 · 300+600">
            <AppText variant="screenTitle">
              ¿Qué cocinamos <AppText weight="semibold">hoy</AppText>?
            </AppText>
          </Row>
          <Row note="headline · 24/32 · 500">
            <AppText variant="headline">Escanea tus alimentos</AppText>
          </Row>
          <Row note="sectionTitle · 20/28 · 600">
            <AppText variant="sectionTitle">Aprovecha primero</AppText>
          </Row>
          <Row note="cardTitle · 17/24 · 600">
            <AppText variant="cardTitle">Pechuga de pollo</AppText>
          </Row>
          <Row note="body · 16/24 · 400">
            <AppText variant="body">Toma una foto para detectar ingredientes y actualizar tu despensa al instante.</AppText>
          </Row>
          <Row note="bodySmall · 14/20 · 400">
            <AppText variant="bodySmall" color={colors.textSecondary}>
              Agrega ingredientes a tu despensa para sugerirte la receta ideal.
            </AppText>
          </Row>
          <Row note="metadata · 13/18 · 500">
            <AppText variant="metadata">25 min · 2 porciones · Faltan 2</AppText>
          </Row>
          <Row note="label · 12/16 · 600 · +0.6">
            <AppText variant="label" uppercase>IA de visión</AppText>
          </Row>
          <Row note="caption 12 · micro 11">
            <View style={styles.inline}>
              <AppText variant="caption" color={colors.textSecondary}>Sincronizado hace 2 min</AppText>
              <CountBadge count={12} />
            </View>
          </Row>
        </Section>

        {/* ── Botones ── */}
        <Section title="PrimaryButton · tone ink | brand | ai">
          <PrimaryButton title="Guardar en despensa" iconName="checkmark-circle-outline" onPress={() => {}} />
          <PrimaryButton title="Guardando" isLoading onPress={() => {}} />
          <PrimaryButton title="Deshabilitado" disabled onPress={() => {}} />
          <PrimaryButton title="Escanear alimentos" tone="brand" iconName="scan-outline" onPress={() => {}} />
          <PrimaryButton title="Generar con Chef IA" tone="ai" iconName="sparkles-outline" onPress={() => {}} />
        </Section>

        <Section title="SecondaryButton · tint | outline">
          <SecondaryButton title="Enviar faltantes a compras" iconName="cart-outline" onPress={() => {}} />
          <SecondaryButton title="Cancelar" variant="outline" onPress={() => {}} />
        </Section>

        <Section title="IconButton · 48 × 48">
          <View style={styles.inline}>
            <IconButton iconName="arrow-forward" variant="surface" accessibilityLabel="Abrir" onPress={() => {}} />
            <IconButton iconName="add" variant="ink" accessibilityLabel="Agregar alimento" onPress={() => {}} />
            <IconButton iconName="bookmark-outline" variant="tonal" accessibilityLabel="Guardar receta" onPress={() => {}} />
            <IconButton iconName="notifications-outline" variant="neutral" accessibilityLabel="Notificaciones" onPress={() => {}} />
            <IconButton
              iconName="cart-outline"
              variant="neutral"
              badgeCount={7}
              accessibilityLabel="Compras, 7 pendientes"
              onPress={() => {}}
            />
          </View>
        </Section>

        {/* ── Chips ── */}
        <Section title="Chip · filter · category · status">
          <View style={styles.wrap}>
            {['Todos', 'Alta coincidencia', 'Rápidas', 'Guardadas'].map((l) => (
              <Chip key={l} label={l} variant="filter" selected={filter === l} onPress={() => setFilter(l)} />
            ))}
          </View>
          <View style={styles.wrap}>
            <Chip variant="category" category="vegetable" icon="leaf-outline" label="Verduras" />
            <Chip variant="category" category="dairy" icon="water-outline" label="Lácteos" />
            <Chip variant="category" category="grain" icon="grid-outline" label="Granos" />
          </View>
          <View style={styles.wrap}>
            <Chip variant="status" status="expiringSoon" label="Vence en 2 días" />
            <Chip variant="status" status="expired" label="Vencido" />
            <Chip variant="status" status="fresh" label="Fresco" />
          </View>
        </Section>

        {/* ── Moléculas y organismos (Paso 3) ── */}
        <Section title="ScreenHeader · 32/40 · 300 + 600">
          <ScreenHeader title="Mi" emphasis="Despensa" subtitle="24 alimentos guardados" />
        </Section>

        <Section title="IngredientCard · ticket de caducidad">
          <View>
            {SAMPLE_INGREDIENTS.slice(0, 3).map((i) => (
              <IngredientCard key={i.id} ingredient={i} onPress={() => {}} />
            ))}
            <IngredientCard
              ingredient={SAMPLE_INGREDIENTS[3]}
              isSelectMode
              isSelected={selected}
              onToggleSelect={() => setSelected((v) => !v)}
            />
          </View>
        </Section>

        <Section title="RecipeCard · franja pastel">
          <View>
            <RecipeCard recipe={SAMPLE_RECIPE} onPress={() => {}} onSave={() => {}} onDelete={() => {}} />
            <RecipeCard
              recipe={{ ...SAMPLE_RECIPE, id: 'demo-batido', title: 'Batido de banano y avena', prepTimeMinutes: 10, difficulty: 'medium', missingIngredients: [rIng('m1', 'a'), rIng('m2', 'b'), rIng('m3', 'c')] }}
              onPress={() => {}}
              isSelectMode
              isSelected
            />
          </View>
        </Section>

        <Section title="EmptyState · ErrorState">
          <EmptyState
            title="Tu despensa está"
            titleEmphasis="vacía"
            description="Escanea tu compra o agrega tus primeros alimentos para empezar a recibir recetas."
            actionLabel="Escanear alimentos"
            onAction={() => {}}
          />
          <ErrorState
            title="No pudimos"
            titleEmphasis="cargar tus recetas"
            message="Tu despensa sigue disponible sin conexión. Reintenta cuando vuelva la red."
            onRetry={() => {}}
          />
        </Section>

        {/* ── Buscador ── */}
        <Section title="SearchInput · 52 dp">
          <SearchInput value={emptyQuery} onChangeText={setEmptyQuery} />
          <SearchInput
            value={query}
            onChangeText={setQuery}
            trailingAction={{ iconName: 'options-outline', accessibilityLabel: 'Filtros y orden', onPress: () => {} }}
          />
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="cardTitle">{title}</AppText>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ note, children }: { note: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <AppText variant="caption" color={colors.textSecondary}>{note}</AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.screenGutter,
    paddingVertical: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.screenGutter,
    gap: spacing.lg,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.tiles,
    padding: spacing.cardPadding,
    gap: spacing.lg,
  },
  sectionBody: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.m3.surfaceContainer,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
