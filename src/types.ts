export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export type FoodSource = 'verified' | 'openfoodfacts' | 'custom' | 'ai_camera' | 'ai_text';

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: FoodSource;
  barcode?: string;
  gramWeight?: number;
}

export interface AnalyzedFoodItem {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portionQuantity?: number;
  portionUnit?: 'g' | 'ml' | 'piece' | 'serving';
  gramsPerPiece?: number;
}

export type Nutrition = Pick<AnalyzedFoodItem, 'calories' | 'protein' | 'carbs' | 'fat'>;
export interface BarcodeProduct {
  barcode: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  unit: 'g' | 'ml';
  nutritionPer100: Nutrition;
  servingQuantity?: number;
  servingLabel?: string;
  pieceQuantity?: number;
  pieceLabel?: string;
}
export interface ProductPortion {
  product: BarcodeProduct;
  amount: number;
  mode: 'weight' | 'servings' | 'pieces';
  pieceWeight?: number;
}

export interface MealAnalysisResult {
  dishName: string;
  referenceObjectDetected: string;
  referenceTip: string;
  items: AnalyzedFoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  notes?: string;
  imageUrl?: string;
}

export interface MealScanDraft extends Pick<MealAnalysisResult, 'dishName' | 'totalCalories' | 'totalProtein' | 'totalCarbs' | 'totalFat'> {
  foodId: string;
  meal: MealType;
  portionDescription: string;
  imageUrl?: string;
  ingredients: AnalyzedFoodItem[];
}

export interface LoggedItem {
  id: string;
  foodId: string;
  date: string; // YYYY-MM-DD
  meal: MealType;
  name: string;
  brand?: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: FoodSource | 'ai_camera';
  imageUrl?: string;
  photoId?: string;
  createdAt: number;
  ingredients?: AnalyzedFoodItem[];
  productPortion?: ProductPortion;
}

export type WorkoutType = 'strength' | 'cardio' | 'walk' | 'hiit' | 'sport';

export interface WorkoutItem {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: WorkoutType;
  durationMinutes: number;
  caloriesBurned: number;
  notes?: string;
  createdAt: number;
}

export interface RecipeItem {
  id: string;
  title: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTime: string;
  difficulty: 'Easy' | 'Medium' | 'Quick';
  category: 'high_protein' | 'breakfast' | 'dinner' | 'snack';
  ingredients: string[];
  instructions: string[];
  tags: string[];
}

export type BiologicalSex = 'female' | 'male';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active';
export type UnitSystem = 'metric' | 'imperial';
export type WeightGoal = 'lose' | 'maintain' | 'gain';

export interface UserProfile {
  age: number;
  sex: BiologicalSex;
  heightCm: number;
  weightKg: number;
  unitSystem: UnitSystem;
  activityLevel: ActivityLevel;
  goal?: WeightGoal;
  weeklyWeightChangeKg?: number;
  customTargetCalories?: number | null;
  hasCompletedOnboarding?: boolean;
}

export interface DailyEnergyNeeds {
  bmr: number;
  tdee: number;
  equationName: string;
  isTeenEquation: boolean;
  explanation: string;
  proteinTargetGrams: number;
  carbsTargetGrams: number;
  fatTargetGrams: number;
}
