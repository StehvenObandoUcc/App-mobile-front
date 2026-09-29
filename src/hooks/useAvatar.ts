import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Foto de perfil guardada solo en el teléfono (por usuario). La usan Inicio (AvatarButton) y Perfil.
 * Los cambios se avisan a todas las pantallas abiertas.
 */
const key = (userId: string) => `@food_ai_avatar_${userId}`;
const listeners = new Set<() => void>();

export function useAvatar(userId: string | null | undefined) {
  const [uri, setUri] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) {
      setUri(null);
      return;
    }
    AsyncStorage.getItem(key(userId))
      .then((v) => setUri(v))
      .catch(() => setUri(null));
  }, [userId]);

  useEffect(() => {
    load();
    listeners.add(load);
    return () => {
      listeners.delete(load);
    };
  }, [load]);

  const save = useCallback(
    async (dataUri: string | null) => {
      if (!userId) return;
      if (dataUri) await AsyncStorage.setItem(key(userId), dataUri);
      else await AsyncStorage.removeItem(key(userId));
      listeners.forEach((l) => l());
    },
    [userId]
  );

  return { uri, save };
}
