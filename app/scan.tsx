import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, Pressable, Image, Linking } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScan } from '../src/hooks/useScan';
import { getTestPhotoCount, incrementTestPhotoCount, MAX_TEST_PHOTOS } from '../src/services/scan-limit';
import { AppText, IconButton, QuotaPill, StatusScreen, AiProgressScreen } from '../src/components';
import { ScanInput } from '../src/types';
import { colors, radii } from '../src/theme';

/**
 * Escaneo (Escaneo.dc.html + Escaneo-Estados.dc.html).
 * - Cámara: barra con volver y cuota, título, visor, consejos y controles (galería · obturador · girar).
 * - Analizando: AiProgressScreen a pantalla completa, sin salida hasta terminar.
 * - Límite de 5 fotos y Error: StatusScreen en la misma pantalla (sin Alert).
 * Un intento fallido no cuenta como foto de prueba: el contador sube solo si el análisis funciona.
 */
type ScanView = 'camera' | 'limit' | 'error';

const ANALYSIS_STEPS = ['Foto optimizada', 'Identificando ingredientes…', 'Comparando con tu despensa'];

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  // Linterna: ilumina la vista y la foto cuando hay poca luz (solo cámara trasera).
  const [torchOn, setTorchOn] = useState(false);
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [testPhotoCount, setTestPhotoCount] = useState<number>(0);
  const [view, setView] = useState<ScanView>('camera');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lastInputRef = useRef<ScanInput | null>(null);
  const { status, analyzeImage } = useScan();
  const autoRequestedRef = useRef(false);

  const goHome = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // Al enfocar: limpiar la foto congelada, leer la cuota (si ya se usaron las 5, mostrar el límite)
  // y RE-consultar el permiso (si lo concedió desde Ajustes, useCameraPermissions no se refresca solo).
  useFocusEffect(
    useCallback(() => {
      setCapturedPhotoUri(null);
      setIsCapturing(false);
      setTorchOn(false);
      autoRequestedRef.current = false;
      getTestPhotoCount().then((count) => {
        setTestPhotoCount(count);
        setView(count >= MAX_TEST_PHOTOS ? 'limit' : 'camera');
      });
      if (!permission?.granted) {
        getPermission().catch(() => {});
      }
    }, [permission?.granted, getPermission])
  );

  // Si el permiso se negó al arrancar la app, se vuelve a pedir al entrar aquí.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain && !autoRequestedRef.current) {
      autoRequestedRef.current = true;
      requestPermission().catch(() => {});
    }
  }, [permission, requestPermission]);

  const isAnalyzing = isCapturing || status === 'loading';

  const checkTestLimit = (): boolean => {
    if (testPhotoCount >= MAX_TEST_PHOTOS) {
      setView('limit');
      return false;
    }
    return true;
  };

  /** Envía la foto ya optimizada a la IA; si falla, muestra el error sin gastar una foto de prueba. */
  const runAnalysis = async (input: ScanInput) => {
    setIsCapturing(true);
    try {
      const result = await analyzeImage(input);
      await incrementTestPhotoCount();
      setTestPhotoCount((prev) => prev + 1);
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
      setErrorMessage(err?.message || null);
      setView('error');
    } finally {
      setIsCapturing(false);
    }
  };

  /** Redimensiona a 1024 px (≈120 KB) y analiza. */
  const analyzeUri = async (uri: string) => {
    setIsCapturing(true);
    setCapturedPhotoUri(uri);
    try {
      const manipulated = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1024 } }], {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      });
      const input: ScanInput = {
        imageUri: manipulated.uri,
        mimeType: 'image/jpeg',
        base64: manipulated.base64 || undefined,
      };
      lastInputRef.current = input;
      await runAnalysis(input);
    } catch (err: any) {
      setCapturedPhotoUri(null);
      setErrorMessage(err?.message || null);
      setView('error');
      setIsCapturing(false);
    }
  };

  const handlePickFromGallery = async () => {
    if (isAnalyzing || !checkTestLimit()) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.8 });
    const uri = !result.canceled ? result.assets?.[0]?.uri : undefined;
    if (uri) await analyzeUri(uri);
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isAnalyzing || !checkTestLimit()) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) throw new Error('No se pudo capturar la fotografía');
      await analyzeUri(photo.uri);
    } catch (err: any) {
      setErrorMessage(err?.message || null);
      setView('error');
      setIsCapturing(false);
    }
  };

  const analyzing = (
    <AiProgressScreen
      visible={isAnalyzing}
      title="Analizando tu"
      emphasis="foto"
      steps={ANALYSIS_STEPS}
      iconName="sparkles"
      stepMs={1600}
      footnote="Esto tarda unos segundos. Al terminar verás lo que encontramos."
      topSlot={
        <QuotaPill
          tone="light"
          used={Math.min(testPhotoCount + 1, MAX_TEST_PHOTOS)}
          max={MAX_TEST_PHOTOS}
          label={`Foto ${Math.min(testPhotoCount + 1, MAX_TEST_PHOTOS)} de ${MAX_TEST_PHOTOS} de prueba`}
        />
      }
    />
  );

  // ── Límite de fotos (B) ──
  if (view === 'limit') {
    return (
      <StatusScreen
        topSlot={
          <QuotaPill tone="warning" used={MAX_TEST_PHOTOS} max={MAX_TEST_PHOTOS} label={`${MAX_TEST_PHOTOS} de ${MAX_TEST_PHOTOS} fotos usadas`} />
        }
        art={{
          iconName: 'scan-outline',
          blobColor: colors.functional.expiringSoon.background,
          tileColor: colors.surface,
          iconColor: colors.difficulty.medium.segment,
        }}
        title="Usaste tus"
        emphasis={`${MAX_TEST_PHOTOS} fotos de prueba`}
        message="Mientras tanto puedes seguir agregando alimentos a tu despensa a mano."
        primary={{ title: 'Agregar a mano', iconName: 'add', onPress: () => router.replace({ pathname: '/inventory', params: { add: '1' } }) }}
        secondary={{ title: 'Volver al inicio', onPress: () => router.replace('/') }}
      />
    );
  }

  // ── Error al analizar (C) ──
  if (view === 'error') {
    return (
      <>
        <StatusScreen
          role="alert"
          topSlot={<QuotaPill tone="light" label="Este intento no cuenta como foto de prueba" />}
          art={{
            iconName: 'cloud-offline-outline',
            blobColor: colors.m3.errorContainer,
            tileColor: colors.surface,
            iconColor: colors.m3.error,
            dotBottomColor: colors.categories.grain.background,
          }}
          title="No pudimos"
          emphasis="analizar tu foto"
          message={errorMessage && !/network|fetch|timeout/i.test(errorMessage) ? errorMessage : 'Revisa tu conexión e inténtalo de nuevo.'}
          primary={{
            title: 'Reintentar análisis',
            iconName: 'refresh',
            onPress: () => {
              setView('camera');
              if (lastInputRef.current) runAnalysis(lastInputRef.current);
            },
          }}
          secondary={{ title: 'Tomar otra foto', onPress: () => setView('camera') }}
        />
        {analyzing}
      </>
    );
  }

  if (!permission) {
    return <View style={styles.camera} />;
  }

  // ── Sin permiso de cámara ──
  if (!permission.granted) {
    return (
      <StatusScreen
        art={{
          iconName: 'camera-outline',
          blobColor: colors.primaryContainer,
          tileColor: colors.surface,
          iconColor: colors.primary,
          dotTopColor: colors.categories.grain.background,
        }}
        title="Necesitamos tu"
        emphasis="cámara"
        message="Con la cámara identificamos lo que tienes en tu nevera o despensa. También puedes elegir una foto de tu galería."
        primary={
          permission.canAskAgain
            ? { title: 'Dar permiso de cámara', iconName: 'camera-outline', onPress: requestPermission }
            : { title: 'Abrir ajustes', iconName: 'settings-outline', onPress: () => Linking.openSettings() }
        }
        secondary={{ title: 'Elegir de la galería', iconName: 'images-outline', onPress: handlePickFromGallery }}
      />
    );
  }

  // ── Cámara (Escaneo.dc.html) ──
  return (
    <View style={styles.camera}>
      {capturedPhotoUri ? (
        <Image source={{ uri: capturedPhotoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} enableTorch={torchOn && facing === 'back'} />
      )}

      {/* Velos para leer el texto sobre la imagen */}
      <View pointerEvents="none" style={[styles.scrimTop, { height: insets.top + 170 }]} />
      <View pointerEvents="none" style={[styles.scrimBottom, { height: insets.bottom + 250 }]} />

      {/* Barra superior */}
      <View style={[styles.topBar, { top: insets.top + 12 }]}>
        <IconButton iconName="chevron-back" variant="ink" accessibilityLabel="Volver al inicio" onPress={goHome} />
        <View style={styles.flex} />
        {facing === 'back' && (
          <IconButton
            iconName={torchOn ? 'flash' : 'flash-off-outline'}
            variant={torchOn ? 'tonal' : 'ink'}
            accessibilityLabel={torchOn ? 'Apagar flash' : 'Encender flash'}
            accessibilityHint="Ilumina los alimentos cuando hay poca luz"
            onPress={() => setTorchOn((v) => !v)}
          />
        )}
        <QuotaPill
          tone="camera"
          used={testPhotoCount}
          max={MAX_TEST_PHOTOS}
          label={`${testPhotoCount} de ${MAX_TEST_PHOTOS} fotos`}
          accessibilityLabel={`Fase de pruebas: ${testPhotoCount} de ${MAX_TEST_PHOTOS} fotos escaneadas`}
        />
      </View>

      {/* Título + guía */}
      <View style={[styles.heading, { top: insets.top + 84 }]}>
        <AppText weight="light" color={colors.textInverse} style={styles.title} accessibilityRole="header">
          {'Escanea tus '}
          <AppText weight="semibold" color={colors.textInverse}>
            alimentos
          </AppText>
        </AppText>
        <AppText variant="body" color={colors.onCameraMuted} style={styles.subtitle}>
          Encuadra los productos dentro del marco
        </AppText>
      </View>

      {/* Visor + consejos */}
      <View pointerEvents="none" style={styles.center}>
        <View style={styles.frame} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <View style={styles.tips}>
          {['Con buena luz'].map((tip) => (
            <View key={tip} style={styles.tip}>
              <AppText variant="bodySmall" color={colors.textInverse} style={styles.tipText}>
                {tip}
              </AppText>
            </View>
          ))}
        </View>
      </View>

      {/* Controles */}
      <View style={[styles.controls, { bottom: insets.bottom + 40 }]}>
        <IconButton
          iconName="image-outline"
          variant="ink"
          iconSize={24}
          style={styles.sideBtn}
          accessibilityLabel="Seleccionar foto de la galería"
          onPress={handlePickFromGallery}
        />
        <Pressable
          onPress={handleCapture}
          style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed]}
          accessibilityRole="button"
          accessibilityLabel="Tomar fotografía y analizar alimentos"
        >
          <View style={styles.shutterInner} />
        </Pressable>
        <IconButton
          iconName="sync-outline"
          variant="ink"
          iconSize={24}
          style={styles.sideBtn}
          accessibilityLabel="Cambiar entre cámara frontal y trasera"
          onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
        />
      </View>

      {analyzing}
    </View>
  );
}

const CORNER = 48;
const CORNER_WIDTH = 4;
const CORNER_RADIUS = 22;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  camera: {
    flex: 1,
    backgroundColor: colors.cameraScrim,
  },
  scrimTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: colors.cameraScrim,
    opacity: 0.55,
  },
  scrimBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.cameraScrim,
    opacity: 0.7,
  },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heading: {
    position: 'absolute',
    left: 24,
    right: 24,
    gap: 4,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    paddingBottom: 40, // el visor queda un poco arriba del centro, como en el mockup
  },
  frame: {
    width: 320,
    maxWidth: '82%',
    aspectRatio: 320 / 340,
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: colors.textInverse,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderTopLeftRadius: CORNER_RADIUS },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderTopRightRadius: CORNER_RADIUS },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderBottomLeftRadius: CORNER_RADIUS },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderBottomRightRadius: CORNER_RADIUS },
  tips: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  tip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    justifyContent: 'center',
  },
  tipText: {
    fontSize: 13,
    lineHeight: 17,
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  sideBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  shutter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: colors.textInverse,
    padding: 5,
  },
  shutterPressed: {
    transform: [{ scale: 0.94 }],
  },
  shutterInner: {
    flex: 1,
    borderRadius: 33,
    backgroundColor: colors.accent,
  },
});
