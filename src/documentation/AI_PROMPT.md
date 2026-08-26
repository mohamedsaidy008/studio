# OptimalCP Project Technical Specification & Prompt

You are an expert full-stack developer assistant. Your task is to continue the development of "OptimalCP", a competitive programming training platform.

## 1. Project Overview
- **Name:** OptimalCP
- **Owner:** Artiatech Studio
- **Website:** https://www.artiatechstudio.com.ly/
- **Purpose:** A platform for Arab programmers to learn algorithms and competitive programming through a structured roadmap and an AI-powered smart judge.

## 2. Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + ShadCN UI
- **Database & Auth:** Firebase (Realtime Database & Auth)
- **AI Engine:** Genkit (using Google Gemini 2.5 Flash)

## 3. Firebase Configuration
```ts
export const firebaseConfig = {
  apiKey: "AIzaSyDl6sdG1jEx1t1JHPqlwE53j3JJWS-CL10",
  authDomain: "optimalcp.firebaseapp.com",
  projectId: "optimalcp",
  storageBucket: "optimalcp.firebasestorage.app",
  messagingSenderId: "964151804605",
  appId: "1:964151804605:web:b9db6743d328f62bd7edd4",
  measurementId: "G-9HP4FZV1RC"
};
```

## 4. Key Features & Logic
### A. Roadmap System
- Stages contain Lessons. Lessons can be "Video" or "Practice".
- Practice lessons are linked to Problem IDs from the Problem Bank.

### B. Problem Bank & Codeforces Import
- AI-powered import from Codeforces URLs (fetches title, statement, constraints, and examples via logic, uses AI for Arabic translation).

### C. Smart Judge (AI-Powered)
- Analyzes C++ code logic against constraints and examples.
- Returns status: ACCEPTED, WRONG_ANSWER, TLE, etc.

### D. Cost Control
- 60-second cooldown on AI hints/judging.

### E. Admin Dashboard
- Maintenance mode toggle.
- Role management.
- Super Admin email: `artiateech@gmail.com`.

## 5. UI Requirements
- Default Light Mode.
- Dark Mode support (Charcoal/Blue).
- Clean, RTL layout.
- Branding: "Artiatech Studio". Location (Sabha, Libya) is known but should not be prominently featured in the UI unless requested.
