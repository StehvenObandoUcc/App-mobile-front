import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { TextInput } from './Text';
import { DialogTitle } from './DialogTitle';
import { PrimaryButton } from './PrimaryButton';
import { IconButton } from './IconButton';
import { colors, radii, spacing, typography, elevations } from '../theme';

/**
 * AvoidIngredientsSheet — «Ingredientes a evitar» (Configuración). Escribe y agrega; cada uno es una píldora
 * que se quita con ✕. El Chef IA nunca los usa.
 */
export type AvoidIngredientsSheetProps = {
  visible: boolean;
  value: string[];
  onSave: (items: string[]) => void;
  onClose: () => void;
};

export function AvoidIngredientsSheet({ visible, value, onSave, onClose }: AvoidIngredientsSheetProps) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<string[]>(value);
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (visible) {
      setItems(value);
      setText('');
    }
    // Solo al abrir: si la pantalla vuelve a leer la configuración mientras editas, no se pierde lo escrito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const add = () => {
    const parts = text.split(',').map((t) => t.trim()).filter(Boolean);
    if (parts.length === 0) return;
    setItems((prev) => {
      const lower = new Set(prev.map((p) => p.toLowerCase()));
      return [...prev, ...parts.filter((p) => !lower.has(p.toLowerCase()))].slice(0, 20);
    });
    setText('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <DialogTitle title="Ingredientes a" emphasis="evitar" size={24} lineHeight={30} />
          <AppText variant="bodySmall" color={colors.textSecondary}>
            Alergias o cosas que no comes. El Chef IA nunca los usará.
          </AppText>
          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              onSubmitEditing={add}
              placeholder="Ej. maní, cilantro"
              placeholderTextColor={colors.textMuted}
              maxLength={80}
              returnKeyType="done"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={[styles.input, focused && styles.inputFocused]}
              accessibilityLabel="Ingrediente a evitar"
            />
            <IconButton iconName="add" variant="ink" accessibilityLabel="Agregar ingrediente a evitar" onPress={add} />
          </View>
          <View style={styles.chips}>
            {items.length === 0 ? (
              <AppText variant="metadata" weight="regular" color={colors.textSecondary}>
                Ninguno por ahora.
              </AppText>
            ) : (
              items.map((it) => (
                <Pressable
                  key={it}
                  onPress={() => setItems((prev) => prev.filter((p) => p !== it))}
                  style={styles.chip}
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar ${it}`}
                >
                  <AppText variant="bodySmall" weight="semibold" color={colors.functional.expired.text}>
                    {it}
                  </AppText>
                  <Ionicons name="close" size={16} color={colors.functional.expired.text} />
                </Pressable>
              ))
            )}
          </View>
          <PrimaryButton
            title="Guardar"
            iconName="checkmark"
            onPress={() => {
              const pending = text.split(',').map((t) => t.trim()).filter(Boolean);
              onSave([...items, ...pending.filter((p) => !items.some((i) => i.toLowerCase() === p.toLowerCase()))].slice(0, 20));
              onClose();
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.scrim,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.containers,
    borderTopRightRadius: radii.containers,
    paddingTop: 10,
    paddingHorizontal: spacing.screenGutter,
    gap: 12,
    ...elevations.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.m3.outline,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 56,
    paddingHorizontal: 16,
    borderRadius: radii.fields,
    borderWidth: 1,
    borderColor: colors.m3.outline,
    fontSize: typography.sizes.body,
    color: colors.textPrimary,
  },
  inputFocused: {
    borderWidth: 2,
    borderColor: colors.ink,
    paddingHorizontal: 15,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 24,
  },
  chip: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.functional.expired.background,
  },
});
