export interface Recipe {
    id: string;
    title: string;
    proteinId: string;
    tags : string[];
    rating?: number;
    lastSuggested?: Date | null;
    isMealPrep: boolean;
    servings_per_batch: number;
}