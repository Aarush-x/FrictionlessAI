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

# Initialize the model (Gemini 1.5 Flash for speed and efficiency)
model = genai.GenerativeModel('gemini-1.5-flash')

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
    Expects JSON: { "image": "base64_string", "preferences": ["Keto", "Vegan"] }
    """
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({"error": "Missing image data"}), 400

        image_b64 = data['image']
        preferences = data.get('preferences', [])

        # Prepare the prompt for Gemini
        # We use a structured prompt to ensure the output is valid JSON
        prompt = f"""
        Act as a Staff Clinical Dietician. Analyze the provided image of a refrigerator or pantry.
        
        USER CONTEXT:
        Dietary Preferences/Restrictions: {', '.join(preferences) if preferences else 'No specific restrictions'}
        
        TASK:
        1. Identify all visible ingredients and their approximate quantities.
        2. Based on the inventory and preferences, generate a high-end, 3-day meal protocol.
        3. Identify exactly which ingredients are missing to complete this protocol.
        4. Calculate estimated daily caloric totals.
        
        STRICT OUTPUT FORMAT:
        Return ONLY a JSON object. Do not include markdown formatting or extra text.
        Structure:
        {{
          "protocolName": "A premium name for the plan (e.g., 'Metabolic Precision Protocol')",
          "analysisSummary": "A 2-sentence clinical summary of the inventory vs goals.",
          "mealPlan": [
            {{
              "day": "Day 01",
              "title": "Daily Theme",
              "calories": "Total kcal",
              "meals": [
                {{ "type": "Breakfast", "name": "Meal Name", "description": "Brief description" }},
                {{ "type": "Lunch", "name": "Meal Name", "description": "Brief description" }},
                {{ "type": "Dinner", "name": "Meal Name", "description": "Brief description" }}
              ]
            }}
          ],
          "groceryList": [
            {{ "id": "unique_id", "name": "Ingredient", "category": "Produce/Protein/etc", "quantity": "Amount" }}
          ]
        }}
        """

        # Process the image
        # Remove data URL prefix if present
        if ',' in image_b64:
            image_b64 = image_b64.split(',')[1]
        
        image_data = base64.b64decode(image_b64)

        # Call Gemini API
        logger.info("Calling Gemini 1.5 Flash API...")
        response = model.generate_content([
            prompt,
            {'mime_type': 'image/jpeg', 'data': image_data}
        ])

        # Parse and clean the response
        content = response.text.strip()
        
        # Handle potential markdown wrapping in Gemini response
        if content.startswith("```json"):
            content = content.split("```json")[1].split("```")[0].strip()
        elif content.startswith("```"):
            content = content.split("```")[1].split("```")[0].strip()

        try:
            plan_json = json.loads(content)
        except json.JSONDecodeError as je:
            logger.error(f"JSON Decode Error: {je}. Raw content: {content}")
            return jsonify({"error": "AI generated invalid JSON", "raw": content}), 500

        # Inject the mock checkout link
        plan_json['checkoutUrl'] = get_mock_checkout_link(plan_json.get('groceryList', []))

        return jsonify(plan_json)

    except Exception as e:
        logger.error(f"Unexpected Error: {str(e)}")
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "model": "gemini-1.5-flash"}), 200

if __name__ == '__main__':
    # Port 3000 is required for the AI Studio Cloud Run environment
    port = int(os.environ.get("PORT", 3000))
    app.run(host='0.0.0.0', port=port)
