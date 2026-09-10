/**
 * AI API routes.
 * Proxies AI requests through the server so API keys stay secure.
 */
import { RequestHandler } from 'express';
import {
  extractSkills,
  analyzeSkillGaps,
  generateRoadmap,
  explainMatch,
  analyzeCurriculum,
  generateCareerGuidance,
  generateText,
} from '../services/ai.service';

/** Opaque message returned to clients; provider detail stays in the server log. */
const AI_UNAVAILABLE = 'The AI service is temporarily unavailable. Please try again.';

/** Upper bound on free-text sent to a provider, to cap cost per request. */
const MAX_PROMPT_CHARS = 8000;

/** POST /api/ai/extract-skills — Extract skills from text. */
export const handleExtractSkills: RequestHandler = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) { res.status(400).json({ error: 'Missing text' }); return; }
    const result = await extractSkills(text);
    res.json(result);
  } catch (error) {
    console.error('[AI] extractSkills failed:', error);
    res.status(502).json({ error: AI_UNAVAILABLE });
  }
};

/** POST /api/ai/analyze-gaps — Analyze skill gaps. */
export const handleAnalyzeGaps: RequestHandler = async (req, res) => {
  try {
    const { gaps } = req.body;
    if (!gaps?.length) { res.status(400).json({ error: 'Missing gaps' }); return; }
    const analysis = await analyzeSkillGaps(gaps);
    res.json({ analysis });
  } catch (error) {
    console.error('[AI] analyzeGaps failed:', error);
    res.status(502).json({ error: AI_UNAVAILABLE });
  }
};

/** POST /api/ai/generate-roadmap — Generate a career roadmap. */
export const handleGenerateRoadmap: RequestHandler = async (req, res) => {
  try {
    const { careerTarget, currentSkills, gaps } = req.body;
    if (!careerTarget) { res.status(400).json({ error: 'Missing careerTarget' }); return; }
    const roadmap = await generateRoadmap({ careerTarget, currentSkills: currentSkills || [], gaps: gaps || [] });
    res.json(roadmap);
  } catch (error) {
    console.error('[AI] generateRoadmap failed:', error);
    res.status(502).json({ error: AI_UNAVAILABLE });
  }
};

/** POST /api/ai/explain-match — Explain a match result. */
export const handleExplainMatch: RequestHandler = async (req, res) => {
  try {
    const { matchData } = req.body;
    if (!matchData) { res.status(400).json({ error: 'Missing matchData' }); return; }
    const explanation = await explainMatch(matchData);
    res.json({ explanation });
  } catch (error) {
    console.error('[AI] explainMatch failed:', error);
    res.status(502).json({ error: AI_UNAVAILABLE });
  }
};

/** POST /api/ai/analyze-curriculum — Analyze curriculum. */
export const handleAnalyzeCurriculum: RequestHandler = async (req, res) => {
  try {
    const { syllabusText } = req.body;
    if (!syllabusText) { res.status(400).json({ error: 'Missing syllabusText' }); return; }
    const result = await analyzeCurriculum(syllabusText);
    res.json(result);
  } catch (error) {
    console.error('[AI] analyzeCurriculum failed:', error);
    res.status(502).json({ error: AI_UNAVAILABLE });
  }
};

/** POST /api/ai/career-guidance — Generate career guidance. */
export const handleCareerGuidance: RequestHandler = async (req, res) => {
  try {
    const { context } = req.body;
    if (!context) { res.status(400).json({ error: 'Missing context' }); return; }
    const guidance = await generateCareerGuidance(context);
    res.json({ guidance });
  } catch (error) {
    console.error('[AI] careerGuidance failed:', error);
    res.status(502).json({ error: AI_UNAVAILABLE });
  }
};

/** POST /api/ai/chat — General AI chat. */
export const handleChat: RequestHandler = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({ error: 'Missing prompt' });
      return;
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
      res.status(413).json({ error: 'That message is too long' });
      return;
    }
    // The system prompt is fixed server-side. Accepting one from the client turned this
    // endpoint into a general-purpose LLM proxy with no guardrails.
    const response = await generateText(prompt, { temperature: 0.7, maxTokens: 1024 });
    res.json({ response });
  } catch (error) {
    console.error('[AI] chat failed:', error);
    res.status(502).json({ error: AI_UNAVAILABLE });
  }
};
