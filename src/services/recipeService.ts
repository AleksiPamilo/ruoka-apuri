import { supabase } from './supabaseClient';
import { type Protein, type ProteinCategory } from '../types/protein';
import { type IngredientItem, type Recipe } from '../types/recipe';

export const getProteinCategories = async (): Promise<ProteinCategory[]> => {
  const { data, error } = await supabase
    .from('protein_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching protein categories:', error);
    return [];
  }

  return (data || []) as ProteinCategory[];
};

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

const RECIPE_SELECT_QUERY = `
  *,
  recipe_ingredients (
    amount,
    unit,
    optional,
    ingredient:ingredients (
      id,
      name,
      category_id
    )
  )
`;

const mapRecipeFromDb = (recipe: any): Recipe => {
  let mappedIngredients: IngredientItem[] = [];

  if (Array.isArray(recipe.recipe_ingredients) && recipe.recipe_ingredients.length > 0) {
    mappedIngredients = recipe.recipe_ingredients
      .map((ri: any) => ({
        id: ri.ingredient?.id,
        name: ri.ingredient?.name || '',
        amount: ri.amount !== null && ri.amount !== undefined ? Number(ri.amount) : undefined,
        unit: ri.unit || undefined,
        categoryId: ri.ingredient?.category_id || undefined,
        optional: Boolean(ri.optional),
      }))
      .filter((ing: IngredientItem) => Boolean(ing.name));
  } else if (Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
    mappedIngredients = recipe.ingredients
      .map((ing: any) => {
        if (typeof ing === 'string') {
          return { name: ing };
        }
        return {
          name: ing.name || '',
          amount: ing.amount !== null && ing.amount !== undefined ? Number(ing.amount) : undefined,
          unit: ing.unit || undefined,
          categoryId: ing.category_id || ing.categoryId || undefined,
        };
      })
      .filter((ing: IngredientItem) => Boolean(ing.name));
  }

  return {
    ...recipe,
    proteinId: recipe.protein_id,
    isMealPrep: recipe.is_meal_prep,
    description: recipe.description || undefined,
    prep_time_minutes: recipe.prep_time_minutes || undefined,
    cook_time_minutes: recipe.cook_time_minutes || undefined,
    ingredients: mappedIngredients,
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
    .select(RECIPE_SELECT_QUERY)
    .in('protein_id', proteinIds)
    .order('last_suggested', { ascending: true })
    .limit(count);

  if (onlyMealPrep) {
    query = query.eq('is_meal_prep', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching suggested recipes:', error);
    const fallbackQuery = supabase
      .from('recipes')
      .select('*')
      .in('protein_id', proteinIds)
      .limit(count);
    const { data: fallbackData } = await fallbackQuery;
    if (fallbackData) {
      return fallbackData.map(mapRecipeFromDb);
    }
    return [];
  }

  return (data || [])
    .map(mapRecipeFromDb)
    .sort(() => 0.5 - Math.random())
    .slice(0, count);
};

export const getRecipeById = async (recipeId: string): Promise<Recipe | null> => {
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_SELECT_QUERY)
    .eq('id', recipeId)
    .single();

  if (error) {
    console.error('Error fetching recipe:', error);
    const { data: fallbackData } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .single();
    if (fallbackData) {
      return mapRecipeFromDb(fallbackData);
    }
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