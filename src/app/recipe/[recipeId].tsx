import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getRecipeById, updateRecipeRating } from '../../services/recipeService';
import { Recipe, IngredientItem } from '../../types/recipe';
import { useAppTheme } from '../../theme/AppThemeProvider';

const SAVED_PLAN_KEY = 'ruoka-apuri.saved-weekly-plan';
const dayLabels = ['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai', 'Lauantai', 'Sunnuntai'];
const shortDayLabels = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'];

export default function RecipeScreen() {
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const { colors } = useAppTheme();
  
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState(4);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [userRating, setUserRating] = useState<number>(0);
  const [addedDayFeedback, setAddedDayFeedback] = useState<string | null>(null);

  useEffect(() => {
    const loadRecipe = async () => {
      if (!recipeId) return;
      const data = await getRecipeById(recipeId);
      if (data) {
        setRecipe(data);
        setServings(data.servings_per_batch || 4);
        setUserRating(data.rating || 0);
      }
      setLoading(false);
    };

    loadRecipe();
  }, [recipeId]);

  const handleAddRecipeToDay = async (dayIndex: number) => {
    if (!recipe) return;
    try {
      const storedPlan = await AsyncStorage.getItem(SAVED_PLAN_KEY);
      let currentPlanRecipes: Recipe[] = [];
      let currentProteinIds: string[] = [];

      if (storedPlan) {
        const parsed = JSON.parse(storedPlan);
        if (Array.isArray(parsed)) {
          currentPlanRecipes = parsed;
        } else {
          currentPlanRecipes = parsed.recipes || [];
          currentProteinIds = parsed.proteinIds || [];
        }
      }

      const lastsDays = Math.max(1, Math.min(7 - dayIndex, Math.floor((recipe.servings_per_batch || 4) / servings)));
      const newEntry: Recipe = {
        ...recipe,
        planStartDay: dayIndex,
        lastsDays,
      };

      const filtered = currentPlanRecipes.filter((r, idx) => (r.planStartDay ?? idx) !== dayIndex);
      const updatedList = [...filtered, newEntry].sort(
        (a, b) => (a.planStartDay ?? 0) - (b.planStartDay ?? 0)
      );

      await AsyncStorage.setItem(
        SAVED_PLAN_KEY,
        JSON.stringify({ proteinIds: currentProteinIds, recipes: updatedList })
      );

      setAddedDayFeedback(dayLabels[dayIndex]);
      setTimeout(() => {
        setAddedDayFeedback(null);
      }, 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const baseServings = recipe?.servings_per_batch || 4;
  const scaleFactor = servings / baseServings;

  const toggleIngredient = (index: number) => {
    setCheckedIngredients((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleStep = (index: number) => {
    setCompletedSteps((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleRate = async (stars: number) => {
    setUserRating(stars);
    if (recipe) {
      await updateRecipeRating(recipe.id, stars);
    }
  };

  const formatAmount = (item: IngredientItem | string) => {
    if (typeof item === 'string') return item;
    if (!item.amount) return item.name;

    const scaledAmount = Math.round(item.amount * scaleFactor * 10) / 10;
    return `${scaledAmount} ${item.unit || ''} ${item.name}`.trim();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: recipe?.title || 'Resepti',
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text },
          headerTintColor: colors.primary,
        }}
      />
      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : recipe ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.headerCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.title, { color: colors.text }]}>{recipe.title}</Text>
            {recipe.description && (
              <Text style={[styles.description, { color: colors.mutedText }]}>{recipe.description}</Text>
            )}

            <View style={styles.badgeRow}>
              {recipe.isMealPrep && (
                <View style={[styles.badge, { backgroundColor: colors.success }]}>
                  <Ionicons name="cube" size={14} color="#FFFFFF" />
                  <Text style={styles.badgeText}>Meal Prep</Text>
                </View>
              )}
              {recipe.prep_time_minutes && (
                <View style={[styles.chip, { backgroundColor: colors.background }]}>
                  <Ionicons name="time-outline" size={14} color={colors.primary} />
                  <Text style={[styles.chipText, { color: colors.text }]}>Valmistelu: {recipe.prep_time_minutes} min</Text>
                </View>
              )}
              {recipe.cook_time_minutes && (
                <View style={[styles.chip, { backgroundColor: colors.background }]}>
                  <Ionicons name="flame-outline" size={14} color={colors.primary} />
                  <Text style={[styles.chipText, { color: colors.text }]}>Kypsennys: {recipe.cook_time_minutes} min</Text>
                </View>
              )}
            </View>

            <View style={styles.ratingRow}>
              <Text style={[styles.ratingLabel, { color: colors.mutedText }]}>Arvostelu:</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable key={star} onPress={() => handleRate(star)}>
                    <Ionicons
                      name={star <= userRating ? 'star' : 'star-outline'}
                      size={24}
                      color={star <= userRating ? '#FFCC00' : colors.mutedText}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.dayAssignHeader}>
              <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Lisää kalenteripäivälle</Text>
              {addedDayFeedback && (
                <View style={[styles.feedbackBadge, { backgroundColor: colors.success }]}>
                  <Ionicons name="checkmark-circle" size={13} color="#FFFFFF" />
                  <Text style={styles.feedbackText}>Lisätty: {addedDayFeedback}</Text>
                </View>
              )}
            </View>
            <View style={styles.dayChipsRow}>
              {shortDayLabels.map((label, dayIdx) => (
                <Pressable
                  key={label}
                  style={({ pressed }) => [
                    styles.dayChip,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handleAddRecipeToDay(dayIdx)}
                >
                  <Text style={[styles.dayChipText, { color: colors.primary }]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.ingredientsHeaderRow}>
              <View style={styles.titleWrapper}>
                <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Ainesosat</Text>
                <Text style={[styles.subtext, { color: colors.mutedText }]}>Skaalautuu annoskoon mukaan</Text>
              </View>

              <View style={[styles.stepper, { backgroundColor: colors.background }]}>
                <Pressable onPress={() => setServings(Math.max(1, servings - 1))} style={styles.stepBtn}>
                  <Ionicons name="remove" size={18} color={colors.primary} />
                </Pressable>
                <Text style={[styles.stepValue, { color: colors.text }]}>{servings} ann.</Text>
                <Pressable onPress={() => setServings(servings + 1)} style={styles.stepBtn}>
                  <Ionicons name="add" size={18} color={colors.primary} />
                </Pressable>
              </View>
            </View>
            {recipe.ingredients && recipe.ingredients.length > 0 ? (
              recipe.ingredients.map((item, index) => {
                const isChecked = !!checkedIngredients[index];
                return (
                  <Pressable
                    key={index}
                    style={[styles.ingredientRow, isChecked && styles.checkedRow]}
                    onPress={() => toggleIngredient(index)}
                  >
                    <Ionicons
                      name={isChecked ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={isChecked ? colors.success : colors.mutedText}
                    />
                    <Text
                      style={[
                        styles.ingredientText,
                        { color: isChecked ? colors.mutedText : colors.text },
                        isChecked && styles.strikethrough,
                      ]}
                    >
                      {formatAmount(item)}
                    </Text>
                  </Pressable>
                );
              })
            ) : (
              <Text style={{ color: colors.mutedText }}>Ei ainesosia ilmoitettu.</Text>
            )}
          </View>

          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Valmistusohjeet</Text>
            {recipe.instructions && recipe.instructions.length > 0 ? (
              recipe.instructions.map((step, index) => {
                const isDone = !!completedSteps[index];
                return (
                  <Pressable
                    key={index}
                    style={[styles.stepCard, { backgroundColor: colors.background }, isDone && styles.stepCardDone]}
                    onPress={() => toggleStep(index)}
                  >
                    <View style={styles.stepHeader}>
                      <Text style={[styles.stepNumber, { color: colors.primary }]}>Vaihe {index + 1}</Text>
                      <Ionicons
                        name={isDone ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={isDone ? colors.success : colors.mutedText}
                      />
                    </View>
                    <Text
                      style={[
                        styles.stepText,
                        { color: isDone ? colors.mutedText : colors.text },
                        isDone && styles.strikethrough,
                      ]}
                    >
                      {step}
                    </Text>
                  </Pressable>
                );
              })
            ) : (
              <Text style={{ color: colors.mutedText }}>Ei valmistusohjeita ilmoitettu.</Text>
            )}
          </View>
        </ScrollView>
      ) : (
        <Text style={[styles.emptyText, { color: colors.mutedText }]}>Reseptiä ei löytynyt.</Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
  loader: { marginTop: 40 },
  headerCard: {
    padding: 18,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { fontSize: 13, fontWeight: '500' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  ratingLabel: { fontSize: 14, fontWeight: '600' },
  stars: { flexDirection: 'row', gap: 4 },
  dayAssignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  feedbackText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  dayChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  dayChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: { opacity: 0.7 },
  ingredientsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleWrapper: { flex: 1, marginRight: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  subtext: { fontSize: 12, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 4 },
  stepBtn: { padding: 6 },
  stepValue: { fontSize: 14, fontWeight: '700', marginHorizontal: 6 },
  section: {
    padding: 18,
    borderRadius: 18,
    gap: 12,
  },
  sectionHeaderTitle: { fontSize: 18, fontWeight: '700' },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  checkedRow: { opacity: 0.6 },
  ingredientText: { fontSize: 15, flex: 1 },
  strikethrough: { textDecorationLine: 'line-through' },
  stepCard: {
    padding: 14,
    borderRadius: 14,
    gap: 8,
  },
  stepCardDone: { opacity: 0.6 },
  stepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepNumber: { fontWeight: '700', fontSize: 14 },
  stepText: { fontSize: 15, lineHeight: 22 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 16 },
});
