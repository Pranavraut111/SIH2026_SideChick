/**
 * AssessmentFlow — AI-powered skill assessment page.
 * Generates questions via Gemini, collects answers, evaluates, and writes results to Firestore.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCareerRoles, useStudentProfile } from "@/hooks/useData";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Sparkles,
  Target,
  Brain,
  AlertTriangle,
} from "lucide-react";

// ============================================
// Types
// ============================================

interface Question {
  id: number;
  skillName: string;
  question: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  expectedConcepts: string[];
}

interface SkillResult {
  skillName: string;
  category: string;
  proficiency: number;
  confidence: number;
  status: string;
  gaps: string[];
  strengths: string[];
}

type Phase = "setup" | "loading-questions" | "quiz" | "evaluating" | "results";

// ============================================
// Component
// ============================================

export default function AssessmentFlow() {
  const navigate = useNavigate();
  const { firebaseUser } = useAuth();
  const { data: student } = useStudentProfile();
  const { data: roles = [], isLoading: rolesLoading } = useCareerRoles();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<Phase>("setup");
  const [roleId, setRoleId] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [results, setResults] = useState<{ readinessScore: number; skills: SkillResult[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatingRoadmap, setCreatingRoadmap] = useState(false);
  const [roadmapReady, setRoadmapReady] = useState(false);

  const selectedRole = roles.find((role) => role.id === roleId);

  // ---- Phase 1: Generate questions ----
  const handleStartAssessment = async () => {
    if (!selectedRole || !firebaseUser) return;
    setPhase("loading-questions");
    setError(null);

    try {
      const res = await fetch("/api/assessment/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await firebaseUser.getIdToken()}`,
        },
        body: JSON.stringify({
          roleId: selectedRole.id,
          careerTarget: selectedRole.title,
          skills: selectedRole.requiredSkills.map((skill) => skill.skillName),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate questions");
      }

      const data = await res.json();
      setQuestions(data.questions);
      setCurrentQ(0);
      setPhase("quiz");
    } catch (err: any) {
      setError(err.message);
      setPhase("setup");
    }
  };

  // ---- Phase 2: Submit answers ----
  const handleSubmit = async () => {
    if (!student || !firebaseUser) return;
    setPhase("evaluating");
    setError(null);

    try {
      const payload = {
        studentId: student.id,
        roleId: selectedRole?.id,
        careerTarget: selectedRole?.title,
        answers: questions.map((q) => ({
          questionId: q.id,
          skillName: q.skillName,
          question: q.question,
          answer: answers[q.id] || "(No answer provided)",
          difficulty: q.difficulty,
        })),
      };

      const res = await fetch("/api/assessment/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await firebaseUser.getIdToken()}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to evaluate answers");
      }

      const data = await res.json();
      setResults(data);

      // Invalidate cached queries so the dashboard refreshes with real data
      queryClient.invalidateQueries({ queryKey: ["student"] });
      queryClient.invalidateQueries({ queryKey: ["skillDNA"] });

      setPhase("results");
    } catch (err: any) {
      setError(err.message);
      setPhase("quiz");
    }
  };

  const handleCreateRoadmap = async () => {
    if (!student || !firebaseUser) return;
    setCreatingRoadmap(true);
    setError(null);
    try {
      const response = await fetch("/api/roadmaps/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await firebaseUser.getIdToken()}`,
        },
        body: JSON.stringify({ studentId: student.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create your roadmap");
      await queryClient.invalidateQueries({ queryKey: ["roadmap", student.id] });
      setRoadmapReady(true);
      navigate("/app/student/roadmap");
    } catch (err: any) {
      setError(err.message || "Could not create your roadmap");
    } finally {
      setCreatingRoadmap(false);
    }
  };

  const answeredCount = Object.keys(answers).filter((k) => answers[Number(k)]?.trim()).length;
  const allAnswered = answeredCount === questions.length;

  return (
    <div className="min-h-screen bg-[#080809] text-[#f2f0ed]">
      <div className="mx-auto max-w-3xl px-5 py-12 md:px-8 md:py-16">
        {/* Header */}
        <button
          onClick={() => navigate("/app/student/overview")}
          className="mb-8 flex items-center gap-2 text-xs text-white/40 hover:text-white/60"
        >
          <ArrowLeft size={14} /> Back to dashboard
        </button>

        {/* ========== SETUP PHASE ========== */}
        {phase === "setup" && (
          <div className="space-y-8">
            <div>
              <div className="mb-2 text-[9px] font-mono uppercase tracking-[.18em] text-white/30">
                Step 1 of 3 · Choose your target
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Skill Assessment
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/45">
                Select your career target. We'll use AI to generate questions
                tailored to the skills required for that role, then evaluate
                your answers to build your real Skill DNA profile.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <AlertTriangle size={16} /> {error}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setRoleId(role.id)}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                    roleId === role.id
                      ? "border-[#a58cda]/50 bg-[#a58cda]/10 ring-1 ring-[#a58cda]/30"
                      : "border-white/10 bg-white/[.025] hover:border-white/20 hover:bg-white/[.04]"
                  }`}
                >
                  <Target
                    size={18}
                    className={roleId === role.id ? "text-[#c0aae8]" : "text-white/30"}
                  />
                  <div>
                    <div className="text-sm font-bold text-white">{role.title}</div>
                    <div className="mt-0.5 text-[10px] text-white/35">
                      {role.requiredSkills.slice(0, 3).map((skill) => skill.skillName).join(" · ")}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {rolesLoading && <p className="text-sm text-white/40">Loading career roles…</p>}
            {!rolesLoading && roles.length === 0 && <p className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100/75">Career roles have not been configured yet. Add them through the catalog before starting an assessment.</p>}
            <button
              onClick={handleStartAssessment}
              disabled={!selectedRole}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition ${
                selectedRole
                  ? "bg-[#efede8] text-[#0a0a0b] hover:bg-white"
                  : "cursor-not-allowed bg-white/10 text-white/30"
              }`}
            >
              <Sparkles size={16} />
              Generate Assessment
            </button>
          </div>
        )}

        {/* ========== LOADING QUESTIONS ========== */}
        {phase === "loading-questions" && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Loader2 size={36} className="animate-spin text-[#a58cda]" />
            <h2 className="mt-6 text-xl font-bold text-white">
              Generating your assessment...
            </h2>
            <p className="mt-2 text-sm text-white/40">
              Our AI is creating questions tailored to {selectedRole?.title}. This
              takes about 5-10 seconds.
            </p>
          </div>
        )}

        {/* ========== QUIZ PHASE ========== */}
        {phase === "quiz" && questions.length > 0 && (
          <div className="space-y-6">
            <div>
              <div className="mb-2 text-[9px] font-mono uppercase tracking-[.18em] text-white/30">
                Step 2 of 3 · Answer questions · {selectedRole?.title}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Assessment in progress
              </h1>
              <p className="mt-1 text-xs text-white/40">
                {answeredCount} of {questions.length} answered
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <AlertTriangle size={16} /> {error}
              </div>
            )}

            {/* Progress bar */}
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#a58cda] transition-all duration-300"
                style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Current question */}
            <div className="rounded-xl border border-white/10 bg-white/[.025] p-6">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono uppercase tracking-widest text-white/30">
                  Question {currentQ + 1} of {questions.length}
                </span>
                <span
                  className={`rounded-md px-2 py-1 text-[9px] font-mono uppercase ${
                    questions[currentQ].difficulty === "beginner"
                      ? "bg-[#8eaa95]/15 text-[#abd0b0]"
                      : questions[currentQ].difficulty === "intermediate"
                      ? "bg-[#b29363]/15 text-[#d8ba84]"
                      : "bg-[#b46e6e]/15 text-[#dc9b9b]"
                  }`}
                >
                  {questions[currentQ].difficulty}
                </span>
              </div>

              <div className="mt-1 text-[10px] text-[#c0aae8]">
                {questions[currentQ].skillName}
              </div>

              <h2 className="mt-4 text-lg font-bold leading-7 text-white">
                {questions[currentQ].question}
              </h2>

              <textarea
                value={answers[questions[currentQ].id] || ""}
                onChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [questions[currentQ].id]: e.target.value,
                  }))
                }
                placeholder="Type your answer here..."
                className="mt-5 h-36 w-full resize-none rounded-lg border border-white/10 bg-white/[.035] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#a58cda]/40"
              />
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentQ((p) => Math.max(0, p - 1))}
                disabled={currentQ === 0}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.035] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-30"
              >
                <ArrowLeft size={14} /> Previous
              </button>

              <div className="flex gap-1.5">
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQ(i)}
                    className={`h-2.5 w-2.5 rounded-full transition ${
                      i === currentQ
                        ? "bg-[#a58cda]"
                        : answers[q.id]?.trim()
                        ? "bg-[#8eaa95]"
                        : "bg-white/15"
                    }`}
                  />
                ))}
              </div>

              {currentQ < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQ((p) => Math.min(questions.length - 1, p + 1))}
                  className="flex items-center gap-2 rounded-lg bg-[#efede8] px-4 py-2.5 text-xs font-bold text-[#0a0a0b]"
                >
                  Next <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!allAnswered}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition ${
                    allAnswered
                      ? "bg-[#a58cda] text-white hover:bg-[#b99de8]"
                      : "cursor-not-allowed bg-white/10 text-white/30"
                  }`}
                >
                  <Sparkles size={14} /> Submit for evaluation
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========== EVALUATING ========== */}
        {phase === "evaluating" && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Brain size={36} className="animate-pulse text-[#a58cda]" />
            <h2 className="mt-6 text-xl font-bold text-white">
              Evaluating your answers...
            </h2>
            <p className="mt-2 text-sm text-white/40">
              AI is scoring your responses and building your Skill DNA. This
              takes about 10-15 seconds.
            </p>
          </div>
        )}

        {/* ========== RESULTS ========== */}
        {phase === "results" && results && (
          <div className="space-y-8">
            <div className="text-center">
              <CheckCircle2 size={48} className="mx-auto text-[#8eaa95]" />
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
                Assessment Complete
              </h1>
              <p className="mt-2 text-sm text-white/45">
                Your Skill DNA has been created. Your readiness score is now
                live.
              </p>
            </div>

            {/* Readiness score */}
            <div className="mx-auto max-w-sm rounded-xl border border-white/10 bg-white/[.025] p-6 text-center">
              <div className="text-[9px] font-mono uppercase tracking-widest text-white/30">
                Overall readiness
              </div>
              <div className="mt-2 font-mono text-5xl text-[#c0aae8]">
                {results.readinessScore}%
              </div>
              <div className="mt-1 text-xs text-white/40">{selectedRole?.title}</div>
            </div>

            {/* Skill breakdown */}
            <div className="space-y-3">
              <div className="text-[9px] font-mono uppercase tracking-widest text-white/30">
                Skill breakdown
              </div>
              {results.skills.map((skill) => (
                <div
                  key={skill.skillName}
                  className="rounded-xl border border-white/10 bg-white/[.025] p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">
                        {skill.skillName}
                      </div>
                      <div className="mt-0.5 text-[10px] text-white/35">
                        {skill.category}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg text-[#c0aae8]">
                        {skill.proficiency}%
                      </div>
                      <span
                        className={`text-[9px] font-mono uppercase ${
                          skill.status === "verified"
                            ? "text-[#abd0b0]"
                            : skill.status === "critical_gap"
                            ? "text-[#dc9b9b]"
                            : "text-[#d8ba84]"
                        }`}
                      >
                        {skill.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${
                        skill.status === "verified"
                          ? "bg-[#8eaa95]"
                          : skill.status === "critical_gap"
                          ? "bg-[#b46e6e]"
                          : "bg-[#b29363]"
                      }`}
                      style={{ width: `${skill.proficiency}%` }}
                    />
                  </div>

                  {/* Gaps and strengths */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {skill.strengths.map((s) => (
                      <span
                        key={s}
                        className="rounded-md bg-[#8eaa95]/15 px-2 py-0.5 text-[9px] text-[#abd0b0]"
                      >
                        ✓ {s}
                      </span>
                    ))}
                    {skill.gaps.map((g) => (
                      <span
                        key={g}
                        className="rounded-md bg-[#b46e6e]/15 px-2 py-0.5 text-[9px] text-[#dc9b9b]"
                      >
                        ✗ {g}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
            <button
              onClick={handleCreateRoadmap}
              disabled={creatingRoadmap || roadmapReady}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#efede8] px-4 py-3 text-sm font-bold text-[#0a0a0b] hover:bg-white disabled:opacity-50"
            >
              {creatingRoadmap ? "Creating your roadmap…" : "Create my evidence roadmap"} <ArrowRight size={16} />
            </button>
            <button onClick={() => navigate("/app/student/overview")} className="w-full text-sm text-white/50 hover:text-white">View Skill DNA first</button>
          </div>
        )}
      </div>
    </div>
  );
}
