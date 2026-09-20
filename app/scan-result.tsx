import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInventory } from '../src/hooks/useInventory';
import { Ingredient, IngredientCategory, IngredientUnit } from '../src/types';
import { AppScreen, PrimaryButton, SecondaryButton } from '../src/components';
import { findSimilarItem } from '../src/utils/text-matching';

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

  // Intercepción universal de salida (BUG-16: botón físico, gestos iOS/Android, header)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (hasConfirmedRef.current || detectedItems.length === 0) {
        return;
      }

      e.preventDefault();

      Alert.alert(
        '¿Descartar alimentos detectados?',
        `Tienes ${detectedItems.length} alimento(s) sin guardar en tu inventario. Si sales ahora, se perderán estos datos.`,
        [
          { text: 'Continuar revisando', style: 'cancel' },
          {
            text: 'Descartar y salir',
            style: 'destructive',
            onPress: () => {
              hasConfirmedRef.current = true;
              navigation.dispatch(e.data.action);
            },
          },
        ]
      );
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
    if (!editName.trim()) {
      Alert.alert('Campo requerido', 'Ingresa el nombre del alimento.');
      return;
    }
    const parsedQty = editQty.trim() ? parseFloat(editQty) : null;

    if (editingIndex !== null) {
      // Actualizar existente
      setDetectedItems((prev) =>
        prev.map((item, i) =>
          i === editingIndex
            ? {
                ...item,
                name: editName.trim(),
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
        name: editName.trim(),
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
      Alert.alert('Sin selección', 'Selecciona al menos un alimento para agregar al inventario.');
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
            id: `ing-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          });
        }
      }

      hasConfirmedRef.current = true;

      Alert.alert(
        '¡Inventario Actualizado!',
        `Se han procesado ${itemsToAdd.length} alimento(s) en tu inventario correctamente.`,
        [
          {
            text: 'Ver inventario',
            onPress: () => {
              router.replace({ pathname: '/inventory', params: { from: 'scan' } });
            },
          },
        ]
      );
    } catch {
      Alert.alert('Error', 'No se pudieron guardar todos los alimentos.');
    }
  };

  return (
    <AppScreen scrollable style={styles.screen}>
      {/* ── Banner de IA ── */}
      <View style={styles.headerCard}>
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
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
          <Ionicons name="information-circle-outline" size={18} color="#D97706" style={{ marginRight: 8 }} />
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
            <Ionicons name="add-circle-outline" size={18} color="#059669" style={{ marginRight: 4 }} />
            <Text style={styles.addManualText}>Añadir manual</Text>
          </Pressable>
        </View>

        {detectedItems.length === 0 && (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <Ionicons name="alert-circle-outline" size={36} color="#9CA3AF" style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151', textAlign: 'center' }}>
              No se detectaron alimentos en la foto
            </Text>
            <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 4, paddingHorizontal: 20 }}>
              Prueba tomando la foto más de cerca o con mejor iluminación, o añade tu producto con el botón "Añadir manual".
            </Text>
          </View>
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
                  {item.confirmed && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
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
                          <Ionicons name="alert-circle" size={12} color="#DC2626" style={{ marginRight: 3 }} />
                          <Text style={styles.lowConfidenceText}>Verifica este alimento</Text>
                        </View>
                      ) : item.confidence <= 0.8 ? (
                        <View style={styles.mediumConfidenceBadge}>
                          <Text style={styles.mediumConfidenceText}>{Math.round(item.confidence * 100)}%</Text>
                        </View>
                      ) : (
                        <View style={styles.highConfidenceBadge}>
                          <Ionicons name="checkmark-circle" size={12} color="#059669" style={{ marginRight: 2 }} />
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
                <Pressable onPress={() => openEditModal(index)} style={styles.iconBtn}>
                  <Ionicons name="pencil-outline" size={18} color="#6B7280" />
                </Pressable>
                <Pressable onPress={() => removeItem(index)} style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </Pressable>
              </View>

              {/* Si ya existe un ítem similar en inventario */}
              {similarItem && (
                <View style={styles.similarItemContainer}>
                  <View style={styles.similarItemHeader}>
                    <Ionicons name="repeat" size={14} color="#059669" style={{ marginRight: 5 }} />
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
                      {isMergeChecked && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
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
                <Ionicons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Nombre del alimento *</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Ej. Tomates cherry"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Cantidad</Text>
                  <TextInput
                    value={editQty}
                    onChangeText={setEditQty}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor="#9CA3AF"
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 20 }}>
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
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F9FAFB' },
  headerCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  aiBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  warningText: { fontSize: 13, color: '#B45309', flex: 1 },
  listSection: { marginHorizontal: 16, marginTop: 18 },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  addManualBtn: { flexDirection: 'row', alignItems: 'center' },
  addManualText: { fontSize: 13, color: '#059669', fontWeight: '600' },
  itemCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  similarItemContainer: {
    backgroundColor: '#F0FDF4',
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  similarItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  similarItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
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
    borderColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  miniCheckboxChecked: {
    backgroundColor: '#059669',
  },
  mergeCheckboxText: {
    fontSize: 12,
    color: '#047857',
    flex: 1,
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: { backgroundColor: '#10B981', borderColor: '#10B981' },
  itemInfo: { flex: 1 },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  itemName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  itemUnconfirmed: { color: '#9CA3AF', textDecorationLine: 'line-through' },
  itemMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  highConfidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  highConfidenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  mediumConfidenceBadge: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  mediumConfidenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  lowConfidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  lowConfidenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  iconBtn: { padding: 6, marginLeft: 4 },
  bottomActions: { paddingHorizontal: 16, marginTop: 24, paddingBottom: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 10 },
  input: {
    height: 48,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  pill: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: { backgroundColor: '#10B981' },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 18,
  },
  pillTextActive: { color: '#FFFFFF' },
});
