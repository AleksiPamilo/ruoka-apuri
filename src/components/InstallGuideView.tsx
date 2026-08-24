import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme/AppThemeProvider';

export default function InstallGuideView({ onContinueToApp }: { onContinueToApp: () => void }) {
  const { colors } = useAppTheme();

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.appIconBg, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.appIconEmoji}>🍳</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Ruoka-apuri</Text>
          <Text style={[styles.tagline, { color: colors.mutedText }]}>
            Parhaan käyttökokemuksen saat asentamalla Ruoka-apurin puhelimesi aloitusnäytölle.
          </Text>
        </View>

        <View style={styles.grid}>
          <View style={[styles.guideCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.osIconBg, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="logo-apple" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>iPhone (iOS)</Text>
            </View>
            <View style={styles.stepList}>
              <View style={styles.stepItem}>
                <Text style={[styles.stepNum, { backgroundColor: colors.primary, color: '#FFFFFF' }]}>1</Text>
                <Text style={[styles.stepText, { color: colors.text }]}>
                  Avaa osoite <Text style={styles.bold}>Safari</Text>-selaimella.
                </Text>
              </View>
              <View style={styles.stepItem}>
                <Text style={[styles.stepNum, { backgroundColor: colors.primary, color: '#FFFFFF' }]}>2</Text>
                <Text style={[styles.stepText, { color: colors.text }]}>
                  Paina alareunan <Text style={styles.bold}>Jaa-painiketta</Text> (neliö ja nuoli ylös ↑).
                </Text>
              </View>
              <View style={styles.stepItem}>
                <Text style={[styles.stepNum, { backgroundColor: colors.primary, color: '#FFFFFF' }]}>3</Text>
                <Text style={[styles.stepText, { color: colors.text }]}>
                  Valitse valikosta <Text style={styles.bold}>"Lisää Koti-valikkoon"</Text>.
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.guideCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.osIconBg, { backgroundColor: colors.success + '15' }]}>
                <Ionicons name="logo-android" size={24} color={colors.success} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Android</Text>
            </View>
            <View style={styles.stepList}>
              <View style={styles.stepItem}>
                <Text style={[styles.stepNum, { backgroundColor: colors.success, color: '#FFFFFF' }]}>1</Text>
                <Text style={[styles.stepText, { color: colors.text }]}>
                  Avaa osoite <Text style={styles.bold}>Chrome</Text>-selaimella.
                </Text>
              </View>
              <View style={styles.stepItem}>
                <Text style={[styles.stepNum, { backgroundColor: colors.success, color: '#FFFFFF' }]}>2</Text>
                <Text style={[styles.stepText, { color: colors.text }]}>
                  Paina oikean yläkulman <Text style={styles.bold}>kolmea pistettä (⋮)</Text>.
                </Text>
              </View>
              <View style={styles.stepItem}>
                <Text style={[styles.stepNum, { backgroundColor: colors.success, color: '#FFFFFF' }]}>3</Text>
                <Text style={[styles.stepText, { color: colors.text }]}>
                  Valitse <Text style={styles.bold}>"Asenna sovellus"</Text> tai <Text style={styles.bold}>"Lisää aloitusnäyttöön"</Text>.
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={onContinueToApp}
          >
            <Text style={styles.primaryButtonText}>Jatka selaimeen</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  content: {
    width: '100%',
    maxWidth: 680,
    alignItems: 'center',
    gap: 24,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  appIconBg: {
    width: 68,
    height: 68,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  appIconEmoji: {
    fontSize: 34,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 440,
    lineHeight: 22,
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  guideCard: {
    flex: 1,
    minWidth: 280,
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  osIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  stepList: {
    gap: 14,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  stepText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  bold: {
    fontWeight: '700',
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
