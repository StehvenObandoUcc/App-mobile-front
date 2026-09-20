import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useScan } from '../src/hooks/useScan';
import { AppScreen, PrimaryButton } from '../src/components';

export default function ScanScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const { status, error, analyzeImage } = useScan();

  // Resetear la vista previa congelada al volver a la pantalla de cámara
  useFocusEffect(
    useCallback(() => {
      setCapturedPhotoUri(null);
      setIsCapturing(false);
    }, [])
  );

  const isAnalyzing = isCapturing || status === 'loading';

  if (!permission) {
    return <View style={styles.blackContainer} />;
  }

  if (!permission.granted) {
    return (
      <AppScreen style={styles.permissionScreen}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconCircle}>
            <Ionicons name="camera-outline" size={48} color="#B94E35" />
          </View>
          <Text style={styles.permissionTitle}>Permiso de cámara necesario</Text>
          <Text style={styles.permissionSubtitle}>
            Food AI necesita acceso a tu cámara para escanear tus alimentos e identificar lo que tienes en tu nevera o despensa.
          </Text>
          <View style={{ width: '100%', maxWidth: 240, marginTop: 24 }}>
            <PrimaryButton title="Dar permiso de cámara" onPress={requestPermission} />
          </View>
        </View>
      </AppScreen>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || isAnalyzing) return;

    setIsCapturing(true);
    try {
      // 1. Capturar fotografía
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) {
        throw new Error('No se pudo capturar la fotografía');
      }

      // Congelar la vista con la foto capturada (punto intermedio, oculta la cámara en vivo)
      setCapturedPhotoUri(photo.uri);

      // Redimensionar en el móvil a width: 1024 manteniendo compress: 0.8 (Ponytail Opt 1)
      const manipulated = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      // 2. Analizar mediante el servicio desacoplado con payload ligero (~120 KB en vez de 4 MB)
      const result = await analyzeImage({
        imageUri: manipulated.uri,
        mimeType: 'image/jpeg',
        base64: manipulated.base64 || undefined,
      });

      // 3. Navegar a la pantalla de revisión con los datos reales de la IA
      router.push({
        pathname: '/scan-result',
        params: {
          scanId: result.scanId,
          imageUri: result.imageUri,
          ingredientsData: JSON.stringify(result.ingredients),
          warningsData: JSON.stringify(result.warnings || []),
        },
      });
    } catch (err: any) {
      setCapturedPhotoUri(null);
      Alert.alert(
        'No pudimos analizar tu foto',
        err?.message || 'Intenta de nuevo en unos segundos.',
        [{ text: 'Entendido', style: 'default' }]
      );
    } finally {
      setIsCapturing(false);
    }
  };

  // Seleccionar foto directamente desde la galería del dispositivo
  const handlePickFromGallery = async () => {
    if (isAnalyzing) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.uri) return;

      setIsCapturing(true);
      setCapturedPhotoUri(asset.uri);

      // Redimensionar en el móvil a width: 1024 manteniendo compress: 0.8
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      const scanResult = await analyzeImage({
        imageUri: manipulated.uri,
        mimeType: 'image/jpeg',
        base64: manipulated.base64 || undefined,
      });

      router.push({
        pathname: '/scan-result',
        params: {
          scanId: scanResult.scanId,
          imageUri: scanResult.imageUri,
          ingredientsData: JSON.stringify(scanResult.ingredients),
          warningsData: JSON.stringify(scanResult.warnings || []),
        },
      });
    } catch (err: any) {
      setCapturedPhotoUri(null);
      Alert.alert(
        'No pudimos analizar la imagen',
        err?.message || 'Ocurrió un error al procesar la imagen de la galería.',
        [{ text: 'Entendido', style: 'default' }]
      );
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <View style={styles.blackContainer}>
      {capturedPhotoUri ? (
        <Image source={{ uri: capturedPhotoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />
      )}

      {/* ── Overlay visor de encuadre (solo cuando la cámara en vivo está activa) ── */}
      {!capturedPhotoUri && (
        <View style={[styles.overlay, isAnalyzing && styles.overlayAnalyzing]} pointerEvents="box-none">
          <View style={styles.frameContainer}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.hint}>
            Encuadra los alimentos dentro del recuadro
          </Text>
        </View>
      )}

      {/* ── Overlay de análisis en progreso (BUG-01) ── */}
      {isAnalyzing && (
        <View style={styles.analyzingOverlay}>
          <ActivityIndicator size="large" color="#B94E35" />
          <Text style={styles.analyzingText}>Analizando tu foto con IA...</Text>
          <Text style={styles.analyzingHint}>Identificando ingredientes...</Text>
        </View>
      )}

      {/* ── Barra de controles inferiores (oculta durante el análisis) ── */}
      {!isAnalyzing && (
        <View style={styles.controls}>
          {/* Cambiar cámara */}
          <Pressable
            style={styles.circleBtn}
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            accessibilityRole="button"
            accessibilityLabel="Cambiar entre cámara frontal y trasera"
          >
            <Ionicons name="camera-reverse-outline" size={26} color="#FFFFFF" />
          </Pressable>

          {/* Botón obturador */}
          <Pressable
            style={styles.shutterButton}
            onPress={handleCapture}
            accessibilityRole="button"
            accessibilityLabel="Tomar fotografía y analizar alimentos"
          >
            <View style={styles.shutterInner} />
          </Pressable>

          {/* Galería */}
          <Pressable
            style={styles.circleBtn}
            onPress={handlePickFromGallery}
            accessibilityRole="button"
            accessibilityLabel="Seleccionar foto de la galería"
          >
            <Ionicons name="images-outline" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const CORNER_SIZE = 28;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
  blackContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionScreen: {
    backgroundColor: '#FFF9F2',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FBE9E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#F5D6C8',
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2B211D',
    textAlign: 'center',
    marginBottom: 8,
  },
  permissionSubtitle: {
    fontSize: 15,
    color: '#66534A',
    textAlign: 'center',
    lineHeight: 22,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  frameContainer: {
    width: 270,
    height: 270,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#B94E35',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  hint: {
    color: '#FFFFFF',
    marginTop: 20,
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  overlayAnalyzing: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: 24,
  },
  analyzingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  analyzingHint: {
    color: '#D1D5DB',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 36,
    paddingBottom: 48,
    paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  circleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(185, 78, 53, 0.3)',
    borderWidth: 4,
    borderColor: '#B94E35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: {
    opacity: 0.5,
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#B94E35',
  },
});
