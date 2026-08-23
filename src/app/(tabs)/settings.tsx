import { View, Text, StyleSheet, Switch } from 'react-native';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { Stack } from 'expo-router';

export default function SettingsScreen() {
  const { colors, isDark, setDarkMode } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Stack.Screen
        options={{
          title: 'Asetukset',
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text },
          headerTintColor: colors.primary,
        }}
      />
      <View style={[styles.toggleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View>
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

      <Text style={[styles.todo, { color: colors.mutedText }]}>todo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  toggleCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  title: { fontSize: 17, fontWeight: '600' },
  subtitle: { fontSize: 13, marginTop: 4 },
  todo: { marginTop: 16, fontSize: 15 },
});