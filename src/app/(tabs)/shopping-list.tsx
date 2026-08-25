import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { Recipe } from '../../types/recipe';
import { CategoryInfo, ShoppingItem } from '../../types/shoppingList';
import { showAppAlert } from '../../components/AlertProvider';
import {
  fetchShoppingCategories,
  findIngredientCategory,
  formatShoppingListForSharing,
  generateShoppingListFromPlan,
  loadShoppingList,
  saveShoppingList,
} from '../../services/shoppingListService';

const SAVED_PLAN_KEY = 'ruoka-apuri.saved-weekly-plan';

export default function ShoppingListScreen() {
  const { colors } = useAppTheme();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [optionsMenuVisible, setOptionsMenuVisible] = useState(false);
  const [completedCollapsed, setCompletedCollapsed] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editCategory, setEditCategory] = useState<string>('other');

  const optionsPanY = useRef(new Animated.Value(0)).current;

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

  const loadData = useCallback(async () => {
    try {
      const [fetchedCats, savedItems] = await Promise.all([
        fetchShoppingCategories(),
        loadShoppingList(),
      ]);
      setCategories(fetchedCats);

      if (savedItems.length > 0) {
        setItems(savedItems);
      } else {
        const storedPlan = await AsyncStorage.getItem(SAVED_PLAN_KEY);
        if (storedPlan) {
          const parsed = JSON.parse(storedPlan);
          const recipes: Recipe[] = Array.isArray(parsed) ? parsed : parsed.recipes || [];
          if (recipes.length > 0) {
            const generated = generateShoppingListFromPlan(recipes, []);
            setItems(generated);
            await saveShoppingList(generated);
          } else {
            setItems([]);
          }
        } else {
          setItems([]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const updateItems = async (nextItems: ShoppingItem[]) => {
    setItems(nextItems);
    await saveShoppingList(nextItems);
  };

  const handleAddItem = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const dbCategory = await findIngredientCategory(trimmed);
    const defaultCat = dbCategory || (categories.length > 0 ? categories[categories.length - 1].id : 'other');
    const newItem: ShoppingItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed.charAt(0).toUpperCase() + trimmed.slice(1),
      category: defaultCat,
      checked: false,
      isCustom: true,
      createdAt: new Date().toISOString(),
    };

    const nextList = [newItem, ...items];
    await updateItems(nextList);
    setInputText('');
  };

  const handleToggleCheck = async (id: string) => {
    const nextList = items.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    await updateItems(nextList);
  };

  const handleDeleteItem = async (id: string) => {
    const nextList = items.filter((item) => item.id !== id);
    await updateItems(nextList);
  };

  const handleSyncFromCalendar = async () => {
    setOptionsMenuVisible(false);
    try {
      const storedPlan = await AsyncStorage.getItem(SAVED_PLAN_KEY);
      if (!storedPlan) {
        showAppAlert('Ei aterioita', 'Kalenterissasi ei ole tällä hetkellä tallennettuja aterioita.');
        return;
      }
      const parsed = JSON.parse(storedPlan);
      const recipes: Recipe[] = Array.isArray(parsed) ? parsed : parsed.recipes || [];
      if (recipes.length === 0) {
        showAppAlert('Ei aterioita', 'Kalenterissasi ei ole tällä hetkellä tallennettuja aterioita.');
        return;
      }

      const updated = generateShoppingListFromPlan(recipes, items);
      await updateItems(updated);
      showAppAlert('Päivitetty', `Ostoslistalle tuotu ainekset ${recipes.length} ateriasta.`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShareList = async () => {
    setOptionsMenuVisible(false);
    if (items.length === 0) {
      showAppAlert('Ostoslista on tyhjä', 'Lisää ensin tuotteita jaettavaksi.');
      return;
    }
    const text = formatShoppingListForSharing(items, categories);
    try {
      await Share.share({
        message: text,
        title: 'Kauppalista',
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearCompleted = async () => {
    setOptionsMenuVisible(false);
    const uncompleted = items.filter((i) => !i.checked);
    await updateItems(uncompleted);
  };

  const handleClearAll = () => {
    setOptionsMenuVisible(false);
    showAppAlert(
      'Tyhjennä ostoslista?',
      'Haluatko varmasti poistaa kaikki tuotteet ostoslistalta?',
      [
        { text: 'Peruuta', style: 'cancel' },
        {
          text: 'Tyhjennä',
          style: 'destructive',
          onPress: async () => {
            await updateItems([]);
          },
        },
      ]
    );
  };

  const openEditModal = (item: ShoppingItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditAmount(item.amount ? String(item.amount) : '');
    setEditUnit(item.unit || '');
    setEditCategory(item.category);
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editName.trim()) return;
    const nextList = items.map((item) => {
      if (item.id === editingItem.id) {
        const parsedAmount = editAmount.trim() ? parseFloat(editAmount.replace(',', '.')) : undefined;
        return {
          ...item,
          name: editName.trim(),
          amount: isNaN(parsedAmount as number) ? undefined : parsedAmount,
          unit: editUnit.trim() || undefined,
          category: editCategory,
        };
      }
      return item;
    });
    await updateItems(nextList);
    setEditingItem(null);
  };

  const activeItems = items.filter((i) => !i.checked);
  const checkedItems = items.filter((i) => i.checked);

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.titleRow}>
            <View style={styles.titleTextContainer}>
              <Text style={[styles.title, { color: colors.text }]}>Ostoslista</Text>
              <Text style={[styles.subtitle, { color: colors.mutedText }]}>
                {items.length === 0
                  ? 'Ei tuotteita listalla'
                  : `${checkedItems.length} / ${items.length} tuotetta kerätty`}
              </Text>
            </View>
            <Pressable
              style={[styles.headerMoreBtn, { backgroundColor: colors.card }]}
              onPress={() => {
                optionsPanY.setValue(0);
                setOptionsMenuVisible(true);
              }}
              hitSlop={8}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
            </Pressable>
          </View>

        <View style={[styles.quickAddCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.quickAddInput, { color: colors.text }]}
            placeholder="Lisää tuote... esim. Kahvi, WC-paperi, Maito"
            placeholderTextColor={colors.mutedText}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleAddItem}
            returnKeyType="done"
          />
          <Pressable
            style={[
              styles.quickAddBtn,
              { backgroundColor: inputText.trim() ? colors.primary : colors.background },
            ]}
            onPress={handleAddItem}
            disabled={!inputText.trim()}
          >
            <Ionicons
              name="add"
              size={22}
              color={inputText.trim() ? '#FFFFFF' : colors.mutedText}
            />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconBg, { backgroundColor: colors.card }]}>
              <Ionicons name="cart-outline" size={44} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Ostoslista on tyhjä</Text>
            <Text style={[styles.emptyText, { color: colors.mutedText }]}>
              Kirjoita tuotteita yläpalkkiin tai tuo ainekset aktiivisesta ateriasuunnitelmastasi.
            </Text>
            <Pressable
              style={[styles.emptyPrimaryBtn, { backgroundColor: colors.primary }]}
              onPress={handleSyncFromCalendar}
            >
              <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
              <Text style={styles.emptyPrimaryBtnText}>Tuo ainekset kalenterista</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {categories.length === 0 && !loading && (
              <View style={[styles.warningBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="warning-outline" size={18} color="#FF9500" />
                <Text style={[styles.warningBannerText, { color: colors.text }]}>
                  Kategorioita ei saatu ladattua tietokannasta.
                </Text>
              </View>
            )}

            {categories.length > 0 ? (
              <>
                {categories.map((catInfo) => {
                  const catItems = activeItems.filter((i) => i.category === catInfo.id);
                  if (catItems.length === 0) return null;

                  return (
                    <View key={catInfo.id} style={styles.categorySection}>
                      <View style={styles.categoryHeader}>
                        <View style={styles.categoryHeaderLeft}>
                          <View style={[styles.categoryIconBg, { backgroundColor: `${catInfo.color}15` }]}>
                            <Ionicons name={catInfo.icon as any} size={15} color={catInfo.color} />
                          </View>
                          <Text style={[styles.categoryTitle, { color: colors.text }]}>{catInfo.name}</Text>
                        </View>
                        <View style={[styles.categoryBadge, { backgroundColor: colors.card }]}>
                          <Text style={[styles.categoryBadgeText, { color: colors.mutedText }]}>
                            {catItems.length}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {catItems.map((item, index) => {
                          const isLast = index === catItems.length - 1;
                          return (
                            <View
                              key={item.id}
                              style={[
                                styles.itemRow,
                                !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                              ]}
                            >
                              <Pressable
                                style={styles.itemCheckboxContainer}
                                onPress={() => handleToggleCheck(item.id)}
                                hitSlop={8}
                              >
                                <View
                                  style={[
                                    styles.checkbox,
                                    { borderColor: item.checked ? colors.primary : colors.border },
                                    item.checked && { backgroundColor: colors.primary },
                                  ]}
                                >
                                  {item.checked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                                </View>
                              </Pressable>

                              <Pressable
                                style={styles.itemContent}
                                onPress={() => openEditModal(item)}
                              >
                                <View style={styles.itemNameRow}>
                                  <Text
                                    style={[
                                      styles.itemName,
                                      { color: item.checked ? colors.mutedText : colors.text },
                                      item.checked && styles.itemNameChecked,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {item.name}
                                  </Text>
                                  {item.amount ? (
                                    <Text style={[styles.itemAmount, { color: colors.primary }]}>
                                      {item.amount} {item.unit || ''}
                                    </Text>
                                  ) : null}
                                </View>

                                {item.recipeTitle ? (
                                  <Text style={[styles.itemRecipeTag, { color: colors.mutedText }]} numberOfLines={1}>
                                    {item.recipeTitle}
                                  </Text>
                                ) : item.isCustom ? (
                                  <Text style={[styles.itemCustomTag, { color: colors.mutedText }]}>
                                    Oma lisäys
                                  </Text>
                                ) : null}
                              </Pressable>

                              <Pressable
                                style={styles.itemDeleteBtn}
                                onPress={() => handleDeleteItem(item.id)}
                                hitSlop={8}
                              >
                                <Ionicons name="trash-outline" size={17} color={colors.mutedText} />
                              </Pressable>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}

                {(() => {
                  const unmappedItems = activeItems.filter(
                    (i) => !categories.some((c) => c.id === i.category)
                  );
                  if (unmappedItems.length === 0) return null;

                  return (
                    <View style={styles.categorySection}>
                      <View style={styles.categoryHeader}>
                        <View style={styles.categoryHeaderLeft}>
                          <View style={[styles.categoryIconBg, { backgroundColor: '#8E8E9315' }]}>
                            <Ionicons name="basket-outline" size={15} color="#8E8E93" />
                          </View>
                          <Text style={[styles.categoryTitle, { color: colors.text }]}>Muut tuotteet</Text>
                        </View>
                        <View style={[styles.categoryBadge, { backgroundColor: colors.card }]}>
                          <Text style={[styles.categoryBadgeText, { color: colors.mutedText }]}>
                            {unmappedItems.length}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {unmappedItems.map((item, index) => {
                          const isLast = index === unmappedItems.length - 1;
                          return (
                            <View
                              key={item.id}
                              style={[
                                styles.itemRow,
                                !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                              ]}
                            >
                              <Pressable
                                style={styles.itemCheckboxContainer}
                                onPress={() => handleToggleCheck(item.id)}
                                hitSlop={8}
                              >
                                <View
                                  style={[
                                    styles.checkbox,
                                    { borderColor: item.checked ? colors.primary : colors.border },
                                    item.checked && { backgroundColor: colors.primary },
                                  ]}
                                >
                                  {item.checked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                                </View>
                              </Pressable>

                              <Pressable
                                style={styles.itemContent}
                                onPress={() => openEditModal(item)}
                              >
                                <View style={styles.itemNameRow}>
                                  <Text
                                    style={[
                                      styles.itemName,
                                      { color: item.checked ? colors.mutedText : colors.text },
                                      item.checked && styles.itemNameChecked,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {item.name}
                                  </Text>
                                  {item.amount ? (
                                    <Text style={[styles.itemAmount, { color: colors.primary }]}>
                                      {item.amount} {item.unit || ''}
                                    </Text>
                                  ) : null}
                                </View>

                                {item.recipeTitle ? (
                                  <Text style={[styles.itemRecipeTag, { color: colors.mutedText }]} numberOfLines={1}>
                                    {item.recipeTitle}
                                  </Text>
                                ) : item.isCustom ? (
                                  <Text style={[styles.itemCustomTag, { color: colors.mutedText }]}>
                                    Oma lisäys
                                  </Text>
                                ) : null}
                              </Pressable>

                              <Pressable
                                style={styles.itemDeleteBtn}
                                onPress={() => handleDeleteItem(item.id)}
                                hitSlop={8}
                              >
                                <Ionicons name="trash-outline" size={17} color={colors.mutedText} />
                              </Pressable>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })()}
              </>
            ) : (
              <View style={styles.categorySection}>
                <View style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {activeItems.map((item, index) => {
                    const isLast = index === activeItems.length - 1;
                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.itemRow,
                          !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                        ]}
                      >
                        <Pressable
                          style={styles.itemCheckboxContainer}
                          onPress={() => handleToggleCheck(item.id)}
                          hitSlop={8}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              { borderColor: item.checked ? colors.primary : colors.border },
                              item.checked && { backgroundColor: colors.primary },
                            ]}
                          >
                            {item.checked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                          </View>
                        </Pressable>

                        <Pressable
                          style={styles.itemContent}
                          onPress={() => openEditModal(item)}
                        >
                          <View style={styles.itemNameRow}>
                            <Text
                              style={[
                                styles.itemName,
                                { color: item.checked ? colors.mutedText : colors.text },
                                item.checked && styles.itemNameChecked,
                              ]}
                              numberOfLines={1}
                            >
                              {item.name}
                            </Text>
                            {item.amount ? (
                              <Text style={[styles.itemAmount, { color: colors.primary }]}>
                                {item.amount} {item.unit || ''}
                              </Text>
                            ) : null}
                          </View>

                          {item.recipeTitle ? (
                            <Text style={[styles.itemRecipeTag, { color: colors.mutedText }]} numberOfLines={1}>
                              {item.recipeTitle}
                            </Text>
                          ) : item.isCustom ? (
                            <Text style={[styles.itemCustomTag, { color: colors.mutedText }]}>
                              Oma lisäys
                            </Text>
                          ) : null}
                        </Pressable>

                        <Pressable
                          style={styles.itemDeleteBtn}
                          onPress={() => handleDeleteItem(item.id)}
                          hitSlop={8}
                        >
                          <Ionicons name="trash-outline" size={17} color={colors.mutedText} />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {checkedItems.length > 0 && (
              <View style={styles.completedSection}>
                <Pressable
                  style={styles.completedHeader}
                  onPress={() => setCompletedCollapsed(!completedCollapsed)}
                >
                  <View style={styles.completedHeaderLeft}>
                    <Ionicons
                      name={completedCollapsed ? 'chevron-forward' : 'chevron-down'}
                      size={18}
                      color={colors.mutedText}
                    />
                    <Text style={[styles.completedTitle, { color: colors.mutedText }]}>
                      Kerätyt tuotteet ({checkedItems.length})
                    </Text>
                  </View>
                  <Pressable
                    style={styles.clearCompletedTextBtn}
                    onPress={handleClearCompleted}
                    hitSlop={8}
                  >
                    <Text style={[styles.clearCompletedText, { color: '#FF3B30' }]}>Poista kerätyt</Text>
                  </Pressable>
                </Pressable>

                {!completedCollapsed && (
                  <View style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.85 }]}>
                    {checkedItems.map((item, index) => {
                      const isLast = index === checkedItems.length - 1;
                      return (
                        <View
                          key={item.id}
                          style={[
                            styles.itemRow,
                            !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                          ]}
                        >
                          <Pressable
                            style={styles.itemCheckboxContainer}
                            onPress={() => handleToggleCheck(item.id)}
                            hitSlop={8}
                          >
                            <View style={[styles.checkbox, { borderColor: colors.primary, backgroundColor: colors.primary }]}>
                              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                            </View>
                          </Pressable>

                          <Pressable style={styles.itemContent} onPress={() => openEditModal(item)}>
                            <View style={styles.itemNameRow}>
                              <Text style={[styles.itemName, styles.itemNameChecked, { color: colors.mutedText }]} numberOfLines={1}>
                                {item.name}
                              </Text>
                              {item.amount ? (
                                <Text style={[styles.itemAmount, { color: colors.mutedText }]}>
                                  {item.amount} {item.unit || ''}
                                </Text>
                              ) : null}
                            </View>
                          </Pressable>

                          <Pressable
                            style={styles.itemDeleteBtn}
                            onPress={() => handleDeleteItem(item.id)}
                            hitSlop={8}
                          >
                            <Ionicons name="trash-outline" size={17} color={colors.mutedText} />
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
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
              <Text style={[styles.actionSheetTitle, { color: colors.mutedText }]}>Ostoslistan valinnat</Text>

              <Pressable style={styles.actionSheetRow} onPress={handleSyncFromCalendar}>
                <View style={[styles.actionIconContainer, { backgroundColor: colors.background }]}>
                  <Ionicons name="refresh-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionRowTitle, { color: colors.text }]}>Päivitä aterioista</Text>
                  <Text style={[styles.actionRowSubtitle, { color: colors.mutedText }]}>
                    Tuo ainekset aktiivisesta ateriasuunnitelmasta
                  </Text>
                </View>
              </Pressable>

              <Pressable style={styles.actionSheetRow} onPress={handleShareList}>
                <View style={[styles.actionIconContainer, { backgroundColor: colors.background }]}>
                  <Ionicons name="share-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionRowTitle, { color: colors.text }]}>Jaa ostoslista</Text>
                  <Text style={[styles.actionRowSubtitle, { color: colors.mutedText }]}>
                    Lähetä lista viestinä tai tallenna muistiinpanoihin
                  </Text>
                </View>
              </Pressable>

              {checkedItems.length > 0 && (
                <Pressable style={styles.actionSheetRow} onPress={handleClearCompleted}>
                  <View style={[styles.actionIconContainer, { backgroundColor: colors.background }]}>
                    <Ionicons name="checkmark-done-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={[styles.actionRowTitle, { color: colors.text }]}>Poista kerätyt tuotteet</Text>
                    <Text style={[styles.actionRowSubtitle, { color: colors.mutedText }]}>
                      Poistaa kaikki valmiiksi merkityt ({checkedItems.length} kpl)
                    </Text>
                  </View>
                </Pressable>
              )}

              {items.length > 0 && (
                <Pressable style={styles.actionSheetRow} onPress={handleClearAll}>
                  <View style={[styles.actionIconContainer, { backgroundColor: '#FF3B3015' }]}>
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={[styles.actionRowTitle, { color: '#FF3B30' }]}>Tyhjennä koko lista</Text>
                    <Text style={[styles.actionRowSubtitle, { color: colors.mutedText }]}>
                      Poistaa kaikki tuotteet ostoslistalta
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
        visible={!!editingItem}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditingItem(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setEditingItem(null)} />
          <View style={[styles.dialogCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.dialogTitle, { color: colors.text }]}>Muokkaa tuotetta</Text>

            <Text style={[styles.inputLabel, { color: colors.mutedText }]}>Tuotteen nimi</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Tuotteen nimi"
              placeholderTextColor={colors.mutedText}
            />

            <View style={styles.amountUnitRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.mutedText }]}>Määrä</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={editAmount}
                  onChangeText={setEditAmount}
                  placeholder="esim. 400"
                  placeholderTextColor={colors.mutedText}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.mutedText }]}>Yksikkö</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={editUnit}
                  onChangeText={setEditUnit}
                  placeholder="esim. g, kpl, l"
                  placeholderTextColor={colors.mutedText}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.mutedText }]}>Kategoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPickerRow}>
              {categories.map((catInfo) => {
                const isSelected = editCategory === catInfo.id;
                return (
                  <Pressable
                    key={catInfo.id}
                    style={[
                      styles.categoryPickerChip,
                      { backgroundColor: isSelected ? colors.primary : colors.background, borderColor: colors.border },
                    ]}
                    onPress={() => setEditCategory(catInfo.id)}
                  >
                    <Ionicons
                      name={catInfo.icon as any}
                      size={13}
                      color={isSelected ? '#FFFFFF' : colors.text}
                    />
                    <Text
                      style={[
                        styles.categoryPickerChipText,
                        { color: isSelected ? '#FFFFFF' : colors.text },
                        isSelected && { fontWeight: '600' },
                      ]}
                    >
                      {catInfo.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.dialogActions}>
              <Pressable
                style={[styles.dialogBtn, { backgroundColor: colors.background }]}
                onPress={() => setEditingItem(null)}
              >
                <Text style={[styles.dialogBtnText, { color: colors.text }]}>Peruuta</Text>
              </Pressable>
              <Pressable
                style={[styles.dialogBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveEdit}
              >
                <Text style={[styles.dialogBtnText, { color: '#FFFFFF' }]}>Tallenna</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 28, paddingHorizontal: 20, paddingBottom: 40 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  titleTextContainer: { flex: 1 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14 },
  headerMoreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  quickAddInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 6,
  },
  quickAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: { marginTop: 40 },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 19, fontWeight: '700', marginBottom: 6 },
  emptyText: { textAlign: 'center', lineHeight: 20, marginBottom: 24, fontSize: 14 },
  emptyPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  emptyPrimaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  listContainer: { gap: 18 },
  categorySection: { gap: 8 },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIconBg: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  itemCheckboxContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    flexShrink: 1,
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemRecipeTag: {
    fontSize: 12,
    marginTop: 2,
  },
  itemCustomTag: {
    fontSize: 11,
    marginTop: 2,
  },
  itemDeleteBtn: {
    padding: 4,
  },
  completedSection: {
    marginTop: 8,
    gap: 8,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  completedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completedTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearCompletedTextBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  clearCompletedText: {
    fontSize: 13,
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
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 4,
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
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 14,
  },
  amountUnitRow: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryPickerRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  categoryPickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryPickerChipText: {
    fontSize: 13,
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  warningBannerText: {
    fontSize: 13,
    flex: 1,
  },
});
