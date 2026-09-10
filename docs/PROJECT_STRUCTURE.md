# ShikshaSetu - Project Structure

## Overview
Full-stack skill intelligence platform connecting academia and industry through evidence-based skill mapping.

## Directory Structure

```
shikshasetu/
├── client/                    # React frontend
│   ├── components/           
│   │   ├── ui/              # shadcn/ui components (buttons, cards, etc)
│   │   └── ProtectedRoute.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx  # Firebase auth state management
│   ├── hooks/
│   │   ├── useData.ts       # React Query hooks for all data fetching
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib/
│   │   ├── firebase.ts      # Firebase config & initialization
│   │   └── utils.ts         # cn() helper & utilities
│   ├── pages/               # Route components
│   │   ├── Index.tsx        # Landing + student dashboard (/)
│   │   ├── Login.tsx        # Login page (/login)
│   │   ├── Signup.tsx       # Registration (/signup)
│   │   ├── AssessmentFlow.tsx # AI skill assessment (/assessment)
│   │   ├── WorkspaceAdvanced.tsx # Main workspace (/workspace)
│   │   └── NotFound.tsx     # 404
│   ├── services/            # Firebase & business logic
│   │   ├── auth.service.ts  # Authentication & profile setup
│   │   ├── student.service.ts # Student CRUD, skill DNA, gaps
│   │   ├── faculty.service.ts # Faculty profiles & recommendations
│   │   ├── industry.service.ts # Orgs, demand signals, talent discovery
│   │   ├── institution.service.ts # Institution data & simulations
│   │   ├── opportunity.service.ts # Internships, jobs, projects
│   │   ├── application.service.ts # Application lifecycle
│   │   ├── roadmap.service.ts # Roadmap queries
│   │   ├── role.service.ts # Career role definitions
│   │   ├── matching.service.ts # Explainable matching algorithm
│   │   └── ai.service.ts    # AI utility wrappers
│   ├── App.tsx             # React Router setup
│   ├── global.css          # TailwindCSS theme & globals
│   └── vite-env.d.ts
│
├── server/                  # Express API backend
│   ├── routes/
│   │   ├── auth.ts         # POST /api/auth/setup-profile
│   │   ├── assessment.ts   # POST /api/assessment/{generate,evaluate}
│   │   ├── roadmap.ts      # POST /api/roadmap/generate
│   │   └── ai.ts           # POST /api/ai/* (skills, gaps, matching)
│   ├── services/
│   │   └── ai.service.ts   # Gemini/Groq integration
│   ├── index.ts            # Server setup & route registration
│   └── node-build.ts       # Production build script
│
├── shared/                  # Types shared between client & server
│   ├── types/              # TypeScript type definitions
│   │   ├── index.ts        # Type re-exports
│   │   ├── common.ts       # Base entities, enums
│   │   ├── user.ts         # User, UserProfile
│   │   ├── student.ts      # Student, SkillGap
│   │   ├── faculty.ts      # Faculty, FacultyRecommendation
│   │   ├── organization.ts # Organization (industry)
│   │   ├── institution.ts  # Institution, CurriculumMapping
│   │   ├── skill.ts        # Skill, SkillProfile, SkillEvidence
│   │   ├── role.ts         # CareerRole
│   │   ├── opportunity.ts  # Opportunity (jobs/internships)
│   │   ├── application.ts  # Application lifecycle
│   │   ├── roadmap.ts      # Roadmap, RoadmapNode
│   │   ├── matching.ts     # MatchResult, MatchComponents
│   │   ├── industry-signal.ts # IndustrySignal, TalentCandidate
│   │   └── ...
│   └── api.ts              # (optional) Shared API interfaces
│
├── public/                 # Static assets
│   ├── favicon.ico
│   ├── placeholder.svg
│   └── robots.txt
│
├── scripts/
│   └── seed/
│       └── seed.ts         # Firestore seed data script
│
├── docs/                   # Documentation (NEW)
│   ├── PROJECT_STRUCTURE.md # This file
│   ├── FIXES_APPLIED.md    # Implementation status
│   ├── STATUS.md           # Current status & guide
│   └── TEST_ENDPOINTS.md   # API testing guide
│
├── .env                    # Environment variables (not in git)
├── firebase-service-account.json # Firebase admin SDK key
├── firestore.rules         # Firestore security rules
├── storage.rules           # Storage security rules
├── package.json
├── tsconfig.json
├── vite.config.ts          # Client build config
├── vite.config.server.ts   # Server build config
├── tailwind.config.ts
└── AGENTS.md              # Project guidelines for AI agents

```

## Key Concepts

### Pages
- **Index.tsx** - Landing page + student dashboard (switches based on auth)
- **WorkspaceAdvanced.tsx** - Multi-role workspace (student/faculty/industry/institution)
- **AssessmentFlow.tsx** - AI-powered skill assessment with 4 phases

### Services Layer
All Firebase operations go through service files (never direct Firebase calls in components):
- **Query data:** Use hooks from `client/hooks/useData.ts`
- **Mutations:** Import service functions directly

### Data Flow
```
Component → Hook (useData) → Service → Firestore
Component → Service → Server API → AI/Business Logic → Firestore
```

### Authentication
- Firebase Auth (email/password + Google OAuth)
- Custom claims for role-based access
- `AuthContext` provides `firebaseUser`, `userProfile`, `signOut`

### Matching Algorithm
Deterministic, explainable scoring system (not black-box AI):
- 7 weighted components
- Returns match score + reasons + skill breakdown
- Located in `client/services/matching.service.ts`

## Routes

### Public
- `/` - Landing page or student dashboard (if logged in)
- `/login` - Login
- `/signup` - Registration

### Protected (require auth)
- `/workspace` - Main workspace (role-based UI)
- `/assessment` - Skill assessment flow

### API Endpoints
- `POST /api/auth/setup-profile` - Create user profile
- `POST /api/assessment/generate` - AI generates questions
- `POST /api/assessment/evaluate` - AI scores answers
- `POST /api/roadmap/generate` - Generate skill roadmap
- `POST /api/ai/*` - Various AI operations

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- TanStack React Query (data fetching)
- React Router 6 (routing)
- TailwindCSS 3 + shadcn/ui (styling)
- React Flow (roadmap visualization)
- Lucide React (icons)

### Backend
- Express.js + TypeScript
- Firebase Admin SDK
- Gemini AI (primary)
- Groq (fallback)

### Database
- Cloud Firestore (NoSQL)
- Collections: students, faculty, organizations, institutions, roles, opportunities, applications, skills

### Infrastructure
- Firebase Authentication
- Firebase Storage (for documents/evidence)
- Netlify Functions (optional deployment)

## Development

```bash
# Install dependencies
pnpm install

# Start dev server (client + server on :8080)
pnpm dev

# Type check
pnpm typecheck

# Build for production
pnpm build

# Start production server
pnpm start
```

## Environment Variables

Required in `.env`:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

GEMINI_API_KEY=
GROQ_API_KEY=  # optional
```

## Firestore Collections

### Main Collections
- `users` - Basic user profiles
- `students` - Student profiles with subcollections:
  - `skillProfiles/{skillId}` - Skill proficiency data
  - `skillProfiles/{skillId}/evidence` - Verification evidence
  - `roadmaps/{roadmapId}` - Career roadmaps
- `faculty` - Faculty profiles
- `organizations` - Industry organizations
- `institutions` - Educational institutions
- `roles` - Career role definitions with skill requirements
- `opportunities` - Jobs, internships, projects
- `applications` - Application lifecycle tracking
- `skills` - Master skill catalog
- `skillCategories` - Skill groupings
- `industrySignals` - Demand signals from market

## Code Style

- Use TypeScript for type safety
- Functional components with hooks
- Service layer for all data operations
- TanStack Query for caching & loading states
- TailwindCSS utility classes (avoid inline styles)
- Explainable, deterministic algorithms over black-box AI where possible

## Security

- Firestore security rules in `firestore.rules`
- Server endpoints verify Firebase Auth tokens
- Custom claims for role-based access
- Never expose Firebase Admin SDK keys client-side
- All AI calls go through server (keys stay secure)

## Next Steps

See `docs/STATUS.md` for implementation status and next tasks.
