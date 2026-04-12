import { DietPlanResponse } from './types';

export const DUMMY_PLAN: DietPlanResponse = {
  protocolName: "Metabolic Precision Protocol",
  analysisSummary: "Based on your current inventory (Spinach, Eggs, Salmon, Quinoa) and your Keto preference, we've optimized for high-protein, low-carb cellular recovery.",
  mealPlan: [
    {
      day: "Day 01",
      title: "Metabolic Reset",
      calories: "1,850",
      meals: [
        { 
          type: 'Breakfast', 
          name: 'Avocado & Spinach Omelette', 
          description: '3 organic eggs with wilted spinach and half an avocado.',
          recipe: '1. Whisk eggs in a bowl.\n2. Sauté spinach in a pan until wilted.\n3. Pour eggs over spinach and cook until set.\n4. Serve with sliced avocado on top.',
          ingredients: ['3 Organic Eggs', '1 cup Spinach', '1/2 Avocado', '1 tsp Olive Oil']
        },
        { 
          type: 'Lunch', 
          name: 'Grilled Salmon with Asparagus', 
          description: '6oz wild-caught salmon with lemon-butter asparagus.',
          recipe: '1. Season salmon with salt and pepper.\n2. Grill for 4-5 minutes per side.\n3. Steam asparagus and toss with lemon juice and a small amount of butter.',
          ingredients: ['6oz Salmon', '1 bunch Asparagus', '1/2 Lemon', '1 tsp Butter']
        },
        { 
          type: 'Dinner', 
          name: 'Quinoa Power Bowl', 
          description: 'Small portion of quinoa with roasted vegetables and tahini.',
          recipe: '1. Cook quinoa according to package instructions.\n2. Roast mixed vegetables (bell peppers, zucchini) at 400°F for 20 mins.\n3. Combine in a bowl and drizzle with tahini sauce.',
          ingredients: ['1/2 cup Quinoa', '1 cup Mixed Vegetables', '2 tbsp Tahini', 'Lemon Juice']
        }
      ]
    },
    {
      day: "Day 02",
      title: "Cognitive Focus",
      calories: "1,720",
      meals: [
        { 
          type: 'Breakfast', 
          name: 'Blueberry Walnut Oatmeal', 
          description: 'Steel-cut oats with fresh berries and crushed walnuts.',
          recipe: '1. Cook steel-cut oats with water or almond milk.\n2. Stir in fresh blueberries and walnuts.\n3. Add a dash of cinnamon if desired.',
          ingredients: ['1/2 cup Steel-cut Oats', '1/4 cup Blueberries', '2 tbsp Walnuts', 'Cinnamon']
        },
        { 
          type: 'Lunch', 
          name: 'Mediterranean Chickpea Salad', 
          description: 'Cucumber, tomato, chickpeas, and feta with olive oil.',
          recipe: '1. Combine chopped cucumber, tomato, and rinsed chickpeas.\n2. Toss with olive oil, lemon juice, and crumbled feta.',
          ingredients: ['1 cup Chickpeas', '1/2 Cucumber', '1 Tomato', '1 oz Feta Cheese', '1 tbsp Olive Oil']
        },
        { 
          type: 'Dinner', 
          name: 'Lemon Herb Chicken', 
          description: 'Roasted chicken breast with rosemary and steamed broccoli.',
          recipe: '1. Rub chicken breast with rosemary, garlic, and lemon zest.\n2. Roast at 375°F for 25-30 mins.\n3. Serve with steamed broccoli florets.',
          ingredients: ['6oz Chicken Breast', '2 cups Broccoli', '1 sprig Rosemary', '1 clove Garlic']
        }
      ]
    },
    {
      day: "Day 03",
      title: "Cellular Recovery",
      calories: "1,900",
      meals: [
        { 
          type: 'Breakfast', 
          name: 'Greek Yogurt with Chia', 
          description: 'Full-fat yogurt with chia seeds and a hint of honey.',
          recipe: '1. Scoop yogurt into a bowl.\n2. Stir in chia seeds and let sit for 5 minutes.\n3. Drizzle with a small amount of honey.',
          ingredients: ['1 cup Greek Yogurt', '1 tbsp Chia Seeds', '1 tsp Honey']
        },
        { 
          type: 'Lunch', 
          name: 'Lentil & Kale Soup', 
          description: 'Hearty lentil soup with massaged kale and garlic.',
          recipe: '1. Sauté garlic and onions.\n2. Add lentils and vegetable broth, simmer until tender.\n3. Stir in chopped kale at the end until wilted.',
          ingredients: ['1 cup Lentils', '2 cups Kale', '2 cloves Garlic', '4 cups Veggie Broth']
        },
        { 
          type: 'Dinner', 
          name: 'Baked Cod with Zucchini', 
          description: 'White fish baked with zucchini ribbons and cherry tomatoes.',
          recipe: '1. Place cod on a baking sheet.\n2. Surround with zucchini ribbons and halved cherry tomatoes.\n3. Drizzle with olive oil and bake at 400°F for 12-15 mins.',
          ingredients: ['6oz Cod', '1 Zucchini', '1/2 cup Cherry Tomatoes', '1 tbsp Olive Oil']
        }
      ]
    }
  ],
  groceryList: [
    { id: '1', name: 'Organic Spinach', category: 'Produce', quantity: '1 bag' },
    { id: '2', name: 'Wild Salmon', category: 'Protein', quantity: '12 oz' },
    { id: '3', name: 'Avocados', category: 'Produce', quantity: '2 units' },
    { id: '4', name: 'Quinoa', category: 'Pantry', quantity: '1 lb' },
    { id: '5', name: 'Greek Yogurt', category: 'Dairy', quantity: '32 oz' }
  ],
  healthMetrics: {
    dailyFiber: "42g",
    uniquePlantsUsed: ["Spinach", "Asparagus", "Lemon", "Blueberries", "Walnuts", "Cucumber", "Tomato", "Chickpeas", "Broccoli", "Rosemary", "Kale", "Garlic", "Zucchini", "Cherry Tomatoes", "Chia Seeds"]
  }
};
