import { supabase } from './supabaseClient';
import { type Protein } from '../types/protein';
import { type Recipe } from '../types/recipe';

export const getProteins = async (): Promise<Protein[]> => {
  const { data, error } = await supabase
    .from('proteins')
    .select('*')
    .order('label', { ascending: true });

  if (error) {
    console.error('Error fetching proteins:', error);
    return [];
  }

  return data as Protein[];
};

const mapRecipeFromDb = (recipe: any): Recipe => {
  return {
    ...recipe,
    proteinId: recipe.protein_id,
    isMealPrep: recipe.is_meal_prep,
    description: recipe.description || undefined,
    prep_time_minutes: recipe.prep_time_minutes || undefined,
    cook_time_minutes: recipe.cook_time_minutes || undefined,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
  };
};

export const getSuggestedRecipes = async (
  proteinIds: string[],
  count: number = 1,
  onlyMealPrep: boolean = false
): Promise<Recipe[]> => {
  let query = supabase
    .from('recipes')
    .select('*')
    .in('protein_id', proteinIds)
    .order('last_suggested', { ascending: true })
    .limit(count);

  if (onlyMealPrep) {
    query = query.eq('is_meal_prep', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching suggested recipes:', error);
    return [];
  }

  return data
    .map(mapRecipeFromDb)
    .sort(() => 0.5 - Math.random())
    .slice(0, count);
};

export const getRecipeById = async (recipeId: string): Promise<Recipe | null> => {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .single();

  if (error) {
    console.error('Error fetching recipe:', error);
    return null;
  }

  return mapRecipeFromDb(data);
};

export const updateRecipeRating = async (recipeId: string, rating: number): Promise<boolean> => {
  const { error } = await supabase
    .from('recipes')
    .update({ rating })
    .eq('id', recipeId);

  if (error) {
    console.error('Error updating rating:', error);
    return false;
  }
  return true;
};