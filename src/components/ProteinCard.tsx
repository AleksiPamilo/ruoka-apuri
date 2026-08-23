import { View, Text, StyleSheet, Pressable } from 'react-native';
import { type Protein } from '../types/protein';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme/AppThemeProvider';

interface Props {
    protein: Protein;
    onPress?: () => void;
  selected?: boolean;
}

export default function ProteinCard({ protein, onPress, selected = false }: Props) {
  const { colors } = useAppTheme();
  const emoji = protein.icon?.trim() || '❓';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card },
        selected && styles.cardSelected,
        selected && { borderColor: colors.success },
        pressed && styles.cardPressed
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.background }, selected && styles.iconContainerSelected, selected && { backgroundColor: colors.success }]}>
        <Text style={styles.emoji}>{emoji}</Text>
        {selected && (
          <View style={[styles.checkmark, { backgroundColor: colors.success }]}>
            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.text }]}>{protein.label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    minHeight: 126,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  cardSelected: {
    borderWidth: 2,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconContainerSelected: {
  },
  emoji: {
    fontSize: 28,
  },
  checkmark: {
    position: 'absolute',
    right: -6,
    top: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    marginTop: 10,
    alignItems: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    textAlign: 'center',
  },
});