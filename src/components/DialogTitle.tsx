import React from 'react';
import { AppText } from './AppText';
import { TextVariant } from './AppText';

/**
 * DialogTitle — título de diálogos y hojas con contraste de peso (300 + 600).
 * «¿Eliminar **3 alimentos**?»: si no se pasa `emphasis`, se resalta la última palabra.
 */
export type DialogTitleProps = {
  title: string;
  emphasis?: string;
  variant?: TextVariant;
  size?: number;
  lineHeight?: number;
};

export function splitTitle(title: string, emphasis?: string): { lead: string; bold: string } {
  if (emphasis) return { lead: title, bold: emphasis };
  const t = title.trim();
  const i = t.lastIndexOf(' ');
  return i > 0 ? { lead: t.slice(0, i), bold: t.slice(i + 1) } : { lead: '', bold: t };
}

export function DialogTitle({ title, emphasis, size = 22, lineHeight = 28 }: DialogTitleProps) {
  const { lead, bold } = splitTitle(title, emphasis);
  return (
    <AppText weight="light" style={{ fontSize: size, lineHeight }} accessibilityRole="header">
      {lead ? `${lead} ` : ''}
      <AppText weight="semibold">{bold}</AppText>
    </AppText>
  );
}
