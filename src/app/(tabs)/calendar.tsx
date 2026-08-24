import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../../types/recipe';
import { useAppTheme } from '../../theme/AppThemeProvider';

const SAVED_PLAN_KEY = 'ruoka-apuri.saved-weekly-plan';
const SAVED_TEMPLATES_KEY = 'ruoka-apuri.saved-plan-templates';
const dayLabels = ['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai', 'Lauantai', 'Sunnuntai'];

type SavedPlan = {
  proteinIds?: string[];
  recipes: Recipe[];
};

type PlanTemplate = {
  id: string;
  name: string;
  createdAt: string;
  recipes: Recipe[];
  proteinIds?: string[];
};

export default function CalendarScreen() {
  const [plan, setPlan] = useState<Recipe[]>([]);
  const [proteinIds, setProteinIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [templatesModalVisible, setTemplatesModalVisible] = useState(false);
  const [saveTemplateModalVisible, setSaveTemplateModalVisible] = useState(false);
  const [optionsMenuVisible, setOptionsMenuVisible] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState('');
  const router = useRouter();
  const { colors } = useAppTheme();

  const optionsPanY = useRef(new Animated.Value(0)).current;
  const templatesPanY = useRef(new Animated.Value(0)).current;

  const optionsPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          optionsPanY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 60 || gestureState.vy > 0.4) {
          Animated.timing(optionsPanY, {
            toValue: 400,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            setOptionsMenuVisible(false);
            optionsPanY.setValue(0);
          });
        } else {
          Animated.spring(optionsPanY, {
            toValue: 0,
            bounciness: 4,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const templatesPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          templatesPanY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 80 || gestureState.vy > 0.4) {
          Animated.timing(templatesPanY, {
            toValue: 600,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            setTemplatesModalVisible(false);
            templatesPanY.setValue(0);
          });
        } else {
          Animated.spring(templatesPanY, {
            toValue: 0,
            bounciness: 4,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const getEntryKey = (recipe: Recipe, index: number) => `${recipe.id}-${recipe.planStartDay ?? index}`;

  const persistPlan = async (nextRecipes: Recipe[]) => {
    const payload: SavedPlan = { proteinIds, recipes: nextRecipes };
    await AsyncStorage.setItem(SAVED_PLAN_KEY, JSON.stringify(payload));
    setPlan(nextRecipes);
  };

  const loadTemplates = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(SAVED_TEMPLATES_KEY);
      if (stored) {
        setTemplates(JSON.parse(stored));
      } else {
        setTemplates([]);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

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
            setEditMode(false);
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

  const handleSaveCurrentAsTemplate = async () => {
    if (!templateNameInput.trim() || plan.length === 0) return;
    const newTemplate: PlanTemplate = {
      id: Date.now().toString(),
      name: templateNameInput.trim(),
      createdAt: new Date().toLocaleDateString('fi-FI'),
      recipes: plan,
      proteinIds,
    };
    const updatedTemplates = [newTemplate, ...templates];
    await AsyncStorage.setItem(SAVED_TEMPLATES_KEY, JSON.stringify(updatedTemplates));
    setTemplates(updatedTemplates);
    setTemplateNameInput('');
    setSaveTemplateModalVisible(false);
  };

  const handleApplyTemplate = async (template: PlanTemplate) => {
    Alert.alert(
      'Ota suunnitelma käyttöön?',
      `Haluatko korvata aktiivisen viikon suunnitelmalla "${template.name}"?`,
      [
        { text: 'Peruuta', style: 'cancel' },
        {
          text: 'Ota käyttöön',
          onPress: async () => {
            await persistPlan(template.recipes);
            if (template.proteinIds) {
              setProteinIds(template.proteinIds);
            }
            setTemplatesModalVisible(false);
          },
        },
      ]
    );
  };

  const handleDeleteTemplate = async (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    await AsyncStorage.setItem(SAVED_TEMPLATES_KEY, JSON.stringify(updated));
    setTemplates(updated);
  };

  useFocusEffect(
    useCallback(() => {
      loadPlan();
      loadTemplates();
    }, [loadPlan, loadTemplates])
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.titleTextContainer}>
            <Text style={[styles.title, { color: colors.text }]}>Kalenteri</Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>
              {editMode
                ? `Valittu ${selectedKeys.length} / ${plan.length}`
                : plan.length > 0
                ? `${plan.length} tallennettua ateriaa`
                : 'Tallennettu viikkosuunnitelma'}
            </Text>
          </View>
          <View style={styles.headerRightContainer}>
            {editMode ? (
              <Pressable
                style={[styles.headerTextBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setEditMode(false);
                  setSelectedKeys([]);
                }}
                hitSlop={8}
              >
                <Text style={styles.headerTextBtnLabel}>Valmis</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.headerMoreBtn, { backgroundColor: colors.card }]}
                onPress={() => {
                  loadTemplates();
                  setOptionsMenuVisible(true);
                }}
                hitSlop={8}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
              </Pressable>
            )}
          </View>
        </View>

        {editMode && plan.length > 0 && (
          <View style={[styles.editToolbar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable
              style={styles.editSelectAllBtn}
              onPress={() => {
                if (selectedKeys.length === plan.length) {
                  setSelectedKeys([]);
                } else {
                  setSelectedKeys(plan.map((r, i) => getEntryKey(r, i)));
                }
              }}
            >
              <Text style={[styles.editToolbarText, { color: colors.primary }]}>
                {selectedKeys.length === plan.length ? 'Poista valinnat' : 'Valitse kaikki'}
              </Text>
            </Pressable>
            <View style={styles.editToolbarRight}>
              <Pressable
                style={[
                  styles.editRemoveBtn,
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
                    styles.editRemoveBtnText,
                    selectedKeys.length === 0 && { color: colors.mutedText },
                  ]}
                >
                  Poista ({selectedKeys.length})
                </Text>
              </Pressable>
              <Pressable
                style={[styles.editDoneBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setEditMode(false);
                  setSelectedKeys([]);
                }}
              >
                <Text style={styles.editDoneBtnText}>Valmis</Text>
              </Pressable>
            </View>
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
            <Ionicons name="calendar-outline" size={44} color={colors.mutedText} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Ei aktiivista viikkoa</Text>
            <Text style={[styles.emptyText, { color: colors.mutedText }]}>
              Valitse proteiinit etusivulta suunnitellaksesi viikon ateriat tai ota käyttöön tallennettu mallipohja.
            </Text>

            <View style={styles.emptyStateActions}>
              {templates.length > 0 ? (
                <Pressable
                  style={[styles.emptyPrimaryBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    loadTemplates();
                    setTemplatesModalVisible(true);
                  }}
                >
                  <Ionicons name="albums-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.emptyPrimaryBtnText}>
                    Selaa tallennettuja pohjia ({templates.length})
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.emptyPrimaryBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/')}
                >
                  <Ionicons name="restaurant-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.emptyPrimaryBtnText}>Suunnittele ateriat</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={optionsMenuVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setOptionsMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setOptionsMenuVisible(false)} />
          <View style={styles.modalFrameContainer} pointerEvents="box-none">
            <Animated.View
              style={[
                styles.actionSheet,
                { backgroundColor: colors.card, transform: [{ translateY: optionsPanY }] },
              ]}
            >
              <View style={styles.dragHandleArea} {...optionsPanResponder.panHandlers}>
                <View style={styles.modalHandle} />
              </View>
              <Text style={[styles.actionSheetTitle, { color: colors.mutedText }]}>Valinnat</Text>

              <Pressable
                style={styles.actionSheetRow}
                onPress={() => {
                  setOptionsMenuVisible(false);
                  loadTemplates();
                  setTemplatesModalVisible(true);
                }}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: colors.background }]}>
                  <Ionicons name="albums-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionRowTitle, { color: colors.text }]}>Omat suunnitelmat</Text>
                  <Text style={[styles.actionRowSubtitle, { color: colors.mutedText }]}>
                    {templates.length > 0 ? `${templates.length} tallennettua mallipohjaa` : 'Selaa ja ota käyttöön pohjia'}
                  </Text>
                </View>
                {templates.length > 0 && (
                  <View style={[styles.countBadge, { backgroundColor: colors.background }]}>
                    <Text style={[styles.countBadgeText, { color: colors.primary }]}>{templates.length}</Text>
                  </View>
                )}
              </Pressable>

              {plan.length > 0 && (
                <Pressable
                  style={styles.actionSheetRow}
                  onPress={() => {
                    setOptionsMenuVisible(false);
                    setEditMode(true);
                    setSelectedKeys([]);
                  }}
                >
                  <View style={[styles.actionIconContainer, { backgroundColor: colors.background }]}>
                    <Ionicons name="checkbox-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={[styles.actionRowTitle, { color: colors.text }]}>Valitse aterioita</Text>
                    <Text style={[styles.actionRowSubtitle, { color: colors.mutedText }]}>
                      Valitse ja poista useita aterioita kerralla
                    </Text>
                  </View>
                </Pressable>
              )}

              {plan.length > 0 && (
                <Pressable
                  style={styles.actionSheetRow}
                  onPress={() => {
                    setOptionsMenuVisible(false);
                    setTemplateNameInput(`Suunnitelma ${templates.length + 1}`);
                    setSaveTemplateModalVisible(true);
                  }}
                >
                  <View style={[styles.actionIconContainer, { backgroundColor: colors.background }]}>
                    <Ionicons name="bookmark-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={[styles.actionRowTitle, { color: colors.text }]}>Tallenna pohjaksi</Text>
                    <Text style={[styles.actionRowSubtitle, { color: colors.mutedText }]}>
                      Tallenna tämä viikko uudelleen käytettäväksi
                    </Text>
                  </View>
                </Pressable>
              )}

              {plan.length > 0 && (
                <Pressable
                  style={styles.actionSheetRow}
                  onPress={() => {
                    setOptionsMenuVisible(false);
                    setTimeout(confirmClearWeek, 200);
                  }}
                >
                  <View style={[styles.actionIconContainer, { backgroundColor: '#FF3B3015' }]}>
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={[styles.actionRowTitle, { color: '#FF3B30' }]}>Tyhjennä koko viikko</Text>
                    <Text style={[styles.actionRowSubtitle, { color: colors.mutedText }]}>
                      Poistaa kaikki ateriat aktiivisesta kalenterista
                    </Text>
                  </View>
                </Pressable>
              )}

              <Pressable
                style={[styles.actionSheetCancelBtn, { backgroundColor: colors.background }]}
                onPress={() => setOptionsMenuVisible(false)}
              >
                <Text style={[styles.actionSheetCancelText, { color: colors.text }]}>Sulje</Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={saveTemplateModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSaveTemplateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSaveTemplateModalVisible(false)} />
          <View style={[styles.dialogCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.dialogTitle, { color: colors.text }]}>Tallenna mallipohjaksi</Text>
            <Text style={[styles.dialogSubtitle, { color: colors.mutedText }]}>
              Anna nimi tälle viikkosuunnitelmalle, jotta voit ottaa sen käyttöön myöhemmin.
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={templateNameInput}
              onChangeText={setTemplateNameInput}
              placeholder="esim. Arkiruokaviikko"
              placeholderTextColor={colors.mutedText}
              autoFocus={true}
            />
            <View style={styles.dialogActions}>
              <Pressable
                style={[styles.dialogBtn, { backgroundColor: colors.background }]}
                onPress={() => setSaveTemplateModalVisible(false)}
              >
                <Text style={[styles.dialogBtnText, { color: colors.text }]}>Peruuta</Text>
              </Pressable>
              <Pressable
                style={[styles.dialogBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveCurrentAsTemplate}
              >
                <Text style={[styles.dialogBtnText, { color: '#FFFFFF' }]}>Tallenna</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={templatesModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTemplatesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setTemplatesModalVisible(false)} />
          <View style={styles.modalFrameContainer} pointerEvents="box-none">
            <Animated.View
              style={[
                styles.sheetContainer,
                { backgroundColor: colors.card, transform: [{ translateY: templatesPanY }] },
              ]}
            >
              <View style={styles.dragHandleArea} {...templatesPanResponder.panHandlers}>
                <View style={styles.modalHandle} />
              </View>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={[styles.sheetTitle, { color: colors.text }]}>Tallennetut suunnitelmat</Text>
                  <Text style={[styles.sheetSubtitle, { color: colors.mutedText }]}>
                    {templates.length} tallennettua mallipohjaa
                  </Text>
                </View>
                <Pressable
                  style={[styles.closeIconBtn, { backgroundColor: colors.background }]}
                  onPress={() => setTemplatesModalVisible(false)}
                >
                  <Ionicons name="close" size={20} color={colors.text} />
                </Pressable>
              </View>

            <ScrollView style={styles.templatesList} showsVerticalScrollIndicator={false}>
              {templates.length > 0 ? (
                templates.map((template) => (
                  <View key={template.id} style={[styles.templateCard, { backgroundColor: colors.background }]}>
                    <View style={styles.templateHeader}>
                      <View style={styles.templateTitleGroup}>
                        <Text style={[styles.templateName, { color: colors.text }]}>{template.name}</Text>
                        <Text style={[styles.templateDate, { color: colors.mutedText }]}>
                          Tallennettu {template.createdAt} • {template.recipes.length} ateriaa
                        </Text>
                      </View>
                      <Pressable
                        style={styles.deleteTemplateBtn}
                        onPress={() => handleDeleteTemplate(template.id)}
                        hitSlop={8}
                      >
                        <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                      </Pressable>
                    </View>

                    <View style={styles.templateRecipesPreview}>
                      {template.recipes.slice(0, 4).map((r, i) => (
                        <View key={i} style={[styles.templateRecipePill, { backgroundColor: colors.card }]}>
                          <Text style={[styles.templateRecipePillText, { color: colors.text }]} numberOfLines={1}>
                            {r.title}
                          </Text>
                        </View>
                      ))}
                      {template.recipes.length > 4 && (
                        <View style={[styles.templateRecipePill, { backgroundColor: colors.card }]}>
                          <Text style={[styles.templateRecipePillText, { color: colors.mutedText }]}>
                            +{template.recipes.length - 4} muuta
                          </Text>
                        </View>
                      )}
                    </View>

                    <Pressable
                      style={[styles.applyTemplateBtn, { backgroundColor: colors.primary }]}
                      onPress={() => handleApplyTemplate(template)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.applyTemplateBtnText}>Ota käyttöön viikoksi</Text>
                    </Pressable>
                  </View>
                ))
              ) : (
                <View style={styles.emptyTemplatesState}>
                  <Ionicons name="bookmark-outline" size={36} color={colors.mutedText} />
                  <Text style={[styles.emptyTemplatesTitle, { color: colors.text }]}>Ei tallennettuja pohjia</Text>
                  <Text style={[styles.emptyTemplatesText, { color: colors.mutedText }]}>
                    Kun sinulla on viikkosuunnitelma kalenterissa, valitse valikosta "Tallenna pohjaksi" tallentaaksesi sen myöhempää käyttöä varten.
                  </Text>
                </View>
              )}
            </ScrollView>
          </Animated.View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 28, paddingHorizontal: 20, paddingBottom: 32 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  titleTextContainer: {
    flex: 1,
  },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14 },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTextBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  headerTextBtnLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerMoreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  editSelectAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  editToolbarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  editToolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FF3B3015',
  },
  editRemoveBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF3B30',
  },
  editDoneBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  editDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  disabledBtn: {
    backgroundColor: 'transparent',
    opacity: 0.4,
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
  emptyText: { textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyStateActions: {
    width: '100%',
    alignItems: 'center',
  },
  emptyPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
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
  actionSheet: {
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
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  actionSheetTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 4,
  },
  actionSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextContainer: {
    flex: 1,
  },
  actionRowTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionRowSubtitle: {
    fontSize: 12,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionSheetCancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSheetCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dialogCard: {
    width: '100%',
    maxWidth: 400,
    marginHorizontal: 24,
    marginBottom: 'auto',
    marginTop: 'auto',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  dialogSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  dialogBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  dialogBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sheetContainer: {
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
    paddingBottom: 36,
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
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sheetSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templatesList: {
    maxHeight: 440,
  },
  templateCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  templateTitleGroup: {
    flex: 1,
    marginRight: 8,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  templateDate: {
    fontSize: 12,
  },
  deleteTemplateBtn: {
    padding: 4,
  },
  templateRecipesPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  templateRecipePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: '100%',
  },
  templateRecipePillText: {
    fontSize: 12,
  },
  applyTemplateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  applyTemplateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyTemplatesState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTemplatesTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  emptyTemplatesText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
});
