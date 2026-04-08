
export const PROTEIN_CATEGORIES = ['meat', 'fish', 'plant_based', 'other'] as const;
export type ProteinCategory = typeof PROTEIN_CATEGORIES[number];

export interface Protein {
    id: string;
    label: string;
    icon: string;
    category: ProteinCategory;
}