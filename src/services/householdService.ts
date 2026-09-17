import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabaseClient';
import { Household, HouseholdPlanData } from '../types/household';
import { ShoppingItem } from '../types/shoppingList';
import { Recipe } from '../types/recipe';

export const ACTIVE_HOUSEHOLD_KEY = 'ruoka-apuri.active-household';

const CODE_PREFIXES = ['KOKKI', 'ARKI', 'HERKKU', 'PATA', 'KEITTO', 'RUOKA', 'KOTI', 'KASVIS', 'MAKU', 'PÖYTÄ'];
// 32 merkkiä, ei sekoittuvia (0/O, 1/I/L puuttuvat) - 256 % 32 === 0 joten tavuista ei tule vinoumaa.
const CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_SUFFIX_LENGTH = 8;

export async function generateHouseholdCode(): Promise<string> {
  const prefix = CODE_PREFIXES[Math.floor(Math.random() * CODE_PREFIXES.length)];
  const randomBytes = await Crypto.getRandomBytesAsync(CODE_SUFFIX_LENGTH);
  let suffix = '';
  for (let i = 0; i < randomBytes.length; i++) {
    suffix += CODE_CHARSET[randomBytes[i] % CODE_CHARSET.length];
  }
  return `${prefix}-${suffix}`;
}

export async function getActiveHousehold(): Promise<Household | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_HOUSEHOLD_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setActiveHousehold(household: Household | null): Promise<void> {
  try {
    if (!household) {
      await AsyncStorage.removeItem(ACTIVE_HOUSEHOLD_KEY);
    } else {
      await AsyncStorage.setItem(ACTIVE_HOUSEHOLD_KEY, JSON.stringify(household));
    }
  } catch (e) {
    console.error(e);
  }
}

export async function createHousehold(name?: string): Promise<{ household: Household | null; error: string | null }> {
  try {
    let attempts = 0;
    let createdHousehold: Household | null = null;

    while (attempts < 5 && !createdHousehold) {
      const code = await generateHouseholdCode();
      const householdName = name?.trim() || 'Oma talous';

      const { data, error } = await supabase
        .from('households')
        .insert({
          code,
          name: householdName,
          last_active_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (!error && data) {
        createdHousehold = data as Household;
        break;
      }

      attempts++;
    }

    if (!createdHousehold) {
      return { household: null, error: 'Jaetun talouden luominen epäonnistui. Yritä uudelleen.' };
    }

    await setActiveHousehold(createdHousehold);
    return { household: createdHousehold, error: null };
  } catch (e: any) {
    return { household: null, error: e?.message || 'Tuntematon virhe' };
  }
}

export async function joinHousehold(rawCode: string): Promise<{ household: Household | null; error: string | null }> {
  try {
    const code = rawCode.trim().toUpperCase().replace(/\s+/g, '');
    if (!code) {
      return { household: null, error: 'Syötä talouskoodi.' };
    }

    const { data, error } = await supabase
      .from('households')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (error || !data) {
      return { household: null, error: 'Koodilla ei löytynyt jaettua taloutta. Tarkista koodi.' };
    }

    const household = data as Household;

    await supabase
      .from('households')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', household.id);

    await setActiveHousehold(household);
    return { household, error: null };
  } catch (e: any) {
    return { household: null, error: e?.message || 'Tuntematon virhe' };
  }
}

export async function leaveHousehold(): Promise<void> {
  await setActiveHousehold(null);
}

export async function fetchHouseholdShoppingItems(householdId: string): Promise<ShoppingItem[]> {
  try {
    const { data, error } = await supabase
      .from('household_shopping_items')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      name: item.name,
      amount: item.amount !== null && item.amount !== undefined ? Number(item.amount) : undefined,
      unit: item.unit || undefined,
      category: item.category || 'other',
      checked: Boolean(item.checked),
      isCustom: Boolean(item.is_custom),
      recipeTitle: item.recipe_title || undefined,
      createdAt: item.created_at,
    }));
  } catch {
    return [];
  }
}

export async function saveHouseholdShoppingItems(householdId: string, items: ShoppingItem[]): Promise<boolean> {
  try {
    const { error: deleteError } = await supabase
      .from('household_shopping_items')
      .delete()
      .eq('household_id', householdId);

    if (deleteError) {
      console.error(deleteError);
      return false;
    }

    if (items.length === 0) {
      return true;
    }

    const rows = items.map((item) => ({
      id: item.id,
      household_id: householdId,
      name: item.name,
      amount: item.amount !== undefined ? item.amount : null,
      unit: item.unit || null,
      category: item.category || 'other',
      checked: Boolean(item.checked),
      is_custom: Boolean(item.isCustom),
      recipe_title: item.recipeTitle || null,
      created_at: item.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('household_shopping_items')
      .insert(rows);

    if (insertError) {
      console.error(insertError);
      return false;
    }

    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function toggleHouseholdShoppingItem(
  householdId: string,
  itemId: string,
  checked: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('household_shopping_items')
      .update({ checked, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .eq('household_id', householdId);

    return !error;
  } catch {
    return false;
  }
}

export async function deleteHouseholdShoppingItem(householdId: string, itemId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('household_shopping_items')
      .delete()
      .eq('id', itemId)
      .eq('household_id', householdId);

    return !error;
  } catch {
    return false;
  }
}

export async function fetchHouseholdPlan(householdId: string): Promise<HouseholdPlanData | null> {
  try {
    const { data, error } = await supabase
      .from('household_plans')
      .select('*')
      .eq('household_id', householdId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      recipes: Array.isArray(data.recipes) ? data.recipes : [],
      proteinIds: Array.isArray(data.protein_ids) ? data.protein_ids : [],
    };
  } catch {
    return null;
  }
}

export async function saveHouseholdPlan(
  householdId: string,
  recipes: Recipe[],
  proteinIds: string[]
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('household_plans')
      .upsert({
        household_id: householdId,
        recipes: recipes || [],
        protein_ids: proteinIds || [],
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error(error);
      return false;
    }

    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export function subscribeToHouseholdShopping(householdId: string, onUpdate: () => void): () => void {
  const channel = supabase
    .channel(`household-shopping-${householdId}-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'household_shopping_items',
        filter: `household_id=eq.${householdId}`,
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToHouseholdPlan(householdId: string, onUpdate: () => void): () => void {
  const channel = supabase
    .channel(`household-plan-${householdId}-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'household_plans',
        filter: `household_id=eq.${householdId}`,
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
