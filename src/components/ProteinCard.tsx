import { View, Text, StyleSheet, Pressable } from 'react-native';
import { type Protein } from '../types/protein';
import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';

interface Props {
    protein: Protein;
    onPress?: () => void;
}

type IconName = ComponentProps<typeof Ionicons>['name'];

const categoryIcons: Record<string, IconName> = {
  meat: 'fast-food-outline',
  fish: 'water-outline',
  plant_based: 'leaf-outline',
  other: 'cube-outline'
};

export default function ProteinCard({ protein, onPress }: Props) {
  const iconName = categoryIcons[protein.category] || categoryIcons.other;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card, 
        pressed && styles.cardPressed
      ]}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={iconName} size={24} color="#FFFFFF" />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>{protein.label}</Text>
        <Text style={styles.category}>{protein.category}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
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
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    letterSpacing: -0.4,
  },
  category: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
});