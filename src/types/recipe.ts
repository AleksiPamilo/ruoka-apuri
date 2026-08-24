export interface IngredientItem {
    id?: string;
    name: string;
    amount?: number;
    unit?: string;
    categoryId?: string;
    optional?: boolean;
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
    ingredients?: IngredientItem[];
    instructions?: string[];
    planStartDay?: number;
    lastsDays?: number;
}