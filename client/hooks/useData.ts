/**
 * React hooks for data fetching via the service layer.
 * Uses TanStack React Query for caching, loading states, and error handling.
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getStudentByUserId, getStudentSkillDNA, getStudentsByInstitution } from '@/services/student.service';
import { getActiveRoadmap } from '@/services/roadmap.service';
import { getOpportunities, type OpportunityFilters } from '@/services/opportunity.service';
import { getStudentApplications, getOrganizationApplications } from '@/services/application.service';
import { discoverTalent, getIndustryDemandSignals, getOrganizationById } from '@/services/industry.service';
import { getFacultyByUserId, getFacultyRecommendations } from '@/services/faculty.service';
import { getCurriculumMappings, getInstitutionById } from '@/services/institution.service';
import { getCareerRoles } from '@/services/role.service';
import type { Student, SkillProfile, Roadmap, Opportunity, Application, IndustrySignal, Faculty, FacultyRecommendation, CareerRole, Organization, Institution, CurriculumMapping, TalentCandidate } from '@shared/types';

/**
 * Hook to get the current user's student profile.
 */
export function useStudentProfile() {
  const { firebaseUser } = useAuth();
  return useQuery<Student | null>({
    queryKey: ['student', firebaseUser?.uid],
    queryFn: () => firebaseUser ? getStudentByUserId(firebaseUser.uid) : Promise.resolve(null),
    enabled: !!firebaseUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get a student's Skill DNA.
 */
export function useSkillDNA(studentId: string | undefined) {
  return useQuery<SkillProfile[]>({
    queryKey: ['skillDNA', studentId],
    queryFn: () => studentId ? getStudentSkillDNA(studentId) : Promise.resolve([]),
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to get a student's active roadmap.
 */
export function useRoadmap(studentId: string | undefined) {
  return useQuery<Roadmap | null>({
    queryKey: ['roadmap', studentId],
    queryFn: () => studentId ? getActiveRoadmap(studentId) : Promise.resolve(null),
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get opportunities with optional filters.
 */
export function useOpportunities(filters: OpportunityFilters = {}) {
  return useQuery<Opportunity[]>({
    queryKey: ['opportunities', filters],
    queryFn: () => getOpportunities(filters),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to get a student's applications.
 */
export function useApplications(studentId: string | undefined) {
  return useQuery<Application[]>({
    queryKey: ['applications', studentId],
    queryFn: () => studentId ? getStudentApplications(studentId) : Promise.resolve([]),
    enabled: !!studentId,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to get industry demand signals.
 */
export function useIndustryDemand(limit = 10) {
  return useQuery<IndustrySignal[]>({
    queryKey: ['industryDemand', limit],
    queryFn: () => getIndustryDemandSignals(limit),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to get the current user's faculty profile.
 */
export function useFacultyProfile() {
  const { firebaseUser } = useAuth();
  return useQuery<Faculty | null>({
    queryKey: ['faculty', firebaseUser?.uid],
    queryFn: () => firebaseUser ? getFacultyByUserId(firebaseUser.uid) : Promise.resolve(null),
    enabled: !!firebaseUser,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get faculty recommendations.
 */
export function useFacultyRecommendations(faculty: Faculty | null | undefined) {
  return useQuery<FacultyRecommendation[]>({
    queryKey: ['facultyRecommendations', faculty?.id],
    queryFn: () => faculty ? Promise.resolve(getFacultyRecommendations(faculty)) : Promise.resolve([]),
    enabled: !!faculty,
    staleTime: 10 * 60 * 1000,
  });
}

/** The shared source of truth for target-role requirements. */
export function useCareerRoles() {
  return useQuery<CareerRole[]>({
    queryKey: ['careerRoles'],
    queryFn: getCareerRoles,
    staleTime: 10 * 60 * 1000,
  });
}

export function useInstitutionStudents(institutionId: string | undefined) {
  return useQuery<Student[]>({
    queryKey: ['institutionStudents', institutionId],
    queryFn: () => institutionId ? getStudentsByInstitution(institutionId) : Promise.resolve([]),
    enabled: !!institutionId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useInstitutionProfile(institutionId: string | undefined) {
  return useQuery<Institution | null>({
    queryKey: ['institution', institutionId],
    queryFn: () => institutionId ? getInstitutionById(institutionId) : Promise.resolve(null),
    enabled: !!institutionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCurriculumMappings(institutionId: string | undefined) {
  return useQuery<CurriculumMapping[]>({
    queryKey: ['curriculumMappings', institutionId],
    queryFn: () => institutionId ? getCurriculumMappings(institutionId) : Promise.resolve([]),
    enabled: !!institutionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrganizationProfile(organizationId: string | undefined) {
  return useQuery<Organization | null>({
    queryKey: ['organization', organizationId],
    queryFn: () => organizationId ? getOrganizationById(organizationId) : Promise.resolve(null),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrganizationApplications(organizationId: string | undefined) {
  return useQuery<Application[]>({
    queryKey: ['organizationApplications', organizationId],
    queryFn: () => organizationId ? getOrganizationApplications(organizationId) : Promise.resolve([]),
    enabled: !!organizationId,
    staleTime: 60 * 1000,
  });
}

export function useTalentPool(minReadiness = 50) {
  return useQuery<TalentCandidate[]>({
    queryKey: ['talentPool', minReadiness],
    queryFn: () => discoverTalent(minReadiness),
    staleTime: 2 * 60 * 1000,
  });
}
