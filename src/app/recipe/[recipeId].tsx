import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getRecipeById } from '../../services/recipeService';
import { Recipe } from '../../types/recipe';
import { useAppTheme } from '../../theme/AppThemeProvider';

export default function RecipeScreen() {
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const { colors } = useAppTheme();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRecipe = async () => {
      if (!recipeId) return;
      const data = await getRecipeById(recipeId);
      setRecipe(data as Recipe | null);
      setLoading(false);
    };

    loadRecipe();
  }, [recipeId]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: recipe?.title || 'Resepti', headerBackButtonDisplayMode: 'minimal', headerStyle: { backgroundColor: colors.background }, headerTitleStyle: { color: colors.text }, headerTintColor: colors.primary }} />
      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : recipe ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>{recipe.title}</Text>
          <Text style={[styles.meta, { color: colors.mutedText }]}>{recipe.servings_per_batch} annosta</Text>
          {recipe.isMealPrep && <Text style={styles.badge}>Meal Prep</Text>}
          {recipe.tags.length > 0 && (
            <View style={styles.tags}>
              {recipe.tags.map((tag) => <Text key={tag} style={[styles.tag, { color: colors.mutedText, backgroundColor: colors.card }]}>{tag}</Text>)}
            </View>
          )}
        </ScrollView>
      ) : (
        <Text style={[styles.emptyText, { color: colors.mutedText }]}>Reseptiä ei löytynyt.</Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  loader: { marginTop: 40 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  meta: { fontSize: 15 },
  badge: { color: '#FFFFFF', backgroundColor: '#34C759', alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginTop: 18, fontWeight: '600' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  tag: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7 },
  emptyText: { textAlign: 'center', marginTop: 40 },
});
