import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Protein, ProteinCategory } from '../../types/protein';
import { useEffect, useState, useCallback } from 'react';
import { getProteinCategories, getProteins } from '../../services/recipeService';
import ProteinCard  from '../../components/ProteinCard';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../../theme/AppThemeProvider';

export default function HomeScreen() {
  const [proteins, setProteins] = useState<Protein[]>([]);
  const [categories, setCategories] = useState<ProteinCategory[]>([]);
  const [selectedProteins, setSelectedProteins] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { colors } = useAppTheme();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [proteinsData, categoriesData] = await Promise.all([
      getProteins(),
      getProteinCategories(),
    ]);
    setProteins(proteinsData);
    setCategories(categoriesData);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (proteins.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={[styles.container, styles.center, { backgroundColor: colors.background, padding: 24 }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.mutedText} />
        <Text style={[styles.introTitle, { color: colors.text, textAlign: 'center', marginTop: 12 }]}>
          Proteiineja ei löytynyt
        </Text>
        <Text style={[styles.introText, { color: colors.mutedText, textAlign: 'center', marginTop: 4, marginBottom: 16 }]}>
          Tietokannasta ei löytynyt proteiinivaihtoehtoja tai yhteyttä ei saatu muodostettua.
        </Text>
        <Pressable
          style={[styles.generateButton, { backgroundColor: colors.primary, paddingHorizontal: 24 }]}
          onPress={fetchData}
        >
          <Text style={styles.generateButtonText}>Yritä uudelleen</Text>
        </Pressable>
      </SafeAreaView>
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

  const categoryFilters = [
    { label: 'Kaikki', value: 'all' },
    ...categories.map((c) => ({ label: c.label, value: c.id })),
  ];

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={visibleProteins}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.list}
        ListHeaderComponent={(
          <View style={styles.titleRow}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  titleRow: {
    marginBottom: 4,
  },
  column: {
    gap: 12,
    marginBottom: 12,
  },
  introTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
  },
  introText: {
    fontSize: 14,
    marginBottom: 20,
  },
  filters: {
    gap: 8,
    paddingBottom: 20,
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