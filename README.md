# Frictionless AI Dietician

A premium, minimalist AI-powered dietician that generates personalized meal plans by analyzing photos of your refrigerator and pantry. This application leverages advanced computer vision and generative AI to simplify healthy eating, calculate metabolic scores, and optimize microbiome health.

## Features

* **Ingredient Recognition**: Upload or take a photo of your fridge to automatically identify available ingredients.
* **Intelligent Meal Planning**: Generates science-backed 3-day meal protocols using the Gemini 3.5 Flash model.
* **Social Leaderboard**: Claim a unique username, search for friends, send and receive real-time database requests, and compete on day streaks.
* **Health Personalization**: Tailors plans based on Health Goals, Dietary Restrictions, and Total Daily Energy Expenditure (TDEE).
* **Dynamic Metabolic Score**: Calculates score from plant diversity, daily fiber, and adherence consistency.
* **Custom Stats Card**: Generate and download graphics, copy to clipboard, or share to WhatsApp, X, and Instagram.
* **Modern Profile Management**: Interactive drag-and-drop avatar file picker, unique username register, and clean push notifications.
* **Plan Persistence**: Save, share, and track your history with a Firebase-backed user dashboard.

---

## Tech Stack

* **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, Motion
* **Backend**: Python Flask, Gunicorn, Google Generative AI SDK
* **Database**: Cloud Firestore
* **Authentication**: Firebase Authentication (Google Sign-In)
* **Image Capture**: html2canvas
* **Icons**: Lucide React

---

## Environment Setup

Create a `.env` file in the root directory and populate it with your credentials:

```env
# Gemini AI (obtained from Google AI Studio)
GEMINI_API_KEY=your_gemini_key

# Firebase Configuration (obtained from Firebase Console Web App settings)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_FIRESTORE_DATABASE_ID=(default)
```

---

## Local Development (Docker Compose)

The easiest way to run the entire stack locally is using Docker Compose.

1. Ensure Docker is running on your system.
2. Build and start the services:
   ```bash
   docker compose up --build
   ```
3. Open your browser and navigate to:
   ```text
   http://localhost:3000
   ```

---

## Production Deployment

### 1. Backend (Render)
Deploy the Flask backend container to Render:
1. Create a Web Service on Render and link your repository.
2. Set the Environment to **Docker** (it will auto-detect and build the main Dockerfile).
3. Under Environment Variables, add your `GEMINI_API_KEY` and set `PORT` to `5000`.
4. Render will generate a backend web service URL.

### 2. Frontend (Vercel)
Deploy the Vite static build to Vercel:
1. Create a project on Vercel and link your repository.
2. Set the Framework Preset to **Vite**.
3. Under Environment Variables, add all client-safe `VITE_FIREBASE_` keys.
4. Set `VITE_BACKEND_URL` to your Render backend URL.
5. Under settings, Vercel will automatically read the `vercel.json` file in the root directory to handle Vite routing and skip Python packages.
6. Remember to copy the generated Vercel domain and add it under **Authorized domains** in your Firebase Console Authentication settings to enable Google Sign-In.
