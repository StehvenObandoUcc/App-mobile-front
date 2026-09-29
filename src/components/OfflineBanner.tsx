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
import { colors, typography, spacing, radii } from '../theme';
import type { OutboxBannerState } from '../types';

import { AppText } from './AppText';
export type OfflineBannerProps = {
  state: OutboxBannerState;
  pendingCount: number;
  stuckCount?: number;
  isRetrying?: boolean;
  onRetry?: () => void;
};

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

function resolveCopy(state: OutboxBannerState, pending: number, stuck: number) {
  switch (state) {
    case 'offline':
      return {
        title: 'Sin conexión',
        body:
          pending > 0
            ? `${pending} ${plural(pending, 'cambio se sincronizará', 'cambios se sincronizarán')} al volver`
            : 'Lo que tienes guardado sigue disponible',
      };
    case 'authBlocked':
      return {
        title: 'Tu sesión expiró',
        body: `Inicia sesión para sincronizar ${pending} ${plural(pending, 'cambio', 'cambios')}`,
      };
    case 'attention':
      return {
        title: 'Revisa tus cambios',
        body: `${stuck} ${plural(stuck, 'cambio no se pudo', 'cambios no se pudieron')} sincronizar`,
      };
    case 'synced':
      return { title: 'Todo sincronizado', body: '' };
    default:
      return { title: '', body: '' };
  }
}

/** Cada estado usa un contenedor pastel de la paleta + su texto «on-container». */
function resolveTone(state: OutboxBannerState) {
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
  const fade = useRef(new Animated.Value(state === 'hidden' ? 0 : 1)).current;
  const visible = state !== 'hidden';
  const { title, body } = resolveCopy(state, pendingCount, stuckCount);
  const tone = resolveTone(state);

  useEffect(() => {
    Animated.timing(fade, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
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
          accessibilityLabel="Reintentar sincronización"
          accessibilityState={{ disabled: isRetrying, busy: isRetrying }}
          style={({ pressed }) => [
            styles.retry,
            { backgroundColor: tone.fg },
            pressed && styles.retryPressed,
          ]}
        >
          {isRetrying ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <AppText numberOfLines={1} weight="semibold" color={colors.textInverse} style={styles.retryText}>
              Reintentar
            </AppText>
          )}
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
});
