export interface MealPlan {
  day: string;
  title: string;
  calories: string;
  meals: {
    type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
    name: string;
    description: string;
    recipe?: string;
    ingredients?: string[];
  }[];
}

export interface GroceryItem {
  id: string;
  name: string;
  category: 'Produce' | 'Protein' | 'Dairy' | 'Pantry' | 'Other';
  quantity: string;
}

export interface UserStats {
  currentStreak: number;
  longestStreak: number;
  lastUploadDate: string;
  totalPlansGenerated: number;
}

export interface DietPlanResponse {
  protocolName: string;
  mealPlan: MealPlan[];
  groceryList: GroceryItem[];
  analysisSummary: string;
  healthMetrics: {
    dailyFiber: string;
    uniquePlantsUsed: string[];
  };
}

export interface UserPreferences {
  dietGoal: string;
  dietaryRestrictions: string[];
  favoriteCuisine: string;
  age: number;
  weight: number;
  height: number;
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'active' | 'athlete';
  exerciseDuration: number;
  exerciseIntensity: 'low' | 'moderate' | 'high';
  tdee: number;
  microbiomeTarget: boolean;
}
