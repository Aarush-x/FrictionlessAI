# Frictionless AI Dietician

A premium, minimalist AI-powered dietician that generates personalized meal plans by analyzing photos of your refrigerator and pantry. This application leverages advanced computer vision and generative AI to simplify healthy eating and microbiome optimization.

## Features

- Ingredient Recognition: Upload or take a photo of your fridge to automatically identify available ingredients.
- Intelligent Meal Planning: Generates science-backed 3-day meal protocols using the Gemini 3 Flash model.
- Shoppable Recipes: Integrates with Instacart to create checkout links for missing ingredients.
- Health Personalization: Tailors plans based on Health Goals, Dietary Restrictions, and Total Daily Energy Expenditure (TDEE).
- Microbiome Metrics: Tracks daily fiber intake and plant diversity to promote gut health.
- Plan Persistence: Save, share, and track your history with a Firebase-backed user dashboard.

## Tech Stack

- Framework: React 19 with Vite
- Language: TypeScript
- Styling: Tailwind CSS
- Animation: Motion (formerly Framer Motion)
- Authentication: Firebase Auth (Google Login)
- Database: Cloud Firestore
- AI Engine: Google Gemini API (@google/genai)
- Icons: Lucide React

## Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- Firebase Project
- Google Gemini API Key
- Instacart API Key (Optional)

### Environment Setup

Create a `.env` file in the root directory and populate it with your credentials:

```env
# Gemini AI
GEMINI_API_KEY=your_gemini_key

# Firebase Configuration
