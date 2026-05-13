# Health Tracker

Personal calorie + workout + period tracker. Logs meals via AI (just type "2 chapatis and dal"), tracks workouts/walking with auto-calculated calorie burn, and predicts cycle dates.

## Stack
- **Next.js 16** (App Router, TypeScript, Tailwind 4)
- **Firebase** (Auth + Firestore) — single-user, restricted by email
- **Gemini 2.5 Flash** — natural-language meal & workout parsing (free tier covers personal use)
- **Recharts** — daily/weekly/monthly/yearly charts

## One-time setup (~15 min)

### 1. Create a Firebase project (use a personal Google account, NOT work)

1. Go to https://console.firebase.google.com → **Create project**
2. Name: `health-tracker` (or anything). Disable Google Analytics — not needed.
3. In the project: **Build → Authentication → Get started → Sign-in method → Google → Enable**.
4. **Build → Firestore Database → Create database → Production mode → choose region**.
5. In Firestore, go to **Rules** tab → paste contents of `firestore.rules` → **Publish**.
6. Get web config: **Project Settings (gear) → General → Your apps → Web (`</>`) → Register app**.
7. Copy the config values into `.env.local` (see step 3).

### 2. Get a Gemini API key

1. Go to https://aistudio.google.com/apikey → **Create API key**.
2. Copy it — you'll paste it into `.env.local`.
3. Free tier: 1M tokens/day. You'll use ~50K/day max — well under the limit.

### 3. Create `.env.local`

```bash
cp .env.local.example .env.local
```

Fill in:
- All 6 `NEXT_PUBLIC_FIREBASE_*` values from the Firebase config
- `NEXT_PUBLIC_ALLOWED_EMAIL` — your personal Gmail (the only email allowed to sign in)
- `GEMINI_API_KEY` — from Google AI Studio

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000 → sign in with your personal Google account → fill in Settings first → start logging.

## Deploy to Vercel

```bash
# Push to a private GitHub repo, then:
# 1. Go to vercel.com → New Project → import the repo
# 2. Set all env vars from .env.local in Vercel project settings
# 3. Deploy
```

For phone access: open the deployed URL on your phone → Safari/Chrome → "Add to Home Screen" → it works like an app.

## File layout

```
src/
├── app/
│   ├── page.tsx              # Today: quick log + day summary
│   ├── charts/page.tsx       # D/W/M/Y calorie charts
│   ├── cycle/page.tsx        # Period tracker + predictions
│   ├── settings/page.tsx     # Profile, goals, BMR calculator
│   ├── layout.tsx            # Auth gate + nav
│   └── api/
│       ├── parse-meal/       # Gemini Flash → structured meal data
│       └── parse-workout/    # Gemini Flash → structured workout data
├── components/
│   ├── AuthGate.tsx          # Google sign-in, email allowlist
│   ├── Nav.tsx               # Bottom nav (mobile) / top nav (desktop)
│   ├── QuickLog.tsx          # The text-input log box
│   └── DaySummary.tsx        # Today's totals + meal/workout list
└── lib/
    ├── firebase.ts           # Firebase init
    ├── store.ts              # Firestore hooks (useMeals, useWorkouts, etc.)
    ├── types.ts              # Domain types
    ├── met.ts                # MET → kcal burn calculator
    ├── cycle.ts              # Period prediction logic
    └── dates.ts              # Date helpers
```

## Data privacy

- All data lives in **your** Firebase project under your personal Google account
- Firestore rules enforce per-user isolation (no other user can read your data)
- Meal text is sent to Google's Gemini API for parsing but not used for training (when using a paid project; free tier may be used for training — see [Google AI Studio terms](https://ai.google.dev/gemini-api/terms))

## Cost estimate (personal use)

- Firebase free tier: covers personal use easily (well under 50K reads/day)
- Vercel hobby: free for personal projects
- Gemini API: **free** at this volume (1M tokens/day free tier; you'll use ~50K)
