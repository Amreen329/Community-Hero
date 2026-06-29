# Community Hero – AI Hyperlocal Problem Solver 🌟

**Community Hero** is a high-performance, full-stack, AI-driven hyperlocal civic problem solver designed for the **Vibe2Ship Hackathon**. The platform connects citizens, neighborhood volunteers, and municipal administrators to dynamically report, verify, schedule, and resolve community infrastructure faults (potholes, garbage piles, water leaks, dark streetlights) with radical transparency.

Powered by **Google Gemini 2.5 Flash** (via `@google/genai` SDK) and **Firebase Auth + Firestore**, it delivers deep Vision analysis, automated severity categorization, duplication detection, priority-score scheduling, and a natural language civic support chatbot.

---

## 🛠️ Complete Technology Stack

- **Frontend Core**: React 19, TypeScript, Bootstrap 5 (CSS Modules / Plain CSS)
- **Icons**: Lucide React
- **Backend Service**: Node.js, Express, tsx, esbuild
- **Durable Database**: Firebase Firestore (NoSQL Document Store)
- **User Authentication**: Firebase Authentication
- **AI Core**: Google Gemini 2.5 Flash API (Google AI Studio)
- **Maps**: Fully interactive responsive Vector Neighborhood Map with live coordinate tracking and dynamic radial Heat Map overlay.

---

## 📂 Folder Structure

```text
/
├── .env.example                # Base environment variables declaration
├── firebase-blueprint.json     # Firestore collections structure schema
├── firestore.rules             # Secure access rules configuration
├── metadata.json               # Application metadata & permissions
├── package.json                # Bundled build script and npm dependencies
├── server.ts                   # Express server with Gemini API routes & Vite middleware
├── vite.config.ts              # Vite asset compiler configuration
├── src/
│   ├── main.tsx                # Client-side mounting entry point
│   ├── index.css               # Global typography, custom scrollbars, and visual themes
│   ├── App.tsx                 # Master state controller, routing & Firestore sync
│   ├── firebase.ts             # Firebase Auth and Firestore client initialization
│   ├── types.ts                # Shared TypeScript structures (UserProfile, Complaint, etc.)
│   └── components/
│       ├── Auth.tsx            # Login/Register card with 1-click test-role bypass
│       ├── Navbar.tsx          # Sticky responsive header with dark-mode overrides
│       ├── Dashboard.tsx       # Analytics metrics, leaderboards, & list views
│       ├── ReportIssue.tsx     # Form with Drag-and-Drop file uploader & AI Vision presets
│       ├── IssueDetail.tsx     # Complaint inspector, volunteer checkmarks, and chat feeds
│       └── MapVisualization.tsx# Custom Vector Pin Map and Radial Density Heat Map
```

---

## ⚙️ Core AI & Database REST APIs

The backend Express server (`/server.ts`) handles security proxies to prevent Gemini API Key exposure:

1. **`POST /api/analyze-image`**: Extracts base64 image data, triggers **Gemini 2.5 Flash Vision** to diagnose public damage, outputs structured JSON including automated severity, description drafting, municipal division recommendation, and emergency level priority scores.
2. **`POST /api/chatbot`**: Feeds context to **CivicHero AI Chatbot**, enabling interactive community onboarding regarding badges, scoring, reporting, and volunteer verification metrics.
3. **`POST /api/priority-recommendations`**: Analyzes the pending complaints backlog to compute an optimized emergency dispatch schedule.

---

## 🚀 Google Cloud Run & Firebase Deployment Guide

This application is fully production-configured to run inside **Google Cloud Run** or **Firebase App Hosting**.

### 1. Build and Bundle Strategy (Compliance)

The build script uses a dual-bundler approach:
```bash
npm run build
```
This script triggers:
1. `vite build`: Compiles the client-side SPA into static assets inside `dist/`.
2. `esbuild server.ts ...`: Compiles the Express TypeScript server into a self-contained, lightweight CommonJS server inside `dist/server.cjs` that natively serves the static client folder in production.

To start the compiled production server:
```bash
npm start
```

### 2. Google Cloud Run Deployment Steps

Follow these exact commands using the **Google Cloud SDK (gcloud CLI)**:

1. **Configure Project**:
   ```bash
   gcloud config set project [YOUR_PROJECT_ID]
   ```

2. **Build and Push Container to Artifact Registry**:
   Ensure you are in the project root directory where the standard `Dockerfile` can compile the app:
   ```bash
   gcloud builds submit --tag gcr.io/[YOUR_PROJECT_ID]/community-hero:latest
   ```

3. **Deploy Container to Cloud Run**:
   Instruct Cloud Run to start the container, passing the required production environment variables:
   ```bash
   gcloud run deploy community-hero \
     --image gcr.io/[YOUR_PROJECT_ID]/community-hero:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars GEMINI_API_KEY="[YOUR_API_KEY]",NODE_ENV="production"
   ```

### 3. Firebase Configuration Environment

For Firestore and Auth:
- Add the credentials from `/firebase-applet-config.json` directly into your client initialization (`src/firebase.ts`) to establish connection channels.
- Go to the **Firebase Console**, navigate to **Firestore Database**, and ensure database rules are configured to accept writes during testing.
