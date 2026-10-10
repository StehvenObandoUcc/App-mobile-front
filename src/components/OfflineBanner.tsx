import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, radii } from '../theme';
import { useTheme, makeStyles } from '../theme/ThemeProvider';
import { useI18n, type t as TFn, type tp as TpFn } from '../i18n';
import { useReduceMotion } from '../hooks/useReduceMotion';
import type { ThemeColors } from '../theme/colors';
import type { OutboxBannerState } from '../types';

import { AppText } from './AppText';
export type OfflineBannerProps = {
  state: OutboxBannerState;
  pendingCount: number;
  stuckCount?: number;
  isRetrying?: boolean;
  onRetry?: () => void;
};

function resolveCopy(state: OutboxBannerState, pending: number, stuck: number, t: typeof TFn, tp: typeof TpFn) {
  switch (state) {
    case 'offline':
      return {
        title: t('molecules.offlineBanner.offlineTitle'),
        body: pending > 0 ? tp('molecules.offlineBanner.offlineBody', pending) : t('molecules.offlineBanner.offlineSaved'),
      };
    case 'authBlocked':
      return {
        title: t('molecules.offlineBanner.authTitle'),
        body: tp('molecules.offlineBanner.authBody', pending),
      };
    case 'attention':
      return {
        title: t('molecules.offlineBanner.attentionTitle'),
        body: tp('molecules.offlineBanner.attentionBody', stuck),
      };
    case 'synced':
      return { title: t('molecules.offlineBanner.syncedTitle'), body: '' };
    default:
      return { title: '', body: '' };
  }
}

/** Cada estado usa un contenedor pastel de la paleta + su texto «on-container». */
function resolveTone(colors: ThemeColors, state: OutboxBannerState) {
  switch (state) {
    case 'synced':
      return { bg: colors.functional.fresh.background, fg: colors.functional.fresh.text, icon: 'checkmark-circle-outline' as const };
    case 'attention':
      return { bg: colors.m3.errorContainer, fg: colors.m3.onErrorContainer, icon: 'alert-circle-outline' as const };
    case 'authBlocked':
      return { bg: colors.m3.primaryContainer, fg: colors.m3.onPrimaryContainer, icon: 'lock-closed-outline' as const };
    default:
      // offline: ámbar de "próximo a vencer" (7.55:1). Es un aviso, no un error.
      return { bg: colors.functional.expiringSoon.background, fg: colors.functional.expiringSoon.text, icon: 'cloud-offline-outline' as const };
  }
}

/**
 * Molécula OfflineBanner: hace visible el patrón Offline-First (Outbox).
 * Presentacional: el estado llega desde useOutboxStatus().
 * Layout: icono en círculo + título/cuerpo apilados + botón que nunca se encoge,
 * para que «Reintentar» no se parta en dos líneas en pantallas angostas.
 */
export function OfflineBanner({
  state,
  pendingCount,
  stuckCount = 0,
  isRetrying = false,
  onRetry,
}: OfflineBannerProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { t, tp } = useI18n();
  const reduceMotion = useReduceMotion();
  const fade = useRef(new Animated.Value(state === 'hidden' ? 0 : 1)).current;
  const visible = state !== 'hidden';
  const { title, body } = resolveCopy(state, pendingCount, stuckCount, t, tp);
  const tone = resolveTone(colors, state);

  useEffect(() => {
    if (reduceMotion) {
      fade.setValue(visible ? 1 : 0);
    } else {
      Animated.timing(fade, {
        toValue: visible ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
    if (visible) {
      // iOS no tiene live regions: anunciamos el cambio para VoiceOver.
      AccessibilityInfo.announceForAccessibility(body ? `${title}. ${body}` : title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!visible) return null;

  const showRetry = state === 'offline' && Boolean(onRetry);

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: tone.bg, opacity: fade }]}
      accessibilityRole={state === 'attention' ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.iconCircle}>
        <Ionicons name={tone.icon} size={20} color={tone.fg} />
      </View>
      <View style={styles.textCol}>
        <AppText weight="semibold" color={tone.fg} style={styles.title}>
          {title}
        </AppText>
        {body ? (
          <AppText weight="regular" color={tone.fg} style={styles.body}>
            {body}
          </AppText>
        ) : null}
      </View>
      {showRetry && (
        <Pressable
          onPress={onRetry}
          disabled={isRetrying}
          accessibilityRole="button"
          accessibilityLabel={t('molecules.offlineBanner.retryA11y')}
          accessibilityState={{ disabled: isRetrying, busy: isRetrying }}
          style={({ pressed }) => [
            styles.retry,
            { backgroundColor: tone.fg },
            pressed && styles.retryPressed,
          ]}
        >
          {isRetrying ? (
            <ActivityIndicator size="small" color={tone.bg} />
          ) : (
            <AppText numberOfLines={1} weight="semibold" color={tone.bg} style={styles.retryText}>
              {t('molecules.offlineBanner.retry')}
            </AppText>
          )}
        </Pressable>
      )}
    </Animated.View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.alerts,
    padding: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20, // radio exacto: con 999 Android a veces lo pinta cuadrado
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: spacing.md,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
  retry: {
    flexShrink: 0,
    minHeight: spacing.touchTargetMin,
    minWidth: 96,
    paddingHorizontal: spacing.lg,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryPressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
  retryText: {
    fontSize: 14,
    lineHeight: 18,
  },
}));
