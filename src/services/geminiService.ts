import { GoogleGenAI, Type } from "@google/genai";
import { DietPlanResponse, UserPreferences } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * Generates a personalized diet plan using Gemini 3 Flash and creates an Instacart checkout link
 * @param base64Image - The fridge photo as a base64 string
 * @param preferences - User's health goals and dietary preferences
 */
export async function generateDietPlan(
  base64Image: string,
  preferences: UserPreferences,
  basePlan?: DietPlanResponse
): Promise<{ plan: DietPlanResponse; instacartUrl: string | null }> {
  try {
    // Remove data URL prefix if present
    const base64Data = base64Image.includes(",") 
      ? base64Image.split(",")[1] 
      : base64Image;

    const systemInstruction = `
      Act as a Staff Clinical Dietician and Microbiome Specialist. Analyze the provided image of a refrigerator or pantry.
      
      USER CONTEXT:
      - Primary Health Goal: ${preferences.dietGoal}
      - Dietary Restrictions: ${preferences.dietaryRestrictions.join(", ") || "None"}
      - Preferred Cuisine: ${preferences.favoriteCuisine}
      - Target Daily Energy Expenditure (TDEE): ${preferences.tdee} kcal
      - Microbiome Optimization: ${preferences.microbiomeTarget ? "ENABLED" : "DISABLED"}
      
      ${basePlan ? `
      RECALIBRATION TASK:
      The user is "forking" an existing meal plan. You MUST adapt the following plan to the new user's TDEE (${preferences.tdee} kcal) and preferences, while keeping the core culinary theme and ingredients from the original plan where possible.
      
      ORIGINAL PLAN CONTEXT:
      - Original Protocol: ${basePlan.protocolName}
      - Original Summary: ${basePlan.analysisSummary}
      ` : ""}

      TASK:
      1. Identify all visible ingredients and their approximate quantities from the image.
      2. Based on the inventory and user preferences, formulate a high-end, 3-day meal protocol.
      3. Specifically identify which ingredients are MISSING from the fridge to complete this 3-day plan.
      
      STRICT CONSTRAINTS:
      - The daily caloric total MUST match the provided TDEE (${preferences.tdee} kcal) within a 5% margin.
      ${preferences.microbiomeTarget ? `
      - MICROBIOME OPTIMIZATION:
        - The daily meal plan MUST contain a minimum of 40 grams of dietary fiber.
        - Across the 3 days, the plan MUST utilize at least 15 distinct, unique plant-based foods (vegetables, fruits, legumes, grains, nuts, seeds) to promote microbiome diversity.
      ` : ""}
      
      Ensure 'analysisSummary' includes a brief clinical explanation of how the plan aligns with the user's goal of '${preferences.dietGoal}' and microbiome health.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: "image/jpeg",
              },
            },
            {
              text: "Generate a personalized 3-day diet plan based on my fridge inventory and preferences.",
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            protocolName: { type: Type.STRING },
            analysisSummary: { type: Type.STRING },
            healthMetrics: {
              type: Type.OBJECT,
              properties: {
                dailyFiber: { type: Type.STRING, description: "Average daily fiber in grams, e.g. '42g'" },
                uniquePlantsUsed: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "List of unique plant-based foods used across the 3 days"
                }
              },
              required: ['dailyFiber', 'uniquePlantsUsed']
            },
            mealPlan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  title: { type: Type.STRING },
                  calories: { type: Type.STRING },
                  meals: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type: { 
                          type: Type.STRING,
                          enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack']
                        },
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        recipe: { type: Type.STRING, description: "Step-by-step preparation instructions" },
                        ingredients: { 
                          type: Type.ARRAY, 
                          items: { type: Type.STRING },
                          description: "Detailed list of ingredients for this specific meal"
                        }
                      },
                      required: ['type', 'name', 'description', 'recipe', 'ingredients']
                    }
                  }
                },
                required: ['day', 'title', 'calories', 'meals']
              }
            },
            groceryList: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  category: { 
                    type: Type.STRING,
                    enum: ['Produce', 'Protein', 'Dairy', 'Pantry', 'Other']
                  },
                  quantity: { type: Type.STRING }
                },
                required: ['id', 'name', 'category', 'quantity']
              }
            }
          },
          required: ['protocolName', 'analysisSummary', 'healthMetrics', 'mealPlan', 'groceryList']
        }
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("AI returned an empty response.");
    }
    
    const plan = JSON.parse(text) as DietPlanResponse;

    // Part 2: Instacart Integration
    let instacartUrl = null;
    const instacartApiKey = process.env.INSTACART_API_KEY;

    if (instacartApiKey && plan.groceryList.length > 0) {
      try {
        const instacartResponse = await fetch("https://connect.instacart.com/idp/v1/products/recipe", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": `Bearer ${instacartApiKey}`
          },
          body: JSON.stringify({
            title: `Weekly AI Meal Plan: ${plan.protocolName}`,
            ingredients: plan.groceryList.map(item => ({
              name: `${item.quantity} ${item.name}`
            }))
          })
        });

        if (instacartResponse.ok) {
          const data = await instacartResponse.json();
          // Assuming the response contains a field like 'recipe_url' or similar based on typical IDP responses
          // The user mentioned "extract the generated shopping URL"
          instacartUrl = data.recipe_url || data.url || data.shopping_url;
          console.log("[Instacart] Shoppable link generated:", instacartUrl);
        } else {
          console.error("[Instacart] Failed to generate link:", await instacartResponse.text());
        }
      } catch (iError) {
        console.error("[Instacart] Error during API call:", iError);
      }
    }

    return { plan, instacartUrl };
  } catch (error) {
    console.error("Error generating diet plan:", error);
    throw new Error("Failed to generate diet plan. Please ensure your image is clear and try again.");
  }
}
