import React, { forwardRef } from 'react';
import type { TextInput as RNTextInput } from 'react-native';
import { LabeledField, LabeledFieldProps } from './LabeledField';

/**
 * IconTextField — campo con etiqueta e icono (Login-Formulario.dc.html): un LabeledField de 56 dp
 * (`spacing.fieldHeightLarge`) con icono obligatorio. `secure` agrega el ojo para mostrar la contraseña.
 * Dentro de un KeyboardAwareScroll, al enfocarse se desplaza para quedar visible sobre el teclado.
 */
export type IconTextFieldProps = Omit<LabeledFieldProps, 'iconName' | 'large'> & {
  iconName: NonNullable<LabeledFieldProps['iconName']>;
};

export const IconTextField = forwardRef<RNTextInput, IconTextFieldProps>(function IconTextField(props, ref) {
  return <LabeledField ref={ref} large {...props} />;
});
