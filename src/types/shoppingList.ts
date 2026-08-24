export interface CategoryInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order?: number;
}

export interface ShoppingItem {
  id: string;
  name: string;
  amount?: number;
  unit?: string;
  category: string;
  checked: boolean;
  isCustom: boolean;
  recipeTitle?: string;
  createdAt: string;
}
