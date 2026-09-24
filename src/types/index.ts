// ─── Estados y Enums Comunes ──────────────────────────────────────────────────
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';
export type DataSource = 'ai' | 'manual';

export type IngredientCategory =
  | 'fruit'
  | 'vegetable'
  | 'protein'
  | 'dairy'
  | 'grain'
  | 'legume'
  | 'sauce'
  | 'snack'
  | 'other';

export type IngredientUnit =
  | 'units'
  | 'grams'
  | 'kilograms'
  | 'milliliters'
  | 'liters'
  | 'package'
  | 'unknown';

export type ExpirationStatus = 'fresh' | 'expiringSoon' | 'expired' | 'unknown';
export type ExpirationSource = 'manual' | 'label' | 'estimated' | 'unknown';

// ─── Entidad: Ingrediente ─────────────────────────────────────────────────────
export type Ingredient = {
  id: string;
  name: string;
  category: IngredientCategory;
  quantity: number | null;
  unit: IngredientUnit;
  expirationDate: string | null;
  confidence: number | null;
  source: DataSource;
  confirmed: boolean;
  imageUri?: string | null;
  notes?: string | null;
  expirationSource?: ExpirationSource;
};

// ─── Entidad: Receta ──────────────────────────────────────────────────────────
export type RecipeDifficulty = 'easy' | 'medium' | 'hard';

export type RecipeIngredient = {
  id: string;
  name: string;
  quantity: number | null;
  unit: IngredientUnit;
  isAvailable: boolean;
  isOptional: boolean;
  inventoryIngredientId?: string | null;
  substitutions: string[];
};

export type Recipe = {
  id: string;
  title: string;
  description: string;
  imageUri?: string | null;
  prepTimeMinutes: number | null;
  servings: number | null;
  difficulty: RecipeDifficulty;
  matchScore: number;
  availableIngredients: RecipeIngredient[];
  missingIngredients: RecipeIngredient[];
  steps: string[];
  isSaved: boolean;
  isPrepared: boolean;
  createdAt?: string; // ISO 8601 Timestamp para ordenamiento estricto en stack
};

// ─── Contratos de Ordenamiento y Filtrado de Recetas ─────────────────────────
export type RecipeSortOption =
  | 'createdAt_desc'
  | 'createdAt_asc'
  | 'matchScore_desc'
  | 'prepTime_asc'
  | 'difficulty_asc';
export type RecipeDifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';

export type RecipeFilterOptions = {
  searchQuery?: string;
  tab?: 'all' | 'high_match' | 'quick' | 'saved';
  difficulty?: RecipeDifficultyFilter;
  maxPrepTime?: number | null;
  sortBy?: RecipeSortOption;
  onlyFullMatch?: boolean;
};

// ─── Contratos de Validación de Ingredientes ──────────────────────────────────
export type IngredientValidationStatus =
  | 'complete'
  | 'missing_optional'
  | 'missing_required'
  | 'empty_inventory';

export type IngredientValidationResult = {
  canPrepare: boolean;
  availableCount: number;
  missingCount: number;
  missingItems: RecipeIngredient[];
  friendlyMessage: string;
  inventoryDeductionNotice: string;
  status: IngredientValidationStatus;
  willDeductFromInventory: boolean;
};

// ─── Contratos de Validación de Chef IA (Tiempo vs Dificultad) ────────────────
export type ChefTimeOption = 15 | 20 | 30 | 45 | 60;

export type ChefValidationRule = {
  difficulty: RecipeDifficulty;
  allowedTimeMinutes: number[];
  disallowedTimeMinutes: number[];
  warningMessage?: string;
};



// ─── Contratos de Preferencias Dietarias ───────────────────────────────────────
export type DietaryPreference =
  | 'any'
  | 'vegetarian'
  | 'vegan'
  | 'keto'
  | 'low_carb'
  | 'gluten_free';

export interface DietaryOption {
  key: DietaryPreference;
  label: string;
}

export const DIETARY_OPTIONS: readonly DietaryOption[] = [
  { key: 'any', label: 'Cualquiera' },
  { key: 'vegetarian', label: 'Vegetariana' },
  { key: 'vegan', label: 'Vegana' },
  { key: 'keto', label: 'Keto' },
  { key: 'gluten_free', label: 'Sin Gluten' },
] as const;

// ─── Contratos de Enfoque Culinario del Chef IA ──────────────────────────────
export type RecipeFocus = 'waste_reduction' | 'quick' | 'custom';

export interface RecipeFocusOption {
  key: RecipeFocus;
  title: string;
  description: string;
  iconName: 'leaf-outline' | 'flash-outline' | 'color-wand-outline';
}

export const RECIPE_FOCUS_OPTIONS: readonly RecipeFocusOption[] = [
  {
    key: 'waste_reduction',
    title: 'Aprovechar por vencer (Cero Desperdicio)',
    description: 'Prioriza ingredientes próximos a caducar para no botar comida.',
    iconName: 'leaf-outline',
  },
  {
    key: 'quick',
    title: 'Rápida y Express',
    description: 'Platos sencillos con menor cantidad de pasos y utensilios.',
    iconName: 'flash-outline',
  },
  {
    key: 'custom',
    title: 'Personalizada y Creativa',
    description: 'Libertad gastronómica total: define estilo, técnica o antojo.',
    iconName: 'color-wand-outline',
  },
] as const;

// ─── Contratos de Escaneo ─────────────────────────────────────────────────────
export type ScanInput = {
  imageUri: string;
  mimeType: string;
  base64?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
};

export type ScanResult = {
  scanId: string;
  imageUri: string;
  ingredients: Ingredient[];
  warnings: string[];
  analyzedAt: string;
};

// ─── Contratos de Flujo (Cocina y Dashboard) ──────────────────────────────────
export type CookingProgress = {
  recipeId: string;
  completedStepIndexes: number[];
  consumedIngredientIds: string[];
  isFinished: boolean;
};

export type HomeSummary = {
  ingredientCount: number;
  expiringSoonCount: number;
  availableRecipeCount: number;
  lastScanAt: string | null;
  hasInventory: boolean;
};

// ─── Contratos de Lista de Compras ───────────────────────────────────────────
export type ShoppingItem = {
  id: string;
  name: string;
  quantity: number | null;
  unit: IngredientUnit;
  category: IngredientCategory;
  isBought: boolean;
  recipeSource?: string | null;
  createdAt: string;
};

// ─── Contratos de Autenticación ──────────────────────────────────────────────
export type User = {
  id: string;
  email: string;
  name: string;
};

export type AuthSession = {
  accessToken: string;
  expiresAt?: string;
  user: User;
};
