import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInventory } from '../src/hooks/useInventory';
import { Ingredient, IngredientCategory, IngredientUnit } from '../src/types';
import { AppScreen, PrimaryButton, SecondaryButton, M3Dialog, EmptyState } from '../src/components';
import { findSimilarItem } from '../src/utils/text-matching';
import { colors, radii, spacing, typography } from '../src/theme';

const UNITS: IngredientUnit[] = [
  'units',
  'grams',
  'kilograms',
  'milliliters',
  'liters',
  'package',
  'unknown',
];

const CATEGORIES: { key: IngredientCategory; label: string }[] = [
  { key: 'vegetable', label: 'Verduras' },
  { key: 'fruit', label: 'Frutas' },
  { key: 'protein', label: 'Proteínas' },
  { key: 'dairy', label: 'Lácteos / Bebidas' },
  { key: 'grain', label: 'Granos y Cereales' },
  { key: 'legume', label: 'Legumbres' },
  { key: 'sauce', label: 'Salsas y Condimentos' },
  { key: 'snack', label: 'Snacks' },
  { key: 'other', label: 'Otros' },
];

export default function ScanResultScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { items: inventoryItems, addItem, updateItem } = useInventory();
  const hasConfirmedRef = useRef(false);
  const [mergeOptions, setMergeOptions] = useState<Record<string, boolean>>({});

  const params = useLocalSearchParams<{
    scanId?: string;
    imageUri?: string;
    ingredientsData?: string;
    warningsData?: string;
  }>();

  // Parsear ingredientes reales detectados por la IA
  const [detectedItems, setDetectedItems] = useState<Ingredient[]>(() => {
    if (params.ingredientsData) {
      try {
        const parsed = JSON.parse(params.ingredientsData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: Ingredient) => ({ ...item, confirmed: true }));
        }
      } catch (e) {
        console.warn('[ScanResult] Error parseando ingredientsData:', e);
      }
    }
    return [];
  });

  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {},
  });

  // Intercepción universal de salida (BUG-16: botón físico, gestos iOS/Android, header)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (hasConfirmedRef.current || detectedItems.length === 0) {
        return;
      }

      e.preventDefault();

      setDialogConfig({
        visible: true,
        title: '¿Descartar alimentos detectados?',
        message: `Tienes ${detectedItems.length} alimento(s) sin guardar en tu inventario. Si sales ahora, se perderán estos datos.`,
        type: 'warning',
        confirmText: 'Descartar y salir',
        cancelText: 'Continuar revisando',
        onConfirm: () => {
          hasConfirmedRef.current = true;
          setDialogConfig((prev) => ({ ...prev, visible: false }));
          navigation.dispatch(e.data.action);
        },
        onCancel: () => {
          setDialogConfig((prev) => ({ ...prev, visible: false }));
        },
      });
    });

    return unsubscribe;
  }, [navigation, detectedItems.length]);

  // Mapa de coincidencias con el inventario existente
  const matchedInventoryMap = useMemo(() => {
    const map = new Map<string, Ingredient>();
    for (const item of detectedItems) {
      const match = findSimilarItem(item.name, inventoryItems);
      if (match) {
        map.set(item.id, match.item);
      }
    }
    return map;
  }, [detectedItems, inventoryItems]);

  const toggleMerge = (itemId: string) => {
    setMergeOptions((prev) => ({
      ...prev,
      [itemId]: prev[itemId] === false ? true : false,
    }));
  };

  const warnings: string[] = useMemo(() => {
    if (params.warningsData) {
      try {
        const parsed = JSON.parse(params.warningsData);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  }, [params.warningsData]);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Form states
  const [editName, setEditName] = useState('');
  const [editQty, setEditQty] = useState('1');
  const [editUnit, setEditUnit] = useState<IngredientUnit>('units');
  const [editCat, setEditCat] = useState<IngredientCategory>('vegetable');

  const toggleConfirm = (index: number) => {
    setDetectedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, confirmed: !item.confirmed } : item))
    );
  };

  const removeItem = (index: number) => {
    setDetectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const openEditModal = (index: number) => {
    const target = detectedItems[index];
    setEditingIndex(index);
    setEditName(target.name);
    setEditQty(target.quantity !== null && target.quantity !== undefined ? String(target.quantity) : '');
    setEditUnit(target.unit || 'units');
    setEditCat(target.category);
    setModalVisible(true);
  };

  const openAddManualModal = () => {
    setEditingIndex(null);
    setEditName('');
    setEditQty('1');
    setEditUnit('units');
    setEditCat('vegetable');
    setModalVisible(true);
  };

  const handleSaveModal = () => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setDialogConfig({
        visible: true,
        title: 'Nombre requerido',
        message: 'Por favor ingresa el nombre del alimento.',
        type: 'warning',
        onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }
    if (trimmedName.length > 60) {
      setDialogConfig({
        visible: true,
        title: 'Nombre demasiado largo',
        message: 'El nombre del alimento no puede exceder 60 caracteres.',
        type: 'warning',
        onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    let parsedQty: number | null = null;
    if (editQty.trim()) {
      const q = parseFloat(editQty.trim());
      if (isNaN(q) || q <= 0 || q > 99999) {
        setDialogConfig({
          visible: true,
          title: 'Cantidad inválida',
          message: 'La cantidad debe ser un número positivo mayor a 0 y menor a 99,999.',
          type: 'warning',
          onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
        });
        return;
      }
      parsedQty = q;
    }

    if (editingIndex !== null) {
      // Actualizar existente
      setDetectedItems((prev) =>
        prev.map((item, i) =>
          i === editingIndex
            ? {
                ...item,
                name: trimmedName,
                quantity: parsedQty,
                unit: editUnit,
                category: editCat,
              }
            : item
        )
      );
    } else {
      // Agregar manual
      const newItem: Ingredient = {
        id: `manual-${Date.now()}`,
        name: trimmedName,
        quantity: parsedQty,
        unit: editUnit,
        category: editCat,
        expirationDate: null,
        confidence: null,
        source: 'manual',
        confirmed: true,
      };
      setDetectedItems((prev) => [...prev, newItem]);
    }
    setModalVisible(false);
  };

  const handleConfirmAll = async () => {
    const itemsToAdd = detectedItems.filter((i) => i.confirmed);
    if (itemsToAdd.length === 0) {
      setDialogConfig({
        visible: true,
        title: 'Sin selección',
        message: 'Selecciona al menos un alimento para agregar al inventario.',
        type: 'warning',
        onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    try {
      for (const item of itemsToAdd) {
        const existing = matchedInventoryMap.get(item.id);
        const shouldMerge = existing && mergeOptions[item.id] !== false;

        if (shouldMerge && existing) {
          // 1. Sumar cantidades aritméticamente
          const existingQty = existing.quantity !== null && existing.quantity !== undefined ? existing.quantity : 1;
          const detectedQty = item.quantity !== null && item.quantity !== undefined ? item.quantity : 1;
          const mergedQty = existingQty + detectedQty;

          // 2. Regla obligatoria: conservar la fecha de vencimiento más próxima (Math.min)
          const mergedExpirationDate =
            existing.expirationDate && item.expirationDate
              ? new Date(existing.expirationDate) < new Date(item.expirationDate)
                ? existing.expirationDate
                : item.expirationDate
              : existing.expirationDate ?? item.expirationDate;

          await updateItem({
            ...existing,
            quantity: mergedQty,
            expirationDate: mergedExpirationDate,
          });
        } else {
          // Agregar como nuevo alimento
          await addItem({
            ...item,
            id: `ing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          });
        }
      }

      hasConfirmedRef.current = true;

      setDialogConfig({
        visible: true,
        title: '¡Inventario Actualizado!',
        message: `Se han procesado ${itemsToAdd.length} alimento(s) en tu inventario correctamente.`,
        type: 'success',
        confirmText: 'Ver inventario',
        onConfirm: () => {
          setDialogConfig((prev) => ({ ...prev, visible: false }));
          router.replace({ pathname: '/inventory', params: { from: 'scan' } });
        },
      });
    } catch {
      setDialogConfig({
        visible: true,
        title: 'Error al guardar',
        message: 'No se pudieron guardar los alimentos en el inventario. Inténtalo nuevamente.',
        type: 'error',
        onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
      });
    }
  };

  return (
    <AppScreen scrollable style={styles.screen}>
      {/* ── Banner de IA ── */}
      <View style={styles.headerCard}>
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={14} color={colors.primaryDark} style={{ marginRight: 5 }} />
          <Text style={styles.aiBadgeText}>Análisis de IA Completado</Text>
        </View>
        <Text style={styles.headerTitle}>Revisa los alimentos detectados</Text>
        <Text style={styles.headerSubtitle}>
          La IA propone, tú decides. Verifica las cantidades y desmarca lo que no desees guardar.
        </Text>
      </View>

      {/* ── Warnings de escaneo si existen ── */}
      {warnings.length > 0 && (
        <View style={styles.warningBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.functional.expiringSoon.text} style={{ marginRight: spacing.sm }} />
          <Text style={styles.warningText}>{warnings[0]}</Text>
        </View>
      )}

      {/* ── Lista de Ingredientes Detectados ── */}
      <View style={styles.listSection}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Alimentos identificados ({detectedItems.length})</Text>
          <Pressable
            onPress={openAddManualModal}
            style={styles.addManualBtn}
            accessibilityRole="button"
            accessibilityLabel="Agregar otro alimento manualmente"
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} style={{ marginRight: spacing.xs }} />
            <Text style={styles.addManualText}>Añadir manual</Text>
          </Pressable>
        </View>

        {detectedItems.length === 0 && (
          <EmptyState
            iconName="alert-circle-outline"
            title="No se detectaron alimentos en la foto"
            description="Prueba tomando la foto más de cerca o con mejor iluminación, o añade tu producto con el botón 'Añadir manual'."
          />
        )}

        {detectedItems.map((item, index) => {
          const similarItem = matchedInventoryMap.get(item.id);
          const isMergeChecked = mergeOptions[item.id] !== false;

          return (
            <View key={item.id} style={styles.itemCardContainer}>
              <View style={styles.itemRow}>
                {/* Checkbox de confirmación */}
                <Pressable
                  onPress={() => toggleConfirm(index)}
                  style={[styles.checkbox, item.confirmed && styles.checkboxChecked]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.confirmed }}
                >
                  {item.confirmed && <Ionicons name="checkmark" size={16} color={colors.surface} />}
                </Pressable>

                {/* Datos del ingrediente */}
                <Pressable style={styles.itemInfo} onPress={() => openEditModal(index)}>
                  <View style={styles.itemNameRow}>
                    <Text style={[styles.itemName, !item.confirmed && styles.itemUnconfirmed]}>
                      {item.name}
                    </Text>
                    {/* Badge de confianza IA (BUG-03) */}
                    {item.source === 'ai' && item.confidence !== null && item.confidence !== undefined && (
                      item.confidence < 0.6 ? (
                        <View style={styles.lowConfidenceBadge}>
                          <Ionicons name="alert-circle" size={12} color={colors.error.text} style={{ marginRight: 3 }} />
                          <Text style={styles.lowConfidenceText}>Verifica este alimento</Text>
                        </View>
                      ) : item.confidence <= 0.8 ? (
                        <View style={styles.mediumConfidenceBadge}>
                          <Text style={styles.mediumConfidenceText}>{Math.round(item.confidence * 100)}%</Text>
                        </View>
                      ) : (
                        <View style={styles.highConfidenceBadge}>
                          <Ionicons name="checkmark-circle" size={12} color={colors.functional.fresh.text} style={{ marginRight: 2 }} />
                          <Text style={styles.highConfidenceText}>{Math.round(item.confidence * 100)}%</Text>
                        </View>
                      )
                    )}
                  </View>
                  <Text style={styles.itemMeta}>
                    {item.quantity !== null && item.quantity !== undefined
                      ? `${item.quantity} ${item.unit || ''}`.trim()
                      : 'Cantidad no especificada'}
                    {item.expirationDate ? ` • Vence: ${item.expirationDate}` : ''}
                  </Text>
                </Pressable>

                {/* Acciones */}
                <Pressable
                  onPress={() => openEditModal(index)}
                  style={styles.iconBtn}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Editar alimento"
                >
                  <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={() => removeItem(index)}
                  style={styles.iconBtn}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Eliminar alimento"
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error.text} />
                </Pressable>
              </View>

              {/* Si ya existe un ítem similar en inventario */}
              {similarItem && (
                <View style={styles.similarItemContainer}>
                  <View style={styles.similarItemHeader}>
                    <Ionicons name="repeat" size={14} color={colors.primary} style={{ marginRight: 5 }} />
                    <Text style={styles.similarItemTitle}>
                      Ya en inventario: {similarItem.name} ({similarItem.quantity ?? 1} {similarItem.unit || 'uds'})
                    </Text>
                  </View>
                  <Pressable
                    style={styles.mergeCheckboxRow}
                    onPress={() => toggleMerge(item.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isMergeChecked }}
                  >
                    <View style={[styles.miniCheckbox, isMergeChecked && styles.miniCheckboxChecked]}>
                      {isMergeChecked && <Ionicons name="checkmark" size={12} color={colors.surface} />}
                    </View>
                    <Text style={styles.mergeCheckboxText}>
                      Sumar a existencia existente (+{item.quantity ?? 1} {item.unit || 'uds'}) y mantener fecha más próxima
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* ── Botones de Acción Final ── */}
      <View style={styles.bottomActions}>
        <PrimaryButton
          title={`Confirmar ${detectedItems.filter((i) => i.confirmed).length} alimentos`}
          onPress={handleConfirmAll}
          iconName="checkmark-circle"
        />
        <View style={{ height: 10 }} />
        <SecondaryButton
          title="Descartar y volver a escanear"
          variant="outline"
          onPress={() => router.back()}
        />
      </View>

      {/* ── Modal de Edición / Agregado ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingIndex !== null ? 'Ajustar alimento' : 'Añadir alimento manual'}
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Nombre del alimento *</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Ej. Tomates cherry"
                placeholderTextColor={colors.textMuted}
                maxLength={60}
                style={styles.input}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={styles.label}>Cantidad</Text>
                  <TextInput
                    value={editQty}
                    onChangeText={(val) => setEditQty(val.replace(/[^0-9.]/g, ''))}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor={colors.textMuted}
                    maxLength={8}
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Unidad</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                    {UNITS.map((u) => (
                      <Pressable
                        key={u}
                        onPress={() => setEditUnit(u)}
                        style={[styles.pill, editUnit === u && styles.pillActive]}
                      >
                        <Text style={[styles.pillText, editUnit === u && styles.pillTextActive]}>{u}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <Text style={styles.label}>Categoría</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: spacing.xl }}>
                {CATEGORIES.map((c) => (
                  <Pressable
                    key={c.key}
                    onPress={() => setEditCat(c.key)}
                    style={[styles.pill, editCat === c.key && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, editCat === c.key && styles.pillTextActive]}>{c.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <PrimaryButton title="Guardar ingrediente" onPress={handleSaveModal} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Diálogo Emergente M3 Expressive ── */}
      <M3Dialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        confirmText={dialogConfig.confirmText}
        cancelText={dialogConfig.cancelText}
        onConfirm={dialogConfig.onConfirm}
        onCancel={dialogConfig.onCancel}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  headerCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: 14,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: radii.circular,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  aiBadgeText: { color: colors.primaryDark, fontSize: typography.sizes.caption, fontWeight: '800' },
  headerTitle: { fontSize: typography.sizes.sectionTitle, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.xs },
  headerSubtitle: { fontSize: typography.sizes.bodySmall, color: colors.textSecondary, lineHeight: 20 },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.functional.expiringSoon.background,
    marginHorizontal: spacing.lg,
    marginTop: 10,
    padding: spacing.md,
    borderRadius: radii.buttons,
    borderWidth: 1,
    borderColor: colors.functional.expiringSoon.border,
  },
  warningText: { fontSize: typography.sizes.metadata, color: colors.functional.expiringSoon.text, flex: 1 },
  listSection: { marginHorizontal: spacing.lg, marginTop: 18 },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: typography.sizes.body, fontWeight: '700', color: colors.textPrimary },
  addManualBtn: { flexDirection: 'row', alignItems: 'center' },
  addManualText: { fontSize: typography.sizes.metadata, color: colors.primary, fontWeight: '700' },
  itemCardContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.cards,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  similarItemContainer: {
    backgroundColor: colors.secondaryContainer,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  similarItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  similarItemTitle: {
    fontSize: typography.sizes.label,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  mergeCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  miniCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
  },
  miniCheckboxChecked: {
    backgroundColor: colors.primary,
  },
  mergeCheckboxText: {
    fontSize: typography.sizes.label,
    color: colors.primaryDark,
    flex: 1,
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  itemInfo: { flex: 1 },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  itemName: { fontSize: typography.sizes.body, fontWeight: '600', color: colors.textPrimary },
  itemUnconfirmed: { color: colors.textMuted, textDecorationLine: 'line-through' },
  itemMeta: { fontSize: typography.sizes.label, color: colors.textSecondary, marginTop: 2 },
  highConfidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.functional.fresh.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  highConfidenceText: {
    fontSize: typography.sizes.caption,
    fontWeight: '700',
    color: colors.functional.fresh.text,
  },
  mediumConfidenceBadge: {
    backgroundColor: colors.functional.expiringSoon.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.functional.expiringSoon.border,
  },
  mediumConfidenceText: {
    fontSize: typography.sizes.caption,
    fontWeight: '700',
    color: colors.functional.expiringSoon.text,
  },
  lowConfidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lowConfidenceText: {
    fontSize: typography.sizes.caption,
    fontWeight: '700',
    color: colors.error.text,
  },
  iconBtn: { padding: 6, marginLeft: spacing.xs },
  bottomActions: { paddingHorizontal: spacing.lg, marginTop: spacing.xxl, paddingBottom: spacing.section },
  modalOverlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    padding: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: { fontSize: typography.sizes.cardTitle, fontWeight: '700', color: colors.textPrimary },
  label: { fontSize: typography.sizes.metadata, fontWeight: '600', color: colors.textPrimary, marginBottom: 6, marginTop: 10 },
  input: {
    height: 48,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.buttons,
    paddingHorizontal: 14,
    fontSize: typography.sizes.body,
    color: colors.textPrimary,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  pill: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: radii.circular,
    backgroundColor: colors.surfaceVariant,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: { backgroundColor: colors.primary },
  pillText: {
    fontSize: typography.sizes.metadata,
    fontWeight: '600',
    color: colors.textSecondary,
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 18,
  },
  pillTextActive: { color: colors.textInverse },
});
