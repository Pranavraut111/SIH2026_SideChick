/**
 * ShikshaSetu Demo Data Seed Script
 *
 * Seeds the interconnected reference data the platform needs to function: the skill
 * catalog, career roles and their weighted requirements, institutions, organizations,
 * opportunities, industry demand signals, curriculum mappings and a demo cohort.
 *
 * Idempotent — every document uses a deterministic id, so re-running updates in place
 * rather than appending duplicates.
 *
 * Run with: pnpm seed
 * Requires FIREBASE_SERVICE_ACCOUNT_PATH env var pointing to service account JSON.
 *
 * Note on demo users: seeded students and faculty carry placeholder `userId` values and
 * have no Firebase Auth account, so nobody can sign in *as* them. They exist to give
 * institution and industry dashboards a real cohort to aggregate. Sign up normally and
 * select "ShikshaSetu Institute of Technology" to join the same institution.
 */
// Loads `.env` the same way the server does. Without this the script only saw variables
// already exported in the shell, so it failed even with a correctly configured `.env`.
import 'dotenv/config';
import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// ============================================
// Initialize Firebase Admin
// ============================================
const DEFAULT_SERVICE_ACCOUNT = './firebase-service-account.json';
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || DEFAULT_SERVICE_ACCOUNT;
const resolvedPath = resolve(serviceAccountPath);

if (!existsSync(resolvedPath)) {
  console.error(`❌ Service account key not found at: ${resolvedPath}\n`);
  console.error('   Fix one of the following:');
  console.error('   1. Set FIREBASE_SERVICE_ACCOUNT_PATH in .env to your service account JSON, or');
  console.error(`   2. Save the key as ${DEFAULT_SERVICE_ACCOUNT} in the project root.\n`);
  console.error('   Firebase console → Project settings → Service accounts → Generate new private key.');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(resolvedPath, 'utf-8')) as ServiceAccount;
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const now = FieldValue.serverTimestamp();

// ============================================
// Seed Data
// ============================================

const skillCategories = [
  { id: 'cat-prog', name: 'Programming', domain: 'Engineering', displayOrder: 1 },
  { id: 'cat-data', name: 'Data', domain: 'Engineering', displayOrder: 2 },
  { id: 'cat-aiml', name: 'AI / ML', domain: 'Intelligence', displayOrder: 3 },
  { id: 'cat-devops', name: 'DevOps', domain: 'Engineering', displayOrder: 4 },
  { id: 'cat-cloud', name: 'Cloud', domain: 'Infrastructure', displayOrder: 5 },
  { id: 'cat-prod', name: 'Production', domain: 'Engineering', displayOrder: 6 },
];

const skills = [
  { id: 'skill-python', name: 'Python', category: 'Programming', categoryId: 'cat-prog' },
  { id: 'skill-sql', name: 'SQL', category: 'Data', categoryId: 'cat-data' },
  { id: 'skill-ml', name: 'Machine Learning', category: 'AI / ML', categoryId: 'cat-aiml' },
  { id: 'skill-docker', name: 'Docker', category: 'DevOps', categoryId: 'cat-devops' },
  { id: 'skill-aws', name: 'AWS', category: 'Cloud', categoryId: 'cat-cloud' },
  { id: 'skill-mlops', name: 'MLOps', category: 'Production', categoryId: 'cat-prod' },
  { id: 'skill-dl', name: 'Deep Learning', category: 'AI / ML', categoryId: 'cat-aiml' },
  { id: 'skill-stats', name: 'Statistics', category: 'Data', categoryId: 'cat-data' },
  { id: 'skill-react', name: 'React', category: 'Programming', categoryId: 'cat-prog' },
  { id: 'skill-genai', name: 'Generative AI', category: 'AI / ML', categoryId: 'cat-aiml' },
  { id: 'skill-vector', name: 'Vector Search', category: 'Data', categoryId: 'cat-data' },
  { id: 'skill-cloud', name: 'Cloud Computing', category: 'Cloud', categoryId: 'cat-cloud' },
];

const roles = [
  {
    id: 'role-aiml', title: 'AI / ML Engineer', domain: 'Technology',
    requiredSkills: [
      { skillId: 'skill-python', skillName: 'Python', minimumLevel: 85, weight: 0.25 },
      { skillId: 'skill-ml', skillName: 'Machine Learning', minimumLevel: 82, weight: 0.25 },
      { skillId: 'skill-sql', skillName: 'SQL', minimumLevel: 80, weight: 0.15 },
      { skillId: 'skill-docker', skillName: 'Docker', minimumLevel: 75, weight: 0.15 },
      { skillId: 'skill-aws', skillName: 'AWS', minimumLevel: 68, weight: 0.10 },
      { skillId: 'skill-mlops', skillName: 'MLOps', minimumLevel: 62, weight: 0.10 },
    ],
    demand: { growth: '+34%', demandIndex: 87, trend: 'rising', period: '2026 Q3' },
    opportunityCount: 127,
  },
  {
    id: 'role-ds', title: 'Data Scientist', domain: 'Technology',
    requiredSkills: [
      { skillId: 'skill-python', skillName: 'Python', minimumLevel: 80, weight: 0.20 },
      { skillId: 'skill-ml', skillName: 'Machine Learning', minimumLevel: 78, weight: 0.20 },
      { skillId: 'skill-stats', skillName: 'Statistics', minimumLevel: 75, weight: 0.20 },
      { skillId: 'skill-sql', skillName: 'SQL', minimumLevel: 80, weight: 0.20 },
      { skillId: 'skill-dl', skillName: 'Deep Learning', minimumLevel: 65, weight: 0.20 },
    ],
    demand: { growth: '+21%', demandIndex: 76, trend: 'rising', period: '2026 Q3' },
    opportunityCount: 218,
  },
  {
    id: 'role-mlops', title: 'MLOps Engineer', domain: 'Technology',
    requiredSkills: [
      { skillId: 'skill-docker', skillName: 'Docker', minimumLevel: 80, weight: 0.25 },
      { skillId: 'skill-aws', skillName: 'AWS', minimumLevel: 75, weight: 0.25 },
      { skillId: 'skill-mlops', skillName: 'MLOps', minimumLevel: 78, weight: 0.25 },
      { skillId: 'skill-python', skillName: 'Python', minimumLevel: 75, weight: 0.15 },
      { skillId: 'skill-ml', skillName: 'Machine Learning', minimumLevel: 60, weight: 0.10 },
    ],
    demand: { growth: '+47%', demandIndex: 92, trend: 'rising', period: '2026 Q3' },
    opportunityCount: 64,
  },
];

const institutions = [
  {
    id: 'inst-sit', name: 'ShikshaSetu Institute of Technology', type: 'college',
    location: 'Pune, Maharashtra', departments: ['CSE', 'IT', 'ECE', 'ME'],
    metrics: {
      totalStudents: 8421, placementReadiness: 67, industryAlignment: 71,
      activeInterventions: 6, verifiedSkillsAvg: 1.4, criticalGapCount: 3,
    },
    adminIds: [],
  },
];

const organizations = [
  {
    id: 'org-nova', name: 'Nova Systems', domain: 'Technology',
    description: 'AI-first engineering company building intelligent document systems.',
    size: 'medium', locations: ['Bengaluru', 'Pune'], adminIds: [],
    metrics: { activeOpportunities: 4, totalApplications: 86, hiredCount: 12, averageMatchScore: 78 },
  },
  {
    id: 'org-orbit', name: 'Orbit Labs', domain: 'Cloud Infrastructure',
    description: 'Cloud-native infrastructure and platform engineering.',
    size: 'small', locations: ['Hyderabad'], adminIds: [],
    metrics: { activeOpportunities: 2, totalApplications: 41, hiredCount: 5, averageMatchScore: 72 },
  },
];

const opportunities = [
  {
    id: 'opp-1', type: 'internship', title: 'AI / ML Intern', description: 'Build and deploy ML models for document intelligence.',
    organizationId: 'org-nova', organizationName: 'Nova Systems',
    requiredSkills: [
      { skillId: 'skill-python', skillName: 'Python', minimumLevel: 80 },
      { skillId: 'skill-ml', skillName: 'Machine Learning', minimumLevel: 70 },
      { skillId: 'skill-sql', skillName: 'SQL', minimumLevel: 70 },
    ],
    preferredSkills: [{ skillId: 'skill-docker', skillName: 'Docker', minimumLevel: 50 }],
    location: 'Bengaluru', mode: 'hybrid', duration: '6 months', stipend: '₹25,000/month',
    deadline: Timestamp.fromDate(new Date('2026-10-01')),
    status: 'active', createdBy: 'system', difficulty: 'intermediate',
    positions: 3, applicationCount: 12,
  },
  {
    id: 'opp-2', type: 'internship', title: 'Cloud Engineering Intern', description: 'Work on Kubernetes-based platform engineering.',
    organizationId: 'org-orbit', organizationName: 'Orbit Labs',
    requiredSkills: [
      { skillId: 'skill-docker', skillName: 'Docker', minimumLevel: 70 },
      { skillId: 'skill-aws', skillName: 'AWS', minimumLevel: 60 },
      { skillId: 'skill-python', skillName: 'Python', minimumLevel: 70 },
    ],
    location: 'Hyderabad', mode: 'onsite', duration: '3 months', stipend: '₹20,000/month',
    deadline: Timestamp.fromDate(new Date('2026-09-30')),
    status: 'active', createdBy: 'system', difficulty: 'intermediate',
    positions: 2, applicationCount: 8,
  },
  {
    id: 'opp-3', type: 'project', title: 'Data Engineering Pipeline', description: 'Design and implement a real-time data pipeline.',
    organizationId: 'org-nova', organizationName: 'Nova Systems',
    requiredSkills: [
      { skillId: 'skill-python', skillName: 'Python', minimumLevel: 75 },
      { skillId: 'skill-sql', skillName: 'SQL', minimumLevel: 80 },
      { skillId: 'skill-mlops', skillName: 'MLOps', minimumLevel: 50 },
    ],
    location: 'Remote', mode: 'remote', duration: '8 weeks',
    status: 'active', createdBy: 'system', difficulty: 'advanced',
    positions: 1, applicationCount: 5,
  },
];

const industrySignals = [
  { skillId: 'skill-mlops', skillName: 'MLOps', demandLevel: 81, demandChange: '+31%', studentReadiness: 34, period: '2026 Q3', source: 'seeded' },
  { skillId: 'skill-genai', skillName: 'Generative AI', demandLevel: 94, demandChange: '+34%', studentReadiness: 42, period: '2026 Q3', source: 'seeded' },
  { skillId: 'skill-cloud', skillName: 'Cloud Computing', demandLevel: 88, demandChange: '+27%', studentReadiness: 51, period: '2026 Q3', source: 'seeded' },
  { skillId: 'skill-docker', skillName: 'Docker', demandLevel: 76, demandChange: '+22%', studentReadiness: 38, period: '2026 Q3', source: 'seeded' },
  { skillId: 'skill-python', skillName: 'Python', demandLevel: 72, demandChange: '+8%', studentReadiness: 74, period: '2026 Q3', source: 'seeded' },
];

const curriculumMappings = [
  { courseId: 'c1', courseName: 'ML Fundamentals', institutionId: 'inst-sit', skillId: 'skill-python', skillName: 'Python', coverageLevel: 92, industryDemand: 88, gapSeverity: 'aligned' },
  { courseId: 'c1', courseName: 'ML Fundamentals', institutionId: 'inst-sit', skillId: 'skill-mlops', skillName: 'MLOps', coverageLevel: 12, industryDemand: 81, gapSeverity: 'critical' },
  { courseId: 'c2', courseName: 'Cloud Computing', institutionId: 'inst-sit', skillId: 'skill-docker', skillName: 'Docker', coverageLevel: 31, industryDemand: 76, gapSeverity: 'high' },
  { courseId: 'c3', courseName: 'Data Systems', institutionId: 'inst-sit', skillId: 'skill-vector', skillName: 'Vector Search', coverageLevel: 8, industryDemand: 68, gapSeverity: 'critical' },
];

const aanyaSkills = [
  { skillId: 'skill-python', skillName: 'Python', category: 'Programming', proficiency: 91, requiredLevel: 85, confidence: 94, evidenceCount: 8, status: 'verified', source: 'assessment', recency: '12 days ago' },
  { skillId: 'skill-sql', skillName: 'SQL', category: 'Data', proficiency: 84, requiredLevel: 80, confidence: 88, evidenceCount: 5, status: 'verified', source: 'course', recency: '1 month ago' },
  { skillId: 'skill-ml', skillName: 'Machine Learning', category: 'AI / ML', proficiency: 72, requiredLevel: 82, confidence: 71, evidenceCount: 4, status: 'in_progress', source: 'project', recency: '8 days ago' },
  { skillId: 'skill-docker', skillName: 'Docker', category: 'DevOps', proficiency: 31, requiredLevel: 75, confidence: 68, evidenceCount: 3, status: 'critical_gap', source: 'self_declared', recency: '3 months ago' },
  { skillId: 'skill-aws', skillName: 'AWS', category: 'Cloud', proficiency: 24, requiredLevel: 68, confidence: 30, evidenceCount: 1, status: 'critical_gap', source: 'self_declared', recency: '5 months ago' },
  { skillId: 'skill-mlops', skillName: 'MLOps', category: 'Production', proficiency: 18, requiredLevel: 62, confidence: 22, evidenceCount: 0, status: 'not_started', source: 'self_declared', recency: 'Never' },
];

const aanyaRoadmap = {
  targetRole: 'AI / ML Engineer', targetRoleId: 'role-aiml', title: 'AI / ML Engineer Pathway',
  status: 'active', estimatedDuration: '6 months', source: 'seeded',
  nodes: [
    { id: 'goal', type: 'goal', title: 'AI / ML Engineer', meta: 'Career target', status: 'verified', position: { x: 30, y: 200 } },
    { id: 'ml', type: 'skill', title: 'Machine Learning', meta: '72% · in progress', status: 'in_progress', skills: ['Machine Learning'], position: { x: 280, y: 90 } },
    { id: 'docker', type: 'skill', title: 'Docker', meta: '31% / 75% required', status: 'critical_gap', skills: ['Docker'], position: { x: 280, y: 300 } },
    { id: 'project', type: 'project', title: 'Production ML API', meta: '3 weeks · recommended', status: 'recommended', skills: ['Docker', 'Python'], duration: '3 weeks', position: { x: 560, y: 90 } },
    { id: 'mission', type: 'industry_mission', title: 'Document pipeline', meta: 'Industry challenge', status: 'locked', skills: ['Docker', 'Python', 'ML'], position: { x: 560, y: 300 } },
    { id: 'outcome', type: 'outcome', title: 'Role ready', meta: '18 opportunities unlock', status: 'locked', position: { x: 840, y: 200 } },
  ],
  edges: [
    { id: 'e1', source: 'goal', target: 'ml', animated: true },
    { id: 'e2', source: 'goal', target: 'docker', animated: true },
    { id: 'e3', source: 'ml', target: 'project' },
    { id: 'e4', source: 'docker', target: 'mission' },
    { id: 'e5', source: 'project', target: 'outcome' },
    { id: 'e6', source: 'mission', target: 'outcome' },
  ],
};

// ============================================
// Seed Function
// ============================================

async function seed() {
  console.log('🌱 Seeding ShikshaSetu demo data...\n');

  const collections: [string, { id: string;[k: string]: any }[]][] = [
    ['skillCategories', skillCategories],
    ['skills', skills],
    ['roles', roles],
    ['institutions', institutions],
    ['organizations', organizations],
    ['opportunities', opportunities],
  ];

  for (const [name, items] of collections) {
    console.log(`  → ${name}...`);
    for (const item of items) {
      const { id, ...data } = item;
      await db.collection(name).doc(id).set({ ...data, createdAt: now, updatedAt: now });
    }
  }

  // Deterministic ids: re-running the seed must update the same documents rather than
  // appending a duplicate set. Auto-ids previously made every run additive, so the
  // institution dashboard drifted further from reality with each reseed.
  console.log('  → Industry signals...');
  for (const signal of industrySignals) {
    await db.collection('industrySignals').doc(`signal-${signal.skillId}-${signal.period.replace(/\s+/g, '')}`)
      .set({ ...signal, createdAt: now, updatedAt: now });
  }

  console.log('  → Curriculum mappings...');
  for (const mapping of curriculumMappings) {
    await db.collection('curriculumMappings').doc(`map-${mapping.institutionId}-${mapping.courseId}-${mapping.skillId}`)
      .set({ ...mapping, createdAt: now, updatedAt: now });
  }

  // Demo student: Aanya Sharma
  console.log('  → Demo student (Aanya Sharma)...');
  const aanyaId = 'student-aanya';
  await db.collection('students').doc(aanyaId).set({
    userId: 'demo-student-uid', institutionId: 'inst-sit', department: 'CSE', batch: '2027',
    enrollmentId: 'SIT2027CS042', displayName: 'Aanya Sharma', email: 'aanya@demo.shikshasetu.in',
    // Counts are kept consistent with the six skill profiles seeded below, so the
    // dashboard's headline numbers agree with the table underneath them.
    careerTarget: 'AI / ML Engineer', careerTargetId: 'role-aiml',
    readinessScore: 75, verifiedSkillCount: 2, matchedOpportunityCount: 2,
    // criticalGaps counts Docker and AWS; MLOps has no evidence, so it is not_started.
    metrics: { totalSkills: 6, verifiedSkills: 2, criticalGaps: 2, activeApplications: 0, completedMissions: 0, evidenceCount: 21 },
    createdAt: now, updatedAt: now,
  });

  for (const sp of aanyaSkills) {
    await db.collection('students').doc(aanyaId).collection('skillProfiles').doc(sp.skillId).set({ ...sp, createdAt: now, updatedAt: now });
  }

  await db.collection('students').doc(aanyaId).collection('roadmaps').doc('roadmap-aiml').set({ ...aanyaRoadmap, studentId: aanyaId, createdAt: now, updatedAt: now });

  // Additional demo students
  const demoStudents = [
    { id: 'student-rohan', name: 'Rohan Mehta', dept: 'CSE', readiness: 86, skills: 22, gaps: 1 },
    { id: 'student-meera', name: 'Meera Iyer', dept: 'IT', readiness: 78, skills: 16, gaps: 2 },
    { id: 'student-arjun', name: 'Arjun Nair', dept: 'CSE', readiness: 63, skills: 11, gaps: 3 },
    { id: 'student-priya', name: 'Priya Deshmukh', dept: 'ECE', readiness: 55, skills: 9, gaps: 4 },
  ];

  for (const s of demoStudents) {
    await db.collection('students').doc(s.id).set({
      userId: `demo-${s.id}-uid`, institutionId: 'inst-sit', department: s.dept, batch: '2027',
      displayName: s.name, email: `${s.name.split(' ')[0].toLowerCase()}@demo.shikshasetu.in`,
      careerTarget: 'AI / ML Engineer', careerTargetId: 'role-aiml', readinessScore: s.readiness,
      verifiedSkillCount: s.skills, matchedOpportunityCount: Math.round(s.readiness * 0.65),
      metrics: { totalSkills: s.skills, verifiedSkills: Math.round(s.skills * 0.6), criticalGaps: s.gaps,
        activeApplications: 0, completedMissions: 0, evidenceCount: s.skills * 2 },
      createdAt: now, updatedAt: now,
    });
  }

  // Demo faculty
  console.log('  → Demo faculty (Dr. Kavita Rao)...');
  await db.collection('faculty').doc('faculty-kavita').set({
    userId: 'demo-faculty-uid', institutionId: 'inst-sit', displayName: 'Dr. Kavita Rao',
    email: 'kavita.rao@demo.shikshasetu.in', department: 'Computer Science',
    designation: 'Associate Professor', specializations: ['Applied ML', 'NLP', 'Data Engineering'],
    industryExposure: 47, exposureChange: '+8% this year',
    metrics: { industryProjects: 4, mentoredStudents: 38, researchLinks: 6, fdpCompleted: 3, guestLectures: 5, consultancies: 1 },
    createdAt: now, updatedAt: now,
  });

  console.log('\n✅ Seed complete! All demo data written to Firestore.\n');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
