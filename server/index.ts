import "dotenv/config";
import express from "express";
import cors from "cors";

// Import the Admin SDK bootstrap first so Firestore/Auth are ready before any route
// module is evaluated. Route modules no longer initialize it themselves.
import "./lib/firebase-admin";

import { requireAuth, requireRole } from "./middleware/auth";
import { handleSetupProfile } from "./routes/auth";
import { handleListInstitutions, handleListOrganizations } from "./routes/directory";
import {
  handleExtractSkills,
  handleAnalyzeGaps,
  handleGenerateRoadmap,
  handleExplainMatch,
  handleAnalyzeCurriculum,
  handleCareerGuidance,
  handleChat,
} from "./routes/ai";
import {
  handleGenerateAssessment,
  handleEvaluateAssessment,
} from "./routes/assessment";
import { handleGenerateRoadmap as handleCreateRoadmap } from "./routes/roadmap";
import { handleMatchOpportunities } from "./routes/matching";
import { handleSubmitApplication } from "./routes/applications";

/**
 * Allowed browser origins. In development the Vite dev server hosts the API in-process,
 * so requests are same-origin; in production set CORS_ORIGINS to a comma-separated list.
 * An open `cors()` would let any site drive this API with a user's bearer token.
 */
function corsOptions(): cors.CorsOptions {
  const configured = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!configured.length) {
    // Same-origin only: no cross-origin browser request is permitted.
    return { origin: false };
  }
  return { origin: configured, credentials: true };
}

export function createServer() {
  const app = express();

  app.use(cors(corsOptions()));
  // Bounded body size — AI endpoints accept free text and would otherwise take anything.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // ---- Public ----
  app.get("/api/ping", (_req, res) => {
    res.json({ message: process.env.PING_MESSAGE ?? "pong" });
  });

  // Onboarding needs these before an account exists.
  app.get("/api/directory/institutions", handleListInstitutions);
  app.get("/api/directory/organizations", handleListOrganizations);

  // ---- Authenticated ----
  // Everything below requires a verified Firebase ID token. The AI routes in particular
  // were previously open to the internet, which made them a free LLM proxy billed to
  // this project's Gemini/Groq keys.
  app.post("/api/auth/setup-profile", requireAuth, handleSetupProfile);

  app.post("/api/ai/extract-skills", requireAuth, handleExtractSkills);
  app.post("/api/ai/analyze-gaps", requireAuth, handleAnalyzeGaps);
  app.post("/api/ai/generate-roadmap", requireAuth, handleGenerateRoadmap);
  app.post("/api/ai/explain-match", requireAuth, handleExplainMatch);
  app.post("/api/ai/career-guidance", requireAuth, handleCareerGuidance);
  app.post("/api/ai/chat", requireAuth, handleChat);
  // Curriculum analysis is an institution planning tool.
  app.post(
    "/api/ai/analyze-curriculum",
    requireAuth,
    requireRole("institution", "faculty"),
    handleAnalyzeCurriculum
  );

  // ---- Student intelligence ----
  app.post("/api/assessment/generate", requireAuth, requireRole("student"), handleGenerateAssessment);
  app.post("/api/assessment/evaluate", requireAuth, requireRole("student"), handleEvaluateAssessment);
  app.post("/api/roadmaps/generate", requireAuth, requireRole("student"), handleCreateRoadmap);
  app.post("/api/matching/opportunities", requireAuth, requireRole("student"), handleMatchOpportunities);
  app.post("/api/applications", requireAuth, requireRole("student"), handleSubmitApplication);

  return app;
}
