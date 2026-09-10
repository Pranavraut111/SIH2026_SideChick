/**
 * Tests for the deterministic domain engines.
 *
 * These functions decide what a student is told about themselves and what a recruiter
 * ranks them on, so the properties asserted here are product guarantees, not
 * implementation details.
 */
import { describe, it, expect } from 'vitest';
import { computeRoleReadiness } from './readiness';
import { computeSkillGaps, gapSeverity } from './gaps';
import { deriveSkillStatus, clampScore, describeRecency } from './skill-status';
import { calculateMatch } from './matching';
import type { RoleSkillRequirement, SkillProfile, Opportunity, Student } from '../types';

// ============================================
// Fixtures
// ============================================

const requirements: RoleSkillRequirement[] = [
  { skillId: 'python', skillName: 'Python', minimumLevel: 80, weight: 0.5 },
  { skillId: 'docker', skillName: 'Docker', minimumLevel: 60, weight: 0.3 },
  { skillId: 'aws', skillName: 'AWS', minimumLevel: 50, weight: 0.2 },
];

function skill(skillId: string, proficiency: number, extra: Partial<SkillProfile> = {}): SkillProfile {
  return {
    id: skillId,
    skillId,
    skillName: skillId,
    category: 'Test',
    proficiency,
    requiredLevel: 80,
    confidence: 80,
    evidenceCount: 3,
    status: 'in_progress',
    source: 'assessment',
    recency: 'Today',
    createdAt: null as never,
    updatedAt: null as never,
    ...extra,
  };
}

function student(overrides: Partial<Student> = {}): Student {
  return {
    id: 'stu-1',
    userId: 'uid-1',
    institutionId: 'inst-1',
    department: 'CSE',
    batch: '2027',
    displayName: 'Test Student',
    email: 't@example.com',
    careerTarget: 'ML Engineer',
    readinessScore: 60,
    verifiedSkillCount: 1,
    matchedOpportunityCount: 0,
    metrics: {
      totalSkills: 3,
      verifiedSkills: 1,
      criticalGaps: 1,
      activeApplications: 0,
      completedMissions: 0,
      evidenceCount: 4,
    },
    createdAt: null as never,
    updatedAt: null as never,
    ...overrides,
  };
}

function opportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: 'opp-1',
    type: 'internship',
    title: 'ML Engineer Intern',
    description: 'Build models',
    organizationId: 'org-1',
    organizationName: 'Nova',
    requiredSkills: [
      { skillId: 'python', skillName: 'Python', minimumLevel: 80 },
      { skillId: 'docker', skillName: 'Docker', minimumLevel: 60 },
    ],
    mode: 'remote',
    status: 'active',
    createdBy: 'uid-industry',
    applicationCount: 0,
    createdAt: null as never,
    updatedAt: null as never,
    ...overrides,
  };
}

// ============================================
// clampScore
// ============================================

describe('clampScore', () => {
  it('rounds to an integer within 0-100', () => {
    expect(clampScore(72.4)).toBe(72);
    expect(clampScore(72.6)).toBe(73);
  });

  it('clamps values outside the range', () => {
    expect(clampScore(150)).toBe(100);
    expect(clampScore(-20)).toBe(0);
  });

  it('treats non-numeric and non-finite input as zero', () => {
    expect(clampScore(undefined)).toBe(0);
    expect(clampScore(NaN)).toBe(0);
    expect(clampScore(Infinity)).toBe(0);
    expect(clampScore(-Infinity)).toBe(0);
    expect(clampScore('abc')).toBe(0);
  });
});

// ============================================
// deriveSkillStatus
// ============================================

describe('deriveSkillStatus', () => {
  it('marks 75 and above as verified', () => {
    expect(deriveSkillStatus(75, true)).toBe('verified');
    expect(deriveSkillStatus(100, true)).toBe('verified');
  });

  it('marks the 40-74 band as in progress', () => {
    expect(deriveSkillStatus(40, true)).toBe('in_progress');
    expect(deriveSkillStatus(74, true)).toBe('in_progress');
  });

  it('distinguishes a low score with evidence from one without', () => {
    expect(deriveSkillStatus(20, true)).toBe('critical_gap');
    expect(deriveSkillStatus(20, false)).toBe('not_started');
  });

  it('is a pure function of the score — the same input always yields the same label', () => {
    expect(deriveSkillStatus(65, true)).toBe(deriveSkillStatus(65, true));
  });
});

describe('describeRecency', () => {
  const now = new Date('2026-09-10T12:00:00Z');

  it('reports never when there is no verification', () => {
    expect(describeRecency(null, now)).toBe('Never');
  });

  it('scales the unit with the elapsed time', () => {
    expect(describeRecency(new Date('2026-09-10T09:00:00Z'), now)).toBe('Today');
    expect(describeRecency(new Date('2026-09-09T09:00:00Z'), now)).toBe('Yesterday');
    expect(describeRecency(new Date('2026-08-29T12:00:00Z'), now)).toBe('12 days ago');
    expect(describeRecency(new Date('2026-06-10T12:00:00Z'), now)).toBe('3 months ago');
    expect(describeRecency(new Date('2024-09-10T12:00:00Z'), now)).toBe('2 years ago');
  });
});

// ============================================
// Readiness
// ============================================

describe('computeRoleReadiness', () => {
  it('returns 100 only when every requirement is met', () => {
    const result = computeRoleReadiness(
      [
        { skillId: 'python', proficiency: 80 },
        { skillId: 'docker', proficiency: 60 },
        { skillId: 'aws', proficiency: 50 },
      ],
      requirements
    );
    expect(result.score).toBe(100);
    expect(result.unmeasuredSkills).toEqual([]);
  });

  it('counts unmeasured required skills as zero rather than ignoring them', () => {
    // This is the defect the old implementation had: averaging only the assessed skills
    // let a student assessed on one skill report near-total readiness.
    const result = computeRoleReadiness([{ skillId: 'python', proficiency: 100 }], requirements);
    expect(result.score).toBe(50); // Python's weight only
    expect(result.unmeasuredSkills).toEqual(['Docker', 'AWS']);
  });

  it('respects the role\'s declared weights', () => {
    // Meeting only the 0.5-weighted skill must score higher than meeting only the 0.2.
    const heavy = computeRoleReadiness([{ skillId: 'python', proficiency: 80 }], requirements);
    const light = computeRoleReadiness([{ skillId: 'aws', proficiency: 50 }], requirements);
    expect(heavy.score).toBe(50);
    expect(light.score).toBe(20);
  });

  it('caps per-skill credit so overshooting one skill cannot cover a gap in another', () => {
    const result = computeRoleReadiness(
      [
        { skillId: 'python', proficiency: 100 }, // far above the required 80
        { skillId: 'docker', proficiency: 0 },
        { skillId: 'aws', proficiency: 0 },
      ],
      requirements
    );
    expect(result.score).toBe(50);
  });

  it('falls back to equal weights when a role declares none', () => {
    const unweighted: RoleSkillRequirement[] = requirements.map((r) => ({ ...r, weight: 0 }));
    const result = computeRoleReadiness([{ skillId: 'python', proficiency: 80 }], unweighted);
    expect(result.score).toBe(33);
  });

  it('reports zero for a role with no declared requirements', () => {
    expect(computeRoleReadiness([{ skillId: 'python', proficiency: 100 }], []).score).toBe(0);
  });
});

// ============================================
// Gaps
// ============================================

describe('gapSeverity', () => {
  it('maps shortfall to the documented bands', () => {
    expect(gapSeverity(0)).toBe('none');
    expect(gapSeverity(5)).toBe('low');
    expect(gapSeverity(10)).toBe('medium');
    expect(gapSeverity(25)).toBe('high');
    expect(gapSeverity(40)).toBe('critical');
  });
});

describe('computeSkillGaps', () => {
  const profiles = [
    { skillId: 'python', proficiency: 85, category: 'Programming' },
    { skillId: 'docker', proficiency: 35, category: 'DevOps' },
  ];

  it('sorts the largest gap first so the caller can act on the top item', () => {
    const gaps = computeSkillGaps(profiles, requirements);
    expect(gaps[0].skillName).toBe('AWS'); // 50 - 0
    expect(gaps.map((g) => g.gap)).toEqual([50, 25, 0]);
  });

  it('never reports a negative gap when a skill exceeds its requirement', () => {
    const gaps = computeSkillGaps(profiles, requirements);
    const python = gaps.find((g) => g.skillId === 'python')!;
    expect(python.gap).toBe(0);
    expect(python.severity).toBe('none');
  });

  it('treats a missing skill profile as zero proficiency', () => {
    const gaps = computeSkillGaps([], requirements);
    expect(gaps.every((g) => g.currentLevel === 0)).toBe(true);
  });

  it('explains every gap with the numbers behind it', () => {
    const gaps = computeSkillGaps(profiles, requirements);
    const docker = gaps.find((g) => g.skillId === 'docker')!;
    expect(docker.reason).toContain('35%');
    expect(docker.reason).toContain('60%');
    expect(docker.recommendedIntervention).toContain('Docker');
  });
});

// ============================================
// Matching
// ============================================

describe('calculateMatch', () => {
  it('produces a higher score for a better-qualified student', () => {
    const strong = calculateMatch(student(), [skill('python', 90), skill('docker', 80)], opportunity());
    const weak = calculateMatch(student(), [skill('python', 20), skill('docker', 10)], opportunity());
    expect(strong.matchScore).toBeGreaterThan(weak.matchScore);
  });

  it('keeps the score within 0-100', () => {
    const result = calculateMatch(
      student(),
      [skill('python', 100, { evidenceCount: 50, confidence: 100, status: 'verified' })],
      opportunity()
    );
    expect(result.matchScore).toBeGreaterThanOrEqual(0);
    expect(result.matchScore).toBeLessThanOrEqual(100);
  });

  it('is deterministic — the same inputs always give the same score', () => {
    const profiles = [skill('python', 77), skill('docker', 55)];
    const a = calculateMatch(student(), profiles, opportunity());
    const b = calculateMatch(student(), profiles, opportunity());
    expect(a.matchScore).toBe(b.matchScore);
    expect(a.components).toEqual(b.components);
  });

  it('separates skills that meet the bar from those that fall short', () => {
    const result = calculateMatch(student(), [skill('python', 90), skill('docker', 30)], opportunity());
    expect(result.matchedSkills.find((s) => s.skillId === 'python')?.meets).toBe(true);
    expect(result.missingSkills.map((s) => s.skillId)).toEqual(['docker']);
    expect(result.missingSkills[0].gap).toBe(30);
  });

  it('does not divide by zero when a requirement is set to zero', () => {
    const result = calculateMatch(
      student(),
      [],
      opportunity({ requiredSkills: [{ skillId: 'python', skillName: 'Python', minimumLevel: 0 }] })
    );
    expect(Number.isFinite(result.matchScore)).toBe(true);
    expect(result.components.skillCompatibility).toBe(100);
  });

  it('gives a neutral, not perfect, skill score when an opportunity declares no skills', () => {
    const result = calculateMatch(student(), [skill('python', 90)], opportunity({ requiredSkills: [] }));
    expect(result.components.skillCompatibility).toBe(50);
  });

  it('marks a student ineligible when they fail every eligibility check', () => {
    const result = calculateMatch(
      student({ department: 'ME', readinessScore: 10 }),
      [skill('python', 90)],
      opportunity({ eligibility: { departments: ['CSE'], minReadiness: 70 } })
    );
    expect(result.eligibilityStatus).toBe('ineligible');
    expect(result.reasons).toContain('Does not meet eligibility criteria.');
  });

  it('treats an opportunity with no eligibility criteria as open to everyone', () => {
    const result = calculateMatch(student(), [skill('python', 90)], opportunity());
    expect(result.eligibilityStatus).toBe('eligible');
    expect(result.components.eligibility).toBe(100);
  });

  it('always explains itself', () => {
    const result = calculateMatch(student(), [skill('python', 90), skill('docker', 20)], opportunity());
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons.some((r) => r.includes('Docker'))).toBe(true);
  });

  it('scores remote opportunities as the most accessible', () => {
    const remote = calculateMatch(student(), [skill('python', 80)], opportunity({ mode: 'remote' }));
    const onsite = calculateMatch(student(), [skill('python', 80)], opportunity({ mode: 'onsite' }));
    expect(remote.components.locationPreference).toBe(100);
    expect(onsite.components.locationPreference).toBe(50);
  });
});

// ============================================
// Seed consistency
// ============================================

describe('seed data consistency', () => {
  // The demo cohort is what judges see first. If a seeded `readinessScore` drifts from
  // what the engine would compute for those skill profiles, the dashboard contradicts
  // the skill table underneath it. This pins the two together.
  const aimlRequirements: RoleSkillRequirement[] = [
    { skillId: 'skill-python', skillName: 'Python', minimumLevel: 85, weight: 0.25 },
    { skillId: 'skill-ml', skillName: 'Machine Learning', minimumLevel: 82, weight: 0.25 },
    { skillId: 'skill-sql', skillName: 'SQL', minimumLevel: 80, weight: 0.15 },
    { skillId: 'skill-docker', skillName: 'Docker', minimumLevel: 75, weight: 0.15 },
    { skillId: 'skill-aws', skillName: 'AWS', minimumLevel: 68, weight: 0.1 },
    { skillId: 'skill-mlops', skillName: 'MLOps', minimumLevel: 62, weight: 0.1 },
  ];

  const aanyaSkills = [
    { skillId: 'skill-python', proficiency: 91 },
    { skillId: 'skill-sql', proficiency: 84 },
    { skillId: 'skill-ml', proficiency: 72 },
    { skillId: 'skill-docker', proficiency: 31 },
    { skillId: 'skill-aws', proficiency: 24 },
    { skillId: 'skill-mlops', proficiency: 18 },
  ];

  it("matches the demo student's seeded readinessScore", () => {
    // Keep in sync with `scripts/seed/seed.ts`.
    expect(computeRoleReadiness(aanyaSkills, aimlRequirements).score).toBe(75);
  });

  it("matches the demo student's seeded status labels", () => {
    // `hasEvidence` mirrors each seeded profile's evidenceCount: MLOps has none, so it
    // is not_started rather than a critical gap.
    const withEvidence = [
      { proficiency: 91, hasEvidence: true },  // Python  -> verified
      { proficiency: 84, hasEvidence: true },  // SQL     -> verified
      { proficiency: 72, hasEvidence: true },  // ML      -> in_progress
      { proficiency: 31, hasEvidence: true },  // Docker  -> critical_gap
      { proficiency: 24, hasEvidence: true },  // AWS     -> critical_gap
      { proficiency: 18, hasEvidence: false }, // MLOps   -> not_started
    ];
    const statuses = withEvidence.map((s) => deriveSkillStatus(s.proficiency, s.hasEvidence));
    expect(statuses).toEqual([
      'verified', 'verified', 'in_progress', 'critical_gap', 'critical_gap', 'not_started',
    ]);
    expect(statuses.filter((s) => s === 'verified')).toHaveLength(2);
    expect(statuses.filter((s) => s === 'critical_gap')).toHaveLength(2);
  });
});
