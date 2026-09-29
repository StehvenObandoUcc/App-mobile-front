import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, IconButton, SegmentedControl, LegalDocument } from '../src/components';
import { TERMS, PRIVACY, LEGAL_UPDATED_AT } from '../src/content/legal';
import { colors, spacing } from '../src/theme';

/** Legal (Legal.dc.html): pestañas Términos / Privacidad. Se abre desde la Bienvenida y desde Configuración. */
export default function LegalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<'terms' | 'privacy'>(params.tab === 'privacy' ? 'privacy' : 'terms');
  const terms = tab === 'terms';

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <IconButton
            iconName="chevron-back"
            variant="white"
            accessibilityLabel="Volver"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
          <AppText variant="sectionTitle">Legal</AppText>
        </View>

        <SegmentedControl
          role="tab"
          rail="container"
          accessibilityLabel="Documentos legales"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'terms', label: 'Términos' },
            { value: 'privacy', label: 'Privacidad' },
          ]}
        />

        <View style={styles.titleBlock}>
          <AppText weight="light" style={styles.title} accessibilityRole="header">
            {terms ? 'Términos y ' : 'Política de '}
            <AppText weight="semibold">{terms ? 'condiciones' : 'privacidad'}</AppText>
          </AppText>
          <AppText variant="metadata" weight="regular" color={colors.textSecondary}>
            {`Última actualización: ${LEGAL_UPDATED_AT}`}
          </AppText>
        </View>

        <LegalDocument sections={terms ? TERMS : PRIVACY} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.screenGutter,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleBlock: {
    gap: 4,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
});
