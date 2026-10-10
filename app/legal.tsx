import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, IconButton, SegmentedControl, LegalDocument } from '../src/components';
import { TERMS, PRIVACY, legalUpdatedAt } from '../src/content/legal';
import { spacing } from '../src/theme';
import { useTheme, makeStyles } from '../src/theme/ThemeProvider';
import { useI18n } from '../src/i18n';

/** Legal (Legal.dc.html): pestañas Términos / Privacidad. Se abre desde la Bienvenida y desde Configuración. */
export default function LegalScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<'terms' | 'privacy'>(params.tab === 'privacy' ? 'privacy' : 'terms');
  const terms = tab === 'terms';
  const { t } = useI18n();

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
            accessibilityLabel={t('screensFlow.legal.backA11y')}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
          <AppText variant="sectionTitle">{t('screensFlow.legal.title')}</AppText>
        </View>

        <SegmentedControl
          role="tab"
          rail="container"
          accessibilityLabel={t('screensFlow.legal.tabsA11y')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'terms', label: t('screensFlow.legal.tabTerms') },
            { value: 'privacy', label: t('screensFlow.legal.tabPrivacy') },
          ]}
        />

        <View style={styles.titleBlock}>
          <AppText weight="light" style={styles.title} accessibilityRole="header">
            {terms ? t('screensFlow.legal.termsTitle') : t('screensFlow.legal.privacyTitle')}
            <AppText weight="semibold">{terms ? t('screensFlow.legal.termsTitleBold') : t('screensFlow.legal.privacyTitleBold')}</AppText>
          </AppText>
          <AppText variant="metadata" weight="regular" color={colors.textSecondary}>
            {t('screensFlow.legal.lastUpdated', { date: legalUpdatedAt() })}
          </AppText>
        </View>

        <LegalDocument sections={terms ? TERMS : PRIVACY} />
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
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
}));
