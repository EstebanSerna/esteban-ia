# CLAUDE.md - Esteban Serna | IA & Automatizaciones Empresariales

## Project Overview
**Esteban IA** (`esteban-ia`) is a high-converting web platform and Progressive Web App (PWA) designed for **Esteban Serna** — AI & Enterprise Automation Specialist. The platform serves as an interactive sales funnel, service showcase, ROI savings calculator, interactive AI simulator, diagnostic booking engine, and embedded Mercado Pago checkout (one-time implementation fee + recurring monthly subscription, charged with a single card entry).

**Backend**: the live backend is a separate Node.js/Express project — **`esteban-ia-backend`** (repo `EstebanSerna/esteban-ia-backend`, deployed on Railway, auto-deploys on push to `main`). It replaced the original Google Apps Script backend (`google-apps-script.js`, still in this repo and still deployed, kept only as a documented fallback — the live site does not call it). If you're working on backend logic (chat proxy, bookings/Calendar, Mercado Pago checkout, notifications), edit the Railway project, not `google-apps-script.js`, unless explicitly asked to update the fallback too.

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
- **Backend / Integrations** (live): `esteban-ia-backend` on Railway (Node.js/Express) — a single
  `POST /` endpoint that handles Calendar bookings, the Claude chat proxy, the Mercado Pago
  checkout (one-time payment + subscription), and the Mercado Pago Webhook. Google Calendar via a
  service account (not the Apps Script owner's own account); email via Resend
  (`info@esteban-serna.com`); WhatsApp welcome message via the Meta Cloud API, reusing the same
  WhatsApp Business number as the separate `whatsapp-assistant` Railway project (currently
  mis-configured — see `src/services/whatsapp.js` in that repo).
- **Backend / Integrations** (fallback, unused by the live site): `google-apps-script.js` in this
  repo — same logic, kept deployed in case Railway goes down.

---

## 📁 Directory Structure & File Map

```
esteban-ia/
├── index.html              # Main HTML structure (single public landing page / sales funnel)
├── css/
│   └── styles.css          # Design system, CSS variables, glassmorphism, responsive grid
├── js/
│   └── app.js              # Quantum canvas, navigation, ROI calculator, AI simulator, booking form logic
├── google-apps-script.js   # FALLBACK backend (unused by the live site, see Backend section above)
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
- **Response chain** (`fetchRealAIResponse()`): (1) Claude via the Apps Script chat proxy
  (`action: "chat"` on the same webhook URL as bookings — the Anthropic API key lives server-side
  in Script Properties, never in the browser); (2) silent fallback to the free Pollinations.ai
  endpoint if the proxy isn't configured or fails; (3) local keyword-based rules engine as the
  final fallback (see `addUserAndReply()`'s catch block). There is intentionally no UI for visitors
  to paste their own API key — that pattern was removed as insecure/unreliable.

### 4. Diagnostic Booking Wizard (`#reservar`, `app.js`)
- Multi-step interactive flow:
  1. Date Selection (HTML5 date picker formatted in Spanish).
  2. Time Slot Selection (Morning / Afternoon hours).
  3. Service Package Selection (Diagnóstico Gratuito, Agente Básico, Agente Experto, Ecosistema Completo).
  4. Client Info Form (Name, Email, WhatsApp, Social handle, Objective).
- **Submission Flow**: Dispatches the JSON payload straight to the Google Apps Script Web App
  (`executeDirectBooking()` in `app.js`), which creates the Calendar event server-side.

### 5. Backend (`esteban-ia-backend` on Railway) & Mercado Pago Checkout
- **Single endpoint (`POST /`)**: routes on `data.action` (`"chat"`, `"mp_checkout"`,
  `"mp_test_subscription"` — a no-charge diagnostic tool) or on `data.type === "payment"` (a
  Mercado Pago Webhook call) — anything else falls through to the booking flow, mirroring the old
  Apps Script `doPost(e)` dispatch so the frontend didn't need to change shape.
- **Body parsing**: the frontend deliberately sends `Content-Type: text/plain` (avoids a CORS
  preflight, inherited from the Apps Script era) — `express.json({ type: () => true })` parses it
  as JSON regardless of the declared content type. Don't "fix" this back to the express default.
- **Checkout (`src/services/mercadopago.js`)**: uses the **official `mercadopago` Node SDK**
  (`MercadoPagoConfig`/`Payment`/`PreApproval`) instead of hand-built HTTP calls. Charges the
  one-time implementation fee, then — if approved — activates the monthly subscription with a
  SECOND card token from the same card entry (a Mercado Pago card token is single-use). The
  subscription's `reason` field must stay ≤ 60 characters (`buildSubscriptionReason()`) — Mercado
  Pago silently rejects longer ones with `"reason has more than 60 characters"`, which was the
  root cause of a long debugging session; don't remove that truncation.
- **Checkout data survives without a database**: the second token and the rest of the checkout
  data (plan, WhatsApp, etc.) are stored in the payment's own `metadata` field at creation time.
  If the payment resolves as `"pending"`/`"in_process"`, the Mercado Pago Webhook later re-fetches
  that same payment by id and reads `metadata` to finish activating the subscription — no separate
  persistence layer.
- **Webhook race condition**: Mercado Pago can call the Webhook almost simultaneously with the
  synchronous checkout response. `processedWebhookPaymentIds` (in-memory `Set` in `server.js`) is
  marked immediately once a payment resolves instantly (not left pending), so the Webhook doesn't
  also try to activate the same subscription in parallel with the same (single-use) token.
- **Google Calendar**: via a **service account**, not the developer's own Google account — see
  `src/services/calendar.js` and that repo's README for setup (share the target Calendar with the
  service account's `client_email`, "Make changes to events" permission).
- **Notifications (`src/services/notifications.js`)**: on a completed sale, sends (a) an internal
  email to `ESTEBAN_EMAIL` via Resend, (b) an HTML welcome email to the customer (same sender,
  `RESEND_FROM`), and (c) attempts a WhatsApp welcome message via the Meta Cloud API — the latter
  needs a Meta-approved message template for a cold outbound message; a free-form text attempt is
  used for now and fails silently (logged, non-blocking) until that's set up.
- **Client webhook config**: `DEFAULT_WEBHOOK_URL` in `app.js` is the Railway service's public URL
  — not a secret, ships as a hardcoded default, same pattern as before. `localStorage` keys
  `google-webhook-url` / `apps-script-url` can still override it for testing against a different
  backend.
- **Payment amounts**: `planDetailsMap` in `app.js` holds `oneTimeAmount`/`monthlyAmount` per plan
  (COP, no decimals) — update these directly in code for real price changes. There is intentionally
  no "pay separately" fallback link — the embedded checkout is the only way to pay, so implementation
  + subscription are always bought together.

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
2. **Two separate repos**: this repo (`esteban-ia`) is the static frontend, deployed via GitHub
   Actions/SFTP. Backend logic lives in the sibling folder/repo `esteban-ia-backend`
   (`EstebanSerna/esteban-ia-backend` on GitHub, deployed on Railway) — edit that repo for chat
   proxy, bookings, or checkout changes, not `google-apps-script.js` here (that one's the unused
   fallback — see Backend section above).
3. **CORS Safety**: `google-apps-script.js`'s `doOptions(e)`/CORS headers stay untouched if you
   ever do edit the fallback. In `esteban-ia-backend`, don't remove the `type: () => true` option
   on `express.json()` — the frontend's `text/plain` trick depends on it.
4. **State Management**: There is no admin/login area anymore — the site is a single public page.
   `localStorage` is only used to optionally override `DEFAULT_WEBHOOK_URL` (`google-webhook-url` /
   `apps-script-url` keys). Don't reintroduce a credentials/config modal for things that can just be
   hardcoded defaults (webhook URL, payment amounts) — see the git history around "quitemos el
   Acceso" for why that was removed.
5. **Spanish Language**: UI text, date formatting, and system messages are in Spanish (`es`).
