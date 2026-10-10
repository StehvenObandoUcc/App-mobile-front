import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/hooks/useAuth';
import { useAvatar } from '../src/hooks/useAvatar';
import { AppText, IconButton, ProfileCard, ActionSheetModal, M3Dialog } from '../src/components';
import { radii, spacing } from '../src/theme';
import { useTheme, makeStyles } from '../src/theme/ThemeProvider';
import { useI18n } from '../src/i18n';

/**
 * Perfil (Perfil.dc.html): volver + «Mi perfil», ProfileCard y «Cerrar sesión» en rojo suave.
 * Tocar la foto abre opciones (elegir o quitar). Cerrar sesión pide confirmación.
 */
export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const { uri, save } = useAvatar(user?.id);
  const [photoSheet, setPhotoSheet] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [notice, setNotice] = useState<{ title: string; emphasis: string; message: string } | null>(null);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const pickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setNotice({ title: t('screensFlow.profile.photoNeedTitle'), emphasis: t('screensFlow.profile.photoNeedEmphasis'), message: t('screensFlow.profile.photoNeedMessage') });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      const asset = !result.canceled ? result.assets?.[0] : undefined;
      if (asset?.uri) {
        // Se reduce a 320 px: así el base64 cabe de sobra en el almacenamiento local (límite ~2 MB por fila).
        const small = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width: 320 } }], {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        });
        if (small.base64) await save(`data:image/jpeg;base64,${small.base64}`);
      }
    } catch (err: any) {
      setNotice({ title: t('screensFlow.profile.photoFailTitle'), emphasis: t('screensFlow.profile.photoFailEmphasis'), message: err?.message || t('screensFlow.profile.photoFailFallback') });
    }
  };

  if (!user) return <View style={styles.screen} />;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.header}>
          <IconButton iconName="chevron-back" variant="white" accessibilityLabel={t('screensFlow.profile.backA11y')} onPress={goBack} />
          <AppText weight="light" style={styles.title} accessibilityRole="header">
            {t('screensFlow.profile.titleLight')}
            <AppText weight="semibold">{t('screensFlow.profile.titleBold')}</AppText>
          </AppText>
        </View>

        <ProfileCard
          name={user.name}
          email={user.email}
          avatarUri={uri}
          onPressAvatar={() => (uri ? setPhotoSheet(true) : pickPhoto())}
        />

        <Pressable
          onPress={() => setConfirmLogout(true)}
          style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]}
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={20} color={colors.m3.onErrorContainer} />
          <AppText variant="body" weight="semibold" color={colors.m3.onErrorContainer}>
            {t('screensFlow.profile.logout')}
          </AppText>
        </Pressable>
      </ScrollView>

      <ActionSheetModal
        visible={photoSheet}
        onClose={() => setPhotoSheet(false)}
        title={t('screensFlow.profile.photoSheetTitle')}
        headerIconName="camera-outline"
        headerTone={{ background: colors.tertiaryContainer, text: colors.onTertiaryContainer }}
        actions={[
          { label: t('screensFlow.profile.choosePhoto'), icon: 'image-outline', onPress: pickPhoto },
          { label: t('screensFlow.profile.removePhoto'), icon: 'trash-outline', isDestructive: true, onPress: () => save(null) },
        ]}
      />
      <M3Dialog
        visible={confirmLogout}
        type="warning"
        iconName="log-out-outline"
        title={t('screensFlow.profile.logoutTitle')}
        titleEmphasis={t('screensFlow.profile.logoutEmphasis')}
        message={t('screensFlow.profile.logoutMessage')}
        cancelText={t('common.cancel')}
        onCancel={() => setConfirmLogout(false)}
        confirmText={t('screensFlow.profile.logout')}
        confirmTone="danger"
        onConfirm={async () => {
          setConfirmLogout(false);
          await logout();
          router.replace('/login');
        }}
      />
      <M3Dialog
        visible={notice !== null}
        type="warning"
        title={notice?.title ?? ''}
        titleEmphasis={notice?.emphasis}
        message={notice?.message ?? ''}
        onConfirm={() => setNotice(null)}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.screenGutter,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
  },
  logout: {
    height: 56,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.m3.errorContainer,
  },
  logoutPressed: {
    opacity: 0.85,
  },
}));
