import { useState, useEffect } from 'react';
import { Platform, useWindowDimensions, View, StyleSheet, Pressable, Text } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppThemeProvider, useAppTheme } from '../theme/AppThemeProvider';
import { AlertProvider } from '../components/AlertProvider';
import InstallGuideView from '../components/InstallGuideView';

function RootNavigator() {
  const { colors, isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const [showApp, setShowApp] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(Boolean(standalone));
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.style.backgroundColor = colors.background;
      document.body.style.backgroundColor = colors.background;

      let metaViewport = document.querySelector('meta[name="viewport"]');
      if (!metaViewport) {
        metaViewport = document.createElement('meta');
        metaViewport.setAttribute('name', 'viewport');
        document.head.appendChild(metaViewport);
      }
      metaViewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );

      let styleEl = document.getElementById('ruoka-apuri-web-styles');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'ruoka-apuri-web-styles';
        styleEl.innerHTML = `
          html, body, #root {
            touch-action: manipulation;
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
            overscroll-behavior-y: none;
          }
          *, *::before, *::after {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
          }
          input, textarea, [contenteditable="true"] {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
          }
        `;
        document.head.appendChild(styleEl);
      }

      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
      }
      metaThemeColor.setAttribute('content', colors.background);

      let metaAppleStatus = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (!metaAppleStatus) {
        metaAppleStatus = document.createElement('meta');
        metaAppleStatus.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
        document.head.appendChild(metaAppleStatus);
      }
      metaAppleStatus.setAttribute('content', isDark ? 'black-translucent' : 'default');
    }
  }, [colors.background, isDark]);

  const isWeb = Platform.OS === 'web';
  const isWideWeb = isWeb && width >= 768;

  if (isWeb && !isStandalone && !showApp) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
        <InstallGuideView onContinueToApp={() => setShowApp(true)} />
      </>
    );
  }

  if (isWideWeb) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
        <View style={[styles.desktopOuterContainer, { backgroundColor: isDark ? '#09090b' : '#e4e4e7' }]}>
          {!isStandalone && (
            <View style={styles.desktopTopBar}>
              <Pressable
                style={[styles.backToGuideBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowApp(false)}
              >
                <Ionicons name="arrow-back" size={16} color={colors.text} />
                <Text style={[styles.backToGuideText, { color: colors.text }]}>Takaisin asennusohjeisiin</Text>
              </Pressable>
            </View>
          )}
          <View style={[styles.phoneFrame, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background }
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background }
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AlertProvider>
        <RootNavigator />
      </AlertProvider>
    </AppThemeProvider>
  );
}

const styles = StyleSheet.create({
  desktopOuterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  desktopTopBar: {
    marginBottom: 10,
  },
  backToGuideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  backToGuideText: {
    fontSize: 13,
    fontWeight: '600',
  },
  phoneFrame: {
    width: '100%',
    maxWidth: 430,
    height: '92%',
    maxHeight: 880,
    borderRadius: 32,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
});