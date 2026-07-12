import os
import json
import base64
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app) # Enable CORS for frontend communication

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Gemini API
# AI Studio automatically injects GEMINI_API_KEY into the environment
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    logger.error("GEMINI_API_KEY not found in environment variables.")
else:
    genai.configure(api_key=api_key)

# Initialize the model (Gemini 3.5 Flash for speed and efficiency)
model = genai.GenerativeModel('gemini-3.5-flash')

def get_mock_checkout_link(grocery_list):
    """
    Mock integration for Instacart/DoorDash.
    In production, this would call their respective Partner APIs to create a cart
    and return a deep-link URL for the user to complete the purchase.
    """
    item_count = len(grocery_list)
    # Simulating a generated checkout session ID
    session_id = base64.b64encode(os.urandom(9)).decode('utf-8')
    return f"https://www.instacart.com/store/checkout/v3?cart_id={session_id}&items={item_count}&partner=frictionless_ai"

@app.route('/api/generate-plan', methods=['POST'])
def generate_plan():
    """
    Endpoint to analyze fridge image and generate a meal plan.
    Expects JSON: {
        "image": "base64_string",
        "preferences": { ...UserPreferences... },
        "basePlan": { ...DietPlanResponse... } (optional)
    }
    """
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({"error": "Missing image data"}), 400

        image_b64 = data['image']
        preferences = data.get('preferences', {})
        base_plan = data.get('basePlan')

        diet_goal = preferences.get('dietGoal', 'General Health')
        dietary_restrictions = preferences.get('dietaryRestrictions', [])
        favorite_cuisine = preferences.get('favoriteCuisine', 'Any')
        tdee = preferences.get('tdee', 2000)
        microbiome_target = preferences.get('microbiomeTarget', False)

        # Prepare the system instruction dynamically
        system_instruction = f"""
        Act as a Staff Clinical Dietician and Microbiome Specialist. Analyze the provided image of a refrigerator or pantry.
        
        USER CONTEXT:
        - Primary Health Goal: {diet_goal}
        - Dietary Restrictions: {", ".join(dietary_restrictions) if dietary_restrictions else "None"}
        - Preferred Cuisine: {favorite_cuisine}
        - Target Daily Energy Expenditure (TDEE): {tdee} kcal
        - Microbiome Optimization: {"ENABLED" if microbiome_target else "DISABLED"}
        """

        if base_plan:
            system_instruction += f"""
            RECALIBRATION TASK:
            The user is "forking" an existing meal plan. You MUST adapt the following plan to the new user's TDEE ({tdee} kcal) and preferences, while keeping the core culinary theme and ingredients from the original plan where possible.
            
            ORIGINAL PLAN CONTEXT:
            - Original Protocol: {base_plan.get('protocolName', '')}
            - Original Summary: {base_plan.get('analysisSummary', '')}
            """

        system_instruction += f"""
        TASK:
        1. Identify all visible ingredients and their approximate quantities from the image.
        2. Based on the inventory and user preferences, formulate a high-end, 3-day meal protocol.
        3. Specifically identify which ingredients are MISSING from the fridge to complete this 3-day plan.
        
        STRICT CONSTRAINTS:
        - The daily caloric total MUST match the provided TDEE ({tdee} kcal) within a 5% margin.
        """

        if microbiome_target:
            system_instruction += """
            - MICROBIOME OPTIMIZATION:
              - The daily meal plan MUST contain a minimum of 40 grams of dietary fiber.
              - Across the 3 days, the plan MUST utilize at least 15 distinct, unique plant-based foods (vegetables, fruits, legumes, grains, nuts, seeds) to promote microbiome diversity.
            """
            
        system_instruction += f"""
        Ensure 'analysisSummary' includes a brief clinical explanation of how the plan aligns with the user's goal of '{diet_goal}' and microbiome health.
        """

        # Enforce exact JSON response schema
        response_schema = {
            "type": "OBJECT",
            "properties": {
                "protocolName": {"type": "STRING"},
                "analysisSummary": {"type": "STRING"},
                "healthMetrics": {
                    "type": "OBJECT",
                    "properties": {
                        "dailyFiber": {"type": "STRING", "description": "Average daily fiber in grams, e.g. '42g'"},
                        "uniquePlantsUsed": {
                            "type": "ARRAY",
                            "items": {"type": "STRING"},
                            "description": "List of unique plant-based foods used across the 3 days"
                        }
                    },
                    "required": ["dailyFiber", "uniquePlantsUsed"]
                },
                "mealPlan": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "day": {"type": "STRING"},
                            "title": {"type": "STRING"},
                            "calories": {"type": "STRING"},
                            "meals": {
                                "type": "ARRAY",
                                "items": {
                                    "type": "OBJECT",
                                    "properties": {
                                        "type": {
                                            "type": "STRING",
                                            "enum": ["Breakfast", "Lunch", "Dinner", "Snack"]
                                        },
                                        "name": {"type": "STRING"},
                                        "description": {"type": "STRING"},
                                        "recipe": {"type": "STRING", "description": "Step-by-step preparation instructions"},
                                        "ingredients": {
                                            "type": "ARRAY",
                                            "items": {"type": "STRING"},
                                            "description": "Detailed list of ingredients for this specific meal"
                                        }
                                    },
                                    "required": ["type", "name", "description", "recipe", "ingredients"]
                                }
                            }
                        },
                        "required": ["day", "title", "calories", "meals"]
                    }
                },
                "groceryList": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "id": {"type": "STRING"},
                            "name": {"type": "STRING"},
                            "category": {
                                "type": "STRING",
                                "enum": ["Produce", "Protein", "Dairy", "Pantry", "Other"]
                            },
                            "quantity": {"type": "STRING"}
                        },
                        "required": ["id", "name", "category", "quantity"]
                    }
                }
            },
            "required": ["protocolName", "analysisSummary", "healthMetrics", "mealPlan", "groceryList"]
        }

        # Process the image
        # Extract mime-type if possible from data URL header
        mime_type = "image/jpeg"
        if ',' in image_b64:
            header, image_b64 = image_b64.split(',', 1)
            if "data:" in header and ";" in header:
                parts = header.split(";")
                mime_type = parts[0].replace("data:", "")
        
        image_data = base64.b64decode(image_b64)

        # Call Gemini API securely server-side
        logger.info("Calling Gemini 1.5 Flash API with server-side configurations...")
        
        req_model = genai.GenerativeModel(
            model_name='gemini-3.5-flash',
            system_instruction=system_instruction
        )

        response = req_model.generate_content(
            contents=[
                "Generate a personalized 3-day diet plan based on my fridge inventory and preferences.",
                {'mime_type': mime_type, 'data': image_data}
            ],
            generation_config={
                "response_mime_type": "application/json",
                "response_schema": response_schema,
            }
        )

        # Parse the JSON response
        content = response.text.strip()
        
        # Handle fallback markdown wrapping if model ignores schema constraints (rare)
        if content.startswith("```json"):
            content = content.split("```json")[1].split("```")[0].strip()
        elif content.startswith("```"):
            content = content.split("```")[1].split("```")[0].strip()

        try:
            plan_json = json.loads(content)
        except json.JSONDecodeError as je:
            logger.error(f"JSON Decode Error: {je}. Raw content: {content}")
            return jsonify({"error": "AI generated invalid JSON", "raw": content}), 500

        # Inject checkout link placeholder (optional, client will resolve real or mock)
        plan_json['checkoutUrl'] = get_mock_checkout_link(plan_json.get('groceryList', []))

        return jsonify(plan_json)

    except Exception as e:
        logger.error(f"Unexpected Error: {str(e)}")
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "model": "gemini-3.5-flash"}), 200

if __name__ == '__main__':
    # Port 3000 is required for the AI Studio Cloud Run environment
    port = int(os.environ.get("PORT", 3000))
    app.run(host='0.0.0.0', port=port)
