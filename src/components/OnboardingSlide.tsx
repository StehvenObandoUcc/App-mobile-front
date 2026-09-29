import React from 'react';
import { View, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PhotoTag, PhotoTagSpec } from './PhotoTag';
import { colors } from '../theme';

/**
 * OnboardingSlide — foto real de la bienvenida con etiquetas de alimentos (Bienvenida-Fotos.dc.html).
 * Alto 470 en el lienzo de 390; se escala al ancho del teléfono. Degradado a avena abajo.
 */
export type OnboardingSlideProps = {
  photo: ImageSourcePropType;
  tags: PhotoTagSpec[];
  width: number;
  height: number;
  accessibilityLabel: string;
  /** Recorte horizontal de la foto (object-position del mockup), 0 = izquierda · 0.5 = centro. */
  focusX?: number;
};

export function OnboardingSlide({ photo, tags, width, height, accessibilityLabel, focusX = 0.5 }: OnboardingSlideProps) {
  const scale = width / 390;
  // «cover» con punto de enfoque horizontal (object-position del mockup): se calcula el tamaño a mano.
  const src = Image.resolveAssetSource(photo);
  const k = src ? Math.max(width / src.width, height / src.height) : 1;
  const imgW = src ? src.width * k : width;
  const imgH = src ? src.height * k : height;
  return (
    <View style={{ width, height, overflow: 'hidden' }} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <Image
        source={photo}
        style={{ position: 'absolute', width: imgW, height: imgH, left: -(imgW - width) * focusX, top: -(imgH - height) / 2 }}
      />
      <LinearGradient
        colors={['rgba(248,244,239,0)', colors.background]}
        style={[styles.fade, { height: 120 * scale }]}
        pointerEvents="none"
      />
      <View style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {tags.map((t) => (
          <PhotoTag key={t.label} spec={t} scale={scale} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
