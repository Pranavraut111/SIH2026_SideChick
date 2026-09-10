/**
 * Client-side AI service.
 *
 * All AI calls go through server /api/ai/* endpoints (Gemini primary, Groq fallback).
 * API keys NEVER touch the browser.
 * No hardcoded fallbacks — if AI fails, it throws.
 */
import { auth } from '@/lib/firebase';
import type { SkillGap } from '@shared/types/skill';
import type { RoadmapNode, RoadmapEdge } from '@shared/types/roadmap';
import type { MatchResult } from '@shared/types/matching';

// ============================================
// Server API caller
// ============================================

async function callAI<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('You must be signed in to use ShikshaSetu AI.');

  const response = await fetch(`/api/ai/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || `AI request failed: ${response.status}`);
  }

  return response.json();
}

// ============================================
// Public API
// ============================================

export interface ExtractedSkill {
  name: string;
  confidence: number;
  category?: string;
}

export interface CareerContext {
  currentSkills: string[];
  careerTarget: string;
  gaps: string[];
  readinessScore: number;
}

export interface CurriculumAnalysis {
  detectedSkills: ExtractedSkill[];
  coverageGaps: string[];
  recommendations: string[];
}

export interface RoadmapSuggestion {
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
  estimatedDuration: string;
}

/**
 * Extract skills from text (resume, project description, syllabus).
 * Powered by Gemini / Groq on server.
 */
export async function extractSkills(text: string): Promise<ExtractedSkill[]> {
  const result = await callAI<{ skills: ExtractedSkill[] }>('extract-skills', { text });
  return result.skills;
}

/**
 * AI-generated skill gap analysis with prioritized action plan.
 */
export async function analyzeSkillGap(gaps: SkillGap[]): Promise<string> {
  const result = await callAI<{ analysis: string }>('analyze-gaps', {
    gaps: gaps.map(g => ({
      skillName: g.skillName,
      currentLevel: g.currentLevel,
      requiredLevel: g.requiredLevel,
      severity: g.severity,
    })),
  });
  return result.analysis;
}

/**
 * Generate a personalized career roadmap.
 * Returns nodes and edges for React Flow.
 */
export async function generateRoadmapSuggestion(
  careerTarget: string,
  gaps: SkillGap[]
): Promise<RoadmapSuggestion> {
  const result = await callAI<RoadmapSuggestion>('generate-roadmap', {
    careerTarget,
    currentSkills: gaps
      .filter(g => g.currentLevel > 0)
      .map(g => ({ name: g.skillName, level: g.currentLevel })),
    gaps: gaps
      .filter(g => g.gap > 0)
      .map(g => ({ name: g.skillName, gap: g.gap })),
  });
  return result;
}

/**
 * Explain a match result in natural language.
 */
export async function explainMatch(matchResult: MatchResult): Promise<string> {
  const result = await callAI<{ explanation: string }>('explain-match', {
    matchData: {
      matchScore: matchResult.matchScore,
      matchedSkills: matchResult.matchedSkills,
      missingSkills: matchResult.missingSkills,
      reasons: matchResult.reasons,
    },
  });
  return result.explanation;
}

/**
 * Generate personalized career guidance.
 */
export async function generateCareerGuidance(context: CareerContext): Promise<string> {
  const result = await callAI<{ guidance: string }>('career-guidance', { context });
  return result.guidance;
}

/**
 * Analyze curriculum syllabus for skill coverage and industry alignment.
 */
export async function analyzeCurriculum(syllabusText: string): Promise<CurriculumAnalysis> {
  return callAI<CurriculumAnalysis>('analyze-curriculum', { syllabusText });
}

/**
 * General AI chat — ask ShikshaSetu AI anything.
 * The system prompt is fixed server-side and is not caller-configurable.
 */
export async function chat(prompt: string): Promise<string> {
  const result = await callAI<{ response: string }>('chat', { prompt });
  return result.response;
}
