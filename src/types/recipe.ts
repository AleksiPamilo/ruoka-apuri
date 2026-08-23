export interface IngredientItem {
    name: string;
    amount?: number;
    unit?: string;
}

export interface Recipe {
    id: string;
    title: string;
    description?: string;
    proteinId: string;
    tags: string[];
    rating?: number;
    lastSuggested?: Date | null;
    isMealPrep: boolean;
    servings_per_batch: number;
    prep_time_minutes?: number;
    cook_time_minutes?: number;
    ingredients?: IngredientItem[] | string[];
    instructions?: string[];
    planStartDay?: number;
    lastsDays?: number;
}