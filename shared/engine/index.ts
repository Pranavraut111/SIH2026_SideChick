/**
 * Deterministic domain engines.
 *
 * These are pure functions with no Firebase, network or environment dependencies, so
 * the same code runs on the server (where results are authoritative and persisted) and
 * in the browser (where the same numbers are previewed). Keeping one implementation is
 * what makes the scores a student sees identical to the ones a recruiter acts on.
 */
export * from './skill-status';
export * from './readiness';
export * from './gaps';
export * from './matching';
