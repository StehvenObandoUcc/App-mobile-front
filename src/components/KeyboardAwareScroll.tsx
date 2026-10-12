import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  StyleProp,
  ViewStyle,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { FIELD_VISIBLE_MARGIN, computeScrollDelta } from '../utils/keyboard-scroll';

/**
 * KeyboardAwareScroll — formulario que sube con el teclado.
 *
 * Con edge-to-edge (Android 15+) la ventana ya no se redimensiona, así que el contenedor aplica
 * `padding` del teclado (iOS y Android) y un ScrollView interno. Los campos (IconTextField, CodeField)
 * llaman a `useEnsureFieldVisible()` al enfocarse: el scroll los deja ~24 dp por encima del teclado,
 * también cuando el teclado termina de abrirse después del foco (keyboardDidShow) o cambia el área visible.
 * Sin dependencias nuevas: solo KeyboardAvoidingView, ScrollView y Keyboard de react-native.
 */
type Ctx = { ensureVisible: (target: View | null) => void; release: (target: View | null) => void };
const KeyboardAwareContext = createContext<Ctx | null>(null);

const noop = () => {};

/** Devuelve `ensureVisible(view)`; fuera de un KeyboardAwareScroll no hace nada. */
export function useEnsureFieldVisible(): (target: View | null) => void {
  return useContext(KeyboardAwareContext)?.ensureVisible ?? noop;
}

/** Suelta el campo registrado (al perder el foco o desmontarse); solo actúa si sigue siendo el enfocado. */
export function useReleaseField(): (target: View | null) => void {
  return useContext(KeyboardAwareContext)?.release ?? noop;
}

export type KeyboardAwareScrollProps = {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  /** Margen entre el campo enfocado y el teclado (defecto 24 dp). */
  fieldMargin?: number;
};

export function KeyboardAwareScroll({ children, contentContainerStyle, style, fieldMargin = FIELD_VISIBLE_MARGIN }: KeyboardAwareScrollProps) {
  const scrollRef = useRef<ScrollView>(null);
  const viewportRef = useRef<View>(null);
  const scrollY = useRef(0);
  const focused = useRef<View | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const viewportHeight = useRef(0);

  const scrollBy = useCallback(
    (top: number, height: number, vh: number) => {
      const delta = computeScrollDelta({ top, height, viewportHeight: vh, margin: fieldMargin });
      if (delta !== 0) scrollRef.current?.scrollTo({ y: Math.max(0, scrollY.current + delta), animated: true });
    },
    [fieldMargin]
  );

  const reveal = useCallback(() => {
    const target = focused.current;
    const viewport = viewportRef.current;
    if (!target || !viewport) return;

    // Respaldo: posiciones en ventana (campo y área visible) si measureLayout no está disponible o falla.
    const viaWindow = () => {
      viewport.measureInWindow((_vx, vy, _vw, vh) => {
        target.measureInWindow((_tx, ty, _tw, th) => {
          if (focused.current === target) scrollBy(ty - vy, th, vh);
        });
      });
    };

    // Preferido: posición del campo respecto al contenido del ScrollView (no depende del scroll en curso).
    const inner = (scrollRef.current as unknown as { getInnerViewRef?: () => unknown } | null)?.getInnerViewRef?.();
    if (inner && viewportHeight.current > 0 && typeof target.measureLayout === 'function') {
      try {
        target.measureLayout(
          inner as Parameters<View['measureLayout']>[0],
          (_x, y, _w, h) => {
            if (focused.current === target) scrollBy(y - scrollY.current, h, viewportHeight.current);
          },
          viaWindow
        );
        return;
      } catch {
        // cae al método de ventana
      }
    }
    viaWindow();
  }, [scrollBy]);

  const ensureVisible = useCallback(
    (target: View | null) => {
      focused.current = target;
      reveal();
    },
    [reveal]
  );

  const release = useCallback((target: View | null) => {
    if (focused.current === target) focused.current = null;
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardOpen(true);
      reveal();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardOpen(false);
      focused.current = null;
    });
    return () => {
      show.remove();
      hide.remove();
      focused.current = null;
    };
  }, [reveal]);

  const ctx = useMemo(() => ({ ensureVisible, release }), [ensureVisible, release]);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
  };

  return (
    <KeyboardAwareContext.Provider value={ctx}>
      <KeyboardAvoidingView style={[{ flex: 1 }, style]} behavior="padding" keyboardVerticalOffset={0}>
        {/* El área visible cambia de alto cuando el contenedor aplica el padding del teclado: se vuelve a revelar el campo. */}
        <View ref={viewportRef} style={{ flex: 1 }} collapsable={false} onLayout={(e) => {
            viewportHeight.current = e.nativeEvent.layout.height;
            reveal();
          }}>
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={onScroll}
            contentContainerStyle={[{ flexGrow: 1 }, contentContainerStyle]}
          >
            {children}
            {/* Relleno inferior extra solo con el teclado abierto: deja espacio para subir el último campo. */}
            {keyboardOpen ? <View style={{ height: fieldMargin }} /> : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </KeyboardAwareContext.Provider>
  );
}
