import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { Ionicons } from '@expo/vector-icons';

import packageJson from '../../../package.json';

export const DEFAULT_SERVINGS_KEY = 'ruoka-apuri.default-servings';

export default function SettingsScreen() {
  const { colors, isDark, setDarkMode } = useAppTheme();
  const [defaultServings, setDefaultServings] = useState<number>(4);

  useEffect(() => {
    const loadDefaultServings = async () => {
      const stored = await AsyncStorage.getItem(DEFAULT_SERVINGS_KEY);
      if (stored) {
        const val = parseInt(stored, 10);
        if (!isNaN(val) && val > 0) {
          setDefaultServings(val);
        }
      }
    };
    loadDefaultServings();
  }, []);

  const updateDefaultServings = async (newVal: number) => {
    const clamped = Math.max(1, Math.min(12, newVal));
    setDefaultServings(clamped);
    await AsyncStorage.setItem(DEFAULT_SERVINGS_KEY, String(clamped));
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Asetukset</Text>
        <Text style={[styles.pageSubtitle, { color: colors.mutedText }]}>
          Määritä sovelluksen ulkoasu ja annoskoko.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeader}>
          <View style={styles.textGroup}>
            <Text style={[styles.title, { color: colors.text }]}>Tumma teema</Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>Käytä sovelluksen tummaa ulkoasua</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={setDarkMode}
            trackColor={{ false: '#767577', true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeader}>
          <View style={styles.textGroup}>
            <Text style={[styles.title, { color: colors.text }]}>Oletusannoskoko</Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>Ateriasuunnittelun oletussyöjämäärä</Text>
          </View>
          <View style={[styles.stepper, { backgroundColor: colors.background }]}>
            <Pressable onPress={() => updateDefaultServings(defaultServings - 1)} style={styles.stepBtn}>
              <Ionicons name="remove" size={18} color={colors.primary} />
            </Pressable>
            <Text style={[styles.stepValue, { color: colors.text }]}>{defaultServings}</Text>
            <Pressable onPress={() => updateDefaultServings(defaultServings + 1)} style={styles.stepBtn}>
              <Ionicons name="add" size={18} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.text, marginBottom: 8 }]}>Tietoja sovelluksesta</Text>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.mutedText }]}>Versio</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{packageJson.version}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.mutedText }]}>Lisenssi</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>GNU GPLv3</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 28, paddingHorizontal: 20, paddingBottom: 24, gap: 16 },
  titleRow: {
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textGroup: { flex: 1, marginRight: 12 },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 13, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 4 },
  stepBtn: { padding: 6 },
  stepValue: { fontSize: 15, fontWeight: '700', marginHorizontal: 8, minWidth: 20, textAlign: 'center' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500' },
});