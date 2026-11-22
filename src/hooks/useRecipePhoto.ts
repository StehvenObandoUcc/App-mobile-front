import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { AuthService } from '../services/auth-service';

/**
 * Foto propia de una receta (tomada con la cámara o elegida de la galería), guardada solo en el teléfono
 * por usuario y receta. Si existe, reemplaza a la foto de Unsplash en el detalle y en las tarjetas.
 */
const key = (userId: string, recipeId: string) => `@food_ai_recipe_photo_${userId}_${recipeId}`;
const listeners = new Set<() => void>();

export type PhotoSource = 'camera' | 'library';
/** 'saved' = foto guardada; 'canceled' = el usuario cerró la cámara/galería; 'denied' = sin permiso. */
export type PickResult = 'saved' | 'canceled' | 'denied';

export function useRecipePhoto(recipeId: string | null | undefined) {
  const userId = AuthService.getSession()?.user.id;
  const [uri, setUri] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId || !recipeId) {
      setUri(null);
      return;
    }
    AsyncStorage.getItem(key(userId, recipeId))
      .then((v) => setUri(v))
      .catch(() => setUri(null));
  }, [userId, recipeId]);

  useEffect(() => {
    load();
    listeners.add(load);
    return () => {
      listeners.delete(load);
    };
  }, [load]);

  const save = useCallback(
    async (dataUri: string | null) => {
      if (!userId || !recipeId) return;
      if (dataUri) await AsyncStorage.setItem(key(userId, recipeId), dataUri);
      else await AsyncStorage.removeItem(key(userId, recipeId));
      listeners.forEach((l) => l());
    },
    [userId, recipeId]
  );

  const pick = useCallback(
    async (source: PhotoSource): Promise<PickResult> => {
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return 'denied';
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 1 };
      const result =
        source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      const asset = !result.canceled ? result.assets?.[0] : undefined;
      if (!asset?.uri) return 'canceled';
      // 900 px de ancho: se ve bien en la portada y el base64 (~150 KB) cabe de sobra en AsyncStorage.
      const small = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width: 900 } }], {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      });
      if (!small.base64) return 'canceled';
      await save(`data:image/jpeg;base64,${small.base64}`);
      return 'saved';
    },
    [save]
  );

  return { uri, save, pick };
}
