export interface ProteinCategory {
    id: string;
    label: string;
    sort_order?: number;
}

export interface Protein {
    id: string;
    label: string;
    icon: string | null;
    category: string;
    sort_order?: number;
}