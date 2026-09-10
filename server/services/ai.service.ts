/**
 * Server-side AI service.
 * Uses Gemini as primary provider, Groq as fast fallback.
 *
 * All AI calls go through the server to keep API keys secure.
 * The client calls /api/ai/* endpoints, never touches the APIs directly.
 */
import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';

// ============================================
// Provider initialization
// ============================================

const geminiKey = process.env.GEMINI_API_KEY;
const groqKey = process.env.GROQ_API_KEY;

let gemini: GoogleGenAI | null = null;
let groq: Groq | null = null;

if (geminiKey) {
  gemini = new GoogleGenAI({ apiKey: geminiKey });
  console.log('[AI] Gemini initialized');
}

if (groqKey) {
  groq = new Groq({ apiKey: groqKey });
  console.log('[AI] Groq initialized');
}

// ============================================
// Core AI functions
// ============================================

/**
 * Generate text using Gemini (primary) or Groq (fallback).
 */
export async function generateText(
  prompt: string,
  options: { systemPrompt?: string; temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const { systemPrompt, temperature = 0.7, maxTokens = 1024 } = options;

  // Try Gemini first
  if (gemini) {
    try {
      const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
      const response = await gemini.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: fullPrompt,
        config: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      });
      return response.text || '';
    } catch (err: any) {
      console.warn('[AI] Gemini failed, trying Groq fallback:', err.message);
    }
  }

  // Fallback to Groq
  if (groq) {
    try {
      const messages: any[] = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature,
        max_tokens: maxTokens,
      });
      return completion.choices[0]?.message?.content || '';
    } catch (err: any) {
      console.error('[AI] Groq also failed:', err.message);
      throw new Error('AI service unavailable');
    }
  }

  throw new Error('No AI provider configured');
}

/**
 * Generate structured JSON output.
 */
export async function generateJSON<T = any>(
  prompt: string,
  options: { systemPrompt?: string; temperature?: number } = {}
): Promise<T> {
  const jsonPrompt = `${prompt}\n\nYou MUST respond with ONLY valid JSON. No markdown code blocks, no explanation text before or after, no comments. Start with { or [ and end with } or ].`;

  const text = await generateText(jsonPrompt, {
    ...options,
    temperature: options.temperature ?? 0.3, // Lower temp for structured output
    maxTokens: options.maxTokens || 2048, // Increase token limit for JSON responses
  });

  // Clean up markdown fences and extra text
  let cleaned = text.trim();
  
  // Remove markdown code blocks
  cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  // Try to extract JSON if there's extra text
  const jsonMatch = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (jsonMatch) {
    cleaned = jsonMatch[1];
  }
  
  // Remove any leading/trailing non-JSON text
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    console.error('[AI] JSON parse failed. Raw response:', text.slice(0, 500));
    console.error('[AI] Cleaned response:', cleaned.slice(0, 500));
    throw new Error(`AI returned invalid JSON: ${cleaned.slice(0, 200)}`);
  }
}

// ============================================
// ShikshaSetu-specific AI functions
// ============================================

const SYSTEM_PROMPT = `You are ShikshaSetu AI — an intelligent assistant for the Academia-Industry Collaboration platform.
You help with skill mapping, career guidance, curriculum analysis, and roadmap generation.
Be concise, practical, and data-driven. Focus on actionable advice.
When analyzing skills, use specific proficiency levels (0-100) and concrete evidence types.
Never invent or hallucinate skill levels — only work with data provided to you.`;

/**
 * Extract skills from text (resume, project description, etc.)
 */
export async function extractSkills(text: string) {
  return generateJSON<{ skills: { name: string; confidence: number; category: string }[] }>(
    `Extract technical skills from this text. For each skill, provide a name, confidence (0-1), and category.\n\nText: ${text}`,
    { systemPrompt: SYSTEM_PROMPT, temperature: 0.2 }
  );
}

/**
 * Analyze skill gaps and provide actionable guidance.
 */
export async function analyzeSkillGaps(gaps: { skillName: string; currentLevel: number; requiredLevel: number; severity: string }[]) {
  const gapSummary = gaps.map(g => `${g.skillName}: ${g.currentLevel}% → ${g.requiredLevel}% required (${g.severity})`).join('\n');

  return generateText(
    `Analyze these skill gaps and provide a prioritized action plan with specific recommendations:\n\n${gapSummary}`,
    { systemPrompt: SYSTEM_PROMPT, temperature: 0.5, maxTokens: 512 }
  );
}

/**
 * Generate a personalized career roadmap.
 */
export async function generateRoadmap(context: {
  careerTarget: string;
  currentSkills: { name: string; level: number }[];
  gaps: { name: string; gap: number }[];
}) {
  return generateJSON<{
    nodes: { id: string; type: string; title: string; meta: string; status: string; position: { x: number; y: number } }[];
    edges: { id: string; source: string; target: string; animated?: boolean }[];
    estimatedDuration: string;
  }>(
    `Generate a career roadmap for someone targeting "${context.careerTarget}".

Current skills: ${context.currentSkills.map(s => `${s.name} (${s.level}%)`).join(', ')}
Skill gaps: ${context.gaps.map(g => `${g.name} (${g.gap}% gap)`).join(', ')}

Create a roadmap with 5-8 nodes. Each node needs: id, type (goal/skill/learning/assessment/project/certification/industry_mission/outcome), title, meta (subtitle), status (verified/in_progress/recommended/critical_gap/locked), and position ({x, y}).
Place nodes in a left-to-right flow, x from 30 to 840, y from 50 to 400.
Connect them with edges (id, source, target, animated for active edges).
Include estimated total duration.`,
    { systemPrompt: SYSTEM_PROMPT, temperature: 0.4 }
  );
}

/**
 * Explain a match result in natural language.
 */
export async function explainMatch(matchData: {
  matchScore: number;
  matchedSkills: { skillName: string; studentLevel: number; requiredLevel: number; meets: boolean }[];
  missingSkills: { skillName: string; gap: number }[];
  reasons: string[];
}) {
  return generateText(
    `Explain this job-student match result in 2-3 concise sentences for the student:

Match Score: ${matchData.matchScore}%
Matched Skills: ${matchData.matchedSkills.map(s => `${s.skillName} (${s.studentLevel}% vs ${s.requiredLevel}% required, ${s.meets ? 'meets' : 'below'})`).join(', ')}
Missing Skills: ${matchData.missingSkills.map(s => `${s.skillName} (${s.gap}% gap)`).join(', ')}
Key Reasons: ${matchData.reasons.join('; ')}`,
    { systemPrompt: SYSTEM_PROMPT, temperature: 0.5, maxTokens: 256 }
  );
}

/**
 * Analyze curriculum for skill coverage and gaps.
 */
export async function analyzeCurriculum(syllabusText: string) {
  return generateJSON<{
    detectedSkills: { name: string; confidence: number; category: string }[];
    coverageGaps: string[];
    recommendations: string[];
  }>(
    `Analyze this course syllabus for industry-relevant skill coverage. Identify skills taught, coverage gaps versus current industry demands, and specific recommendations to improve alignment.\n\nSyllabus:\n${syllabusText}`,
    { systemPrompt: SYSTEM_PROMPT, temperature: 0.3 }
  );
}

/**
 * Generate career guidance for a student.
 */
export async function generateCareerGuidance(context: {
  currentSkills: string[];
  careerTarget: string;
  gaps: string[];
  readinessScore: number;
}) {
  return generateText(
    `Provide brief, actionable career guidance (3-4 sentences) for a student:

Career Target: ${context.careerTarget}
Readiness: ${context.readinessScore}%
Current Skills: ${context.currentSkills.join(', ')}
Skill Gaps: ${context.gaps.join(', ')}`,
    { systemPrompt: SYSTEM_PROMPT, temperature: 0.6, maxTokens: 256 }
  );
}
