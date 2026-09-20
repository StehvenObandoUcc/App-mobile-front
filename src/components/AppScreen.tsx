import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export type AppScreenProps = {
  children: React.ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: any;
  style?: any;
};

export function AppScreen({
  children,
  scrollable = false,
  contentContainerStyle,
  style,
}: AppScreenProps) {
  return (
    <SafeAreaView style={[styles.safeArea, style]} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      {scrollable ? (
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.container, contentContainerStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
});
