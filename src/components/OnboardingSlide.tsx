import React from 'react';
import { View, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhotoTag, PhotoTagSpec } from './PhotoTag';
import { useTheme, makeStyles } from '../theme/ThemeProvider';

/**
 * OnboardingSlide — foto real de la bienvenida con etiquetas de alimentos.
 * Alto 470 en el lienzo de 390; se escala al ancho del teléfono. Degradado a avena abajo.
 */
export type OnboardingSlideProps = {
  photo: ImageSourcePropType;
  tags: PhotoTagSpec[];
  width: number;
  height: number;
  accessibilityLabel: string;
  /** Recorte horizontal de la foto (como object-position), 0 = izquierda · 0.5 = centro. */
  focusX?: number;
};

export function OnboardingSlide({ photo, tags, width, height, accessibilityLabel, focusX = 0.5 }: OnboardingSlideProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  // La foto llega hasta el borde superior: las etiquetas bajan lo que ocupa la barra de estado para no pisarla.
  const topInset = useSafeAreaInsets().top;
  const scale = width / 390;
  // «cover» con punto de enfoque horizontal (como object-position): se calcula el tamaño a mano.
  const src = Image.resolveAssetSource(photo);
  const srcW = src?.width;
  const srcH = src?.height;
  const k = srcW && srcH ? Math.max(width / srcW, height / srcH) : 1;
  const imgW = srcW && srcH ? srcW * k : width;
  const imgH = srcW && srcH ? srcH * k : height;
  return (
    <View style={{ width, height, overflow: 'hidden' }} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <Image
        source={photo}
        style={{ position: 'absolute', width: imgW, height: imgH, left: -(imgW - width) * focusX, top: -(imgH - height) / 2 }}
      />
      <LinearGradient
        colors={[`${colors.background}00`, colors.background]}
        style={[styles.fade, { height: 120 * scale }]}
        pointerEvents="none"
      />
      {/* Velo suave bajo la barra de estado: el reloj y la batería se leen sobre fotos claras. */}
      <LinearGradient
        colors={['rgba(0,0,0,0.38)', 'rgba(0,0,0,0)']}
        style={[styles.topScrim, { height: topInset + 28 }]}
        pointerEvents="none"
      />
      <View style={[StyleSheet.absoluteFill, { top: topInset }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {tags.map((t) => (
          <PhotoTag key={t.label} spec={t} scale={scale} />
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  topScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
}));
