import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { ToggleSwitch } from './ToggleSwitch';
import { colors, radii } from '../theme';

/**
 * SettingsSection + SettingsRow — Configuracion.dc.html.
 * Sección: rótulo en mayúsculas 13/600 y tarjeta blanca radio 24.
 * Fila: 64 dp, icono 40 (radio 13) en su pastel, título 16/600, subtítulo 13, y a la derecha
 * chevron · valor + chevron · interruptor · botón · nada. Destructiva = título rojo.
 */
export function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="metadata" weight="semibold" color={colors.textSecondary} style={styles.sectionTitle} accessibilityRole="header">
        {title.toUpperCase()}
      </AppText>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export type SettingsTrailing =
  | { type: 'chevron' }
  | { type: 'value'; text: string }
  | { type: 'toggle'; value: boolean; onChange?: (v: boolean) => void; disabled?: boolean }
  | { type: 'button'; label: string; onPress: () => void; busy?: boolean }
  | { type: 'none' };

export type SettingsRowProps = {
  iconName: keyof typeof Ionicons.glyphMap;
  tone: { background: string; text: string };
  title: string;
  subtitle?: string;
  trailing?: SettingsTrailing;
  onPress?: () => void;
  destructive?: boolean;
  /** Filete inferior (todas menos la última de la tarjeta). */
  divider?: boolean;
  accessibilityHint?: string;
};

export function SettingsRow({
  iconName,
  tone,
  title,
  subtitle,
  trailing = { type: 'chevron' },
  onPress,
  destructive = false,
  divider = false,
  accessibilityHint,
}: SettingsRowProps) {
  const isToggle = trailing.type === 'toggle';
  const press = onPress ?? (isToggle && trailing.onChange && !trailing.disabled ? () => trailing.onChange!(!trailing.value) : undefined);
  // Sin acción propia (p. ej. la fila solo tiene un botón a la derecha) la fila es un View:
  // así el lector de pantalla puede llegar al botón interno.
  if (!press) {
    return (
      <View style={[styles.row, divider && styles.divider]}>
        <View style={[styles.icon, { backgroundColor: tone.background }]}>
          <Ionicons name={iconName} size={20} color={tone.text} />
        </View>
        <View style={styles.texts} accessible accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}>
          <AppText variant="body" weight="semibold" color={destructive ? colors.m3.error : colors.textPrimary}>
            {title}
          </AppText>
          {!!subtitle && (
            <AppText variant="metadata" weight="regular" color={colors.textSecondary}>
              {subtitle}
            </AppText>
          )}
        </View>
        {trailing.type === 'toggle' && (
          <ToggleSwitch value={trailing.value} disabled accessibilityLabel={title} accessibilityHint={accessibilityHint} />
        )}
        {trailing.type === 'button' && (
          <Pressable
            onPress={trailing.onPress}
            disabled={trailing.busy}
            style={({ pressed }) => [styles.button, (pressed || trailing.busy) && styles.buttonPressed]}
            accessibilityRole="button"
            accessibilityLabel={trailing.label}
          >
            <AppText variant="bodySmall" weight="semibold">
              {trailing.busy ? 'Sincronizando…' : trailing.label}
            </AppText>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <Pressable
      onPress={press}
      style={({ pressed }) => [styles.row, divider && styles.divider, pressed && styles.pressed]}
      accessibilityRole={isToggle ? 'switch' : 'button'}
      accessibilityState={isToggle ? { checked: trailing.value, disabled: trailing.disabled } : undefined}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}${trailing.type === 'value' ? `. ${trailing.text}` : ''}` : title}
      accessibilityHint={accessibilityHint}
    >
      <View style={[styles.icon, { backgroundColor: tone.background }]}>
        <Ionicons name={iconName} size={20} color={tone.text} />
      </View>
      <View style={styles.texts}>
        <AppText variant="body" weight="semibold" color={destructive ? colors.m3.error : colors.textPrimary}>
          {title}
        </AppText>
        {!!subtitle && (
          <AppText variant="metadata" weight="regular" color={colors.textSecondary}>
            {subtitle}
          </AppText>
        )}
      </View>
      {trailing.type === 'chevron' && <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
      {trailing.type === 'value' && (
        <View style={styles.value}>
          <AppText variant="bodySmall" weight="semibold">
            {trailing.text}
          </AppText>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </View>
      )}
      {trailing.type === 'toggle' && (
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden pointerEvents="none">
          <ToggleSwitch value={trailing.value} disabled={trailing.disabled} accessibilityLabel={title} onChange={() => {}} />
        </View>
      )}
      {trailing.type === 'button' && (
        <Pressable
          onPress={trailing.onPress}
          disabled={trailing.busy}
          style={({ pressed }) => [styles.button, (pressed || trailing.busy) && styles.buttonPressed]}
          accessibilityRole="button"
          accessibilityLabel={trailing.label}
        >
          <AppText variant="bodySmall" weight="semibold">
            {trailing.busy ? 'Sincronizando…' : trailing.label}
          </AppText>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  sectionTitle: {
    paddingLeft: 4,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingVertical: 4,
    paddingHorizontal: 14,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.m3.surfaceContainer,
  },
  pressed: {
    opacity: 0.7,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  value: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  button: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: colors.m3.surfaceContainer,
  },
});
