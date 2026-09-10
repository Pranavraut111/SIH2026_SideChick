/**
 * Authentication and authorization middleware.
 *
 * Authorization is enforced here on the server, never by hiding routes in the client.
 * `requireAuth` verifies the Firebase ID token and attaches the decoded claims to the
 * request; `requireRole` narrows access to specific roles.
 */
import type { RequestHandler, Request } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import type { UserRole } from '../../shared/types';
import { adminAuth } from '../lib/firebase-admin';

/** A request that has passed `requireAuth`. */
export interface AuthedRequest extends Request {
  user: DecodedIdToken & {
    role?: UserRole;
    institutionId?: string;
    organizationId?: string;
  };
}

function extractBearerToken(req: Request): string | undefined {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) return undefined;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : undefined;
}

/**
 * Verify the caller's Firebase ID token.
 * Responds 401 when the token is absent, malformed, expired or revoked.
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication is required' });
    return;
  }

  try {
    (req as AuthedRequest).user = await adminAuth.verifyIdToken(token);
    next();
  } catch {
    // Deliberately opaque: never echo the verification failure back to the caller.
    res.status(401).json({ error: 'Your session is invalid or has expired' });
  }
};

/**
 * Restrict a route to one or more roles. Must run after `requireAuth`.
 */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, res, next) => {
    const user = (req as AuthedRequest).user;
    if (!user) {
      res.status(401).json({ error: 'Authentication is required' });
      return;
    }
    if (!roles.includes(user.role as UserRole)) {
      res.status(403).json({ error: 'Your account does not have access to this resource' });
      return;
    }
    next();
  };
}

/** Convenience accessor for handlers that run behind `requireAuth`. */
export function authedUser(req: Request): AuthedRequest['user'] {
  return (req as AuthedRequest).user;
}
