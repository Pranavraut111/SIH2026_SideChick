# ShikshaSetu - Skill Intelligence Platform

> Bridging academia and industry through evidence-based skill mapping, personalized roadmaps, and explainable opportunity matching.

## 🎯 What is ShikshaSetu?

ShikshaSetu is a production-ready full-stack platform that connects students, institutions, faculty, and industry through intelligent skill mapping and outcome tracking. Instead of black-box recommendations, we provide:

- **Skill DNA** - Evidence-backed skill profiles with provenance
- **Smart Assessment** - AI-generated questions tailored to career goals
- **Career Roadmaps** - Personalized pathways from gaps to goals
- **Explainable Matching** - Transparent opportunity matching with reasons
- **Institution Intelligence** - What-if simulations for curriculum planning
- **Industry Demand** - Real-time skill demand signals

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Add your Firebase and AI API keys

# Start development server
pnpm dev

# Visit http://localhost:8080
```

## 📁 Project Structure

```
shikshasetu/
├── client/           # React frontend (Vite + TailwindCSS)
│   ├── pages/       # Route components
│   ├── services/    # Firebase & business logic
│   ├── hooks/       # React Query data hooks
│   └── components/  # UI components (shadcn/ui)
├── server/          # Express API backend
│   ├── routes/      # API endpoints
│   └── services/    # AI integration (Gemini/Groq)
├── shared/          # TypeScript types (client + server)
├── docs/            # Documentation
└── scripts/         # Seed data & utilities
```

See [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) for detailed architecture.

## 🎨 Features

### For Students
- ✅ AI-powered skill assessment
- ✅ Evidence-backed Skill DNA
- ✅ Personalized career roadmaps
- ✅ Explainable opportunity matching
- ✅ Application tracking

### For Institutions
- ✅ Student readiness analytics
- ✅ Curriculum gap analysis
- ✅ What-if intervention simulator
- ✅ Industry demand insights

### For Industry
- ✅ Talent discovery by evidence
- ✅ Structured opportunity posting
- ✅ Application pipeline management
- ✅ Skill-based candidate filtering

### For Faculty
- ✅ Industry exposure tracking
- ✅ Mentorship opportunities
- ✅ Professional development programs
- ✅ Research collaboration

## 🛠️ Tech Stack

**Frontend:** React 18, TypeScript, Vite, TailwindCSS, React Query, React Router, React Flow
**Backend:** Express, TypeScript, Firebase Admin SDK
**AI:** Google Gemini (primary), Groq (fallback)
**Database:** Cloud Firestore
**Auth:** Firebase Authentication
**Deployment:** Netlify / Vercel ready

## 📚 Documentation

- [Project Structure](docs/PROJECT_STRUCTURE.md) - Architecture overview
- [Implementation Status](docs/STATUS.md) - What's working & what's next
- [API Testing Guide](docs/TEST_ENDPOINTS.md) - Test all endpoints
- [Agent Guidelines](AGENTS.md) - Development guidelines

## 🔑 Environment Setup

Create `.env` in project root:

```env
# Firebase Client Config
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender
VITE_FIREBASE_APP_ID=your_app_id

# AI API Keys (server-side only)
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key  # optional fallback
```

## 🧪 Testing

```bash
# Type checking
pnpm typecheck

# Run the assessment flow:
1. Sign up at /signup
2. Go to /assessment
3. Select a career role
4. Answer AI-generated questions
5. View Skill DNA results
6. Generate roadmap

# Check Firestore Console to verify data writes
```

See [docs/TEST_ENDPOINTS.md](docs/TEST_ENDPOINTS.md) for API testing.

## 🏗️ Development

```bash
# Development (hot reload)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Seed Firestore with sample data
pnpm seed
```

## 📡 API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ping` | Health check |
| `POST` | `/api/auth/setup-profile` | Create user profile |
| `POST` | `/api/assessment/generate` | Generate questions |
| `POST` | `/api/assessment/evaluate` | Score & create Skill DNA |
| `POST` | `/api/roadmap/generate` | Generate career roadmap |
| `POST` | `/api/ai/extract-skills` | Extract skills from text |
| `POST` | `/api/ai/analyze-gaps` | Analyze skill gaps |
| `POST` | `/api/ai/explain-match` | Explain match results |

## 🎓 Product Flow

```
ONBOARDING → ASSESSMENT → SKILL DNA → GAPS → ROADMAP → OPPORTUNITIES → MATCHING → APPLICATION → OUTCOMES → FEEDBACK LOOP
```

1. **Assessment** - AI generates role-specific questions
2. **Skill DNA** - Evidence-backed proficiency scores
3. **Gap Analysis** - Compare current vs required skills
4. **Roadmap** - Personalized learning path
5. **Matching** - Explainable opportunity scoring
6. **Applications** - Track entire lifecycle
7. **Outcomes** - Measure and improve

## 🔐 Security

- Firebase Auth with role-based access control
- Firestore security rules enforced
- API keys kept server-side only
- Custom claims for role verification
- Input validation on all endpoints

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

This is a Smart India Hackathon 2026 project. For contributions:
1. Read [AGENTS.md](AGENTS.md) for guidelines
2. Check [docs/STATUS.md](docs/STATUS.md) for current tasks
3. Follow existing code patterns
4. Test end-to-end before submitting

## 📞 Support

For questions or issues, refer to the documentation in `/docs` or check Firestore Console for data verification.

---

**Built with ❤️ for Smart India Hackathon 2026**
