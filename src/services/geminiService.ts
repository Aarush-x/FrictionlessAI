import { DietPlanResponse, UserPreferences } from "../types";

// The backend URL can be configured via environment variables.
// If not specified, relative routes are used (highly recommended for production behind reverse proxies).
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

/**
 * Sends preferences and the fridge image to the backend to generate a personalized diet plan
 * @param base64Image - The fridge photo as a base64 string
 * @param preferences - User's health goals and dietary preferences
 * @param basePlan - Optional original plan if recalibrating/forking
 */
export async function generateDietPlan(
  base64Image: string,
  preferences: UserPreferences,
  basePlan?: DietPlanResponse
): Promise<{ plan: DietPlanResponse; instacartUrl: string | null }> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/generate-plan`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: base64Image,
        preferences: preferences,
        basePlan: basePlan || null
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsedErr;
      try {
        parsedErr = JSON.parse(errText);
      } catch {
        parsedErr = { error: errText };
      }
      throw new Error(parsedErr.error || parsedErr.details || `HTTP error! Status: ${response.status}`);
    }

    const plan = await response.json() as DietPlanResponse & { checkoutUrl?: string };

    // Instacart Shoppable Link Integration
    let instacartUrl = null;
    const instacartApiKey = import.meta.env.VITE_INSTACART_API_KEY;

    if (instacartApiKey && plan.groceryList && plan.groceryList.length > 0) {
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
          instacartUrl = data.recipe_url || data.url || data.shopping_url;
          console.log("[Instacart] Shoppable link generated:", instacartUrl);
        } else {
          console.error("[Instacart] Failed to generate link:", await instacartResponse.text());
        }
      } catch (iError) {
        console.error("[Instacart] Error during API call:", iError);
      }
    }

    // Fallback to the backend-provided checkoutUrl if no direct Instacart client integration is configured
    return { 
      plan, 
      instacartUrl: instacartUrl || plan.checkoutUrl || null 
    };
  } catch (error) {
    console.error("Plan Generation Error:", error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Failed to generate diet plan. Please ensure the backend server is running and try again.");
  }
}

