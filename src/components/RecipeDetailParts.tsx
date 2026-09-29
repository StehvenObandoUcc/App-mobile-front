import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { SecondaryButton } from './SecondaryButton';
import { colors, radii, spacing, elevations } from '../theme';

/**
 * Piezas del detalle de receta (Receta-Detalle.dc.html).
 * Átomo: AiBadge · Moléculas: StatTile, StepItem, StickyActionBar
 * Organismos: RecipeCover, RecipeIngredientsCard, MissingIngredientsCard
 */

// ── AiBadge ───────────────────────────────────────────────────────────────────
export function AiBadge({ label, size = 'md' }: { label: string; size?: 'sm' | 'md' }) {
  return (
    <View style={[styles.aiBadge, size === 'sm' ? styles.aiBadgeSm : styles.aiBadgeMd]}>
      <Ionicons name="sparkles" size={size === 'sm' ? 12 : 14} color={colors.onTertiaryContainer} />
      <AppText variant={size === 'sm' ? 'caption' : 'metadata'} weight="semibold" color={colors.onTertiaryContainer}>
        {label}
      </AppText>
    </View>
  );
}

// ── RecipeCover ───────────────────────────────────────────────────────────────
export type RecipeCoverProps = {
  banner: { bg: string; fg: string };
  imageUri?: string | null;
  isSaved: boolean;
  topInset: number;
  onBack: () => void;
  onToggleSave: () => void;
};

export function RecipeCover({ banner, imageUri, isSaved, topInset, onBack, onToggleSave }: RecipeCoverProps) {
  return (
    <View style={[styles.cover, { backgroundColor: banner.bg, height: 270 + topInset }]}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <>
          <View style={[styles.halo, { top: 40 + topInset }]} />
          <View style={[styles.plate, { top: 58 + topInset }]}>
            <Ionicons name="restaurant-outline" size={64} color={banner.fg} />
          </View>
        </>
      )}
      <View style={[styles.coverBar, { top: 20 + topInset }]}>
        <IconButton iconName="chevron-back" variant="white" accessibilityLabel="Volver" onPress={onBack} style={styles.coverBtn} />
        <IconButton
          iconName={isSaved ? 'heart' : 'heart-outline'}
          variant="surface"
          accessibilityLabel={isSaved ? 'Quitar de guardadas' : 'Guardar receta'}
          onPress={onToggleSave}
          style={styles.coverBtn}
        />
      </View>
    </View>
  );
}

// ── StatTile ──────────────────────────────────────────────────────────────────
export type StatTileProps = {
  value: string;
  label: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  top?: React.ReactNode;
  tone?: { background: string; text: string };
};

export function StatTile({ value, label, iconName, top, tone }: StatTileProps) {
  const fg = tone?.text ?? colors.textPrimary;
  return (
    <View style={[styles.stat, { backgroundColor: tone?.background ?? colors.surface }]} accessible accessibilityLabel={`${value} ${label}`}>
      <View style={styles.statTop}>{top ?? (iconName ? <Ionicons name={iconName} size={18} color={fg} /> : null)}</View>
      <AppText weight="semibold" color={fg} style={styles.statValue} numberOfLines={1}>
        {value}
      </AppText>
      <AppText variant="caption" color={tone ? fg : colors.textSecondary}>
        {label}
      </AppText>
    </View>
  );
}

// ── RecipeIngredientsCard ─────────────────────────────────────────────────────
export type IngredientRow = { id: string; name: string; quantity: string; badge?: { label: string; tone: { background: string; text: string } } };

export function RecipeIngredientsCard({ available, total, rows }: { available: number; total: number; rows: IngredientRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const VISIBLE = 3;
  const collapsed = !expanded && rows.length > VISIBLE + 1;
  const shown = collapsed ? rows.slice(0, VISIBLE) : rows;
  const rest = rows.slice(VISIBLE);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <AppText variant="sectionTitle" accessibilityRole="header">
          Ingredientes
        </AppText>
        <AppText variant="bodySmall" weight="semibold" color={colors.functional.fresh.text}>{`Tienes ${available} de ${total}`}</AppText>
      </View>
      {total > 0 && (
        <View style={styles.segments}>
          {Array.from({ length: Math.min(total, 12) }).map((_, i) => {
            const filled = total <= 12 ? i < available : i < Math.round((available / total) * 12);
            return <View key={i} style={[styles.segment, { backgroundColor: filled ? colors.secondary : colors.m3.surfaceContainerHighest }]} />;
          })}
        </View>
      )}
      {rows.length > 0 && (
        <View style={styles.listCard}>
          {shown.map((r, i) => (
            <View key={r.id} style={[styles.ingRow, (i < shown.length - 1 || collapsed) && styles.rowDivider]}>
              <View style={styles.okDot}>
                <Ionicons name="checkmark" size={14} color={colors.functional.fresh.text} />
              </View>
              <AppText variant="body" style={styles.ingName} numberOfLines={2}>
                {r.name}
              </AppText>
              {r.badge && (
                <View style={[styles.badge, { backgroundColor: r.badge.tone.background }]}>
                  <AppText variant="caption" weight="semibold" color={r.badge.tone.text}>
                    {r.badge.label}
                  </AppText>
                </View>
              )}
              <AppText variant="bodySmall" weight="medium" color={colors.textSecondary}>
                {r.quantity}
              </AppText>
            </View>
          ))}
          {collapsed && (
            <View style={styles.ingRow}>
              <View style={styles.okDot}>
                <Ionicons name="checkmark" size={14} color={colors.functional.fresh.text} />
              </View>
              <AppText variant="body" style={styles.ingName} numberOfLines={1}>
                {`${rest[0].name} y ${rest.length - 1} más`}
              </AppText>
              <Pressable onPress={() => setExpanded(true)} style={styles.link} accessibilityRole="button" accessibilityLabel="Ver todos los ingredientes">
                <AppText variant="bodySmall" weight="semibold" color={colors.primary}>
                  Ver todos
                </AppText>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ── MissingIngredientsCard ────────────────────────────────────────────────────
export type MissingRow = { id: string; name: string; quantity: string; optional: boolean; substitutions: string[] };

export function MissingIngredientsCard({ rows, onAddToShopping }: { rows: MissingRow[]; onAddToShopping: () => void }) {
  const tone = colors.functional.expiringSoon;
  const n = rows.length;
  return (
    <View style={[styles.missing, { backgroundColor: tone.background }]}>
      <AppText variant="bodySmall" weight="semibold" color={tone.text}>
        {n === 1 ? 'Te falta 1 ingrediente' : `Te faltan ${n} ingredientes`}
      </AppText>
      {rows.map((r) => (
        <View key={r.id} style={styles.missingItem}>
          <View style={styles.dashedDot} />
          <View style={styles.missingTexts}>
            <AppText variant="body" weight="semibold">
              {r.name}
              {r.optional ? <AppText weight="regular" color={colors.textSecondary}> · opcional</AppText> : null}
            </AppText>
            {r.substitutions.length > 0 && (
              <AppText variant="metadata" weight="regular" color={colors.textSecondary}>
                {`Puedes usar: ${r.substitutions.join(' o ')}`}
              </AppText>
            )}
          </View>
          <AppText variant="bodySmall" weight="medium" color={colors.textSecondary}>
            {r.quantity}
          </AppText>
        </View>
      ))}
      <SecondaryButton
        title={n === 1 ? 'Añadir faltante a compras' : 'Añadir faltantes a compras'}
        iconName="cart-outline"
        onPress={onAddToShopping}
        style={styles.missingBtn}
      />
    </View>
  );
}

// ── StepItem ──────────────────────────────────────────────────────────────────
export type StepState = 'done' | 'current' | 'pending';

export function StepItem({ index, text, state, onPress }: { index: number; text: string; state: StepState; onPress: () => void }) {
  const done = state === 'done';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.step, done && styles.stepDone, pressed && { opacity: 0.9 }]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={`Paso ${index}${state === 'current' ? ', paso actual' : ''}: ${text}`}
    >
      <View style={[styles.stepNum, done ? styles.stepNumDone : state === 'current' ? styles.stepNumCurrent : styles.stepNumPending]}>
        {done ? (
          <Ionicons name="checkmark" size={16} color={colors.onInk} />
        ) : (
          <AppText variant="bodySmall" weight="semibold" color={state === 'current' ? colors.onInk : colors.textPrimary}>
            {index}
          </AppText>
        )}
      </View>
      <AppText
        variant="body"
        color={done ? colors.functional.fresh.text : colors.textPrimary}
        style={[styles.stepText, done && styles.stepTextDone]}
      >
        {text}
      </AppText>
      {state === 'current' && <View pointerEvents="none" style={styles.stepRing} />}
    </Pressable>
  );
}

// ── StickyActionBar ───────────────────────────────────────────────────────────
/** StepsLoading — «El Chef IA está escribiendo los pasos…» + dos pasos fantasma (Recetas-Estados · D). */
export function StepsLoading() {
  return (
    <View style={styles.stepsLoadingWrap} accessibilityLiveRegion="polite" accessibilityState={{ busy: true }}>
      <View style={styles.stepsLoadingBanner}>
        <ActivityIndicator color={colors.tertiary} />
        <AppText variant="body" weight="medium" color={colors.onTertiaryContainer} style={styles.stepsLoadingText}>
          El Chef IA está escribiendo los pasos…
        </AppText>
      </View>
      {[1, 0.7].map((o) => (
        <View key={o} style={[styles.ghostStep, { opacity: o }]} importantForAccessibility="no-hide-descendants">
          <View style={styles.ghostDot} />
          <View style={styles.ghostLines}>
            <View style={[styles.ghostLine, { width: o === 1 ? '90%' : '80%', backgroundColor: colors.m3.surfaceContainerHigh }]} />
            <View style={[styles.ghostLine, { width: o === 1 ? '60%' : '50%' }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function StickyActionBar({ note, bottomInset, children }: { note?: string; bottomInset: number; children: React.ReactNode }) {
  return (
    <View style={[styles.sticky, { paddingBottom: Math.max(bottomInset + 12, 28) }]}>
      {note ? (
        <View style={styles.stickyNote}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <AppText variant="metadata" weight="regular" color={colors.textSecondary} style={styles.stickyNoteText}>
            {note}
          </AppText>
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  stepsLoadingWrap: {
    gap: 14,
  },
  stepsLoadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radii.alerts,
    backgroundColor: colors.tertiaryContainer,
  },
  stepsLoadingText: {
    flex: 1,
    fontSize: 15,
  },
  ghostStep: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: radii.alerts,
    backgroundColor: colors.surface,
  },
  ghostDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.m3.surfaceContainer,
  },
  ghostLines: {
    flex: 1,
    gap: 8,
    paddingTop: 4,
  },
  ghostLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.m3.surfaceContainer,
  },
  aiBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.tertiaryContainer,
  },
  aiBadgeSm: { height: 26, paddingRight: 10, gap: 5 },
  aiBadgeMd: { height: 30 },

  cover: {
    overflow: 'hidden',
  },
  halo: {
    position: 'absolute',
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.surface,
    opacity: 0.4,
  },
  plate: {
    position: 'absolute',
    alignSelf: 'center',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 12,
    borderColor: colors.background,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coverBtn: {
    borderWidth: 0,
  },

  stat: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
    gap: 4,
  },
  statTop: {
    height: 18,
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 18,
    lineHeight: 24,
  },

  section: {
    gap: 12,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  segments: {
    flexDirection: 'row',
    gap: 3,
  },
  segment: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.cards,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  ingRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.m3.surfaceContainer,
  },
  okDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.functional.fresh.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingName: {
    flex: 1,
    fontSize: 15,
  },
  badge: {
    height: 22,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    justifyContent: 'center',
  },
  link: {
    height: 44,
    justifyContent: 'center',
  },

  missing: {
    borderRadius: radii.cards,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  missingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: radii.fields,
    backgroundColor: colors.surface,
  },
  dashedDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.difficulty.medium.segment,
  },
  missingTexts: {
    flex: 1,
    gap: 2,
  },
  missingBtn: {
    minHeight: 48,
  },

  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: radii.alerts,
    backgroundColor: colors.surface,
  },
  stepDone: {
    backgroundColor: colors.functional.fresh.background,
  },
  stepNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumDone: {
    backgroundColor: colors.secondary,
  },
  stepNumCurrent: {
    backgroundColor: colors.ink,
  },
  stepNumPending: {
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  stepTextDone: {
    textDecorationLine: 'line-through',
  },
  stepRing: {
    ...StyleSheet.absoluteFill,
    borderRadius: radii.alerts,
    borderWidth: 2,
    borderColor: colors.ink,
  },

  sticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: spacing.screenGutter,
    gap: 8,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.tiles,
    borderTopRightRadius: radii.tiles,
    ...elevations.lg,
  },
  stickyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stickyNoteText: {
    flex: 1,
  },
});
