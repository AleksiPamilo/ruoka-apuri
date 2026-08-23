import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { Protein, ProteinCategory } from '../../types/protein';
import { useEffect, useState } from 'react';
import { getProteins } from '../../services/recipeService';
import ProteinCard  from '../../components/ProteinCard';
import { Stack, useRouter } from 'expo-router';
import { useAppTheme } from '../../theme/AppThemeProvider';

export default function HomeScreen() {
  const [proteins, setProteins] = useState<Protein[]>([]);
  const [selectedProteins, setSelectedProteins] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<ProteinCategory | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { colors } = useAppTheme();

  useEffect(() => {
    const fetchProteins = async () => {
      const data = await getProteins();
      setProteins(data);
      setLoading(false);
    };

    fetchProteins();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const handleProteinPress = (protein: Protein) => {
    setSelectedProteins((current) => {
      if (current.includes(protein.id)) {
        return current.filter((id) => id !== protein.id);
      }

      return current.length < 7 ? [...current, protein.id] : current;
    });
  };

  const handleGeneratePress = () => {
    const selected = proteins.filter((protein) => selectedProteins.includes(protein.id));

    router.push({
        pathname: '/recipes/[proteinId]',
        params: { 
            proteinId: selected.map((protein) => protein.id).join(','),
            proteinLabel: selected.map((protein) => protein.label).join(', ')
        }
    });
  };

  const visibleProteins = categoryFilter === 'all'
    ? proteins
    : proteins.filter((protein) => protein.category === categoryFilter);

  const categoryFilters: { label: string; value: ProteinCategory | 'all' }[] = [
    { label: 'Kaikki', value: 'all' },
    { label: 'Liha', value: 'meat' },
    { label: 'Kala', value: 'fish' },
    { label: 'Kasvipohjainen', value: 'plant_based' },
    { label: 'Muu', value: 'other' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Stack.Screen
        options={{
          headerLargeTitle: true,
          headerLargeTitleShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerLargeTitleStyle: { color: colors.text },
          headerTintColor: colors.primary,
          title: 'Ruoka-apuri'
        }}
      />
      <FlatList
        data={visibleProteins}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.list}
        ListHeaderComponent={(
          <View>
            <Text style={[styles.introTitle, { color: colors.text }]}>Valitse proteiinit</Text>
            <Text style={[styles.introText, { color: colors.mutedText }]}>Luo resepti-ideoita päivälle tai suunnittele koko viikko.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {categoryFilters.map((filter) => (
                <Pressable
                  key={filter.value}
                  onPress={() => setCategoryFilter(filter.value)}
                  style={[
                    styles.filter,
                    { backgroundColor: colors.chipBackground, borderColor: colors.border },
                    categoryFilter === filter.value && [styles.filterActive, { backgroundColor: colors.chipActive, borderColor: colors.chipActive }]
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: colors.chipText },
                      categoryFilter === filter.value && { color: colors.chipActiveText },
                    ]}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
        renderItem={({ item }) => (
          <ProteinCard
            protein={item}
            selected={selectedProteins.includes(item.id)}
            onPress={() => handleProteinPress(item)}
          />
        )}
      />
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}> 
        <Text style={[styles.selectionText, { color: colors.mutedText }]}> 
          {selectedProteins.length === 0
            ? 'Valitse vähintään yksi proteiini.'
            : `${selectedProteins.length} / 7 valittu`}
        </Text>
        <Pressable
          disabled={selectedProteins.length === 0}
          onPress={handleGeneratePress}
          style={[styles.generateButton, { backgroundColor: colors.primary }, selectedProteins.length === 0 && styles.generateButtonDisabled]}
        >
          <Text style={styles.generateButtonText}>Suunnittele ateriat</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  column: {
    gap: 12,
    marginBottom: 12,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  introText: {
    fontSize: 14,
    marginBottom: 16,
  },
  filters: {
    gap: 8,
    paddingBottom: 18,
  },
  filter: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
  },
  filterActive: {
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  selectionText: {
    textAlign: 'center',
    marginBottom: 10,
  },
  generateButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  generateButtonDisabled: {
    opacity: 0.45,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});