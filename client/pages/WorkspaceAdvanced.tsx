/**
 * ShikshaSetu's data-first student MVP.
 * The UI follows the product dependency chain:
 * assessment → Skill DNA → role gaps → roadmap → matching → application.
 */
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Background, Controls, Handle, Position, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowRight, BriefcaseBusiness, Check, ChevronRight, ClipboardCheck,
  Fingerprint, GitBranch, LayoutDashboard, Target,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  useApplications, useCareerRoles, useIndustryDemand, useOpportunities,
  useRoadmap, useSkillDNA, useStudentProfile,
} from "@/hooks/useData";
import { calculateMatch, fetchAuthoritativeMatches } from "@/services/matching.service";
import { computeSkillGaps } from "@/services/student.service";
import { submitApplication } from "@/services/application.service";
import RoleWorkspaces from "@/pages/RoleWorkspaces";
import type { CareerRole, MatchResult, Opportunity, RoadmapNode } from "@shared/types";

type StudentPage = "overview" | "skill-dna" | "career" | "roadmap" | "opportunities" | "applications";
const nav = [
  ["overview", "My next steps", LayoutDashboard],
  ["skill-dna", "Skill DNA", Fingerprint],
  ["career", "Career intelligence", Target],
  ["roadmap", "Roadmap", GitBranch],
  ["opportunities", "Opportunities", BriefcaseBusiness],
  ["applications", "Applications", ClipboardCheck],
] as const;

const statusColors: Record<string, string> = {
  verified: "bg-emerald-400/10 text-emerald-200",
  completed: "bg-emerald-400/10 text-emerald-200",
  in_progress: "bg-violet-400/10 text-violet-200",
  recommended: "bg-violet-400/10 text-violet-200",
  critical_gap: "bg-amber-400/10 text-amber-100",
  not_started: "bg-white/10 text-white/50",
  locked: "bg-white/10 text-white/50",
};

function Brand() {
  return <Link to="/" className="flex items-center gap-2"><span className="brand-mark"><span /><span /><span /></span><span className="font-bold tracking-tight text-white">ShikshaSetu</span></Link>;
}

function Status({ value }: { value: string }) {
  return <span className={`rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${statusColors[value] || "bg-white/10 text-white/50"}`}>{value.replace(/_/g, " ")}</span>;
}

function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-[10px] uppercase tracking-[.18em] text-violet-200/70">{eyebrow}</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">{description}</p></div>{action}</div>;
}

function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-white/15 bg-white/[.02] p-8 text-center"><h2 className="text-lg font-bold text-white">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/45">{body}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[.025] p-4"><p className="text-[10px] uppercase tracking-[.14em] text-white/35">{label}</p><p className="mt-3 text-3xl font-bold tracking-tight text-white">{value}</p><p className="mt-1 text-xs text-white/40">{detail}</p></div>;
}

function Shell({ page, children }: { page: StudentPage; children: React.ReactNode }) {
  const navigate = useNavigate();
  const { userProfile, signOut } = useAuth();
  return <div className="min-h-screen bg-[#080809] text-[#f2f0ed]">
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#080809]/95 px-4 py-3 backdrop-blur lg:hidden"><Brand /><button onClick={signOut} className="text-xs text-white/50">Sign out</button></header>
    <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/10 bg-[#0b0b0d] p-5 lg:flex lg:flex-col"><Brand /><p className="mt-7 text-[10px] uppercase tracking-[.16em] text-white/35">Student workspace</p><nav className="mt-3 space-y-1">{nav.map(([id, label, Icon]) => <button key={id} onClick={() => navigate(`/app/student/${id}`)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${page === id ? "bg-violet-400/15 text-white" : "text-white/45 hover:bg-white/[.05] hover:text-white"}`}><Icon size={16} />{label}</button>)}</nav><div className="mt-auto border-t border-white/10 pt-4"><p className="truncate text-xs font-semibold text-white">{userProfile?.displayName || "Student"}</p><button onClick={signOut} className="mt-3 text-xs text-white/45 hover:text-white">Sign out</button></div></aside>
    <main className="mx-auto max-w-7xl px-4 py-8 lg:ml-64 lg:px-8">{children}</main>
  </div>;
}

function Overview() {
  const { data: student } = useStudentProfile();
  const { data: skills = [] } = useSkillDNA(student?.id);
  const { data: roles = [] } = useCareerRoles();
  const { data: opportunities = [] } = useOpportunities();
  const navigate = useNavigate();
  if (!student) return <Empty title="Finish setting up your student profile" body="Your student record is still loading or was not created. Return to account setup and try again." />;
  if (!skills.length) return <><PageTitle eyebrow="Student / starting point" title="Build your Skill DNA" description="Your next action is an assessment. It creates evidence-backed proficiency data before ShikshaSetu can recommend a role or opportunity." /><Empty title="No verified skills yet" body="Take a role-based assessment to create your baseline and unlock gap analysis." action={<button className="rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-black" onClick={() => navigate("/app/student/assessment")}>Start assessment <ArrowRight className="ml-1 inline" size={15} /></button>} /></>;
  const currentRole = roles.find((role) => role.id === student.careerTargetId || role.title === student.careerTarget);
  const gaps = currentRole ? computeSkillGaps(skills, currentRole.requiredSkills) : [];
  const matches = opportunities.map((item) => calculateMatch(student, skills, item)).sort((a, b) => b.matchScore - a.matchScore);
  const nextGap = gaps.find((gap) => gap.gap > 0);
  return <><PageTitle eyebrow="Student / decision center" title={`Your path to ${currentRole?.title || student.careerTarget || "your career target"}`} description="Every recommendation comes from your current Skill DNA, target-role requirements and active opportunities." action={<button className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10" onClick={() => navigate("/app/student/assessment")}>Reassess skills</button>} /><div className="grid gap-4 md:grid-cols-4"><Metric label="Readiness" value={`${student.readinessScore}%`} detail="from latest assessment" /><Metric label="Verified skills" value={skills.filter((skill) => skill.status === "verified").length} detail="with supporting evidence" /><Metric label="Open gaps" value={gaps.filter((gap) => gap.gap > 0).length} detail="against target role" /><Metric label="Opportunity matches" value={matches.filter((match) => match.matchScore >= 60).length} detail="active opportunities" /></div><div className="mt-6 grid gap-5 lg:grid-cols-2"><section className="rounded-xl border border-white/10 bg-white/[.025] p-5"><p className="text-[10px] uppercase tracking-[.16em] text-white/35">Highest-impact action</p>{nextGap ? <><h2 className="mt-3 text-xl font-bold text-white">Close your {nextGap.skillName} gap</h2><p className="mt-2 text-sm leading-6 text-white/50">You are at {nextGap.currentLevel}% and your target role requires {nextGap.requiredLevel}%. {nextGap.recommendedIntervention}</p><button onClick={() => navigate("/app/student/roadmap")} className="mt-5 text-sm font-semibold text-violet-200">Open roadmap <ChevronRight className="inline" size={15} /></button></> : <p className="mt-3 text-sm text-white/50">Your core role skills meet the currently declared baseline.</p>}</section><section className="rounded-xl border border-white/10 bg-white/[.025] p-5"><p className="text-[10px] uppercase tracking-[.16em] text-white/35">Best current match</p>{matches[0] ? <><h2 className="mt-3 text-xl font-bold text-white">{matches[0].matchScore}% match</h2><p className="mt-2 text-sm text-white/50">{opportunities.find((item) => item.id === matches[0].opportunityId)?.title}</p><button onClick={() => navigate("/app/student/opportunities")} className="mt-5 text-sm font-semibold text-violet-200">See explanation <ChevronRight className="inline" size={15} /></button></> : <p className="mt-3 text-sm text-white/50">No active opportunities are available yet.</p>}</section></div></>;
}

function SkillDNA() {
  const { data: student } = useStudentProfile();
  const { data: skills = [], isLoading } = useSkillDNA(student?.id);
  if (isLoading) return <p className="text-sm text-white/45">Loading Skill DNA…</p>;
  return <><PageTitle eyebrow="Skill intelligence / evidence" title="Your Skill DNA" description="A skill is not a claim. It is proficiency, confidence, required level and evidence recorded over time." />{!skills.length ? <Empty title="No Skill DNA yet" body="Complete an assessment to create verified skill profiles." action={<Link className="text-sm font-semibold text-violet-200" to="/app/student/assessment">Start assessment</Link>} /> : <div className="overflow-hidden rounded-xl border border-white/10"><div className="grid grid-cols-[minmax(130px,1.4fr)_60px_65px_55px_90px] gap-3 border-b border-white/10 bg-white/[.04] px-4 py-3 text-[10px] uppercase tracking-[.12em] text-white/35"><span>Skill & evidence</span><span>Now</span><span>Need</span><span>Gap</span><span>Status</span></div>{skills.map((skill) => { const gap = Math.max(skill.requiredLevel - skill.proficiency, 0); return <div key={skill.id} className="grid grid-cols-[minmax(130px,1.4fr)_60px_65px_55px_90px] gap-3 border-b border-white/[.07] px-4 py-4 last:border-0"><div><p className="font-semibold text-white">{skill.skillName}</p><p className="mt-1 text-xs text-white/40">{skill.evidenceCount} evidence item{skill.evidenceCount === 1 ? "" : "s"} · {skill.source.replace(/_/g, " ")}</p></div><span className="text-sm text-white">{skill.proficiency}%</span><span className="text-sm text-white/60">{skill.requiredLevel}%</span><span className={gap ? "text-sm text-amber-100" : "text-sm text-emerald-200"}>{gap}%</span><Status value={skill.status} /></div>; })}</div>}</>;
}

function Career() {
  const { data: student } = useStudentProfile();
  const { data: skills = [] } = useSkillDNA(student?.id);
  const { data: roles = [], isLoading } = useCareerRoles();
  if (isLoading) return <p className="text-sm text-white/45">Loading career intelligence…</p>;
  if (!student || !skills.length) return <Empty title="Career readiness needs Skill DNA" body="Assessment evidence is required before role readiness can be calculated." />;
  return <><PageTitle eyebrow="Career intelligence / explainable" title="Roles your skills can support" description="Readiness is a transparent comparison of your assessed proficiency with each role’s declared requirements." />{!roles.length ? <Empty title="No roles configured" body="The shared role catalog is empty. Add roles and their required skills to start career matching." /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{roles.map((role) => <RoleCard key={role.id} role={role} skillProfiles={skills} selected={student.careerTargetId === role.id || student.careerTarget === role.title} />)}</div>}</>;
}

function RoleCard({ role, skillProfiles, selected }: { role: CareerRole; skillProfiles: NonNullable<ReturnType<typeof useSkillDNA>["data"]>; selected: boolean }) {
  const gaps = computeSkillGaps(skillProfiles, role.requiredSkills);
  const readiness = Math.round(role.requiredSkills.reduce((sum, requirement) => sum + Math.min((skillProfiles.find((skill) => skill.skillId === requirement.skillId)?.proficiency || 0) / requirement.minimumLevel, 1) * requirement.weight, 0) * 100);
  return <article className={`rounded-xl border p-5 ${selected ? "border-violet-300/40 bg-violet-300/[.08]" : "border-white/10 bg-white/[.025]"}`}><div className="flex items-start justify-between gap-4"><div><h2 className="font-bold text-white">{role.title}</h2><p className="mt-1 text-xs text-white/40">{role.domain} · demand {role.demand.growth}</p></div>{selected && <Status value="verified" />}</div><p className="mt-7 text-4xl font-bold tracking-tight text-white">{readiness}%</p><p className="mt-1 text-xs text-white/40">role readiness</p><p className="mt-5 border-t border-white/10 pt-4 text-xs text-white/50">{gaps.filter((gap) => gap.gap > 0).length ? `Gaps: ${gaps.filter((gap) => gap.gap > 0).slice(0, 3).map((gap) => gap.skillName).join(", ")}` : "All declared core skills meet the baseline."}</p></article>;
}

function Roadmap() {
  const { data: student } = useStudentProfile();
  const { data: roadmap, isLoading } = useRoadmap(student?.id);
  const [selected, setSelected] = useState<RoadmapNode | null>(null);
  if (isLoading) return <p className="text-sm text-white/45">Loading roadmap…</p>;
  if (!roadmap) return <><PageTitle eyebrow="Roadmap / living pathway" title="Your roadmap will appear after planning" description="A roadmap turns role gaps into ordered learning, project and evidence steps." /><Empty title="No roadmap has been created" body="Complete a role-based assessment, then create your evidence roadmap from the assessment results. It will be generated from your measured skill gaps." /></>;
  const nodes = roadmap.nodes.map((node) => ({ id: node.id, type: "roadmap", position: node.position, data: node as unknown as Record<string, unknown> }));
  return <><PageTitle eyebrow="Roadmap / living pathway" title={roadmap.title} description="Select a node to see the evidence it needs and its relationship to the next outcome." /><div className="grid gap-5 xl:grid-cols-[1fr_320px]"><div className="h-[580px] overflow-hidden rounded-xl border border-white/10 bg-[#0b0b0e]"><ReactFlow nodes={nodes} edges={roadmap.edges} nodeTypes={{ roadmap: RoadmapNodeCard }} onNodeClick={(_, node) => setSelected(node.data as unknown as RoadmapNode)} fitView proOptions={{ hideAttribution: true }}><Background color="#2a2730" gap={28} /><Controls /></ReactFlow></div><aside className="rounded-xl border border-white/10 bg-white/[.025] p-5">{selected ? <><Status value={selected.status} /><h2 className="mt-4 text-xl font-bold text-white">{selected.title}</h2><p className="mt-2 text-sm text-white/45">{selected.description || selected.meta}</p><dl className="mt-6 space-y-4 border-t border-white/10 pt-5 text-sm"><div><dt className="text-white/35">Evidence created</dt><dd className="mt-1 text-white">{selected.evidenceType || "Complete the linked action"}</dd></div><div><dt className="text-white/35">Estimated duration</dt><dd className="mt-1 text-white">{selected.duration || "Not specified"}</dd></div></dl></> : <p className="text-sm leading-6 text-white/45">Select a roadmap node to inspect its skill requirements, evidence and next action.</p>}</aside></div></>;
}

function RoadmapNodeCard({ data }: { data: RoadmapNode }) {
  return <div className="w-48 rounded-lg border border-white/15 bg-[#17151b] p-3 shadow-xl"><Handle type="target" position={Position.Left} className="!bg-violet-300" /><p className="text-[9px] uppercase tracking-[.13em] text-white/40">{data.type.replace(/_/g, " ")}</p><p className="mt-1 text-sm font-bold text-white">{data.title}</p><p className="mt-1 text-[10px] text-white/45">{data.meta}</p><div className="mt-2"><Status value={data.status} /></div><Handle type="source" position={Position.Right} className="!bg-violet-300" /></div>;
}

function Opportunities() {
  const { data: student } = useStudentProfile();
  const { data: skills = [] } = useSkillDNA(student?.id);
  const { data: opportunities = [], isLoading } = useOpportunities();
  const { data: applications = [] } = useApplications(student?.id);
  const queryClient = useQueryClient();
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Scores come from the server so the number a student sees is the same one stored on
  // the application and shown to the recruiter. The local `calculateMatch` below is only
  // a fallback for the brief window before the request resolves.
  const { data: authoritative = [], isLoading: matchesLoading } = useQuery({
    queryKey: ["matches", student?.id],
    queryFn: () => fetchAuthoritativeMatches(student!.id),
    enabled: !!student?.id && opportunities.length > 0,
    staleTime: 60 * 1000,
  });

  const scoreFor = (opportunity: Opportunity): MatchResult | null => {
    const fromServer = authoritative.find((match) => match.opportunityId === opportunity.id);
    if (fromServer) return fromServer;
    return student ? calculateMatch(student, skills, opportunity) : null;
  };

  const chosen = opportunities.find((item) => item.id === chosenId) || opportunities[0];
  const match = chosen ? scoreFor(chosen) : null;
  const applied = !!chosen && applications.some((application) => application.opportunityId === chosen.id);

  const apply = async () => {
    if (!student || !chosen || applied) return;
    setSubmitting(true);
    setApplyError(null);
    try {
      await submitApplication(student.id, chosen.id);
      await queryClient.invalidateQueries({ queryKey: ["applications", student.id] });
      await queryClient.invalidateQueries({ queryKey: ["student", student.userId] });
    } catch (error: any) {
      setApplyError(error.message || "Could not submit your application.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <p className="text-sm text-white/45">Loading active opportunities…</p>;

  return <><PageTitle eyebrow="Opportunity marketplace / explainable" title="Opportunities matched to your evidence" description="Scores show the reason behind each match: skills, evidence, eligibility and career relevance — never a black-box recommendation." />{!opportunities.length ? <Empty title="No active opportunities" body="When industry partners publish internships, projects or missions, they will appear here with structured requirements." /> : <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]"><div className="space-y-3">{opportunities.map((opportunity) => { const score = scoreFor(opportunity)?.matchScore ?? 0; return <button key={opportunity.id} onClick={() => { setChosenId(opportunity.id); setApplyError(null); }} className={`w-full rounded-xl border p-4 text-left ${chosen?.id === opportunity.id ? "border-violet-300/40 bg-violet-300/[.08]" : "border-white/10 bg-white/[.025] hover:bg-white/[.04]"}`}><div className="flex justify-between gap-4"><div><p className="font-bold text-white">{opportunity.title}</p><p className="mt-1 text-xs text-white/40">{opportunity.organizationName} · {opportunity.type.replace(/_/g, " ")}</p></div><p className="text-lg font-bold text-violet-200">{matchesLoading ? "…" : `${score}%`}</p></div></button>; })}</div>{chosen && match && <OpportunityDetail opportunity={chosen} match={match} applied={applied} submitting={submitting} error={applyError} onApply={apply} />}</div>}</>;
}

function OpportunityDetail({ opportunity, match, applied, submitting, error, onApply }: { opportunity: Opportunity; match: MatchResult; applied: boolean; submitting: boolean; error: string | null; onApply: () => void }) {
  return <article className="rounded-xl border border-white/10 bg-white/[.025] p-6"><div className="flex items-start justify-between gap-4"><div><Status value={opportunity.type} /><h2 className="mt-3 text-2xl font-bold text-white">{opportunity.title}</h2><p className="mt-1 text-sm text-white/45">{opportunity.organizationName} · {opportunity.location || "Location not specified"} · {opportunity.mode}</p></div><p className="text-4xl font-bold tracking-tight text-violet-200">{match.matchScore}%</p></div><p className="mt-5 text-sm leading-6 text-white/55">{opportunity.description}</p><div className="mt-6 grid gap-5 border-y border-white/10 py-5 md:grid-cols-2"><div><p className="text-[10px] uppercase tracking-[.14em] text-white/35">You meet</p><ul className="mt-3 space-y-2 text-sm text-emerald-100">{match.matchedSkills.filter((skill) => skill.meets).map((skill) => <li key={skill.skillId}><Check className="mr-2 inline" size={14} />{skill.skillName}</li>)}{!match.matchedSkills.some((skill) => skill.meets) && <li className="text-white/45">No required skill is at target level yet.</li>}</ul></div><div><p className="text-[10px] uppercase tracking-[.14em] text-white/35">Strengthen before applying</p><ul className="mt-3 space-y-2 text-sm text-amber-100">{match.missingSkills.map((skill) => <li key={skill.skillId}>{skill.skillName} · {skill.gap}% gap</li>)}{!match.missingSkills.length && <li className="text-emerald-100">No declared skill gaps.</li>}</ul></div></div><div className="mt-5"><p className="text-[10px] uppercase tracking-[.14em] text-white/35">Why this score</p><ul className="mt-3 space-y-2 text-sm text-white/55">{match.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div>{error && <p className="mt-5 rounded-lg border border-amber-300/25 bg-amber-300/[.08] px-3 py-2 text-xs text-amber-100">{error}</p>}<button disabled={applied || submitting || match.eligibilityStatus === "ineligible"} onClick={onApply} className="mt-7 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-40">{applied ? "Already applied" : submitting ? "Submitting…" : match.eligibilityStatus === "ineligible" ? "Not eligible" : "Apply with this evidence"}</button></article>;
}

function Applications() {
  const { data: student } = useStudentProfile();
  const { data: applications = [], isLoading } = useApplications(student?.id);
  if (isLoading) return <p className="text-sm text-white/45">Loading your applications…</p>;
  return <><PageTitle eyebrow="Applications / outcome tracking" title="Your opportunity lifecycle" description="Applications stay connected to the evidence and explainable score present when you applied." />{!applications.length ? <Empty title="No applications yet" body="Explore opportunities to view a transparent match explanation before applying." action={<Link to="/app/student/opportunities" className="text-sm font-semibold text-violet-200">Explore opportunities</Link>} /> : <div className="space-y-3">{applications.map((application) => <article key={application.id} className="flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-white/[.025] p-5 md:flex-row md:items-center"><div><h2 className="font-bold text-white">{application.opportunityTitle}</h2><p className="mt-1 text-xs text-white/45">Applied with a {application.matchScore}% explainable match</p></div><div className="flex items-center gap-4"><p className="text-sm text-violet-200">{application.matchDetails?.matchedSkills?.length ?? 0} matched skills</p><Status value={application.status} /></div></article>)}</div>}</>;
}

export default function WorkspaceAdvanced() {
  const { role } = useAuth();
  const { pathname } = useLocation();
  const page = (pathname.split("/")[3] || "overview") as StudentPage;
  if (role && role !== "student") return <RoleWorkspaces role={role} />;
  const pages: Record<StudentPage, React.ReactNode> = { overview: <Overview />, "skill-dna": <SkillDNA />, career: <Career />, roadmap: <Roadmap />, opportunities: <Opportunities />, applications: <Applications /> };
  return <Shell page={pages[page] ? page : "overview"}>{pages[page] || pages.overview}</Shell>;
}
