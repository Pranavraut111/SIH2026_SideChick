import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, Building2, ChevronRight, GraduationCap, Plus, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCareerRoles, useCurriculumMappings, useFacultyProfile, useIndustryDemand,
  useInstitutionProfile, useInstitutionStudents, useOpportunities,
  useOrganizationApplications, useOrganizationProfile, useTalentPool,
} from "@/hooks/useData";
import { createOpportunity } from "@/services/opportunity.service";
import { updateApplicationStatus } from "@/services/application.service";
import { updateFacultyProfile } from "@/services/faculty.service";
import { runSimulation } from "@/services/institution.service";
import type { ApplicationStatus, OpportunityType, UserRole } from "@shared/types";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={"rounded-xl border border-white/10 bg-white/[.025] p-5 " + className}>{children}</section>;
}
function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <Card><p className="text-[10px] uppercase tracking-[.14em] text-white/35">{label}</p><p className="mt-3 text-3xl font-bold text-white">{value}</p><p className="mt-1 text-xs text-white/40">{detail}</p></Card>;
}
function Title({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-[10px] uppercase tracking-[.16em] text-violet-200/70">{eyebrow}</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-white">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">{description}</p></div>{action}</div>;
}
function Empty({ title, body }: { title: string; body: string }) {
  return <Card className="border-dashed text-center"><h2 className="font-bold text-white">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/45">{body}</p></Card>;
}
function Status({ value }: { value: string }) {
  const color = value === "selected" || value === "completed" ? "bg-emerald-400/10 text-emerald-200" : value === "rejected" ? "bg-red-400/10 text-red-200" : "bg-violet-400/10 text-violet-200";
  return <span className={"rounded-full px-2 py-1 text-[10px] font-semibold capitalize " + color}>{value.replace(/_/g, " ")}</span>;
}
function Shell({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const { userProfile, signOut } = useAuth();
  const label = role === "industry" ? "Industry workspace" : role === "faculty" ? "Faculty workspace" : "Institution command center";
  return <div className="min-h-screen bg-[#080809] text-[#f2f0ed]"><header className="border-b border-white/10 bg-[#0b0b0d] px-5 py-4"><div className="mx-auto flex max-w-7xl items-center justify-between"><div><p className="font-bold text-white">ShikshaSetu</p><p className="mt-1 text-xs text-white/40">{label}</p></div><div className="flex items-center gap-4 text-sm"><span className="hidden text-white/50 sm:block">{userProfile?.displayName}</span><button className="text-white/50 hover:text-white" onClick={signOut}>Sign out</button></div></div></header><main className="mx-auto max-w-7xl px-5 py-8">{children}</main></div>;
}

function FacultyWorkspace() {
  const { data: faculty, isLoading } = useFacultyProfile();
  const { data: opportunities = [] } = useOpportunities();
  const client = useQueryClient();
  const [specialization, setSpecialization] = useState("");
  const [saving, setSaving] = useState(false);
  const relevant = opportunities.filter((item) => ["fdp", "mentorship", "workshop", "research_project", "consultancy"].includes(item.type));
  const addSpecialization = async () => {
    const clean = specialization.trim();
    if (!faculty || !clean || faculty.specializations.includes(clean)) return;
    setSaving(true);
    try {
      await updateFacultyProfile(faculty.id, { specializations: [...faculty.specializations, clean] });
      await client.invalidateQueries({ queryKey: ["faculty"] });
      setSpecialization("");
    } finally { setSaving(false); }
  };
  if (isLoading) return <p className="text-sm text-white/45">Loading faculty profile…</p>;
  if (!faculty) return <Empty title="Faculty profile unavailable" body="Your role profile was not found. Complete faculty onboarding before using the passport." />;
  return <><Title eyebrow="Faculty / industry passport" title={faculty.displayName} description="Track industry exposure, maintain your professional evidence, and discover real collaboration opportunities." /><div className="grid gap-4 md:grid-cols-4"><Metric label="Industry exposure" value={faculty.industryExposure + "%"} detail={faculty.exposureChange || "No trend recorded"} /><Metric label="Industry projects" value={faculty.metrics.industryProjects} detail="verified engagements" /><Metric label="Students mentored" value={faculty.metrics.mentoredStudents} detail="from your profile" /><Metric label="FDP completed" value={faculty.metrics.fdpCompleted} detail="verified programmes" /></div><div className="mt-6 grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><Card><p className="text-[10px] uppercase tracking-[.14em] text-white/35">Professional profile</p><h2 className="mt-3 text-xl font-bold text-white">{faculty.designation || "Designation not added"}</h2><p className="mt-1 text-sm text-white/45">{faculty.department || "Department not added"}</p><div className="mt-6 flex flex-wrap gap-2">{faculty.specializations.map((item) => <span key={item} className="rounded-full bg-violet-400/10 px-2.5 py-1 text-xs text-violet-100">{item}</span>)}</div><div className="mt-5 flex gap-2"><input value={specialization} onChange={(event) => setSpecialization(event.target.value)} placeholder="Add a specialization" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none" /><button disabled={saving} onClick={addSpecialization} className="rounded-lg bg-white px-3 text-sm font-bold text-black disabled:opacity-50">Add</button></div></Card><Card><p className="text-[10px] uppercase tracking-[.14em] text-white/35">Industry opportunities</p>{relevant.length ? <div className="mt-3 divide-y divide-white/[.08]">{relevant.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-3"><div><p className="font-semibold text-white">{item.title}</p><p className="mt-1 text-xs text-white/40">{item.organizationName} · {item.type.replace(/_/g, " ")}</p></div><ChevronRight size={16} className="text-white/30" /></div>)}</div> : <p className="mt-3 text-sm text-white/45">No faculty-focused opportunities are active.</p>}</Card></div></>;
}

function IndustryWorkspace() {
  const { userProfile } = useAuth();
  const organizationId = userProfile?.organizationId;
  const { data: organization } = useOrganizationProfile(organizationId);
  const { data: opportunities = [] } = useOpportunities(organizationId ? { organizationId } : {});
  const { data: applications = [] } = useOrganizationApplications(organizationId);
  const { data: talent = [] } = useTalentPool(60);
  const { data: roles = [] } = useCareerRoles();
  const client = useQueryClient();
  const [openForm, setOpenForm] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [form, setForm] = useState({ title: "", description: "", type: "internship" as OpportunityType, mode: "remote" as "remote" | "hybrid" | "onsite", duration: "", location: "" });
  const [saving, setSaving] = useState(false);
  const skillCatalog = useMemo(() => Array.from(new Map(roles.flatMap((role) => role.requiredSkills).map((skill) => [skill.skillId, skill])).values()), [roles]);
  const post = async () => {
    if (!organizationId || !organization || !form.title.trim() || !form.description.trim() || !selectedSkills.length) return;
    setSaving(true);
    try {
      await createOpportunity({ ...form, title: form.title.trim(), description: form.description.trim(), organizationId, organizationName: organization.name, requiredSkills: skillCatalog.filter((skill) => selectedSkills.includes(skill.skillId)), status: "active", createdBy: userProfile?.uid || "", difficulty: "intermediate", positions: 1 });
      await client.invalidateQueries({ queryKey: ["opportunities"] });
      setForm({ title: "", description: "", type: "internship", mode: "remote", duration: "", location: "" });
      setSelectedSkills([]);
      setOpenForm(false);
    } finally { setSaving(false); }
  };
  const moveApplication = async (id: string, status: ApplicationStatus) => {
    await updateApplicationStatus(id, status);
    await client.invalidateQueries({ queryKey: ["organizationApplications", organizationId] });
  };
  if (!organizationId) return <Empty title="Organization assignment required" body="Your industry account needs an organization before it can publish opportunities or view its pipeline. Create a new industry account with an organization ID, or have an administrator assign your account." />;
  return <><Title eyebrow="Industry / talent intelligence" title={organization?.name || "Organization workspace"} description="Publish structured opportunities, discover evidence-backed talent and move applicants through a visible pipeline." action={<button onClick={() => setOpenForm(!openForm)} className="rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-black"><Plus className="mr-1 inline" size={15} />Post opportunity</button>} />{openForm && <Card className="mb-6"><h2 className="font-bold text-white">Post an opportunity</h2><div className="mt-4 grid gap-3 md:grid-cols-2"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Opportunity title" className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white outline-none" /><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as OpportunityType })} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white"><option value="internship">Internship</option><option value="job">Job</option><option value="project">Project</option><option value="industry_mission">Industry mission</option><option value="mentorship">Mentorship</option><option value="learning_program">Learning program</option></select><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the real work and outcomes" className="min-h-24 rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white outline-none md:col-span-2" /><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white outline-none" /><input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="Duration, e.g. 8 weeks" className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white outline-none" /></div><p className="mt-4 text-xs text-white/45">Required skills</p><div className="mt-2 flex flex-wrap gap-2">{skillCatalog.map((skill) => <button key={skill.skillId} onClick={() => setSelectedSkills((current) => current.includes(skill.skillId) ? current.filter((id) => id !== skill.skillId) : [...current, skill.skillId])} className={"rounded-full px-2.5 py-1 text-xs " + (selectedSkills.includes(skill.skillId) ? "bg-violet-400/25 text-violet-100" : "bg-white/10 text-white/55")}>{skill.skillName}</button>)}</div><button disabled={saving || !selectedSkills.length} onClick={post} className="mt-5 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-black disabled:opacity-40">{saving ? "Publishing…" : "Publish opportunity"}</button></Card>}<div className="grid gap-4 md:grid-cols-3"><Metric label="Active opportunities" value={opportunities.length} detail="owned by your organization" /><Metric label="Applicants" value={applications.length} detail="across your pipeline" /><Metric label="Talent ready now" value={talent.filter((candidate) => candidate.readinessSegment === "ready_now").length} detail="readiness ≥ 80%" /></div><div className="mt-6 grid gap-5 lg:grid-cols-[.9fr_1.1fr]"><Card><p className="text-[10px] uppercase tracking-[.14em] text-white/35">Evidence-based talent pool</p>{talent.length ? <div className="mt-3 divide-y divide-white/[.08]">{talent.slice(0, 8).map((candidate) => <div key={candidate.studentId} className="flex items-center justify-between py-3"><div><p className="font-semibold text-white">{candidate.displayName}</p><p className="mt-1 text-xs text-white/40">{candidate.department} · batch {candidate.batch} · {candidate.verifiedProjects}</p></div><p className="font-bold text-violet-200">{candidate.compatibility}%</p></div>)}</div> : <p className="mt-3 text-sm text-white/45">No students meet the current readiness filter.</p>}</Card><Card><p className="text-[10px] uppercase tracking-[.14em] text-white/35">Recruitment pipeline</p>{applications.length ? <div className="mt-3 divide-y divide-white/[.08]">{applications.map((application) => <div key={application.id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"><div><p className="font-semibold text-white">{application.studentName}</p><p className="mt-1 text-xs text-white/40">{application.opportunityTitle} · {application.matchScore}% match</p></div><select value={application.status} onChange={(e) => moveApplication(application.id, e.target.value as ApplicationStatus)} className="rounded-lg border border-white/10 bg-black/20 p-2 text-xs text-white"><option value="applied">Applied</option><option value="under_review">Under review</option><option value="shortlisted">Shortlisted</option><option value="interview">Interview</option><option value="selected">Selected</option><option value="rejected">Rejected</option></select></div>)}</div> : <p className="mt-3 text-sm text-white/45">Applicants will appear here when students apply.</p>}</Card></div></>;
}

function InstitutionWorkspace() {
  const { userProfile } = useAuth();
  const institutionId = userProfile?.institutionId;
  const { data: institution } = useInstitutionProfile(institutionId);
  const { data: students = [] } = useInstitutionStudents(institutionId);
  const { data: curriculum = [] } = useCurriculumMappings(institutionId);
  const { data: demand = [] } = useIndustryDemand();
  const [cohort, setCohort] = useState(100);
  const [mentors, setMentors] = useState(3);
  const [weeks, setWeeks] = useState(6);
  if (!institutionId) return <Empty title="Institution assignment required" body="Your institution administrator account needs an institution before it can view cohort readiness or curriculum alignment." />;
  const baseline = students.length ? Math.round(students.reduce((sum, student) => sum + student.readinessScore, 0) / students.length) : 0;
  const simulation = runSimulation({ targetCohortSize: Math.min(cohort, students.length || cohort), mentorCount: mentors, durationWeeks: weeks, targetSkills: demand.slice(0, 3).map((item) => item.skillName) }, baseline);
  const ready = students.filter((student) => student.readinessScore >= 75).length;
  const priorityMappings = curriculum.filter((mapping) => mapping.gapSeverity !== "aligned");
  const simulationControls: Array<[string, number, (value: number) => void, number, number]> = [["Target cohort", cohort, setCohort, 1, Math.max(students.length, 1)], ["Mentors", mentors, setMentors, 0, 30], ["Duration (weeks)", weeks, setWeeks, 1, 24]];
  return <><Title eyebrow="Institution / command center" title={institution?.name || "Institution intelligence"} description="Monitor real student readiness, industry demand and curriculum coverage; then model an intervention before committing resources." /><div className="grid gap-4 md:grid-cols-4"><Metric label="Students" value={students.length} detail="in your connected cohort" /><Metric label="Placement ready" value={ready} detail={"of " + students.length + " at 75% readiness"} /><Metric label="Average readiness" value={baseline + "%"} detail="from student assessments" /><Metric label="Curriculum gaps" value={priorityMappings.length} detail="high, critical or missing mappings" /></div><div className="mt-6 grid gap-5 lg:grid-cols-[1fr_.9fr]"><Card><p className="text-[10px] uppercase tracking-[.14em] text-white/35">Student readiness</p>{students.length ? <div className="mt-4 divide-y divide-white/[.08]">{students.slice(0, 10).map((student) => <div key={student.id} className="flex items-center justify-between py-3"><div><p className="font-semibold text-white">{student.displayName}</p><p className="mt-1 text-xs text-white/40">{student.department} · {student.careerTarget || "Target not selected"}</p></div><p className="font-bold text-violet-200">{student.readinessScore}%</p></div>)}</div> : <p className="mt-3 text-sm text-white/45">No student profiles are connected to this institution yet.</p>}</Card><Card><p className="text-[10px] uppercase tracking-[.14em] text-white/35">Curriculum mirror</p>{priorityMappings.length ? <div className="mt-4 divide-y divide-white/[.08]">{priorityMappings.map((mapping) => <div key={mapping.id} className="flex items-center justify-between py-3"><div><p className="font-semibold text-white">{mapping.skillName}</p><p className="mt-1 text-xs text-white/40">{mapping.courseName} · {mapping.coverageLevel}% coverage</p></div><Status value={mapping.gapSeverity} /></div>)}</div> : <p className="mt-3 text-sm text-white/45">No curriculum gaps have been mapped yet.</p>}</Card></div><div className="mt-6 grid gap-5 lg:grid-cols-[.9fr_1.1fr]"><Card><p className="text-[10px] uppercase tracking-[.14em] text-white/35">What-if intervention</p><div className="mt-5 space-y-4">{simulationControls.map(([label, value, setValue, min, max]) => <label key={label} className="block text-sm text-white/60">{label}<div className="mt-2 flex items-center gap-3"><input type="range" min={min} max={max} value={value} onChange={(e) => setValue(Number(e.target.value))} className="flex-1 accent-violet-300" /><span className="w-8 text-right text-white">{value}</span></div></label>)}</div></Card><Card><p className="text-[10px] uppercase tracking-[.14em] text-white/35">Projected result</p><p className="mt-3 text-xs leading-5 text-white/45">Decision support only, based on the configured intervention model and your current cohort baseline.</p><div className="mt-5 grid grid-cols-2 gap-3"><Metric label="Readiness" value={simulation.projectedReadiness + "%"} detail={"from " + baseline + "%"} /><Metric label="Near-ready" value={simulation.eligibleStudents} detail="projected students" /><Metric label="Threshold crossings" value={simulation.thresholdCrossings} detail="potentially moved" /><Metric label="Verified skills" value={simulation.verifiedSkillsAvg} detail="projected average" /></div></Card></div><Card className="mt-6"><p className="text-[10px] uppercase tracking-[.14em] text-white/35">Industry demand</p><div className="mt-4 grid gap-3 md:grid-cols-3">{demand.slice(0, 6).map((signal) => <div key={signal.id} className="rounded-lg border border-white/10 p-3"><p className="font-semibold text-white">{signal.skillName}</p><p className="mt-2 text-2xl font-bold text-violet-200">{signal.demandLevel}%</p><p className="mt-1 text-xs text-white/40">{signal.demandChange} · readiness {signal.studentReadiness}%</p></div>)}</div></Card></>;
}

export default function RoleWorkspaces({ role }: { role: UserRole }) {
  const page = useLocation().pathname.split("/")[3] || "overview";
  const content = role === "faculty" ? <FacultyWorkspace /> : role === "industry" ? <IndustryWorkspace /> : <InstitutionWorkspace />;
  return <Shell role={role}>{content}</Shell>;
}
