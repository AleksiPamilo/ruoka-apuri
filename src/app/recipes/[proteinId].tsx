import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getSuggestedRecipes } from '../../services/recipeService';
import { Recipe } from '../../types/recipe';
import { useAppTheme } from '../../theme/AppThemeProvider';

const SAVED_PLAN_KEY = 'ruoka-apuri.saved-weekly-plan';
const dayLabels = ['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai', 'Lauantai', 'Sunnuntai'];

export default function RecipeGeneratorScreen() {
  const { proteinId: proteinIdsParam, proteinLabel } = useLocalSearchParams();
  const proteinIds = (proteinIdsParam as string).split(',').filter(Boolean);
  const isMultiProtein = proteinIds.length > 1;
  const router = useRouter();
  const { colors } = useAppTheme();
  
  const [diners, setDiners] = useState(1);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<Recipe[]>([]);
  const [mealPrepOnly, setMealPrepOnly] = useState(false);
  const [savedPlan, setSavedPlan] = useState<Recipe[] | null>(null);
  const [showWeeklyPlan, setShowWeeklyPlan] = useState(false);

  const loadDailyIdeas = async () => {
    setLoading(true);
    const ideas = await getSuggestedRecipes(proteinIds, 10);
    setPlan(ideas.slice(0, 5));
    setLoading(false);
  };

  useEffect(() => {
    loadDailyIdeas();
  }, []);

  useEffect(() => {
    const loadSavedPlan = async () => {
      const storedPlan = await AsyncStorage.getItem(SAVED_PLAN_KEY);
      if (storedPlan) {
        const parsedPlan = JSON.parse(storedPlan);
        if (!Array.isArray(parsedPlan) && parsedPlan.proteinIds?.join(',') === proteinIds.join(',')) {
          setSavedPlan(parsedPlan.recipes);
          setPlan(parsedPlan.recipes);
          setShowWeeklyPlan(true);
        }
      }
    };

    loadSavedPlan();
  }, []);

  const generatePlan = async (mode: 'daily' | 'weekly' | 'mealprep') => {
    setLoading(true);
    
    const days = mode === 'daily' ? 1 : 7;
    const targetServings = days * diners;
    
    const isPrepMode = mode === 'mealprep';
    let availableRecipes = await getSuggestedRecipes(proteinIds, 20, isPrepMode);
    if (isPrepMode && availableRecipes.length === 0) {
      availableRecipes = await getSuggestedRecipes(proteinIds, 20);
    }
    
    let selected: Recipe[];

    if (mode !== 'daily') {
      selected = [];
      let dayIndex = 0;

      while (dayIndex < 7 && availableRecipes.length > 0) {
        const proteinId = proteinIds[dayIndex % proteinIds.length];
        const proteinRecipes = availableRecipes.filter((recipe) => recipe.proteinId === proteinId);
        const candidates = proteinRecipes.length > 0 ? proteinRecipes : availableRecipes;

        const unusedCandidates = candidates.filter((r) => !selected.some((s) => s.id === r.id));
        let chosenRecipe: Recipe;

        if (unusedCandidates.length > 0) {
          chosenRecipe = unusedCandidates[Math.floor(Math.random() * unusedCandidates.length)];
        } else {
          const unusedOverall = availableRecipes.filter((r) => !selected.some((s) => s.id === r.id));
          if (unusedOverall.length > 0) {
            chosenRecipe = unusedOverall[Math.floor(Math.random() * unusedOverall.length)];
          } else {
            let oldestLastIndex = Infinity;
            chosenRecipe = candidates[0];

            for (const candidate of candidates) {
              let lastIndex = -1;
              for (let i = selected.length - 1; i >= 0; i--) {
                if (selected[i].id === candidate.id) {
                  lastIndex = i;
                  break;
                }
              }
              if (lastIndex < oldestLastIndex) {
                oldestLastIndex = lastIndex;
                chosenRecipe = candidate;
              }
            }
          }
        }

        const servings = chosenRecipe.servings_per_batch || 4;
        const lastsDays = Math.max(1, Math.min(7 - dayIndex, Math.floor(servings / diners)));

        selected.push({
          ...chosenRecipe,
          planStartDay: dayIndex,
          lastsDays,
          isMealPrep: isPrepMode || chosenRecipe.isMealPrep,
        });

        dayIndex += lastsDays;
      }
    } else {
      selected = [];
      let currentServings = 0;
      const shuffled = [...availableRecipes].sort(() => 0.5 - Math.random());

      for (const recipe of shuffled) {
        if (currentServings >= targetServings) break;
        if (!selected.some((s) => s.id === recipe.id)) {
          selected.push(recipe);
          currentServings += recipe.servings_per_batch || 4;
        }
      }
    }

    setPlan(selected);
    setShowWeeklyPlan(mode !== 'daily');
    setLoading(false);
  };

  const saveWeeklyPlan = async () => {
    await AsyncStorage.setItem(SAVED_PLAN_KEY, JSON.stringify({ proteinIds, recipes: plan }));
    setSavedPlan(plan);
    router.replace('/calendar');
  };

  const isPlanSaved = savedPlan?.map((recipe) => recipe.id).join(',') === plan.map((recipe) => recipe.id).join(',');

  const handleMealPrepToggle = () => {
    const nextMealPrepOnly = !mealPrepOnly;
    setMealPrepOnly(nextMealPrepOnly);
    generatePlan(nextMealPrepOnly ? 'mealprep' : 'weekly');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: proteinLabel as string,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text },
          headerTintColor: colors.primary,
        }}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={[styles.cardTitle, { color: colors.text }]}>Kuinka monta syöjää?</Text>
          <View style={[styles.stepper, { backgroundColor: colors.background }]}> 
            <Pressable onPress={() => setDiners(Math.max(1, diners - 1))} style={styles.stepBtn}>
              <Ionicons name="remove" size={24} color={colors.primary} />
            </Pressable>
            <Text style={[styles.stepValue, { color: colors.text }]}>{diners}</Text>
            <Pressable onPress={() => setDiners(diners + 1)} style={styles.stepBtn}>
              <Ionicons name="add" size={24} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.buttonGrid}>
          {isMultiProtein || showWeeklyPlan ? (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: colors.card }, styles.mealPrepButton, { borderColor: colors.success }, mealPrepOnly && styles.greenBtn, mealPrepOnly && { backgroundColor: colors.success }]}
              onPress={handleMealPrepToggle}
            >
              <Ionicons name="cube" size={28} color={mealPrepOnly ? '#FFFFFF' : colors.success} />
              <Text style={[styles.btnLabel, { color: mealPrepOnly ? '#FFFFFF' : colors.text }]}>Meal Prep</Text>
            </Pressable>
          ) : null}
        </View>

        {!isMultiProtein && !showWeeklyPlan && (
          <Pressable style={[styles.randomButton, { backgroundColor: colors.primary }]} onPress={loadDailyIdeas}>
            <Ionicons name="shuffle" size={20} color="#FFFFFF" />
            <Text style={styles.randomButtonText}>Arvo uusia ideoita</Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.weeklyBtn, { backgroundColor: colors.card, borderColor: colors.primary }]}
          onPress={() => {
            setMealPrepOnly(false);
            generatePlan('weekly');
          }}
        >
          <Text style={[styles.weeklyBtnText, { color: colors.primary }]}>Luo 7 päivän suunnitelma</Text>
        </Pressable>

        {showWeeklyPlan && plan.length > 0 && (
          <Pressable
            style={[styles.saveButton, { backgroundColor: colors.accent }, isPlanSaved && styles.saveButtonSaved, isPlanSaved && { backgroundColor: colors.success }]}
            onPress={saveWeeklyPlan}
          >
            <Ionicons name={isPlanSaved ? 'checkmark' : 'bookmark-outline'} size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>{isPlanSaved ? 'Viikko tallennettu' : 'Tallenna viikko'}</Text>
          </Pressable>
        )}

        <View style={styles.resultsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ehdotetut reseptit</Text>
          
          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />
          ) : plan.length > 0 ? (
            plan.map((recipe, index) => (
              <View key={`${recipe.id}-${index}`} style={[styles.recipeResult, { backgroundColor: colors.card }]}>
                {showWeeklyPlan && <Text style={[styles.dayLabel, { color: colors.primary }]}>{dayLabels[recipe.planStartDay ?? index]}</Text>}
                <View style={styles.recipeRow}>
                  <View style={styles.recipeInfo}>
                    <Text style={[styles.recipeTitle, { color: colors.text }]}>{recipe.title}</Text>
                    <Text style={[styles.recipeMeta, { color: colors.mutedText }]}>
                      {recipe.servings_per_batch} annosta • {showWeeklyPlan
                        ? `Riittää ${recipe.lastsDays ?? 1} päivää`
                        : recipe.isMealPrep ? 'Prep-ystävällinen' : 'Tuoreeltaan'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.mutedText} />
                </View>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.mutedText }]}>Valitse ylhäältä tapa suunnitella ateriat.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
  },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 4 },
  stepBtn: { padding: 8 },
  stepValue: { fontSize: 18, fontWeight: '700', marginHorizontal: 15, minWidth: 20, textAlign: 'center' },
  buttonGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  actionBtn: { 
    flex: 1, padding: 20, borderRadius: 20, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
  },
  mealPrepButton: {
    borderWidth: 1,
    borderColor: '#34C759',
  },
  greenBtn: {},
  btnLabel: { marginTop: 8, fontWeight: '600', fontSize: 15 },
  randomButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    padding: 15,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  randomButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  saveButton: {
    borderRadius: 14,
    padding: 15,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonSaved: {},
  saveButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  weeklyBtn: { 
    padding: 16, borderRadius: 16, alignItems: 'center', 
    borderWidth: 1, marginBottom: 30 
  },
  weeklyBtnText: { fontWeight: '600', fontSize: 16 },
  resultsContainer: { flex: 1 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 15, letterSpacing: -0.5 },
  recipeResult: { 
    backgroundColor: '#FFF', padding: 16, borderRadius: 14, marginBottom: 10, 
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recipeInfo: { flex: 1 },
  recipeTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  recipeMeta: { fontSize: 13 },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 15 }
});