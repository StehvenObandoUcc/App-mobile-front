import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
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
import { colors, radii, spacing } from '../src/theme';

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
  type: 'info' | 'warning' | 'error' | 'success';
  confirmText?: string;
  confirmTone?: 'ink' | 'danger';
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  summary?: { value: number; label: string }[];
};

const round = (n: number) => Math.round(n * 1000) / 1000;

export default function ScanResultScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { items: inventoryItems, addItem, updateItem } = useInventory();
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

  const [dialog, setDialog] = useState<DialogState>({ visible: false, title: '', message: '', type: 'info', onConfirm: () => {} });
  const closeDialog = () => setDialog((prev) => ({ ...prev, visible: false }));

  // Salir sin guardar (botón físico, gesto, «Descartar») pide confirmación.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (hasConfirmedRef.current || detectedItems.length === 0) return;
      e.preventDefault();
      const n = detectedItems.length;
      setDialog({
        visible: true,
        title: '¿Descartar',
        titleEmphasis: n === 1 ? 'este alimento?' : `${n} alimentos?`,
        message: n === 1 ? 'Aún no se guarda en tu despensa. Si sales ahora, se pierde.' : 'Aún no se guardan en tu despensa. Si sales ahora, se pierden.',
        type: 'warning',
        confirmText: 'Descartar',
        confirmTone: 'danger',
        cancelText: 'Seguir revisando',
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
      if (match) map.set(item.id, match.item);
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
    setDialog({ visible: true, title, titleEmphasis, message, type: 'warning', onConfirm: closeDialog });

  const handleSaveSheet = () => {
    const trimmed = name.trim();
    if (!trimmed) return warn('Falta el', 'nombre', 'Escribe el nombre del alimento.');
    if (trimmed.length > 60) return warn('Nombre muy', 'largo', 'El nombre no puede pasar de 60 caracteres.');
    let qty: number | null = null;
    if (quantity.trim()) {
      const q = parseFloat(quantity.trim().replace(',', '.'));
      if (isNaN(q) || q <= 0 || q > 99999) return warn('Cantidad', 'inválida', 'Usa un número mayor que 0 y menor que 99 999.');
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
    if (selected.length === 0) return warn('Marca al menos', 'un alimento', 'Solo se guardan los alimentos marcados.');
    let added = 0;
    let merged = 0;
    try {
      for (const item of selected) {
        const existing = matchedInventoryMap.get(item.id);
        const wantsMerge = existing && mergeOptions[item.id] !== false;
        // Se suma en la unidad de la despensa (g↔kg, ml↔L). Si las unidades no son compatibles, se guarda aparte.
        const extra =
          wantsMerge && existing
            ? convertQuantity(item.quantity ?? 1, item.unit, existing.unit)
            : null;
        if (wantsMerge && existing && extra !== null) {
          await updateItem({
            ...existing,
            quantity: round((existing.quantity ?? 1) + extra),
            expirationDate: earliestISODate(existing.expirationDate, item.expirationDate),
          });
          merged += 1;
        } else {
          await addItem({ ...item, id: `ing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` });
          added += 1;
        }
      }
      hasConfirmedRef.current = true;
      setDialog({
        visible: true,
        title: '¡Despensa',
        titleEmphasis: 'actualizada!',
        message: '',
        type: 'success',
        confirmText: 'Ver despensa',
        summary: [
          ...(added > 0 ? [{ value: added, label: added === 1 ? 'alimento nuevo' : 'alimentos nuevos' }] : []),
          ...(merged > 0 ? [{ value: merged, label: merged === 1 ? 'sumado a uno que ya tenías' : 'sumados a los que ya tenías' }] : []),
        ],
        onConfirm: () => {
          closeDialog();
          router.replace({ pathname: '/inventory', params: { from: 'scan' } });
        },
      });
    } catch {
      setDialog({
        visible: true,
        title: 'No se pudo',
        titleEmphasis: 'guardar',
        message: 'Tus alimentos siguen aquí. Inténtalo de nuevo.',
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
        <IconButton iconName="chevron-back" accessibilityLabel="Volver a la cámara" onPress={() => router.back()} />
        <View style={styles.empty}>
          <IllustrationBlob iconName="scan-outline" tone="ai" size="lg" />
          <AppText weight="light" align="center" style={styles.emptyTitle} accessibilityRole="header">
            {detectedCount === 0 ? 'No encontramos ' : 'Quitaste todos los '}
            <AppText weight="semibold">alimentos</AppText>
          </AppText>
          <AppText variant="body" color={colors.textSecondary} align="center" style={styles.emptyText}>
            {detectedCount === 0
              ? 'Prueba tomando la foto más de cerca o con mejor iluminación, o añade tu producto a mano.'
              : 'Toma otra foto o añade tus productos a mano.'}
          </AppText>
          <View style={styles.emptyActions}>
            <PrimaryButton title="Tomar otra foto" onPress={() => router.back()} />
            <SecondaryButton title="Añadir manual" variant="outline" onPress={openAddManual} />
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
        <IconButton iconName="chevron-back" accessibilityLabel="Volver a la cámara" onPress={() => router.back()} />

        <View style={styles.header}>
          <AiBadge label="Análisis de IA completado" />
          <AppText weight="light" style={styles.title} accessibilityRole="header">
            {'Revisa lo '}
            <AppText weight="semibold">detectado</AppText>
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
            Los alimentos que no marques no se guardarán.
          </AppText>
        </View>

        {warnings.length > 0 && (
          <View style={styles.warning} accessibilityRole="alert">
            <Ionicons name="information-circle-outline" size={18} color={colors.functional.expiringSoon.text} />
            <AppText variant="metadata" weight="regular" color={colors.functional.expiringSoon.text} style={styles.flex}>
              {warnings[0]}
            </AppText>
          </View>
        )}

        <View style={styles.countRow}>
          <AppText variant="metadata" weight="semibold" color={colors.textSecondary} style={styles.flex}>
            {`${detectedItems.length} ${detectedItems.length === 1 ? 'detectado' : 'detectados'} · ${selected.length} ${
              selected.length === 1 ? 'seleccionado' : 'seleccionados'
            }`}
          </AppText>
          <SecondaryButton title="Añadir manual" iconName="add" variant="tint" onPress={openAddManual} style={styles.addBtn} />
        </View>

        <View style={styles.list}>
          {detectedItems.map((item) => (
            <DetectedItemCard
              key={item.id}
              item={item}
              existing={matchedInventoryMap.get(item.id)}
              mergeChecked={mergeOptions[item.id] !== false}
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
          title={selected.length === 1 ? 'Confirmar 1 alimento' : `Confirmar ${selected.length} alimentos`}
          onPress={handleConfirmAll}
          disabled={selected.length === 0}
        />
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.discard, pressed && styles.discardPressed]}
          accessibilityRole="button"
        >
          <AppText variant="body" weight="semibold" color={colors.m3.error} style={styles.discardText}>
            Descartar y volver a escanear
          </AppText>
        </Pressable>
      </StickyActionBar>

      {overlays}
    </View>
  );
}

const styles = StyleSheet.create({
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
  title: {
    fontSize: 30,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radii.fields,
    backgroundColor: colors.functional.expiringSoon.background,
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
  discard: {
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardPressed: {
    backgroundColor: colors.m3.errorContainer,
  },
  discardText: {
    fontSize: 15,
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
  emptyTitle: {
    fontSize: 26,
    lineHeight: 32,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
  },
  emptyActions: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 8,
  },
  summary: {
    gap: 8,
  },
});
