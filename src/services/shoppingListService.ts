import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import { Recipe } from '../types/recipe';
import { CategoryInfo, ShoppingItem } from '../types/shoppingList';

export const SHOPPING_LIST_STORAGE_KEY = 'ruoka-apuri.shopping-list';
export const CATEGORIES_CACHE_KEY = 'ruoka-apuri.shopping-categories';

export async function fetchShoppingCategories(): Promise<CategoryInfo[]> {
  try {
    const { data, error } = await supabase
      .from('shopping_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      const cached = await AsyncStorage.getItem(CATEGORIES_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
      return [];
    }

    const categories: CategoryInfo[] = data.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon || 'basket-outline',
      color: cat.color || '#8E8E93',
      sort_order: cat.sort_order ?? 0,
    }));

    await AsyncStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(categories));
    return categories;
  } catch (e) {
    console.error(e);
    const cached = await AsyncStorage.getItem(CATEGORIES_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
    return [];
  }
}

export async function findIngredientCategory(name: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('ingredients')
      .select('category_id')
      .ilike('name', name.trim())
      .limit(1)
      .single();
    if (data && data.category_id) {
      return data.category_id;
    }
  } catch {}
  return null;
}

export function parseIngredientString(raw: string): { name: string; amount?: number; unit?: string } {
  const trimmed = raw.trim();
  const match = trimmed.match(/^([\d.,]+)\s*([a-zA-ZäöåÄÖÅ]+)?\s+(.+)$/);
  if (match) {
    const parsedAmount = parseFloat(match[1].replace(',', '.'));
    const unit = match[2] || '';
    const name = match[3].trim();
    return {
      name,
      amount: isNaN(parsedAmount) ? undefined : parsedAmount,
      unit: unit || undefined,
    };
  }
  return { name: trimmed };
}

export function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function generateShoppingListFromPlan(
  recipes: Recipe[],
  existingList: ShoppingItem[]
): ShoppingItem[] {
  const customItems = existingList.filter((item) => item.isCustom);
  const existingCheckedMap = new Map<string, boolean>();
  existingList.forEach((item) => {
    existingCheckedMap.set(normalizeIngredientName(item.name), item.checked);
  });

  const ingredientMap = new Map<string, ShoppingItem>();

  recipes.forEach((recipe) => {
    if (!recipe.ingredients) return;

    recipe.ingredients.forEach((ing) => {
      let name = '';
      let amount: number | undefined;
      let unit: string | undefined;
      let categoryId: string = 'other';

      if (typeof ing === 'string') {
        const parsed = parseIngredientString(ing);
        name = parsed.name;
        amount = parsed.amount;
        unit = parsed.unit;
      } else {
        name = ing.name;
        amount = ing.amount;
        unit = ing.unit;
        categoryId = ing.categoryId || 'other';
      }

      if (!name) return;

      const normName = normalizeIngredientName(name);
      const existing = ingredientMap.get(normName);

      if (existing) {
        if (amount !== undefined && existing.amount !== undefined && existing.unit === unit) {
          existing.amount += amount;
        }
        if (existing.recipeTitle && !existing.recipeTitle.includes(recipe.title)) {
          existing.recipeTitle = `${existing.recipeTitle}, ${recipe.title}`;
        }
      } else {
        const wasChecked = existingCheckedMap.get(normName) ?? false;
        ingredientMap.set(normName, {
          id: `cal-${normName}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          amount,
          unit,
          category: categoryId,
          checked: wasChecked,
          isCustom: false,
          recipeTitle: recipe.title,
          createdAt: new Date().toISOString(),
        });
      }
    });
  });

  const calendarItems = Array.from(ingredientMap.values());
  return [...calendarItems, ...customItems];
}

export async function loadShoppingList(): Promise<ShoppingItem[]> {
  try {
    const raw = await AsyncStorage.getItem(SHOPPING_LIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function saveShoppingList(items: ShoppingItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SHOPPING_LIST_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error(e);
  }
}

export function formatShoppingListForSharing(
  items: ShoppingItem[],
  categories: CategoryInfo[]
): string {
  const active = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  let text = '🛒 Kauppalista (Ruoka-apuri)\n\n';

  categories.forEach((cat) => {
    const catItems = active.filter((i) => i.category === cat.id);
    if (catItems.length === 0) return;

    text += `▪️ ${cat.name}:\n`;
    catItems.forEach((item) => {
      const amountStr = item.amount ? `${item.amount} ${item.unit || ''}`.trim() + ' ' : '';
      text += `  • ${amountStr}${item.name}\n`;
    });
    text += '\n';
  });

  const uncategorizedActive = active.filter(
    (i) => !categories.some((c) => c.id === i.category)
  );
  if (uncategorizedActive.length > 0) {
    text += '▪️ Muut tuotteet:\n';
    uncategorizedActive.forEach((item) => {
      const amountStr = item.amount ? `${item.amount} ${item.unit || ''}`.trim() + ' ' : '';
      text += `  • ${amountStr}${item.name}\n`;
    });
    text += '\n';
  }

  if (checked.length > 0) {
    text += '✅ Kerätyt:\n';
    checked.forEach((item) => {
      const amountStr = item.amount ? `${item.amount} ${item.unit || ''}`.trim() + ' ' : '';
      text += `  ✓ ${amountStr}${item.name}\n`;
    });
  }

  return text.trim();
}
