import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInventory } from '../src/hooks/useInventory';
import { Ingredient, IngredientCategory, IngredientUnit } from '../src/types';
import {
  AppText,
  IconButton,
  PrimaryButton,
  SecondaryButton,
  M3Dialog,
  AiBadge,
  StickyActionBar,
  DetectedItemCard,
  IllustrationBlob,
  IngredientFormSheet,
  M3DatePickerModal,
  SummaryRow,
} from '../src/components';
import { findSimilarItem } from '../src/utils/text-matching';
import { convertQuantity } from '../src/utils/consumption';
import { earliestISODate } from '../src/utils/dates';
import { radii, spacing } from '../src/theme';
import { useTheme, makeStyles } from '../src/theme/ThemeProvider';
import { useI18n } from '../src/i18n';

/**
 * Resultado del escaneo (Escaneo-Resultado.dc.html + Escaneo-Resultado-Estados.dc.html).
 * Lista de DetectedItemCard, «Añadir manual», barra fija «Confirmar N alimentos».
 * Estados: nada detectado (A) y éxito con desglose (B, M3Dialog + SummaryRow).
 */
type DialogState = {
  visible: boolean;
  title: string;
  titleEmphasis?: string;
  message: string;
  type: 'neutral' | 'ai' | 'warning' | 'error' | 'success';
  confirmText?: string;
  confirmTone?: 'ink' | 'danger';
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  summary?: { value: number; label: string }[];
};

const round = (n: number) => Math.round(n * 1000) / 1000;

export default function ScanResultScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { items: inventoryItems, addItem, updateItem } = useInventory();
  const { t, tp } = useI18n();
  const hasConfirmedRef = useRef(false);
  const [mergeOptions, setMergeOptions] = useState<Record<string, boolean>>({});

  const params = useLocalSearchParams<{
    scanId?: string;
    imageUri?: string;
    ingredientsData?: string;
    warningsData?: string;
  }>();

  // Ingredientes reales detectados por la IA (todos marcados al llegar)
  const [detectedItems, setDetectedItems] = useState<Ingredient[]>(() => {
    if (params.ingredientsData) {
      try {
        const parsed = JSON.parse(params.ingredientsData);
        if (Array.isArray(parsed)) return parsed.map((item: Ingredient) => ({ ...item, confirmed: true }));
      } catch (e) {
        console.warn('[ScanResult] Error parseando ingredientsData:', e);
      }
    }
    return [];
  });
  const detectedCount = useRef(detectedItems.length).current;

  const [dialog, setDialog] = useState<DialogState>({ visible: false, title: '', message: '', type: 'neutral', onConfirm: () => {} });
  const closeDialog = () => setDialog((prev) => ({ ...prev, visible: false }));

  // Salir sin guardar (botón físico, gesto, «Descartar») pide confirmación.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (hasConfirmedRef.current || detectedItems.length === 0) return;
      e.preventDefault();
      const n = detectedItems.length;
      setDialog({
        visible: true,
        title: t('screensFlow.scanResult.discardTitle'),
        titleEmphasis: tp('screensFlow.scanResult.discardEmphasis', n),
        message: tp('screensFlow.scanResult.discardMessage', n),
        type: 'error',
        confirmText: t('screensFlow.scanResult.discardConfirm'),
        confirmTone: 'danger',
        cancelText: t('screensFlow.scanResult.keepReviewing'),
        onConfirm: () => {
          hasConfirmedRef.current = true;
          closeDialog();
          navigation.dispatch(e.data.action);
        },
        onCancel: closeDialog,
      });
    });
    return unsubscribe;
  }, [navigation, detectedItems.length]);

  // Coincidencias con la despensa (para ofrecer «Sumar»)
  const matchedInventoryMap = useMemo(() => {
    const map = new Map<string, Ingredient>();
    for (const item of detectedItems) {
      const match = findSimilarItem(item.name, inventoryItems);
      // Solo se ofrece «Sumar» con coincidencias exactas; las parecidas se guardan aparte.
      if (match && match.isExact) map.set(item.id, match.item);
    }
    return map;
  }, [detectedItems, inventoryItems]);

  const warnings: string[] = useMemo(() => {
    try {
      const parsed = params.warningsData ? JSON.parse(params.warningsData) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [params.warningsData]);

  // ── Hoja de edición / alta manual (la misma de la Despensa) ──
  const [sheetVisible, setSheetVisible] = useState(false);
  const [dateVisible, setDateVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState<IngredientUnit>('units');
  const [category, setCategory] = useState<IngredientCategory>('vegetable');
  const [expirationDate, setExpirationDate] = useState('');

  const openEdit = (item: Ingredient) => {
    setEditingId(item.id);
    setName(item.name);
    setQuantity(item.quantity !== null && item.quantity !== undefined ? String(item.quantity) : '');
    setUnit(item.unit || 'units');
    setCategory(item.category);
    setExpirationDate(item.expirationDate ?? '');
    setSheetVisible(true);
  };

  const openAddManual = () => {
    setEditingId(null);
    setName('');
    setQuantity('1');
    setUnit('units');
    setCategory('vegetable');
    setExpirationDate('');
    setSheetVisible(true);
  };

  const warn = (title: string, titleEmphasis: string, message: string) =>
    setDialog({ visible: true, title, titleEmphasis, message, type: 'neutral', onConfirm: closeDialog });

  const handleSaveSheet = () => {
    const trimmed = name.trim();
    if (!trimmed) return warn(t('screensFlow.scanResult.noNameTitle'), t('screensFlow.scanResult.noNameEmphasis'), t('screensFlow.scanResult.noNameMessage'));
    if (trimmed.length > 60) return warn(t('screensFlow.scanResult.nameTooLongTitle'), t('screensFlow.scanResult.nameTooLongEmphasis'), t('screensFlow.scanResult.nameTooLongMessage'));
    let qty: number | null = null;
    if (quantity.trim()) {
      const q = parseFloat(quantity.trim().replace(',', '.'));
      if (isNaN(q) || q <= 0 || q > 99999) return warn(t('screensFlow.scanResult.quantityInvalidTitle'), t('screensFlow.scanResult.quantityInvalidEmphasis'), t('screensFlow.scanResult.quantityInvalidMessage'));
      qty = q;
    }
    const patch = { name: trimmed, quantity: qty, unit, category, expirationDate: expirationDate || null };
    if (editingId) {
      setDetectedItems((prev) => prev.map((it) => (it.id === editingId ? { ...it, ...patch } : it)));
    } else {
      setDetectedItems((prev) => [
        ...prev,
        { id: `manual-${Date.now()}`, ...patch, confidence: null, source: 'manual', confirmed: true },
      ]);
    }
    setSheetVisible(false);
  };

  const toggleConfirm = (id: string) =>
    setDetectedItems((prev) => prev.map((it) => (it.id === id ? { ...it, confirmed: !it.confirmed } : it)));
  const removeItem = (id: string) => setDetectedItems((prev) => prev.filter((it) => it.id !== id));
  const toggleMerge = (id: string) => setMergeOptions((prev) => ({ ...prev, [id]: prev[id] === false }));

  const selected = detectedItems.filter((i) => i.confirmed);

  const handleConfirmAll = async () => {
    if (selected.length === 0) return warn(t('screensFlow.scanResult.pickOneTitle'), t('screensFlow.scanResult.pickOneEmphasis'), t('screensFlow.scanResult.pickOneMessage'));
    let added = 0;
    let merged = 0;
    try {
      // Estado acumulado por alimento de la despensa: si dos detectados caen en el mismo, se suman ambos.
      const mergedById = new Map<string, Ingredient>();
      for (const item of selected) {
        const original = matchedInventoryMap.get(item.id);
        const existing = original ? mergedById.get(original.id) ?? original : undefined;
        const wantsMerge = Boolean(existing) && mergeOptions[item.id] !== false;
        // Agotado (0) o sin cantidad: se repone con la cantidad, unidad y fecha nuevas.
        const restocking = Boolean(existing) && (existing!.quantity === 0 || existing!.quantity === null);
        // Se suma en la unidad de la despensa (g↔kg, ml↔L). Si las unidades no son compatibles, se guarda aparte.
        const extra =
          wantsMerge && existing && !restocking && item.quantity !== null
            ? convertQuantity(item.quantity, item.unit, existing.unit)
            : null;
        if (wantsMerge && existing && (restocking || extra !== null || item.quantity === null)) {
          const next: Ingredient = restocking
            ? { ...existing, quantity: item.quantity, unit: item.unit, expirationDate: item.expirationDate ?? null }
            : {
                ...existing,
                quantity: extra !== null && existing.quantity !== null ? round(existing.quantity + extra) : existing.quantity,
                expirationDate: earliestISODate(existing.expirationDate, item.expirationDate),
              };
          mergedById.set(existing.id, next);
          merged += 1;
        } else {
          await addItem({ ...item, id: `ing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` });
          added += 1;
        }
      }
      for (const next of mergedById.values()) {
        await updateItem(next);
      }
      hasConfirmedRef.current = true;
      setDialog({
        visible: true,
        title: t('screensFlow.scanResult.savedTitle'),
        titleEmphasis: t('screensFlow.scanResult.savedEmphasis'),
        message: '',
        type: 'success',
        confirmText: t('screensFlow.scanResult.viewPantry'),
        summary: [
          ...(added > 0 ? [{ value: added, label: tp('screensFlow.scanResult.summaryAdded', added) }] : []),
          ...(merged > 0 ? [{ value: merged, label: tp('screensFlow.scanResult.summaryMerged', merged) }] : []),
        ],
        onConfirm: () => {
          closeDialog();
          router.replace({ pathname: '/inventory', params: { from: 'scan' } });
        },
      });
    } catch {
      setDialog({
        visible: true,
        title: t('screensFlow.scanResult.saveFailTitle'),
        titleEmphasis: t('screensFlow.scanResult.saveFailEmphasis'),
        message: t('screensFlow.scanResult.saveFailMessage'),
        type: 'error',
        onConfirm: closeDialog,
      });
    }
  };

  const overlays = (
    <>
      <IngredientFormSheet
        visible={sheetVisible}
        mode={editingId ? 'edit' : 'add'}
        values={{ name, quantity, unit, category, expirationDate }}
        onChange={(key, value) => {
          if (key === 'name') setName(value as string);
          else if (key === 'quantity') setQuantity(value as string);
          else if (key === 'unit') setUnit(value as IngredientUnit);
          else if (key === 'category') setCategory(value as IngredientCategory);
          else if (key === 'expirationDate') setExpirationDate(value as string);
        }}
        onSubmit={handleSaveSheet}
        onClose={() => setSheetVisible(false)}
        onOpenCalendar={() => setDateVisible(true)}
      />
      <M3DatePickerModal visible={dateVisible} value={expirationDate} onChange={setExpirationDate} onClose={() => setDateVisible(false)} />
      <M3Dialog
        visible={dialog.visible}
        title={dialog.title}
        titleEmphasis={dialog.titleEmphasis}
        message={dialog.message}
        type={dialog.type}
        confirmText={dialog.confirmText}
        confirmTone={dialog.confirmTone}
        cancelText={dialog.cancelText}
        onConfirm={dialog.onConfirm}
        onCancel={dialog.onCancel}
        hero={Boolean(dialog.summary)}
      >
        {dialog.summary && dialog.summary.length > 0 ? (
          <View style={styles.summary}>
            {dialog.summary.map((s) => (
              <SummaryRow key={s.label} value={s.value} label={s.label} />
            ))}
          </View>
        ) : null}
      </M3Dialog>
    </>
  );

  // ── A · Nada detectado ──
  if (detectedItems.length === 0) {
    return (
      <View style={[styles.screen, styles.emptyScreen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
        <IconButton iconName="chevron-back" variant="white" accessibilityLabel={t('screensFlow.scanResult.backToCameraA11y')} onPress={() => router.back()} />
        <View style={styles.empty}>
          <IllustrationBlob iconName="scan-outline" tone="ai" size="lg" />
          <AppText variant="headline" weight="light" align="center" accessibilityRole="header">
            {detectedCount === 0 ? t('screensFlow.scanResult.emptyTitleNone') : t('screensFlow.scanResult.emptyTitleRemoved')}
            <AppText weight="semibold">{t('screensFlow.scanResult.emptyBold')}</AppText>
          </AppText>
          <AppText variant="body" color={colors.textSecondary} align="center">
            {detectedCount === 0
              ? t('screensFlow.scanResult.emptyTextNone')
              : t('screensFlow.scanResult.emptyTextRemoved')}
          </AppText>
          <View style={styles.emptyActions}>
            <PrimaryButton title={t('screensFlow.scanResult.takeAnother')} onPress={() => router.back()} />
            <SecondaryButton title={t('screensFlow.scanResult.addManual')} variant="outline" onPress={openAddManual} />
          </View>
        </View>
        {overlays}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 170 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <IconButton iconName="chevron-back" variant="white" accessibilityLabel={t('screensFlow.scanResult.backToCameraA11y')} onPress={() => router.back()} />

        <View style={styles.header}>
          <AiBadge label={t('screensFlow.scanResult.aiBadge')} />
          <AppText variant="screenTitle" weight="light" accessibilityRole="header">
            {t('screensFlow.scanResult.reviewTitleLight')}
            <AppText weight="semibold">{t('screensFlow.scanResult.reviewTitleBold')}</AppText>
          </AppText>
          <AppText variant="body" color={colors.textSecondary}>
            {t('screensFlow.scanResult.reviewSubtitle')}
          </AppText>
        </View>

        {warnings.length > 0 && (
          <View style={styles.warning} accessibilityRole="alert">
            <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
            <AppText variant="metadata" weight="regular" color={colors.textPrimary} style={styles.flex}>
              {warnings[0]}
            </AppText>
          </View>
        )}

        <View style={styles.countRow}>
          <AppText variant="metadata" weight="semibold" color={colors.textSecondary} style={styles.flex}>
            {`${tp('screensFlow.scanResult.countDetected', detectedItems.length)} · ${tp('screensFlow.scanResult.countSelected', selected.length)}`}
          </AppText>
          <SecondaryButton title={t('screensFlow.scanResult.addManual')} iconName="add" variant="tint" onPress={openAddManual} style={styles.addBtn} />
        </View>

        <View style={styles.list}>
          {detectedItems.map((item) => (
            <DetectedItemCard
              key={item.id}
              item={item}
              existing={matchedInventoryMap.get(item.id)}
              mergeChecked={mergeOptions[item.id] !== false}
              mergeCompatible={(() => {
                const ex = matchedInventoryMap.get(item.id);
                if (!ex || ex.quantity === null || ex.quantity === 0 || item.quantity === null) return true;
                return convertQuantity(item.quantity, item.unit, ex.unit) !== null;
              })()}
              onToggleMerge={() => toggleMerge(item.id)}
              onToggle={() => toggleConfirm(item.id)}
              onEdit={() => openEdit(item)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </View>
      </ScrollView>

      <StickyActionBar bottomInset={insets.bottom}>
        <PrimaryButton
          title={tp('screensFlow.scanResult.confirm', selected.length)}
          onPress={handleConfirmAll}
          disabled={selected.length === 0}
        />
        <SecondaryButton
          title={t('screensFlow.scanResult.discardAndRescan')}
          variant="text"
          tone="danger"
          onPress={() => router.back()}
        />
      </StickyActionBar>

      {overlays}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 0,
  },
  content: {
    paddingHorizontal: spacing.screenGutter,
    gap: 16,
  },
  header: {
    gap: 8,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radii.fields,
    backgroundColor: colors.surfaceVariant,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addBtn: {
    height: 48,
    paddingHorizontal: 16,
  },
  list: {
    gap: 10,
  },
  emptyScreen: {
    paddingHorizontal: spacing.screenGutter,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 8,
    paddingBottom: 40,
  },
  emptyActions: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 8,
  },
  summary: {
    gap: 8,
  },
}));
