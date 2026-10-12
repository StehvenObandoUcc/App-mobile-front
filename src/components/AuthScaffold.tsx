import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { KeyboardAwareScroll } from './KeyboardAwareScroll';
import { spacing } from '../theme';
import { useTheme, makeStyles } from '../theme/ThemeProvider';

/**
 * AuthScaffold — armazón de las pantallas de autenticación (login-formulario, verificar correo,
 * olvidé mi contraseña, nueva contraseña): botón volver blanco, título «Ligero **Énfasis**»
 * (screenTitle, light + semibold), subtítulo opcional y el contenido dentro de KeyboardAwareScroll.
 */
export type AuthScaffoldProps = {
  title: string;
  emphasis: string;
  subtitle?: string;
  onBack: () => void;
  backAccessibilityLabel: string;
  children: React.ReactNode;
  /** Se pinta entre el título y el subtítulo, p. ej. una nota de seguridad. */
  afterTitle?: React.ReactNode;
};

export function AuthScaffold({ title, emphasis, subtitle, onBack, backAccessibilityLabel, children, afterTitle }: AuthScaffoldProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <KeyboardAwareScroll
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xl, paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xl },
        ]}
      >
        <IconButton iconName="chevron-back" variant="white" accessibilityLabel={backAccessibilityLabel} onPress={onBack} />
        <AppText variant="screenTitle" weight="light" accessibilityRole="header">
          {title}
          <AppText weight="semibold">{emphasis}</AppText>
        </AppText>
        {afterTitle}
        {subtitle ? (
          <AppText variant="body" color={colors.textSecondary}>
            {subtitle}
          </AppText>
        ) : null}
        {children}
      </KeyboardAwareScroll>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.screenGutter,
    gap: 18,
  },
}));
