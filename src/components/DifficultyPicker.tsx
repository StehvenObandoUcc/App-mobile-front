import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { AppText } from './AppText';
import { RecipeDifficulty } from '../types';
import { colors, radii } from '../theme';
import { DIFFICULTY_LABELS } from '../utils/recipe-visuals';

/**
 * DifficultyPicker — 3 fichas de 72 dp con medidor segmentado ▮▯▯ (Chef-IA.dc.html).
 * La elegida toma el pastel de su nivel + anillo cacao; el medidor no depende solo del color.
 */
export type DifficultyPickerProps = {
  value: RecipeDifficulty;
  onChange: (value: RecipeDifficulty) => void;
};

const LEVELS: RecipeDifficulty[] = ['easy', 'medium', 'hard'];

export function DifficultyMeter({ level, segment, empty }: { level: number; segment: string; empty: string }) {
  return (
    <View style={styles.meter}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.seg, { backgroundColor: i <= level ? segment : empty }]} />
      ))}
    </View>
  );
}

export function DifficultyPicker({ value, onChange }: DifficultyPickerProps) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Nivel de dificultad">
      {LEVELS.map((d) => {
        const tone = colors.difficulty[d];
        const selected = value === d;
        return (
          <Pressable
            key={d}
            onPress={() => onChange(d)}
            style={({ pressed }) => [
              styles.tile,
              { backgroundColor: selected ? tone.background : colors.surfaceVariant },
              pressed && styles.pressed,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`Dificultad ${DIFFICULTY_LABELS[d]}`}
          >
            <DifficultyMeter
              level={tone.level}
              segment={tone.segment}
              empty={selected ? colors.surface : colors.m3.surfaceContainerHighest}
            />
            <AppText variant="bodySmall" weight={selected ? 'semibold' : 'medium'} color={selected ? tone.text : colors.textPrimary}>
              {DIFFICULTY_LABELS[d]}
            </AppText>
            {selected && <View pointerEvents="none" style={styles.ring} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  tile: {
    flex: 1,
    height: 72,
    borderRadius: radii.alerts,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pressed: {
    opacity: 0.88,
  },
  meter: {
    flexDirection: 'row',
    gap: 3,
  },
  seg: {
    width: 14,
    height: 8,
    borderRadius: 4,
  },
  ring: {
    ...StyleSheet.absoluteFill,
    borderRadius: radii.alerts,
    borderWidth: 2,
    borderColor: colors.ink,
  },
});
