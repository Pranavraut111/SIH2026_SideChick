/**
 * Deterministic roadmap generation. Nodes are derived only from the target
 * role's requirements and the student's measured Skill DNA.
 */
import type { RequestHandler } from 'express';
import { adminDb as db, FieldValue } from '../lib/firebase-admin';
import { authedUser } from '../middleware/auth';
import { generateRoadmapSchema } from '../../shared/schemas';

export const handleGenerateRoadmap: RequestHandler = async (req, res) => {
  const parsed = generateRoadmapSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'studentId is required' });
    return;
  }
  const { studentId } = parsed.data;

  try {
    const user = authedUser(req);

    const studentRef = db.collection('students').doc(studentId);
    const student = await studentRef.get();
    if (!student.exists || student.data()?.userId !== user.uid) {
      res.status(403).json({ error: 'You can only generate your own roadmap' });
      return;
    }
    const studentData = student.data()!;
    if (!studentData.careerTargetId) {
      res.status(400).json({ error: 'Complete a role-based assessment before generating a roadmap' });
      return;
    }

    const role = await db.collection('roles').doc(studentData.careerTargetId).get();
    if (!role.exists) {
      res.status(400).json({ error: 'The selected career role no longer exists' });
      return;
    }
    const roleData = role.data()!;
    const requirements = roleData.requiredSkills || [];
    const profiles = await studentRef.collection('skillProfiles').get();
    const levels = new Map(profiles.docs.map((profile) => [profile.data().skillId, profile.data().proficiency || 0]));

    const nodes = [
      { id: 'goal', type: 'goal', title: roleData.title, meta: 'Career target', status: 'verified', position: { x: 0, y: 180 } },
      ...requirements.map((requirement: { skillId: string; skillName: string; minimumLevel: number }, index: number) => {
        const current = levels.get(requirement.skillId) || 0;
        const gap = Math.max(requirement.minimumLevel - current, 0);
        return {
          id: 'skill-' + requirement.skillId,
          type: 'skill',
          title: requirement.skillName,
          meta: current + '% current · ' + requirement.minimumLevel + '% required',
          status: gap === 0 ? 'verified' : gap >= 25 ? 'critical_gap' : 'in_progress',
          skills: [requirement.skillName],
          evidenceType: gap === 0 ? 'Existing verified evidence' : 'Assessment, project or mentor validation',
          position: { x: 250 + (Math.floor(index / 3) * 270), y: 40 + ((index % 3) * 160) },
        };
      }),
      { id: 'outcome', type: 'outcome', title: 'Role-ready evidence', meta: 'Unlock opportunities through verified skills', status: 'locked', position: { x: 840, y: 180 } },
    ];
    const edges = [
      ...requirements.map((requirement: { skillId: string }) => ({ id: 'goal-' + requirement.skillId, source: 'goal', target: 'skill-' + requirement.skillId })),
      ...requirements.map((requirement: { skillId: string }) => ({ id: 'outcome-' + requirement.skillId, source: 'skill-' + requirement.skillId, target: 'outcome' })),
    ];

    const roadmapRef = studentRef.collection('roadmaps').doc('active');
    await roadmapRef.set({
      studentId,
      targetRole: roleData.title,
      targetRoleId: role.id,
      title: roleData.title + ' pathway',
      nodes,
      edges,
      status: 'active',
      estimatedDuration: 'Based on your remaining gaps',
      source: 'system_generated',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    res.json({ success: true, roadmapId: roadmapRef.id });
  } catch (error) {
    console.error('[Roadmap] generate failed:', error);
    res.status(500).json({ error: 'Could not generate your roadmap' });
  }
};
