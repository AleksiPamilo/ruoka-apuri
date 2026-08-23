import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../../types/recipe';
import { useAppTheme } from '../../theme/AppThemeProvider';

const SAVED_PLAN_KEY = 'ruoka-apuri.saved-weekly-plan';
const dayLabels = ['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai', 'Lauantai', 'Sunnuntai'];

type SavedPlan = {
  proteinIds?: string[];
  recipes: Recipe[];
};

export default function CalendarScreen() {
  const [plan, setPlan] = useState<Recipe[]>([]);
  const [proteinIds, setProteinIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const router = useRouter();
  const { colors } = useAppTheme();

  const getEntryKey = (recipe: Recipe, index: number) => `${recipe.id}-${recipe.planStartDay ?? index}`;

  const persistPlan = async (nextRecipes: Recipe[]) => {
    const payload: SavedPlan = { proteinIds, recipes: nextRecipes };
    await AsyncStorage.setItem(SAVED_PLAN_KEY, JSON.stringify(payload));
    setPlan(nextRecipes);
  };

  const loadPlan = useCallback(async () => {
    setLoading(true);
    const storedPlan = await AsyncStorage.getItem(SAVED_PLAN_KEY);
    if (storedPlan) {
      const parsedPlan = JSON.parse(storedPlan);
      if (Array.isArray(parsedPlan)) {
        setPlan(parsedPlan);
        setProteinIds([]);
      } else {
        setPlan(parsedPlan.recipes || []);
        setProteinIds(parsedPlan.proteinIds || []);
      }
    } else {
      setPlan([]);
      setProteinIds([]);
    }
    setEditMode(false);
    setSelectedKeys([]);
    setLoading(false);
  }, []);

  const toggleSelect = (key: string) => {
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  };

  const handleCardLongPress = (key: string) => {
    if (!editMode) {
      setEditMode(true);
      setSelectedKeys([key]);
    } else {
      toggleSelect(key);
    }
  };

  const handleCardPress = (recipe: Recipe, index: number) => {
    const key = getEntryKey(recipe, index);
    if (editMode) {
      toggleSelect(key);
    } else {
      router.push({ pathname: '/recipe/[recipeId]', params: { recipeId: recipe.id } });
    }
  };

  const confirmRemoveSelected = () => {
    if (selectedKeys.length === 0) return;
    Alert.alert(
      'Poista valitut ateriat?',
      `Haluatko varmasti poistaa ${selectedKeys.length} valittua ateriaa suunnitelmasta?`,
      [
        { text: 'Peruuta', style: 'cancel' },
        {
          text: 'Poista',
          style: 'destructive',
          onPress: async () => {
            const nextRecipes = plan.filter((recipe, index) => !selectedKeys.includes(getEntryKey(recipe, index)));
            await persistPlan(nextRecipes);
            setSelectedKeys([]);
            if (nextRecipes.length === 0) {
              setEditMode(false);
            }
          },
        },
      ]
    );
  };

  const confirmClearWeek = () => {
    Alert.alert(
      'Tyhjennä viikko?',
      'Haluatko varmasti poistaa koko viikon ateriasuunnitelman? Tätä toimintoa ei voi peruuttaa.',
      [
        { text: 'Peruuta', style: 'cancel' },
        {
          text: 'Tyhjennä viikko',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(SAVED_PLAN_KEY);
            setPlan([]);
            setProteinIds([]);
            setSelectedKeys([]);
            setEditMode(false);
          },
        },
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      loadPlan();
    }, [loadPlan])
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Kalenteri',
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text },
          headerTintColor: colors.primary,
          headerRight: () => null,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Viikon ateriat</Text>
        <Text style={[styles.subtitle, { color: colors.mutedText }]}>
          {editMode ? `Valittu ${selectedKeys.length} / ${plan.length}` : 'Tallennettu viikkosuunnitelma'}
        </Text>

        {plan.length > 0 && !loading && (
          <View style={styles.controlsRow}>
            <View style={styles.leftControls}>
              <Pressable
                style={[styles.controlBtn, editMode && { backgroundColor: colors.border }]}
                onPress={() => {
                  setEditMode((current) => !current);
                  setSelectedKeys([]);
                }}
              >
                <Text style={[styles.controlBtnText, { color: colors.primary }]}>
                  {editMode ? 'Valmis' : 'Valitse'}
                </Text>
              </Pressable>

              {editMode && (
                <Pressable
                  style={styles.controlBtn}
                  onPress={() => {
                    if (selectedKeys.length === plan.length) {
                      setSelectedKeys([]);
                    } else {
                      setSelectedKeys(plan.map((r, i) => getEntryKey(r, i)));
                    }
                  }}
                >
                  <Text style={[styles.controlBtnText, { color: colors.primary }]}>
                    {selectedKeys.length === plan.length ? 'Poista valinnat' : 'Valitse kaikki'}
                  </Text>
                </Pressable>
              )}
            </View>

            {editMode ? (
              <Pressable
                style={[
                  styles.removeBtn,
                  selectedKeys.length === 0 && styles.disabledBtn,
                ]}
                onPress={confirmRemoveSelected}
                disabled={selectedKeys.length === 0}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={selectedKeys.length === 0 ? colors.mutedText : '#FF3B30'}
                />
                <Text
                  style={[
                    styles.removeBtnText,
                    selectedKeys.length === 0 && { color: colors.mutedText },
                  ]}
                >
                  Poista ({selectedKeys.length})
                </Text>
              </Pressable>
            ) : (
              <Pressable style={styles.clearWeekBtn} onPress={confirmClearWeek}>
                <Ionicons name="trash-outline" size={15} color={colors.mutedText} />
                <Text style={[styles.clearWeekText, { color: colors.mutedText }]}>Tyhjennä viikko</Text>
              </Pressable>
            )}
          </View>
        )}

        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : plan.length > 0 ? (
          plan.map((recipe, index) => {
            const entryKey = getEntryKey(recipe, index);
            const isSelected = selectedKeys.includes(entryKey);

            return (
              <Pressable
                key={`${recipe.id}-${index}`}
                style={({ pressed }) => [
                  styles.dayCard,
                  { backgroundColor: colors.card },
                  editMode && isSelected && { borderColor: colors.primary, borderWidth: 1.5 },
                  pressed && styles.pressed,
                ]}
                onPress={() => handleCardPress(recipe, index)}
                onLongPress={() => handleCardLongPress(entryKey)}
                delayLongPress={300}
              >
                <View style={styles.dayHeader}>
                  <Text style={[styles.dayLabel, { color: colors.primary }]}>
                    {dayLabels[recipe.planStartDay ?? index]}
                  </Text>
                  {editMode ? (
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                        },
                      ]}
                    >
                      {isSelected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
                  )}
                </View>
                <Text style={[styles.recipeTitle, { color: colors.text }]}>{recipe.title}</Text>
                <Text style={[styles.recipeMeta, { color: colors.mutedText }]}>
                  {recipe.servings_per_batch} annosta
                  {recipe.lastsDays ? ` • Riittää ${recipe.lastsDays} päivää` : recipe.isMealPrep ? ' • Meal Prep' : ''}
                </Text>
              </Pressable>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={40} color={colors.mutedText} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Ei tallennettua viikkoa</Text>
            <Text style={[styles.emptyText, { color: colors.mutedText }]}>
              Luo ja tallenna viikkosuunnitelma, niin se näkyy täällä.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 16 },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  leftControls: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  controlBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  controlBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearWeekBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  clearWeekText: {
    fontSize: 13,
    fontWeight: '500',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FF3B3015',
  },
  removeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF3B30',
  },
  disabledBtn: {
    backgroundColor: 'transparent',
    opacity: 0.5,
  },
  loader: { marginTop: 40 },
  dayCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  pressed: { opacity: 0.8 },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dayLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  recipeTitle: { fontSize: 17, fontWeight: '600', marginBottom: 5 },
  recipeMeta: { fontSize: 13 },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  emptyText: { textAlign: 'center', lineHeight: 20 },
});

