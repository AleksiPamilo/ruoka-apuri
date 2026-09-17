import { ShoppingItem } from './shoppingList';
import { Recipe } from './recipe';

export type Household = {
  id: string;
  code: string;
  name: string;
  created_at: string;
  last_active_at: string;
};

export type HouseholdPlanData = {
  recipes: Recipe[];
  proteinIds: string[];
};

export type HouseholdSyncState = {
  household: Household | null;
  isLoading: boolean;
  error: string | null;
};
