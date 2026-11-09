import React from 'react';
import { AppText } from './AppText';

/**
 * DialogTitle — título de diálogos y hojas: una sola frase en seminegrita, token `headline` (24/32).
 * El contraste de peso (300 + 600, «Mi **Despensa**») queda solo para los títulos de pantalla (ScreenHeader):
 * repetido en cada diálogo y estado vacío dejaba de marcar jerarquía y partía frases como «¿Eliminar **3 alimentos**?».
 * `emphasis` se mantiene para no tocar los textos: se une al título con un espacio.
 */
export type DialogTitleProps = {
  title: string;
  emphasis?: string;
};

/** «¿Eliminar esta» + «receta?» → «¿Eliminar esta receta?» */
export function joinTitle(title: string, emphasis?: string): string {
  return [title.trim(), emphasis?.trim()].filter(Boolean).join(' ');
}

export function DialogTitle({ title, emphasis }: DialogTitleProps) {
  return (
    <AppText variant="headline" weight="semibold" accessibilityRole="header">
      {joinTitle(title, emphasis)}
    </AppText>
  );
}
