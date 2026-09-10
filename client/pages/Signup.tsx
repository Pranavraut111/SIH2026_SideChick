/**
 * Signup — three steps: role → affiliation → account details.
 *
 * The affiliation step is the one that makes the rest of the platform work. Every
 * profile is anchored to a real institution or organization, which is what lets an
 * institution see its own cohort, an industry user reach their organization's pipeline,
 * and Firestore rules scope access by tenancy. Signup previously collected none of it,
 * so every account was created unaffiliated: institution dashboards saw zero students
 * and industry accounts were permanently locked out of their own workspace.
 *
 * The selected ids are re-verified server-side before they become custom claims —
 * nothing here is trusted on the client's word.
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  getInstitutionDirectory,
  getOrganizationDirectory,
} from '@/services/directory.service';
import { ArrowRight, Building2, BriefcaseBusiness, GraduationCap, Users, Eye, EyeOff, Check } from 'lucide-react';
import type { UserRole } from '@shared/types';

function Mark() {
  return (
    <div className="brand-mark" aria-label="ShikshaSetu logo">
      <span />
      <span />
      <span />
    </div>
  );
}

const roleOptions: { value: UserRole; label: string; description: string; icon: typeof Users }[] = [
  { value: 'student', label: 'Student', description: 'Map skills, discover pathways and opportunities', icon: Users },
  { value: 'faculty', label: 'Faculty', description: 'Build your industry passport and mentor students', icon: GraduationCap },
  { value: 'industry', label: 'Industry', description: 'Discover talent, post opportunities and missions', icon: BriefcaseBusiness },
  { value: 'institution', label: 'Institution', description: 'Command center for skill intelligence', icon: Building2 },
];

const inputClass =
  'w-full rounded-lg border border-white/12 bg-white/[.035] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#b69ce7]/50 focus:ring-1 focus:ring-[#b69ce7]/25';
const labelClass = 'mb-1.5 block text-[10px] font-mono uppercase tracking-[.18em] text-white/35';
const primaryButtonClass =
  'flex w-full items-center justify-center gap-2 rounded-lg bg-[#efede8] px-4 py-3 text-[12px] font-bold text-[#0a0a0b] transition-all hover:bg-white active:scale-[.98] disabled:opacity-30';

type Step = 'role' | 'affiliation' | 'details';

/** Graduating-batch options: this year plus the next five. */
const batchOptions = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() + i));

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp, signInWithGoogle, setupGoogleProfile, firebaseUser } = useAuth();

  const isGoogleFlow = searchParams.get('google') === 'true';

  const [step, setStep] = useState<Step>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [institutionId, setInstitutionId] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [department, setDepartment] = useState('');
  const [batch, setBatch] = useState('');
  const [designation, setDesignation] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsOrganization = selectedRole === 'industry';
  const needsInstitution = !!selectedRole && !needsOrganization;

  const institutions = useQuery({
    queryKey: ['directory', 'institutions'],
    queryFn: getInstitutionDirectory,
    enabled: needsInstitution,
    staleTime: 10 * 60 * 1000,
  });

  const organizations = useQuery({
    queryKey: ['directory', 'organizations'],
    queryFn: getOrganizationDirectory,
    enabled: needsOrganization,
    staleTime: 10 * 60 * 1000,
  });

  const departments =
    institutions.data?.find((item) => item.id === institutionId)?.departments ?? [];

  // Pre-fill from the Google account when arriving from the Google sign-in path.
  useEffect(() => {
    if (isGoogleFlow && firebaseUser) {
      setDisplayName(firebaseUser.displayName || '');
      setEmail(firebaseUser.email || '');
    }
  }, [isGoogleFlow, firebaseUser]);

  // Selecting a different institution invalidates the chosen department.
  useEffect(() => {
    setDepartment('');
  }, [institutionId]);

  /** Everything the affiliation step must produce before the user can continue. */
  const affiliationComplete = (() => {
    if (!selectedRole) return false;
    if (needsOrganization) return !!organizationId;
    if (!institutionId) return false;
    if (selectedRole === 'student') return !!department && !!batch;
    if (selectedRole === 'faculty') return !!department;
    return true;
  })();

  const profileOptions = () => ({
    institutionId: needsInstitution ? institutionId : undefined,
    organizationId: needsOrganization ? organizationId : undefined,
    details: {
      department: department || undefined,
      batch: batch || undefined,
      designation: designation || undefined,
      jobTitle: jobTitle || undefined,
    },
  });

  const handleRoleContinue = () => {
    if (!selectedRole) return;
    setError(null);
    setStep('affiliation');
  };

  const handleAffiliationContinue = async () => {
    if (!affiliationComplete || !selectedRole) return;
    setError(null);

    // Google users are already authenticated — finish their profile here.
    if (isGoogleFlow) {
      setLoading(true);
      try {
        await setupGoogleProfile(selectedRole, profileOptions());
        navigate('/app', { replace: true });
      } catch (err: any) {
        setError(err.message || 'Profile setup failed.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setStep('details');
  };

  const handleGoogleSignUp = async () => {
    if (!selectedRole || !affiliationComplete) return;
    setError(null);
    setLoading(true);
    try {
      const { isNewUser } = await signInWithGoogle();
      if (isNewUser) {
        await setupGoogleProfile(selectedRole, profileOptions());
      }
      navigate('/app', { replace: true });
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google sign up failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !affiliationComplete) return;
    setError(null);
    setLoading(true);
    try {
      await signUp(email, password, displayName, selectedRole, profileOptions());
      navigate('/app', { replace: true });
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Sign up failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const heading =
    step === 'role' ? 'Choose your role' : step === 'affiliation' ? 'Where do you belong?' : 'Create your account';

  const subheading = (() => {
    if (step === 'role') {
      return isGoogleFlow && firebaseUser
        ? `Welcome ${firebaseUser.displayName || ''}! Select how you'll use ShikshaSetu.`
        : 'Select how you want to use ShikshaSetu.';
    }
    if (step === 'affiliation') {
      return needsOrganization
        ? 'Your organization connects you to your recruitment pipeline.'
        : 'Your institution connects you to your cohort, curriculum and opportunities.';
    }
    return `Signing up as ${roleOptions.find((r) => r.value === selectedRole)?.label}`;
  })();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070708] px-4 py-10">
      <div className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-[#7158a6]/10 blur-[130px]" />
      <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-[#6b519f]/10 blur-[100px]" />

      <div className="relative z-10 w-full max-w-[480px]">
        <Link to="/" className="mb-10 flex items-center gap-2.5">
          <Mark />
          <span className="text-[15px] font-extrabold tracking-[-.04em] text-white">ShikshaSetu</span>
        </Link>

        <div className="mb-8">
          <div className="mb-2 font-mono text-[9px] uppercase tracking-[.18em] text-white/30">
            Step {step === 'role' ? 1 : step === 'affiliation' ? 2 : 3} of {isGoogleFlow ? 2 : 3}
          </div>
          <h1 className="text-3xl font-bold tracking-[-.06em] text-white">{heading}</h1>
          <p className="mt-2 text-sm text-white/40">{subheading}</p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-[#b46e6e]/30 bg-[#b46e6e]/10 px-4 py-3 text-xs text-[#dc9b9b]">
            {error}
          </div>
        )}

        {/* ---------- Step 1: role ---------- */}
        {step === 'role' && (
          <div className="space-y-3">
            {roleOptions.map((option) => {
              const Icon = option.icon;
              const selected = selectedRole === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setSelectedRole(option.value)}
                  className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition hover:-translate-y-0.5 ${
                    selected
                      ? 'border-[#a58cda]/50 bg-[#a58cda]/10 shadow-[0_0_28px_rgba(129,96,181,.12)]'
                      : 'border-white/10 bg-white/[.025] hover:border-white/20'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      selected ? 'bg-[#a58cda]/20 text-[#c2ace8]' : 'bg-white/[.06] text-white/40'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white">{option.label}</div>
                    <div className="mt-1 text-[11px] text-white/40">{option.description}</div>
                  </div>
                  {selected && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#a58cda] text-black">
                      <Check size={12} />
                    </div>
                  )}
                </button>
              );
            })}

            <button onClick={handleRoleContinue} disabled={!selectedRole} className={`mt-4 ${primaryButtonClass}`}>
              Continue <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* ---------- Step 2: affiliation ---------- */}
        {step === 'affiliation' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setStep('role')}
              className="text-xs text-white/40 transition hover:text-white/60"
            >
              ← Back to role selection
            </button>

            {needsOrganization ? (
              <div>
                <label className={labelClass}>Organization</label>
                {organizations.isLoading ? (
                  <p className="text-xs text-white/35">Loading organizations…</p>
                ) : organizations.isError ? (
                  <p className="text-xs text-[#dc9b9b]">Could not load organizations. Please refresh.</p>
                ) : !organizations.data?.length ? (
                  <p className="text-xs text-white/45">
                    No organizations are registered yet. An administrator must add your organization before
                    you can create an industry account.
                  </p>
                ) : (
                  <select
                    value={organizationId}
                    onChange={(e) => setOrganizationId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select your organization</option>
                    {organizations.data.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name} · {organization.domain}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div>
                <label className={labelClass}>Institution</label>
                {institutions.isLoading ? (
                  <p className="text-xs text-white/35">Loading institutions…</p>
                ) : institutions.isError ? (
                  <p className="text-xs text-[#dc9b9b]">Could not load institutions. Please refresh.</p>
                ) : !institutions.data?.length ? (
                  <p className="text-xs text-white/45">
                    No institutions are registered yet. Run the seed script, or ask an administrator to add
                    your institution.
                  </p>
                ) : (
                  <select
                    value={institutionId}
                    onChange={(e) => setInstitutionId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select your institution</option>
                    {institutions.data.map((institution) => (
                      <option key={institution.id} value={institution.id}>
                        {institution.name} · {institution.location}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {(selectedRole === 'student' || selectedRole === 'faculty') && institutionId && (
              <div>
                <label className={labelClass}>Department</label>
                {departments.length ? (
                  <select value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass}>
                    <option value="">Select your department</option>
                    {departments.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. CSE"
                  />
                )}
              </div>
            )}

            {selectedRole === 'student' && (
              <div>
                <label className={labelClass}>Graduating batch</label>
                <select value={batch} onChange={(e) => setBatch(e.target.value)} className={inputClass}>
                  <option value="">Select your batch</option>
                  {batchOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedRole === 'faculty' && (
              <div>
                <label className={labelClass}>Designation (optional)</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Associate Professor"
                />
              </div>
            )}

            {selectedRole === 'industry' && (
              <div>
                <label className={labelClass}>Your role (optional)</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Talent Acquisition Lead"
                />
              </div>
            )}

            <button
              onClick={handleAffiliationContinue}
              disabled={!affiliationComplete || loading}
              className={`mt-2 ${primaryButtonClass}`}
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0a0a0b]/20 border-t-[#0a0a0b]" />
              ) : (
                <>
                  {isGoogleFlow ? 'Finish setup' : 'Continue'} <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        )}

        {/* ---------- Step 3: account details ---------- */}
        {step === 'details' && (
          <div>
            <button
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="mb-5 flex w-full items-center justify-center gap-3 rounded-lg border border-white/12 bg-white/[.04] px-4 py-3 text-[12px] font-semibold text-white transition hover:bg-white/[.08] active:scale-[.98] disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.9 33.6 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.2-2.7-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.5 18.8 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.4 0-9.9-3.6-11.3-8.5l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.7 39.5 44 34 44 24c0-1.3-.2-2.7-.4-3.9z"/></svg>
              Continue with Google
            </button>

            <div className="mb-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-white/25">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <button
                type="button"
                onClick={() => setStep('affiliation')}
                className="mb-2 text-xs text-white/40 transition hover:text-white/60"
              >
                ← Back to affiliation
              </button>
              <div>
                <label className={labelClass}>Full name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  autoComplete="name"
                  className={inputClass}
                  placeholder="Aanya Sharma"
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className={labelClass}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className={`${inputClass} pr-10`}
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className={`mt-2 ${primaryButtonClass}`}>
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0a0a0b]/20 border-t-[#0a0a0b]" />
                ) : (
                  <>
                    Create account <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-white/35">
          Already have an account?{' '}
          <Link to="/login" className="text-[#b69ce7] transition hover:text-[#c8b3f5]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
