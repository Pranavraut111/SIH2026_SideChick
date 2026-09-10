# ShikshaSetu — Implementation Gap Audit

**Date:** 2026-09-10
**Branch:** `main` @ `830dad4`
**Scope:** Full repository audit prior to MVP build-out (SIH 2026 PS 26044).

Toolchain baseline established during this audit:

| Check | Result |
| --- | --- |
| `tsc --noEmit` | ✅ 0 errors |
| `vitest --run` | ✅ 5 passed / 5 — **all in `client/lib/utils.spec.ts` (the `cn()` helper)** |
| `vite build` | ✅ builds, 1.18 MB single chunk |

> Two environment blockers were found and fixed to get these running: the pnpm install
> was incomplete (`@rolldown/binding-darwin-arm64` shipped without its `.node` binary,
> breaking vitest and vite), and the TypeScript 7 native binary carried a
> `com.apple.quarantine` xattr that blocked execution. Both are now repaired locally.

---

## A. Already genuinely functional

These are real, end-to-end, backed by Firestore and correctly authorized. **Do not rewrite.**

| Area | Evidence |
| --- | --- |
| **Email/password + Google auth** | `client/services/auth.service.ts`, `client/contexts/AuthContext.tsx` — real Firebase Auth. |
| **Server profile bootstrap** | `server/routes/auth.ts` — verifies the ID token, enforces `decodedToken.uid === uid`, sets custom claims, creates `users/{uid}` + role profile doc, rejects duplicates with 409. Genuinely correct. |
| **AI assessment generation** | `server/routes/assessment.ts:handleGenerateAssessment` — auth-gated, validates `roleId` against the real `roles` collection, derives skills from role requirements (not from the client's `skills[]`). |
| **AI assessment evaluation → Skill DNA** | `handleEvaluateAssessment` — auth-gated, enforces `student.userId === uid`, writes real `skillProfiles` + `evidence` subcollection docs in a batch, updates `readinessScore`/`careerTargetId`. |
| **Deterministic roadmap generation** | `server/routes/roadmap.ts` — auth-gated, ownership-checked, nodes derived purely from role requirements × measured proficiency. No AI involved. Correctly matches the spec's "deterministic" requirement. |
| **Deterministic skill-gap computation** | `computeSkillGaps()` in `client/services/student.service.ts` — transparent severity bands and reasons. |
| **Deterministic 7-component matching** | `client/services/matching.service.ts` — genuinely explainable, weighted, with per-component scores and generated reasons. *(Correct algorithm, wrong tier — see C/E.)* |
| **Assessment UI** | `client/pages/AssessmentFlow.tsx` — real `fetch` with bearer token, real loading/error phases, invalidates React Query caches. No fake success paths. |
| **Service layer + React Query hooks** | `client/services/*`, `client/hooks/useData.ts` — clean UI → hook → service → Firestore separation. No Firebase calls scattered in components. |
| **Domain type system** | `shared/types/*` — 18 modules, well-modelled, `SkillProfile` carries proficiency/confidence/requiredLevel/evidenceCount/source/status as the spec requires. |
| **Seed script** | `scripts/seed/seed.ts` — real interconnected Firestore data (skills, roles, institutions, organizations, opportunities, signals, curriculum mappings, students). |

---

## B. Partially functional

| # | Area | What works | What's missing |
| --- | --- | --- | --- |
| B1 | **Onboarding** | Role selection, account creation, server profile creation. | `Signup.tsx` never collects `institutionId`, `organizationId`, `department`, or `batch` — it calls `signUp(email, password, displayName, role)` with no options. Every profile is therefore created with empty institution/organization. See D1 for the consequences. |
| B2 | **Institution command center** | Reads real Firestore students, curriculum mappings, industry signals; computes baseline readiness from actual data. | Can never see any real student, because no student is ever assigned an `institutionId` (B1). Only seeded students appear. |
| B3 | **Industry workspace** | Real opportunity creation form, real Firestore write, real application pipeline with status transitions. | Gated behind `userProfile.organizationId`, which onboarding never sets — so it permanently renders "Organization assignment required". Unreachable in practice. |
| B4 | **Faculty workspace** | Real profile read, real specialization write-back. | `getFacultyRecommendations()` is hardcoded heuristics with a literal `deadline: '9 days'`; no faculty opportunity application/lifecycle exists. |
| B5 | **Application lifecycle** | Real `applications` docs, real status transitions by recruiters, real student list. | `matchScore` and `matchDetails` are supplied **by the browser** at apply time (see E4). No internship lifecycle, mentor feedback, or completion stage. |
| B6 | **What-if simulator** | Wired to real cohort baseline from Firestore; clearly labelled "Decision support only". | `runSimulation()` is an invented formula (`mentors × 2 + (weeks−4) × 2 + 10`) with no grounding in outcome data; `opportunityMatches` is literally `cohort × 1.17`. Runs client-side. |
| B7 | **Talent discovery** | Real Firestore query on `readinessScore`. | Returns `institutionName: ''` and `skills: ''` — the join was never implemented, so the UI renders blanks. |

---

## C. UI-only / mock / misplaced

| # | Item | Detail |
| --- | --- | --- |
| C1 | **Matching engine tier** | Lives in `client/` and executes in the browser. The spec is explicit: *"Do not let frontend code determine authoritative match results."* The algorithm is good; its location is wrong. |
| C2 | **What-if simulator tier** | `runSimulation()` in `client/services/institution.service.ts` — client-side, no service boundary. |
| C3 | **Faculty recommendations** | Hardcoded rules + hardcoded deadline string, presented as system output. |
| C4 | **`getFacultyRecommendations` impact strings** | `'+12 exposure'`, `'+8 exposure'` — invented numbers with no model behind them. |
| C5 | **Unused imports signalling unbuilt features** | `institution.service.ts` imports `INDUSTRY_SIGNALS`, `InstitutionSkillGap`, `CurriculumHealth`, `SimulationParams` but never implements skill-gap heatmaps or curriculum health. `industry.service.ts` similarly. |
| C6 | **`docs/STATUS.md`** | Documents `POST /api/roadmap/generate`; the actual route is `/api/roadmaps/generate`. Documentation drift. |

---

## D. Missing completely

| # | Gap | Impact |
| --- | --- | --- |
| **D1** | **🔴 The `/app/*` routes do not exist.** `App.tsx` registers only `/`, `/login`, `/signup`, `/assessment`, `/workspace`. But *every* navigation target in the app is `/app/...`: the landing page CTAs (`Link to="/app"` ×5 in `Index.tsx`), signup/login success (`navigate('/app')`), `ProtectedRoute`'s role-denied redirect, all six sidebar items (`navigate(\`/app/student/${id}\`)`), and the post-assessment redirect (`navigate('/app/student/roadmap')`). **All of them land on the NotFound catch-all.** The workspace is reachable only by typing `/workspace` manually, and once there every sidebar click 404s. This single defect makes the entire product unusable. | Total |
| **D2** | **Institution / organization directory.** No way for a user to pick which institution or company they belong to. No `GET /api/directory/*`. Root cause of B1/B2/B3. | Total for 3 of 4 roles |
| D3 | **Server-authoritative matching & application submission.** No `/api/matching/*`, no `POST /api/applications`. | High |
| D4 | **Zod validation.** `zod` is a dependency and is imported **nowhere**. AI output is `JSON.parse`d and written straight to Firestore. | High |
| D5 | **Domain test coverage.** Zero tests for matching, gap computation, readiness, or auth. The only spec file tests a CSS class-name helper. | High |
| D6 | **Internship lifecycle, portfolio, documents, notifications, outcome intelligence, curriculum mirror ingestion, faculty opportunity lifecycle, industry missions.** Types exist (`document.ts`, `notification.ts`, `curriculum.ts`); no services, routes, or UI. | Slices 4–7 |

---

## E. Security concerns

| # | Severity | Issue |
| --- | --- | --- |
| **E1** | 🔴 **Critical** | **`.env` is committed to git.** `.gitignore` contains an explicit `!.env` un-ignore rule, and `git ls-files` confirms `.env` is tracked. It holds `GEMINI_API_KEY`, `GROQ_API_KEY`, and the full Firebase web config. *(`firebase-service-account.json` is correctly ignored and untracked.)* |
| **E2** | 🔴 **Critical** | **`/api/ai/*` has no authentication.** All seven endpoints — including `/api/ai/chat`, which forwards an arbitrary `prompt` **and arbitrary `systemPrompt`** — are open to the internet. Anyone who finds the deployment gets a free, unmetered LLM proxy billed to these keys. |
| **E3** | 🔴 **Critical** | **Custom-claim privilege escalation.** `handleSetupProfile` writes the client-supplied `institutionId`/`organizationId` straight into Firebase Auth custom claims with no existence or membership check. Since `firestore.rules` authorizes on exactly those claims (`belongsToInstitution`, `belongsToOrganization`), any user can claim membership of any institution or company and read/write its data. |
| **E4** | 🟠 **High** | **Client-authored match scores.** `submitApplication()` accepts `matchScore` and `matchDetails` as parameters from the browser, and the Firestore create rule validates neither. A student can submit a 100% match with fabricated component scores; recruiters shortlist on that number. |
| **E5** | 🟠 **High** | **Storage: every user can read every user's private documents.** `storage.rules` has two `allow read` clauses under the same match block; rules OR together, so the second (`if isAuthenticated()`) defeats the first (`if isOwner(userId)`). Resumes, certificates and academic records are readable by any signed-in account. The comment claims Firestore enforces access — Storage rules are evaluated independently. |
| **E6** | 🟠 **High** | **Skill evidence is world-readable.** `students/{id}/skillProfiles/{id}/evidence/{id}` → `allow read: if isAuthenticated()`. Any student can read any other student's evidence records. |
| **E7** | 🟡 **Medium** | **Opportunity attribution is unchecked.** `opportunities` create rule is only `hasRole('industry')` — no check that `request.resource.data.organizationId` matches the caller's claim, or that `createdBy == request.auth.uid`. An industry user can post opportunities in a competitor's name. |
| **E8** | 🟡 **Medium** | **Cross-institution curriculum writes.** `curriculumMappings` and `courses` allow write on `hasRole('institution')` with no `institutionId` scoping — any institution admin can rewrite any other institution's curriculum. |
| **E9** | 🟡 **Medium** | **Student withdrawal can rewrite the record.** The applications update rule checks `request.resource.data.status == 'withdrawn'` but not that other fields are unchanged — a student can alter `matchScore` while withdrawing. |
| **E10** | 🟡 **Medium** | **Unscoped student/skill reads.** `hasRole('industry')` grants read on *every* student profile and skill profile platform-wide; `hasRole('institution')` grants skill-profile reads regardless of which institution. |
| **E11** | 🟡 **Medium** | **Internal error messages returned to clients.** `res.status(500).json({ error: err.message })` across `ai.ts`, and `{ detail: err.message }` in `assessment.ts`, leak provider and stack detail. |
| **E12** | 🟡 **Medium** | **`cors()` with no origin allowlist** — any site can call the API with a user's bearer token pasted in. |
| E13 | 🟢 Low | `requireUser()` throws `'UNAUTHENTICATED'`, but the `catch` in `assessment.ts` always responds **500**, so unauthenticated calls look like server faults. `roadmap.ts` maps it correctly. |

---

## F. Architecture problems

| # | Issue | Why it matters |
| --- | --- | --- |
| **F1** | **Firebase Admin is initialized as a side effect of importing `routes/auth.ts`.** `assessment.ts` and `roadmap.ts` both call `getFirestore()` at module scope and only work because `server/index.ts` happens to import `auth` first. Reorder the imports and the server crashes on boot. | Fragile; blocks adding routes safely |
| **F2** | **AI output mutates domain state unvalidated.** The LLM returns `proficiency`, `confidence` **and `status`**, and all three are persisted verbatim. The spec says: *"Do not allow an LLM to arbitrarily invent permanent skill proficiency. Use deterministic rules for important scoring."* `status` in particular is trivially derivable from `proficiency`. A malformed or adversarial response writes junk into Skill DNA. | Violates a stated core rule |
| **F3** | **Deterministic engines live in `client/`.** `calculateMatch`, `computeSkillGaps`, `runSimulation` cannot be reused by the server without duplication. | Blocks C1/D3 |
| **F4** | **Readiness score is unweighted.** `avgProficiency` over *only the assessed skills*, ignoring `RoleSkillRequirement.weight` and ignoring required skills that were never assessed. A student assessed on one easy skill can score 90% "ready". | Headline metric is wrong |
| **F5** | **`AuthContext` leaks its Firestore listener.** The `onAuthChange` callback returns `() => unsubscribeProfile()`, but `onAuthStateChanged` ignores its callback's return value. Every auth transition adds a listener; after sign-out the stale listener fires permission-denied errors. | Memory leak + console noise |
| **F6** | **`tsconfig` has `strict: false`, `strictNullChecks: false`, `noImplicitAny: false`.** The clean `tsc` result is therefore much weaker than it looks. | Hides real null bugs |
| **F7** | **`shared/types` imports `Timestamp` from `firebase/firestore`** (client SDK) while the server uses `firebase-admin/firestore`. Type-only today, so it compiles — but it is the wrong dependency direction for shared code. | Latent |
| **F8** | **No `serverTimestamp` on `Opportunity.mode` typing mismatch** — `RoleWorkspaces` types `mode` locally as `"remote" \| "hybrid" \| "onsite"` instead of importing `LocationMode`. | Minor drift |
| F9 | **Seed script is not idempotent** — `industrySignals` and `curriculumMappings` use `doc()` auto-IDs, so every re-run duplicates them. Seeded students use fake `userId`s (`demo-student-uid`) with no matching `users` doc, so no one can log in as them. Aanya's `verifiedSkillCount: 18` contradicts her 6 skill profiles (2 verified). | Demo reliability |
| F10 | **1.18 MB single JS chunk**, no code splitting. | Demo load time |

---

## Mock-data classification

Per the spec's required migration categories:

| Data | Classification | Action |
| --- | --- | --- |
| `skills`, `skillCategories`, `roles`, `institutions`, `organizations`, `opportunities` | **2 — Firestore seed** | ✅ Already seeded correctly |
| `industrySignals`, `curriculumMappings` | **2 — Firestore seed** | ✅ Seeded; make idempotent |
| Student `skillProfiles`, `evidence`, `readinessScore` | **3 — computed backend** | ✅ Written by `/api/assessment/evaluate` |
| Roadmap `nodes`/`edges` | **3 — computed backend** | ✅ Written by `/api/roadmaps/generate` |
| Match scores | **3 — computed backend** | ❌ Currently computed in the browser (C1/E4) |
| Readiness / role readiness | **3 — computed backend** | ⚠️ Computed, but with the wrong formula (F4) |
| What-if projections | **3 — computed backend** | ❌ Client-side invented formula (B6/C2) |
| Faculty recommendations | **3 — computed backend** | ❌ Hardcoded (C3/C4) |
| `TalentCandidate.institutionName` / `.skills` | **3 — computed backend** | ❌ Empty strings (B7) |
| Assessment questions, gap narrative, match explanation | **4 — AI** | ✅ Real AI calls; ⚠️ unvalidated (D4/F2) |
| External job-board demand | **5 — external integration** | Not started (correctly deferred to Slice 7) |
| Nav labels, status colours, copy | **1 — UI-only** | Fine as-is |

---

## Build order

**Slice 1 — Foundation (blocking everything):**
D1 routing · D2 directory + real onboarding · E3 claim validation · E1 secrets · E2 AI auth ·
E5–E10 rules · F1 admin bootstrap · F5 listener leak · D4 zod at every server boundary.

**Slice 2 — Student intelligence:**
F3 move engines to `shared/` · C1/D3 server-authoritative matching + application submission (E4) ·
F2 validate + clamp AI output, derive `status` deterministically · F4 weighted readiness ·
D5 tests for every deterministic engine.

Slices 3–7 follow the order given in the brief.

---

# Slices 1 & 2 — completed

Verified after the changes: `tsc --noEmit` 0 errors · **37 tests passing** (was 5, none of them domain code) · client build ✓ · server build ✓ · dev server booted and endpoints exercised live.

## Slice 1 — Foundation

| Ref | Fix |
| --- | --- |
| **D1** | `client/App.tsx` now registers `/app` and `/app/:role/*`, plus `/app/student/assessment`. `/workspace` and `/assessment` redirect to the new paths so old links still resolve. Every sidebar item, landing CTA and post-assessment redirect now lands somewhere real. |
| **D2** | New `GET /api/directory/institutions` + `/organizations` (`server/routes/directory.ts`, `client/services/directory.service.ts`) — the only unauthenticated data routes, returning just id/name/departments. |
| **B1** | `Signup.tsx` rebuilt as **role → affiliation → account**. Collects institution or organization, department (constrained to that institution's list), batch, designation/job title. Google users get the same affiliation step. |
| **E3** | `setup-profile` now verifies the institution/organization document exists and that the department is one it offers *before* setting custom claims. User doc + role profile are written in one batch; **claims are set last**, so a failed write grants no privileges. |
| **E2** | Every `/api/**` route except `/api/ping` and `/api/directory/*` is behind `requireAuth`; assessment/roadmap/matching/applications additionally behind `requireRole('student')`. Verified live: unauthenticated → `401`, bad token → `401`. |
| **E11** | AI routes return an opaque `502`; provider detail stays in the server log. |
| **E12** | `cors()` replaced with an allowlist from `CORS_ORIGINS`, defaulting to same-origin only. Bodies capped at 1 MB, AI prompts at 8 000 chars. |
| **Chat** | `/api/ai/chat` no longer accepts a client-supplied `systemPrompt` — that made it a general-purpose LLM proxy with no guardrails. |
| **E5** | `storage.rules` rewritten. The OR-ed `allow read: if isAuthenticated()` that exposed every user's resumes and certificates is gone; one rule per method, owner-only. |
| **E6–E10** | `firestore.rules` rewritten: evidence is owner/institution only; industry reads are scoped; opportunity creation requires `belongsToOrganization` + `createdBy == uid`; curriculum writes are institution-scoped; application `create` is server-only and updates are field-restricted via a `onlyChanges()` helper. |
| **E1** | `.env` untracked (`git rm --cached`) and the `!.env` un-ignore rule in `.gitignore` replaced with `.env` / `.env.*` / `!.env.example`. |
| **F1** | New `server/lib/firebase-admin.ts` is the single Admin SDK init. Boot order is no longer load-bearing. |
| **F5** | `AuthContext` holds the profile listener and tears it down on each auth transition — no more accumulating listeners or permission-denied noise after sign-out. |
| **D4** | `zod` (already a dependency, previously imported nowhere) now validates every server request body and every AI response in `shared/schemas/`. |

## Slice 2 — Student intelligence

| Ref | Fix |
| --- | --- |
| **F3** | Engines moved to `shared/engine/` — `matching.ts`, `gaps.ts`, `readiness.ts`, `skill-status.ts`. Pure functions, no Firebase. Client services re-export them, so import paths are unchanged for callers. |
| **C1 / D3** | New `POST /api/matching/opportunities` and `POST /api/applications`. The client sends only *which* opportunity; the server recomputes the score from Firestore. |
| **E4** | `submitApplication(studentId, opportunityId)` — the browser can no longer author a `matchScore`. The server also rejects closed opportunities, passed deadlines, duplicate applications and ineligible applicants. |
| **F2** | AI output is schema-validated and clamped before persistence. **`status` is no longer taken from the model** — it is derived from proficiency by `deriveSkillStatus()`. Skills the assessment didn't cover are rejected, so a model can't inject invented skills into Skill DNA. |
| **F4** | Readiness is now weighted across *every* required skill, with unmeasured skills counting zero and per-skill credit capped at 100%. A student assessed on one easy skill can no longer report ~90% ready. |
| **D5** | `shared/engine/engine.spec.ts` — 32 tests covering determinism, weighting, the zero-requirement division-by-zero case, eligibility, gap sorting and severity bands. Two of them pin the seeded demo cohort to what the engine actually computes. |
| **F9** | Seed script made idempotent (deterministic ids for signals and mappings) and internally consistent — Aanya's `readinessScore` corrected from `72` to the engine-computed **75**, and her status labels aligned with her evidence counts. |

## Not addressed (later slices, as scoped)

B4/C3/C4 faculty recommendations · B6/C2 what-if simulator · B7 talent-pool joins · F6 `strict: false` ·
F7 shared types importing the client `Timestamp` · F10 code splitting · D6 internship lifecycle, portfolio,
documents, notifications, outcome intelligence.

## Required manual follow-up

1. **Rotate `GEMINI_API_KEY` and `GROQ_API_KEY`.** Untracking `.env` stops future commits; the values are still in git history and must be treated as compromised.
2. **Deploy the rules** — `firebase deploy --only firestore:rules,storage`. They are inert until deployed.
3. **Re-run `pnpm seed`** so institutions exist for the new signup flow to offer.
