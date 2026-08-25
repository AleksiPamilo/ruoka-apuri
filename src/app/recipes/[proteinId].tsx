import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Modal, Animated, PanResponder, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getSuggestedRecipes } from '../../services/recipeService';
import { Recipe, IngredientItem } from '../../types/recipe';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { DEFAULT_SERVINGS_KEY } from '../(tabs)/settings';

const SAVED_PLAN_KEY = 'ruoka-apuri.saved-weekly-plan';
const dayLabels = ['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai', 'Lauantai', 'Sunnuntai'];
const shortDayLabels = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'];

export default function RecipeGeneratorScreen() {
  const { proteinId: proteinIdsParam, proteinLabel } = useLocalSearchParams();
  const proteinIds = (proteinIdsParam as string).split(',').filter(Boolean);
  const isMultiProtein = proteinIds.length > 1;
  const router = useRouter();
  const { colors } = useAppTheme();
  
  const [diners, setDiners] = useState(4);
  const [loading, setLoading] = useState(false);
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null);
  const [plan, setPlan] = useState<Recipe[]>([]);
  const [mealPrepOnly, setMealPrepOnly] = useState(false);
  const [savedPlan, setSavedPlan] = useState<Recipe[] | null>(null);
  const [showWeeklyPlan, setShowWeeklyPlan] = useState(false);
  const [previewRecipe, setPreviewRecipe] = useState<Recipe | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [addedDayFeedback, setAddedDayFeedback] = useState<string | null>(null);
  const [slotModalVisible, setSlotModalVisible] = useState(false);
  const [freeDaysList, setFreeDaysList] = useState<number[]>([]);
  const [existingCalendarRecipes, setExistingCalendarRecipes] = useState<Recipe[]>([]);
  const [existingCalendarProteinIds, setExistingCalendarProteinIds] = useState<string[]>([]);
  const [slotAssignments, setSlotAssignments] = useState<Record<number, string | null>>({});

  const previewPanY = useRef(new Animated.Value(0)).current;
  const slotPanY = useRef(new Animated.Value(0)).current;

  const previewPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          previewPanY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 70 || gestureState.vy > 0.4) {
          Animated.timing(previewPanY, {
            toValue: 500,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            setPreviewRecipe(null);
            setPreviewIndex(null);
            setAddedDayFeedback(null);
            previewPanY.setValue(0);
          });
        } else {
          Animated.spring(previewPanY, {
            toValue: 0,
            bounciness: 4,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const slotPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slotPanY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 70 || gestureState.vy > 0.4) {
          Animated.timing(slotPanY, {
            toValue: 600,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            setSlotModalVisible(false);
            slotPanY.setValue(0);
          });
        } else {
          Animated.spring(slotPanY, {
            toValue: 0,
            bounciness: 4,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    const loadSettings = async () => {
      const storedServings = await AsyncStorage.getItem(DEFAULT_SERVINGS_KEY);
      if (storedServings) {
        const val = parseInt(storedServings, 10);
        if (!isNaN(val) && val > 0) {
          setDiners(val);
        }
      }
    };
    loadSettings();
  }, []);

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
        let lastsDays: number;
        if (isPrepMode) {
          const remainingDays = 7 - dayIndex;
          if (remainingDays >= 5) {
            lastsDays = 3;
          } else if (remainingDays === 4) {
            lastsDays = 2;
          } else if (remainingDays === 3) {
            lastsDays = 3;
          } else if (remainingDays === 2) {
            lastsDays = 2;
          } else {
            lastsDays = 1;
          }
          if (diners === 1) {
            const naturalBatchDays = Math.floor(servings / diners);
            if (naturalBatchDays > lastsDays) {
              lastsDays = Math.min(remainingDays, naturalBatchDays);
            }
          }
        } else {
          lastsDays = Math.max(1, Math.min(7 - dayIndex, Math.floor(servings / diners)));
        }

        const targetServings = lastsDays * diners;

        selected.push({
          ...chosenRecipe,
          planStartDay: dayIndex,
          lastsDays,
          diners,
          targetServings,
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
          selected.push({
            ...recipe,
            diners,
            targetServings: diners,
            lastsDays: 1,
          });
          currentServings += recipe.servings_per_batch || 4;
        }
      }
    }

    setPlan(selected);
    setShowWeeklyPlan(mode !== 'daily');
    setLoading(false);
  };

  const handleSwapRecipe = async (index: number) => {
    if (index < 0 || index >= plan.length || swappingIndex !== null) return;
    setSwappingIndex(index);

    try {
      const targetRecipe = plan[index];
      const targetProteinId = targetRecipe.proteinId || proteinIds[index % proteinIds.length] || proteinIds[0];

      let available = await getSuggestedRecipes([targetProteinId], 30, mealPrepOnly);
      if (available.length <= 1) {
        const more = await getSuggestedRecipes(proteinIds, 30, mealPrepOnly);
        if (more.length > 0) {
          available = more;
        }
      }
      if (available.length <= 1 && mealPrepOnly) {
        const withoutPrep = await getSuggestedRecipes(proteinIds, 30, false);
        if (withoutPrep.length > 0) {
          available = withoutPrep;
        }
      }

      const unused = available.filter((r) => !plan.some((p) => p.id === r.id));
      let chosen: Recipe | undefined;

      if (unused.length > 0) {
        chosen = unused[Math.floor(Math.random() * unused.length)];
      } else {
        const alternatives = available.filter((r) => r.id !== targetRecipe.id);
        if (alternatives.length > 0) {
          chosen = alternatives[Math.floor(Math.random() * alternatives.length)];
        }
      }

      if (chosen && chosen.id !== targetRecipe.id) {
        const lastsDays = targetRecipe.lastsDays ?? (showWeeklyPlan ? 1 : targetRecipe.lastsDays);
        const targetServings = (lastsDays || 1) * diners;

        const updatedRecipe: Recipe = {
          ...chosen,
          planStartDay: targetRecipe.planStartDay ?? index,
          lastsDays,
          diners,
          targetServings,
          isMealPrep: mealPrepOnly || chosen.isMealPrep,
        };

        setPlan((prevPlan) => {
          const nextPlan = [...prevPlan];
          nextPlan[index] = updatedRecipe;
          return nextPlan;
        });

        if (previewRecipe && (previewIndex === index || previewRecipe.id === targetRecipe.id)) {
          setPreviewRecipe(updatedRecipe);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSwappingIndex(null);
    }
  };

  const executeSavePlan = async (recipesToSave: Recipe[], proteinIdsToSave: string[]) => {
    await AsyncStorage.setItem(
      SAVED_PLAN_KEY,
      JSON.stringify({ proteinIds: proteinIdsToSave, recipes: recipesToSave })
    );
    setSavedPlan(recipesToSave);
    router.replace('/calendar');
  };

  const handleSavePlan = async (mode: 'weekly' | 'suggestions') => {
    try {
      const storedPlan = await AsyncStorage.getItem(SAVED_PLAN_KEY);
      let existingRecipes: Recipe[] = [];
      let existingProteinIds: string[] = [];

      if (storedPlan) {
        const parsed = JSON.parse(storedPlan);
        if (Array.isArray(parsed)) {
          existingRecipes = parsed;
        } else {
          existingRecipes = parsed.recipes || [];
          existingProteinIds = parsed.proteinIds || [];
        }
      }

      const targetRecipes = mode === 'weekly'
        ? plan
        : plan.map((recipe, index) => ({
            ...recipe,
            planStartDay: index,
            lastsDays: 1,
          }));

      if (existingRecipes.length === 0) {
        await executeSavePlan(targetRecipes, proteinIds);
        return;
      }

      const isExactMatch =
        existingRecipes.length === targetRecipes.length &&
        existingRecipes.every((r, idx) => r.id === targetRecipes[idx]?.id);

      if (isExactMatch) {
        router.replace('/calendar');
        return;
      }

      const occupiedDays = new Set(existingRecipes.map((r, idx) => r.planStartDay ?? idx));
      const freeDays: number[] = [];
      for (let d = 0; d < 7; d++) {
        if (!occupiedDays.has(d)) {
          freeDays.push(d);
        }
      }

      if (freeDays.length > 0 && targetRecipes.length <= freeDays.length) {
        const mergedRecipes = [...existingRecipes];
        for (let i = 0; i < targetRecipes.length; i++) {
          mergedRecipes.push({
            ...targetRecipes[i],
            planStartDay: freeDays[i],
            lastsDays: 1,
          });
        }
        mergedRecipes.sort((a, b) => (a.planStartDay ?? 0) - (b.planStartDay ?? 0));
        const mergedProteinIds = Array.from(new Set([...existingProteinIds, ...proteinIds]));
        await executeSavePlan(mergedRecipes, mergedProteinIds);
        return;
      }

      const buttons: any[] = [
        { text: 'Peruuta', style: 'cancel' },
        {
          text: 'Korvaa koko viikko',
          style: 'destructive',
          onPress: async () => {
            await executeSavePlan(targetRecipes, proteinIds);
          },
        },
        {
          text: freeDays.length === 0 ? 'Valitse korvattavat päivät' : `Valitse päivät (${freeDays.length} vapaana)`,
          onPress: () => {
            openSlotModal(freeDays, existingRecipes, existingProteinIds);
          },
        },
      ];

      Alert.alert(
        freeDays.length === 0 ? 'Kalenteri on täynnä' : 'Kalenterissa on jo aterioita',
        freeDays.length === 0
          ? `Kalenterissasi on jo 7 ateriaa. Haluatko valita mitkä päivät korvataan, vai korvata koko viikon?`
          : `Kalenterissa on ${existingRecipes.length} ateriaa ja ${freeDays.length} vapaata päivää. Miten haluat toimia?`,
        buttons
      );
    } catch (e) {
      console.error(e);
    }
  };

  const openSlotModal = (freeDays: number[], existingRecs: Recipe[], existingProts: string[]) => {
    setFreeDaysList(freeDays);
    setExistingCalendarRecipes(existingRecs);
    setExistingCalendarProteinIds(existingProts);

    const initialAssignments: Record<number, string> = {};
    for (let day = 0; day < 7; day++) {
      const existing = existingRecs.find((r, idx) => (r.planStartDay ?? idx) === day);
      if (existing) {
        initialAssignments[day] = 'KEEP_EXISTING';
      } else {
        initialAssignments[day] = 'EMPTY';
      }
    }

    if (freeDays.length > 0) {
      freeDays.forEach((freeDay, idx) => {
        if (idx < plan.length) {
          initialAssignments[freeDay] = plan[idx].id;
        }
      });
    } else {
      if (plan.length > 0) {
        initialAssignments[0] = plan[0].id;
      }
    }

    setSlotAssignments(initialAssignments);
    setSlotModalVisible(true);
  };

  const handleConfirmSlotAssignments = async () => {
    const finalRecipes: Recipe[] = [];

    for (let day = 0; day < 7; day++) {
      const assignment = slotAssignments[day];
      if (!assignment || assignment === 'EMPTY') {
        continue;
      }
      if (assignment === 'KEEP_EXISTING') {
        const existing = existingCalendarRecipes.find((r, idx) => (r.planStartDay ?? idx) === day);
        if (existing) {
          finalRecipes.push(existing);
        }
      } else {
        const newRecipe = plan.find((r) => r.id === assignment);
        if (newRecipe) {
          finalRecipes.push({
            ...newRecipe,
            planStartDay: day,
            lastsDays: 1,
          });
        }
      }
    }

    finalRecipes.sort((a, b) => (a.planStartDay ?? 0) - (b.planStartDay ?? 0));
    const mergedProteinIds = Array.from(new Set([...existingCalendarProteinIds, ...proteinIds]));
    setSlotModalVisible(false);
    await executeSavePlan(finalRecipes, mergedProteinIds);
  };

  const handleAddRecipeToDay = async (recipe: Recipe, dayIndex: number) => {
    try {
      const storedPlan = await AsyncStorage.getItem(SAVED_PLAN_KEY);
      let currentPlanRecipes: Recipe[] = [];
      let currentProteinIds: string[] = proteinIds;

      if (storedPlan) {
        const parsed = JSON.parse(storedPlan);
        if (Array.isArray(parsed)) {
          currentPlanRecipes = parsed;
        } else {
          currentPlanRecipes = parsed.recipes || [];
          currentProteinIds = parsed.proteinIds || proteinIds;
        }
      }

      const computedLasts = (recipe.isMealPrep || mealPrepOnly) ? Math.min(7 - dayIndex, 2) : 1;
      const lastsDays = Math.max(1, Math.min(7 - dayIndex, computedLasts));
      const targetServings = lastsDays * diners;
      const newEntry: Recipe = {
        ...recipe,
        planStartDay: dayIndex,
        lastsDays,
        diners,
        targetServings,
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

  const isPlanSaved = savedPlan?.map((recipe) => recipe.id).join(',') === plan.map((recipe) => recipe.id).join(',');

  const handleMealPrepToggle = () => {
    const nextMealPrepOnly = !mealPrepOnly;
    setMealPrepOnly(nextMealPrepOnly);
    generatePlan(nextMealPrepOnly ? 'mealprep' : 'weekly');
  };

  const handleCardPress = (recipe: Recipe, index: number) => {
    setPreviewRecipe(recipe);
    setPreviewIndex(index);
    setAddedDayFeedback(null);
  };

  const formatIngredient = (item: IngredientItem | string) => {
    if (typeof item === 'string') return item;
    if (!item.amount) return item.name;
    return `${item.amount} ${item.unit || ''} ${item.name}`.trim();
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

        {showWeeklyPlan && plan.length > 0 ? (
          <Pressable
            style={[styles.saveButton, { backgroundColor: colors.accent }, isPlanSaved && styles.saveButtonSaved, isPlanSaved && { backgroundColor: colors.success }]}
            onPress={() => handleSavePlan('weekly')}
          >
            <Ionicons name={isPlanSaved ? 'checkmark' : 'bookmark-outline'} size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>{isPlanSaved ? 'Viikko tallennettu' : 'Tallenna viikko'}</Text>
          </Pressable>
        ) : !showWeeklyPlan && plan.length > 0 ? (
          <Pressable
            style={[styles.saveSuggestionsBtn, { backgroundColor: colors.card, borderColor: colors.primary }]}
            onPress={() => handleSavePlan('suggestions')}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={[styles.saveSuggestionsBtnText, { color: colors.primary }]}>Tallenna nämä ateriat kalenteriin</Text>
          </Pressable>
        ) : null}

        <View style={styles.resultsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {showWeeklyPlan ? 'Ateriasuunnitelma' : 'Reseptit'}
          </Text>
          
          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />
          ) : plan.length > 0 ? (
            plan.map((recipe, index) => (
              <View
                key={`${recipe.id}-${index}`}
                style={[styles.recipeResult, { backgroundColor: colors.card }]}
              >
                <Pressable
                  style={styles.recipeMainClickable}
                  onPress={() => handleCardPress(recipe, index)}
                >
                  {showWeeklyPlan && (
                    <Text style={[styles.dayLabel, { color: colors.primary }]}>
                      {dayLabels[recipe.planStartDay ?? index]}
                    </Text>
                  )}
                  <Text style={[styles.recipeTitle, { color: colors.text }]}>{recipe.title}</Text>
                  <Text style={[styles.recipeMeta, { color: colors.mutedText }]}>
                    {(() => {
                      const totalServings = recipe.targetServings || ((recipe.lastsDays || 1) * (recipe.diners || diners));
                      const days = recipe.lastsDays || 1;
                      if (showWeeklyPlan) {
                        if (days > 1) {
                          return `${totalServings} annosta • Riittää ${days} päivää`;
                        }
                        return `${totalServings} annosta • 1 päivä`;
                      }
                      return `${recipe.servings_per_batch} annosta • ${recipe.isMealPrep ? 'Prep-ystävällinen' : 'Tuoreeltaan'}`;
                    })()}
                  </Text>
                </Pressable>
                <View style={styles.cardActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.swapCardBtn,
                      { backgroundColor: colors.background },
                      pressed && styles.pressed,
                    ]}
                    onPress={() => handleSwapRecipe(index)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {swappingIndex === index ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="refresh" size={18} color={colors.primary} />
                    )}
                  </Pressable>
                  <Pressable
                    style={styles.chevronBtn}
                    onPress={() => handleCardPress(recipe, index)}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
                  >
                    <Ionicons name="chevron-forward" size={16} color={colors.mutedText} />
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.mutedText }]}>Valitse ylhäältä tapa suunnitella ateriat.</Text>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={!!previewRecipe}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setPreviewRecipe(null);
          setPreviewIndex(null);
          setAddedDayFeedback(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => {
              setPreviewRecipe(null);
              setPreviewIndex(null);
              setAddedDayFeedback(null);
            }}
          />
          {previewRecipe && (
            <View style={styles.modalFrameContainer} pointerEvents="box-none">
              <Animated.View
                style={[
                  styles.modalSheet,
                  { backgroundColor: colors.card, transform: [{ translateY: previewPanY }] },
                ]}
              >
                <View style={styles.dragHandleArea} {...previewPanResponder.panHandlers}>
                  <View style={styles.modalHandle} />
                </View>
                
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    {previewIndex !== null && showWeeklyPlan && (
                      <Text style={[styles.modalDayLabel, { color: colors.primary }]}>
                        {dayLabels[previewRecipe.planStartDay ?? previewIndex]}
                      </Text>
                    )}
                    <Text style={[styles.modalTitle, { color: colors.text }]}>{previewRecipe.title}</Text>
                  </View>
                  <Pressable
                    style={[styles.modalCloseBtn, { backgroundColor: colors.background }]}
                    onPress={() => {
                      setPreviewRecipe(null);
                      setPreviewIndex(null);
                      setAddedDayFeedback(null);
                    }}
                  >
                    <Ionicons name="close" size={20} color={colors.text} />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                  {previewRecipe.description ? (
                    <Text style={[styles.modalDescription, { color: colors.mutedText }]}>
                      {previewRecipe.description}
                    </Text>
                  ) : null}

                  <View style={styles.modalBadgeRow}>
                    {previewRecipe.isMealPrep && (
                      <View style={[styles.modalBadge, { backgroundColor: colors.success }]}>
                        <Ionicons name="cube" size={13} color="#FFFFFF" />
                        <Text style={styles.modalBadgeText}>Meal Prep</Text>
                      </View>
                    )}
                    {previewRecipe.prep_time_minutes ? (
                      <View style={[styles.modalChip, { backgroundColor: colors.background }]}>
                        <Ionicons name="time-outline" size={13} color={colors.primary} />
                        <Text style={[styles.modalChipText, { color: colors.text }]}>Valm. {previewRecipe.prep_time_minutes} min</Text>
                      </View>
                    ) : null}
                    {previewRecipe.cook_time_minutes ? (
                      <View style={[styles.modalChip, { backgroundColor: colors.background }]}>
                        <Ionicons name="flame-outline" size={13} color={colors.primary} />
                        <Text style={[styles.modalChipText, { color: colors.text }]}>Kyps. {previewRecipe.cook_time_minutes} min</Text>
                      </View>
                    ) : null}
                    <View style={[styles.modalChip, { backgroundColor: colors.background }]}>
                      <Ionicons name="people-outline" size={13} color={colors.primary} />
                      <Text style={[styles.modalChipText, { color: colors.text }]}>
                        {previewRecipe.targetServings || ((previewRecipe.lastsDays || 1) * (previewRecipe.diners || diners))} annosta
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalDayAssignSection}>
                    <View style={styles.modalDayAssignHeader}>
                      <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Lisää kalenteripäivälle</Text>
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
                          onPress={() => handleAddRecipeToDay(previewRecipe, dayIdx)}
                        >
                          <Text style={[styles.dayChipText, { color: colors.primary }]}>{label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {previewRecipe.ingredients && previewRecipe.ingredients.length > 0 && (
                    <View style={styles.modalIngredientsSection}>
                      <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Ainesosat</Text>
                      <View style={styles.modalIngredientsList}>
                        {previewRecipe.ingredients.map((item, idx) => (
                          <View key={idx} style={styles.modalIngredientItem}>
                            <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
                            <Text style={[styles.modalIngredientText, { color: colors.text }]}>
                              {formatIngredient(item)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </ScrollView>

                <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
                  {previewIndex !== null && (
                    <Pressable
                      style={[styles.modalSwapBtn, { borderColor: colors.primary, backgroundColor: colors.card }]}
                      onPress={() => handleSwapRecipe(previewIndex)}
                      disabled={swappingIndex !== null}
                    >
                      {swappingIndex === previewIndex ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <>
                          <Ionicons name="refresh" size={18} color={colors.primary} />
                          <Text style={[styles.modalSwapBtnText, { color: colors.primary }]}>Vaihda toiseen</Text>
                        </>
                      )}
                    </Pressable>
                  )}
                  <Pressable
                    style={[styles.modalViewFullBtn, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      const id = previewRecipe.id;
                      const totalServings = previewRecipe.targetServings || ((previewRecipe.lastsDays || 1) * (previewRecipe.diners || diners));
                      const lastsDays = previewRecipe.lastsDays || 1;
                      const currentDiners = previewRecipe.diners || diners;
                      setPreviewRecipe(null);
                      setPreviewIndex(null);
                      setAddedDayFeedback(null);
                      router.push({
                        pathname: '/recipe/[recipeId]',
                        params: {
                          recipeId: id,
                          servings: String(totalServings),
                          lastsDays: String(lastsDays),
                          diners: String(currentDiners),
                        },
                      });
                    }}
                  >
                    <Ionicons name="book-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.modalViewFullBtnText}>Katso koko ohje</Text>
                  </Pressable>
                </View>
              </Animated.View>
            </View>
          )}
        </View>
      </Modal>

      <Modal
        visible={slotModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSlotModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSlotModalVisible(false)} />
          <View style={styles.modalFrameContainer} pointerEvents="box-none">
            <Animated.View
              style={[
                styles.slotModalSheet,
                { backgroundColor: colors.card, transform: [{ translateY: slotPanY }] },
              ]}
            >
            <View style={styles.dragHandleArea} {...slotPanResponder.panHandlers}>
              <View style={styles.modalHandle} />
            </View>

            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {freeDaysList.length === 0 ? 'Valitse korvattavat päivät' : 'Valitse päivät aterioille'}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.mutedText }]}>
                  {freeDaysList.length === 0
                    ? 'Valitse mille päiville uudet ateriat asetetaan'
                    : `${freeDaysList.length} vapaata päivää kalenterissa`}
                </Text>
              </View>
              <Pressable
                style={[styles.modalCloseBtn, { backgroundColor: colors.background }]}
                onPress={() => setSlotModalVisible(false)}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.slotModalScroll} showsVerticalScrollIndicator={false}>
              {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
                const existingMeal = existingCalendarRecipes.find((r, idx) => (r.planStartDay ?? idx) === dayIdx);
                const currentAssignment = slotAssignments[dayIdx];
                const isDayFree = !existingMeal;

                return (
                  <View key={dayIdx} style={[styles.daySlotCard, { backgroundColor: colors.background }]}>
                    <View style={styles.daySlotHeader}>
                      <View style={styles.daySlotHeaderLeft}>
                        <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                        <Text style={[styles.daySlotTitle, { color: colors.text }]}>{dayLabels[dayIdx]}</Text>
                      </View>
                      {existingMeal ? (
                        <View style={[styles.currentMealBadge, { backgroundColor: colors.card }]}>
                          <Text style={[styles.currentMealBadgeText, { color: colors.mutedText }]} numberOfLines={1}>
                            Nykyinen: {existingMeal.title}
                          </Text>
                        </View>
                      ) : (
                        <View style={[styles.freeDayBadge, { backgroundColor: '#34C75915' }]}>
                          <Text style={styles.freeDayBadgeText}>Vapaa</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.slotRecipeOptions}>
                      {existingMeal && (
                        <Pressable
                          style={[
                            styles.slotRecipeOption,
                            { backgroundColor: colors.card, borderColor: currentAssignment === 'KEEP_EXISTING' ? colors.primary : colors.border },
                            currentAssignment === 'KEEP_EXISTING' && styles.slotRecipeOptionSelected,
                          ]}
                          onPress={() => {
                            setSlotAssignments((prev) => ({
                              ...prev,
                              [dayIdx]: 'KEEP_EXISTING',
                            }));
                          }}
                        >
                          <View style={styles.slotRecipeOptionLeft}>
                            <Ionicons
                              name={currentAssignment === 'KEEP_EXISTING' ? 'checkmark-circle' : 'ellipse-outline'}
                              size={18}
                              color={currentAssignment === 'KEEP_EXISTING' ? colors.primary : colors.mutedText}
                            />
                            <Text
                              style={[
                                styles.slotRecipeOptionTitle,
                                { color: currentAssignment === 'KEEP_EXISTING' ? colors.primary : colors.text },
                                currentAssignment === 'KEEP_EXISTING' && { fontWeight: '600' },
                              ]}
                              numberOfLines={1}
                            >
                              Säilytä nykyinen ({existingMeal.title})
                            </Text>
                          </View>
                        </Pressable>
                      )}

                      {plan.map((recipe) => {
                        const isSelected = currentAssignment === recipe.id;
                        return (
                          <Pressable
                            key={recipe.id}
                            style={[
                              styles.slotRecipeOption,
                              { backgroundColor: colors.card, borderColor: isSelected ? colors.primary : colors.border },
                              isSelected && styles.slotRecipeOptionSelected,
                            ]}
                            onPress={() => {
                              setSlotAssignments((prev) => ({
                                ...prev,
                                [dayIdx]: isSelected ? (existingMeal ? 'KEEP_EXISTING' : 'EMPTY') : recipe.id,
                              }));
                            }}
                          >
                            <View style={styles.slotRecipeOptionLeft}>
                              <Ionicons
                                name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                                size={18}
                                color={isSelected ? colors.primary : colors.mutedText}
                              />
                              <Text
                                style={[
                                  styles.slotRecipeOptionTitle,
                                  { color: isSelected ? colors.primary : colors.text },
                                  isSelected && { fontWeight: '600' },
                                ]}
                                numberOfLines={1}
                              >
                                {existingMeal ? `Aseta: ${recipe.title}` : recipe.title}
                              </Text>
                            </View>
                            {recipe.prep_time_minutes ? (
                              <Text style={[styles.slotRecipeOptionMeta, { color: colors.mutedText }]}>
                                {recipe.prep_time_minutes} min
                              </Text>
                            ) : null}
                          </Pressable>
                        );
                      })}

                      {isDayFree && (
                        <Pressable
                          style={[
                            styles.slotRecipeOption,
                            { backgroundColor: colors.card, borderColor: currentAssignment === 'EMPTY' ? colors.mutedText : colors.border },
                          ]}
                          onPress={() => {
                            setSlotAssignments((prev) => ({
                              ...prev,
                              [dayIdx]: 'EMPTY',
                            }));
                          }}
                        >
                          <View style={styles.slotRecipeOptionLeft}>
                            <Ionicons
                              name={currentAssignment === 'EMPTY' ? 'close-circle' : 'ellipse-outline'}
                              size={18}
                              color={colors.mutedText}
                            />
                            <Text style={[styles.slotRecipeOptionTitle, { color: colors.mutedText }]}>
                              Jätä tämä päivä tyhjäksi
                            </Text>
                          </View>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View style={[styles.slotModalActions, { borderTopColor: colors.border }]}>
              <Pressable
                style={[styles.slotSaveBtn, { backgroundColor: colors.primary }]}
                onPress={handleConfirmSlotAssignments}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.slotSaveBtnText}>Tallenna muutokset kalenteriin</Text>
              </Pressable>
            </View>
          </Animated.View>
          </View>
        </View>
      </Modal>
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
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 4 },
  stepBtn: { padding: 8 },
  stepValue: { fontSize: 18, fontWeight: '700', marginHorizontal: 15, minWidth: 20, textAlign: 'center' },
  buttonGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  actionBtn: { 
    flex: 1,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
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
  saveSuggestionsBtn: {
    borderRadius: 14,
    padding: 15,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
  },
  saveSuggestionsBtnText: { fontWeight: '600', fontSize: 15 },
  weeklyBtn: { 
    padding: 16,
    borderRadius: 16,
    alignItems: 'center', 
    borderWidth: 1,
    marginBottom: 16,
  },
  weeklyBtnText: { fontWeight: '600', fontSize: 16 },
  resultsContainer: { flex: 1 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 15, letterSpacing: -0.5 },
  recipeResult: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  recipeMainClickable: {
    flex: 1,
    marginRight: 8,
  },
  pressed: { opacity: 0.7 },
  dayLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  recipeTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  recipeMeta: { fontSize: 13 },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swapCardBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 15 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalFrameContainer: {
    width: '100%',
    maxWidth: 430,
    height: Platform.OS === 'web' ? '92%' : '100%',
    maxHeight: Platform.OS === 'web' ? 880 : undefined,
    justifyContent: 'flex-end',
    borderBottomLeftRadius: Platform.OS === 'web' ? 32 : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? 32 : 0,
    overflow: 'hidden',
  },
  modalSheet: {
    width: '100%',
    maxWidth: 430,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '82%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  dragHandleArea: {
    width: '100%',
    paddingTop: 4,
    paddingBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHandle: {
    width: 38,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(128, 128, 128, 0.4)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalDayLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    maxHeight: 340,
  },
  modalScrollContent: {
    paddingBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  modalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  modalBadgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  modalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  modalChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalDayAssignSection: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  modalDayAssignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
  modalIngredientsSection: {
    marginTop: 4,
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalIngredientsList: {
    gap: 6,
  },
  modalIngredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modalIngredientText: {
    fontSize: 14,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  modalSwapBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  modalSwapBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalViewFullBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  modalViewFullBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  slotModalSheet: {
    width: '100%',
    maxWidth: 430,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  slotModalScroll: {
    marginTop: 10,
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  daySlotCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  daySlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  daySlotHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  daySlotTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  currentMealBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    maxWidth: '55%',
  },
  currentMealBadgeText: {
    fontSize: 11,
  },
  freeDayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  freeDayBadgeText: {
    color: '#34C759',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  slotRecipeOptions: {
    gap: 8,
  },
  slotRecipeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  slotRecipeOptionSelected: {
    borderWidth: 1.5,
  },
  slotRecipeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  slotRecipeOptionTitle: {
    fontSize: 14,
    flexShrink: 1,
  },
  slotRecipeOptionMeta: {
    fontSize: 12,
  },
  slotModalActions: {
    paddingTop: 12,
    borderTopWidth: 1,
  },
  slotSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  slotSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});