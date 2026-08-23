import { supabase } from './supabaseClient';
import { type Protein } from '../types/protein';

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
}

export const getSuggestedRecipes = async (
    proteinIds: string[],
    count: number = 1,
    onlyMealPrep: boolean = false
) => {
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
    
    return data.map((recipe) => ({
        ...recipe,
        proteinId: recipe.protein_id,
        isMealPrep: recipe.is_meal_prep,
    })).sort(() => 0.5 - Math.random()).slice(0, count);
}

export const getRecipeById = async (recipeId: string) => {
    const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipeId)
        .single();

    if (error) {
        console.error('Error fetching recipe:', error);
        return null;
    }

    return {
        ...data,
        proteinId: data.protein_id,
        isMealPrep: data.is_meal_prep,
    };
};