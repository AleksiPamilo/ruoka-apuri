import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark';
type ThemePreference = ThemeMode | null;

const THEME_MODE_KEY = 'ruoka-apuri.theme-mode';

const lightColors = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  text: '#1C1C1E',
  mutedText: '#8E8E93',
  border: '#E5E5EA',
  primary: '#0A84FF',
  success: '#34C759',
  accent: '#5856D6',
  chipActive: '#1C1C1E',
  chipText: '#636366',
  chipBackground: '#FFFFFF',
  chipActiveText: '#FFFFFF',
  tabInactive: '#8E8E93',
};

const darkColors = {
  background: '#121214',
  card: '#1C1C1F',
  text: '#F5F5F7',
  mutedText: '#A1A1AA',
  border: '#2C2C31',
  primary: '#5AC8FA',
  success: '#30D158',
  accent: '#7D7AFF',
  chipActive: '#34343A',
  chipText: '#C7C7CC',
  chipBackground: '#1C1C1F',
  chipActiveText: '#F5F5F7',
  tabInactive: '#8E8E93',
};

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  colors: typeof lightColors;
  toggleTheme: () => void;
  setDarkMode: (enabled: boolean) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>(null);

  useEffect(() => {
    const loadPreference = async () => {
      const stored = await AsyncStorage.getItem(THEME_MODE_KEY);
      if (stored === 'light' || stored === 'dark') {
        setPreference(stored);
      }
    };

    loadPreference();
  }, []);

  const mode: ThemeMode = preference ?? (systemScheme === 'dark' ? 'dark' : 'light');

  const toggleTheme = async () => {
    const nextMode: ThemeMode = mode === 'light' ? 'dark' : 'light';
    setPreference(nextMode);
    await AsyncStorage.setItem(THEME_MODE_KEY, nextMode);
  };

  const setDarkMode = async (enabled: boolean) => {
    const nextMode: ThemeMode = enabled ? 'dark' : 'light';
    setPreference(nextMode);
    await AsyncStorage.setItem(THEME_MODE_KEY, nextMode);
  };

  const value = useMemo(
    () => ({
      mode,
      isDark: mode === 'dark',
      colors: mode === 'dark' ? darkColors : lightColors,
      toggleTheme,
      setDarkMode,
    }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }

  return context;
}
