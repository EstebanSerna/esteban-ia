# CLAUDE.md - Esteban Serna | IA & Automatizaciones Empresariales

## Project Overview
**Esteban IA** (`esteban-ia`) is a high-converting web platform and Progressive Web App (PWA) designed for **Esteban Serna** — AI & Enterprise Automation Specialist. The platform serves as an interactive sales funnel, service showcase, ROI savings calculator, interactive AI simulator, diagnostic booking engine, and private admin portal with Google Calendar integration.

---

## 🚀 Quick Start & Commands

### Development Server
To launch the project locally:
- **Python (Recommended)**: `python -m http.server 8080`
- **NPM / Node**: `npm run dev` or `npx serve . -p 8080`
- **URL**: `http://localhost:8080`

### Project Stack
- **Frontend**: Pure HTML5, Vanilla CSS3 (Custom Properties & Glassmorphism), ES6+ JavaScript.
- **Visual Effects**: Canvas 2D Quantum Particle System (`#quantum-canvas`).
- **PWA**: Web App Manifest (`manifest.json`) + Service Worker (`sw.js`).
- **Backend / Integrations**: Google Apps Script (`google-apps-script.js`) for Google Calendar auto-booking, Google Identity Services (GIS API), LocalStorage fallback.

---

## 📁 Directory Structure & File Map

```
esteban-ia/
├── index.html              # Main HTML structure (Landing Page & Panel Esteban IA)
├── css/
│   └── styles.css          # Design system, CSS variables, glassmorphism, responsive grid
├── js/
│   ├── app.js              # Quantum canvas, navigation, ROI calculator, AI simulator, booking form logic
│   └── calendar.js         # Google Calendar GIS authentication, Apps Script webhook integration, event rendering
├── google-apps-script.js   # Google Apps Script (GAS) Web App backend for Calendar event creation & CORS handling
├── manifest.json           # Progressive Web App (PWA) manifest
├── sw.js                   # Service Worker for offline caching & PWA support
├── images/                 # Hero background, photos, and PWA app icons (192x192, 512x512)
├── package.json            # NPM scripts & project metadata
├── .gitignore              # Git ignore configuration
├── README.md               # Human-friendly documentation
└── CLAUDE.md               # Claude Code instructions & architecture guide (this file)
```

---

## 🎯 Core Features & Logic Architecture

### 1. Quantum Canvas Background (`app.js`)
- Animated particle system drawn on HTML5 `<canvas id="quantum-canvas">`.
- Resizes dynamically on window resize and renders subtle gold/dark floating particles.

### 2. ROI Savings Calculator (`#calculadora`, `app.js`)
- Calculates monthly hours saved and annual monetary savings in USD ($) and COP ($).
- Formula:
  - `Hours Saved / Month` = `(Weekly Hours * 4.33) * 0.70` (70% automation rate)
  - `Annual Savings USD` = `Monthly Hours Saved * Hourly Rate ($ USD) * 12`
  - `Annual Savings COP` = `Annual Savings USD * 4000`

### 3. Interactive AI Simulator (`#simulador`, `app.js`)
- Interactive chat demo simulating a 24/7 autonomous sales & service agent.
- Features pre-set user prompt buttons and custom message input with dynamic typing indicators.

### 4. Diagnostic Booking Wizard (`#reservar`, `app.js`)
- Multi-step interactive flow:
  1. Date Selection (HTML5 date picker formatted in Spanish).
  2. Time Slot Selection (Morning / Afternoon hours).
  3. Service Package Selection (Diagnóstico Gratuito, Agente Básico, Agente Experto, Ecosistema Completo).
  4. Client Info Form (Name, Email, WhatsApp, Social handle, Objective).
- **Submission Flow**:
  - Saves locally in `localStorage` under `local-reservations`.
  - Dispatches JSON payload to Google Apps Script Web App (if configured).

### 5. Google Calendar & Webhook Integration (`google-apps-script.js` & `calendar.js`)
- **Backend Handler (`google-apps-script.js`)**:
  - Implements `doPost(e)` with CORS headers (`Access-Control-Allow-Origin: *`).
  - Parses dates formatted in Spanish (e.g., `"18 de Julio de 2026"`, `"10:30 AM"`).
  - Automatically creates a Google Calendar event with duration dynamically set by service type (30, 45, or 60 min).
  - Sends email invitation to client (`guests: data.email`).
- **Client Webhook Config**:
  - Saved in `localStorage` key `apps-script-url` or `google-webhook-url`.

### 6. Panel Privado Esteban IA & Demo Mode (`calendar.js`)
- Accessible via button `#btn-ia-portal`.
- Toggles between Public Landing Page (`#public-view`) and Admin Dashboard (`#ia-portal-view`).
- Includes dynamic mock events for demo mode when Google OAuth keys are not present.

---

## 🎨 Design System & Styling Conventions (`css/styles.css`)

### Color Palette (CSS Custom Properties)
- Primary Background: `--bg-primary: #040405`
- Dark Card Background: `--bg-card: rgba(16, 16, 20, 0.75)`
- Gold Accent Main: `--gold-primary: #d4af37`
- Gold Gradient: `linear-gradient(135deg, #f3e5ab 0%, #d4af37 50%, #aa7c11 100%)`
- Border Accent: `--gold-border: rgba(212, 175, 55, 0.25)`
- Text Primary: `--text-primary: #f0f0f5`
- Text Secondary: `--text-secondary: #9090a0`

### Styling Rules
- **Dark Theme First**: Modern glassmorphism with `backdrop-filter: blur(12px)`.
- **Buttons**: Gold primary CTA `.btn-primary` and outlined secondary `.btn-secondary`.
- **Responsive**: Mobile menu triggered by `#mobile-menu-trigger` for screen widths `< 900px`.

---

## 💡 Guidelines for Claude Code Modifications

1. **Vanilla Architecture**: Keep code native HTML5/CSS3/Vanilla JS. Do not introduce large build tools (Webpack, Vite, React) unless explicitly requested.
2. **CORS Safety**: When modifying `google-apps-script.js`, ensure `doOptions(e)` and `Access-Control-Allow-Origin` headers remain untouched for Web App deployment.
3. **State Management**: Use `localStorage` cleanly with key prefixes (`local-reservations`, `apps-script-url`, `google-client-id`).
4. **Spanish Language**: UI text, date formatting, and system messages are in Spanish (`es`).
