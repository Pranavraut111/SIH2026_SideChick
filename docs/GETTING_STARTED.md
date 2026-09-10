# Getting Started with ShikshaSetu

## Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Firebase project
- Gemini API key (get from Google AI Studio)

## Setup Steps

### 1. Clone & Install

```bash
git clone <your-repo>
cd shikshasetu
pnpm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (or use existing)
3. Enable Authentication:
   - Go to Authentication → Sign-in method
   - Enable Email/Password
   - Enable Google (optional)
4. Create Firestore Database:
   - Go to Firestore Database
   - Create database (start in test mode)
5. Get your config:
   - Project Settings → General
   - Scroll to "Your apps" → Web app
   - Copy configuration values

### 3. Get AI API Keys

**Gemini (Primary - Required):**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Copy the key

**Groq (Fallback - Optional):**
1. Go to [Groq Console](https://console.groq.com)
2. Create API key
3. Copy the key

### 4. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env and fill in your values
nano .env
```

Fill in:
```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=yourproject.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=yourproject
VITE_FIREBASE_STORAGE_BUCKET=yourproject.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456...
VITE_FIREBASE_APP_ID=1:123456...

GEMINI_API_KEY=AIza...
GROQ_API_KEY=gsk_... # optional
```

### 5. Setup Firebase Admin SDK

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save as `firebase-service-account.json` in project root
4. **IMPORTANT:** This file is in `.gitignore` - never commit it!

### 6. Deploy Firestore Rules

```bash
# Install Firebase CLI if you haven't
npm install -g firebase-tools

# Login
firebase login

# Initialize project
firebase init firestore
# Select your project
# Use existing firestore.rules and don't overwrite

# Deploy rules
firebase deploy --only firestore:rules
```

### 7. Seed Initial Data (Optional)

```bash
# Run seed script to populate sample roles and skills
pnpm seed
```

This creates:
- Career roles (AI/ML Engineer, Data Scientist, etc.)
- Skills catalog (Python, ML, Docker, etc.)
- Sample opportunities

### 8. Start Development Server

```bash
pnpm dev
```

Visit: http://localhost:8080

## First User Journey

### 1. Sign Up
- Go to http://localhost:8080/signup
- Create account with email/password
- Select **Student** role
- Enter basic profile info

### 2. Take Assessment
- Navigate to `/assessment`
- Select career target: "AI / ML Engineer"
- AI generates 8-10 questions
- Answer each question (be honest!)
- Submit assessment

### 3. View Results
- See your Skill DNA breakdown
- Check readiness score (0-100)
- Review skill gaps

### 4. Generate Roadmap
```bash
# Get your student ID from Firestore Console
# Then call:
curl -X POST http://localhost:8080/api/roadmap/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{"studentId": "your-student-id"}'
```

Or add this to the UI (see `docs/STATUS.md` for code)

### 5. View Dashboard
- Go to `/workspace`
- See your skill readiness
- View personalized roadmap
- Explore opportunities

## Troubleshooting

### "Firebase: Error (auth/invalid-api-key)"
- Check `VITE_FIREBASE_API_KEY` in `.env`
- Make sure all VITE_ variables are set
- Restart dev server after changing `.env`

### "AI service unavailable"
- Check `GEMINI_API_KEY` in `.env`
- Verify API key is valid at Google AI Studio
- Try adding `GROQ_API_KEY` as fallback

### "Permission denied" in Firestore
- Deploy firestore rules: `firebase deploy --only firestore:rules`
- Check user is authenticated
- Verify custom claims are set (check auth.service.ts)

### Assessment questions not generating
- Check server logs for AI errors
- Verify Gemini API key
- Check if role exists in Firestore `roles` collection
- Run seed script if roles are missing

### Roadmap not appearing
- Complete assessment first
- Set career target in student profile
- Call `/api/roadmap/generate` endpoint
- Check Firestore: `students/{id}/roadmaps/active`

## Development Workflow

```bash
# Start dev server with hot reload
pnpm dev

# Type check (run before committing)
pnpm typecheck

# Build for production
pnpm build

# Test production build locally
pnpm start
```

## Next Steps

1. **Explore the code:**
   - `client/pages/AssessmentFlow.tsx` - See how assessment works
   - `server/routes/assessment.ts` - API implementation
   - `client/services/matching.service.ts` - Matching algorithm

2. **Read the docs:**
   - `docs/PROJECT_STRUCTURE.md` - Understand architecture
   - `docs/STATUS.md` - See what's implemented
   - `docs/TEST_ENDPOINTS.md` - Test APIs manually

3. **Customize:**
   - Add more career roles in seed data
   - Customize skill categories
   - Adjust matching algorithm weights
   - Add your institution's branding

4. **Deploy:**
   - See Firebase Hosting or Netlify docs
   - Set environment variables in hosting platform
   - Deploy Firestore rules and indexes

## Common Commands

```bash
# Development
pnpm dev                 # Start dev server
pnpm typecheck          # Check TypeScript
pnpm build              # Build for production
pnpm start              # Run production build

# Firebase
firebase login          # Login to Firebase
firebase deploy         # Deploy rules
firebase emulators:start # Run local emulators

# Utilities
pnpm seed              # Seed Firestore data
```

## Getting Help

- Check `docs/` folder for detailed guides
- Read code comments - heavily documented
- Check Firestore Console to verify data
- Review Firebase Auth console for users
- Check browser console for client errors
- Check terminal for server errors

## Project is Ready When...

✅ Dev server starts without errors
✅ Can sign up new user
✅ Assessment generates questions
✅ Assessment creates Skill DNA in Firestore
✅ Roadmap generates successfully
✅ Dashboard shows real data (after connecting UI)

Happy building! 🚀
