# SlyD 🛡️ — Real-Time Hookup & Social PWA

> **Zero-Friction Connections · 100% Verified Men · Biometric SlyD Shield™ Anti-Catfishing**

SlyD is an ultra-fast, high-trust, real-time location-based social and hookup progressive web application (PWA) designed for gay, bisexual, and queer men. 

---

## 🌟 Architecture & Features Overview

### 1. Mandatory SlyD Shield 🛡️
* **100% Real Guys, Zero Bots:** Mandatory biometric liveness check during onboarding. Unverified users cannot access the live feed or grid.
* **Randomized Liveness Pose Check:** Real-time pose/liveness challenge (head tilt, smile, blink, hand gesture).
* **Private Storage:** Verification selfies are strictly encrypted at rest for validation and device fingerprinting—never published publicly.
* **Public Badge:** Verified accounts earn the verified `SlyD Shield Verified` badge across grid, map, and chat.

### 2. Login Gatekeeper & Intent Selection (SRS Phase 2)
Every session prompts a mandatory check-in modal:
* **Option A: "Looking for NOW"**
  * Activates background GPS heartbeats
  * Sets `sessionState.intent = "NOW"`, makes profile visible to active guys nearby
  * Unlocks full real-time Map and Grid
* **Option B: "Looking for LATER"**
  * Sets `sessionState.intent = "LATER"`
  * Locks out Map & Grid access to preserve real-time accuracy
  * Prompts: *"You selected 'Later'. The live grid is disabled to protect real-time accuracy. Log out and back in when you're ready to meet."*

### 3. Floating Status Bar Toggles: [ Host ] & [ Travel ] (SRS Phase 3)
* Floating glassmorphic status widget at the top of Map and Grid views
* **[ 🏠 Host ]**: Signals available place to host immediately
* **[ 🚗 Travel ]**: Signals mobile and ready to travel
* **Both Supported**: Active dual-glow badge highlights on your avatar

### 4. Mutual Interest Gatekeeping & SlyD+ Subscription
* **Free Tier:** Access to Now grid, distance filters, Host/Travel toggles, and mutual interest messaging.
* **Mutual Match:** Users express interest ("⚡ Express Interest"). When both reciprocate, direct chat is unlocked!
* **SlyD+ Subscription:** Unlocks direct instant messaging to any profile without needing mutual interest, plus Stealth Mode, unsend messages, and advanced filters.

### 5. On-Demand Secure Location Sharing (In-Chat)
* Exact GPS coordinates are **never** broadcast on the public grid (only approximate radii like "0.3 miles away").
* Inside chat, tap the **Share Location** pin button.
* Explicit confirmation modal: *"Share your live/exact meetup location with [User]?"*
* Sends interactive map coordinate card with a 1-tap **Open in Google Maps / Directions** navigation button.

---

## 🚀 Deployment Guide

### Frontend Deployment: Vercel

1. **Connect Repository to Vercel:**
   * Import `danguero21-ops/slyd-pwa` from GitHub into your Vercel Dashboard.
   * Framework Preset: **Vite**
   * Build Command: `npm run build`
   * Output Directory: `dist`
2. **Environment Variables in Vercel:**
   * `VITE_FIREBASE_API_KEY`
   * `VITE_FIREBASE_AUTH_DOMAIN`
   * `VITE_FIREBASE_PROJECT_ID`
   * `VITE_FIREBASE_APP_ID`
   * `VITE_FIREBASE_STORAGE_BUCKET` (optional)
   * `VITE_GOOGLE_MAPS_API_KEY` (optional browser key for Google Maps, OpenStreetMap fallback built-in)
   * `GEMINI_API_KEY` (server-side environment variable for `/api` AI verification)

### Backend Deployment: Firebase

1. **Firestore Database:**
   * Deploy `firestore.rules` to your Firebase project:
     ```bash
     firebase deploy --only firestore:rules
     ```
   * The rules ensure verified accounts cannot be tampered with by clients, protect private biometric fields, and enforce chat participant access.
2. **Authentication:**
   * In Firebase Console, enable **Google**, **Phone Authentication**, and **Email/Password**.

---

## 💻 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build for production (PWA)
npm run build
```

---

## 📱 Progressive Web App (PWA)

SlyD is a production-ready Progressive Web App:
* Web App Manifest: Standalone full-screen mobile app display with dark OLED aesthetic.
* Service Worker (`workbox`): Offline shell caching and instant asset loading.
* Install Prompt: Works out-of-the-box on iOS Safari ("Add to Home Screen") and Android Chrome / Desktop ("Install App").
