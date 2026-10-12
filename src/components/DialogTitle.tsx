import React from 'react';
import { AppText } from './AppText';

/**
 * DialogTitle — título de diálogos y hojas con contraste de peso (300 + 600).
 * «¿Eliminar **3 alimentos**?»: si no se pasa `emphasis`, se resalta la última palabra.
 * Un solo tamaño para todas las hojas y diálogos: el token `headline` (24/32). Antes había 22, 24 y 26; se eligió
 * 24 porque ya lo usaban la mayoría de las hojas (OptionSheet, Avoid, Compras, ActionSheet) y es la escala existente.
 */
export type DialogTitleProps = {
  title: string;
  emphasis?: string;
};

export function splitTitle(title: string, emphasis?: string): { lead: string; bold: string } {
  if (emphasis) return { lead: title, bold: emphasis };
  const t = title.trim();
  const i = t.lastIndexOf(' ');
  return i > 0 ? { lead: t.slice(0, i), bold: t.slice(i + 1) } : { lead: '', bold: t };
}

export function DialogTitle({ title, emphasis }: DialogTitleProps) {
  const { lead, bold } = splitTitle(title, emphasis);
  return (
    <AppText variant="headline" weight="light" accessibilityRole="header">
      {lead ? `${lead} ` : ''}
      <AppText weight="semibold">{bold}</AppText>
    </AppText>
  );
}
