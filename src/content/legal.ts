import { t } from '../i18n';

/**
 * Textos legales (Legal.dc.html). Responsable: Stehven Alexander Obando Cordoba, Pasto (Nariño).
 * Ajustes frente al mockup: el proveedor de IA real es DeepSeek (no Gemini) y las fotos no se guardan
 * en el servidor (solo se envían para el análisis). Revisar antes de publicar.
 * Los textos de las secciones están en misc.legal.* (es/en) y se leen en el idioma activo al mostrarse.
 */
export type LegalSection = { title: string; body: string };

/** Fecha de la última actualización en el idioma activo. */
export function legalUpdatedAt(): string {
  return t('misc.legal.updatedAt');
}
export const LEGAL_CONTACT = 'mindforgeandes@gmail.com';

const section = (base: string): LegalSection => ({
  get title() { return t(`${base}Title`); },
  get body() { return t(`${base}Body`, { contact: LEGAL_CONTACT }); },
});

export const TERMS: LegalSection[] = [
  section('misc.legal.terms.s1'),
  section('misc.legal.terms.s2'),
  section('misc.legal.terms.s3'),
  section('misc.legal.terms.s4'),
  section('misc.legal.terms.s5'),
  section('misc.legal.terms.s6'),
  section('misc.legal.terms.s7'),
  section('misc.legal.terms.s8'),
  section('misc.legal.terms.s9'),
  section('misc.legal.terms.s10'),
  section('misc.legal.terms.s11'),
  section('misc.legal.terms.s12'),
];

export const PRIVACY: LegalSection[] = [
  section('misc.legal.privacy.p1'),
  section('misc.legal.privacy.p2'),
  section('misc.legal.privacy.p3'),
  section('misc.legal.privacy.p4'),
  section('misc.legal.privacy.p5'),
  section('misc.legal.privacy.p6'),
  section('misc.legal.privacy.p7'),
  section('misc.legal.privacy.p8'),
  section('misc.legal.privacy.p9'),
  section('misc.legal.privacy.p10'),
];
