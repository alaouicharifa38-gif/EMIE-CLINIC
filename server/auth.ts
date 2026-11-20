import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import {
  createRecord,
  escapeFormulaString,
  listAllRecords,
} from './airtable.ts';
import {
  AIRTABLE_TABLES,
  getAirtableCredentials,
  getSessionSecret,
} from './config.ts';
import type { AuthSessionUser, UserRole } from '../shared/types.ts';

export const SESSION_COOKIE_NAME = 'emie_admin_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

interface SessionTokenPayload {
  user: AuthSessionUser;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  adminUser?: AuthSessionUser;
}

interface AirtableAdminUserFields {
  'Admin ID'?: string;
  'Full Name'?: string;
  Email?: string;
  'Password Hash'?: string;
  Role?: UserRole;
  'Linked Staff'?: string[];
  Active?: boolean;
  'Created At'?: string;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

export function verifyPassword(password: string, hash: string): boolean {
  if (!hash || !hash.startsWith('$2')) return false;
  return bcrypt.compareSync(password, hash);
}

export function signSessionToken(user: AuthSessionUser): string {
  const payload: SessionTokenPayload = {
    user,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string | undefined): AuthSessionUser | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as SessionTokenPayload;
    if (!parsed.exp || parsed.exp < Date.now()) return null;
    if (!parsed.user || !parsed.user.email || !parsed.user.role) return null;
    return parsed.user;
  } catch {
    return null;
  }
}

function isHttpsRequest(req: Request): boolean {
  if (req.secure) return true;
  const forwardedProto = req.get('x-forwarded-proto');
  if (forwardedProto) {
    const first = forwardedProto.split(',')[0]?.trim().toLowerCase();
    if (first === 'https') return true;
  }
  const origin = req.get('origin') || req.get('referer') || '';
  if (origin.startsWith('https://')) return true;
  return process.env.NODE_ENV === 'production';
}

export function getSessionCookieOptions(req: Request): {
  httpOnly: boolean;
  sameSite: 'none' | 'lax';
  secure: boolean;
  path: string;
} {
  const https = isHttpsRequest(req);
  return {
    httpOnly: true,
    sameSite: https ? 'none' : 'lax',
    secure: https,
    path: '/',
  };
}

export function setSessionCookie(req: Request, res: Response, user: AuthSessionUser): void {
  const token = signSessionToken(user);
  res.cookie(SESSION_COOKIE_NAME, token, {
    ...getSessionCookieOptions(req),
    maxAge: SESSION_TTL_MS,
  });
}

export function clearSessionCookie(req: Request, res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, getSessionCookieOptions(req));
}

export function authenticateSession(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  const token = cookies?.[SESSION_COOKIE_NAME];
  const user = verifySessionToken(token);
  if (user) {
    req.adminUser = user;
  }
  next();
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.adminUser) {
    res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
    return;
  }
  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.adminUser) {
      res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
      return;
    }
    if (!allowedRoles.includes(req.adminUser.role)) {
      res.status(403).json({
        error: 'Insufficient permissions for this operation',
        code: 'FORBIDDEN',
      });
      return;
    }
    next();
  };
}

export async function authenticateAdminCredentials(
  emailInput: string,
  passwordInput: string,
): Promise<AuthSessionUser | null> {
  const email = emailInput.trim().toLowerCase();
  const password = passwordInput;
  if (!email || !password) return null;

  // 1. Check Airtable Admin Users table first if Airtable is configured
  if (getAirtableCredentials()) {
    try {
      const records = await listAllRecords<AirtableAdminUserFields>(
        AIRTABLE_TABLES.ADMIN_USERS,
        {
          filterByFormula: `LOWER({Email}) = '${escapeFormulaString(email)}'`,
          maxRecords: 1,
        },
      );
      if (records.length > 0) {
        const rec = records[0];
        const f = rec.fields;
        if (!f.Active) {
          return null;
        }
        const hash = String(f['Password Hash'] || '');
        if (verifyPassword(password, hash)) {
          return {
            id: rec.id,
            adminId: String(f['Admin ID'] || rec.id),
            fullName: String(f['Full Name'] || email),
            email: String(f.Email || email).toLowerCase(),
            role: (f.Role as UserRole) || 'Staff',
            linkedStaffId: Array.isArray(f['Linked Staff'])
              ? f['Linked Staff'][0]
              : undefined,
            source: 'airtable',
          };
        }
        return null;
      }
    } catch {
      // Fall through to env Super Admin check only if Airtable table is unavailable/empty
    }
  }

  // 2. Check environment-configured initial Super Admin credentials
  const envEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const envPassword = process.env.SUPER_ADMIN_PASSWORD;
  const envHash = process.env.SUPER_ADMIN_PASSWORD_HASH?.trim();

  if (envEmail && email === envEmail) {
    const valid = envHash
      ? verifyPassword(password, envHash)
      : Boolean(envPassword && password === envPassword);

    if (valid) {
      return {
        id: 'env-super-admin',
        adminId: 'ADMIN-ROOT',
        fullName: process.env.SUPER_ADMIN_NAME?.trim() || 'Super Admin',
        email: envEmail,
        role: 'Super Admin',
        source: 'env',
      };
    }
  }

  return null;
}

export async function bootstrapSuperAdmin(params: {
  setupToken: string;
  fullName: string;
  email: string;
  password: string;
}): Promise<AuthSessionUser> {
  const configuredToken = process.env.ADMIN_SETUP_TOKEN?.trim();
  if (!configuredToken) {
    throw new Error(
      'ADMIN_SETUP_TOKEN is not configured on the server. Set ADMIN_SETUP_TOKEN or SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD in environment variables.',
    );
  }

  const providedBuf = Buffer.from(params.setupToken.trim());
  const expectedBuf = Buffer.from(configuredToken);
  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    throw new Error('Invalid setup token.');
  }

  if (!getAirtableCredentials()) {
    throw new Error(
      'Airtable must be configured (AIRTABLE_ACCESS_TOKEN and AIRTABLE_BASE_ID) before creating a persisted Super Admin user.',
    );
  }

  const existingAdmins = await listAllRecords<AirtableAdminUserFields>(
    AIRTABLE_TABLES.ADMIN_USERS,
    {
      filterByFormula: `{Role} = 'Super Admin'`,
      maxRecords: 1,
    },
  );
  if (existingAdmins.length > 0) {
    throw new Error(
      'A Super Admin account already exists in Airtable. Sign in with existing credentials.',
    );
  }

  const email = params.email.trim().toLowerCase();
  const passwordHash = hashPassword(params.password);
  const adminId = `ADM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const now = new Date().toISOString();

  const created = await createRecord<AirtableAdminUserFields>(
    AIRTABLE_TABLES.ADMIN_USERS,
    {
      'Admin ID': adminId,
      'Full Name': params.fullName.trim(),
      Email: email,
      'Password Hash': passwordHash,
      Role: 'Super Admin',
      Active: true,
      'Created At': now,
    },
  );

  return {
    id: created.id,
    adminId,
    fullName: params.fullName.trim(),
    email,
    role: 'Super Admin',
    source: 'airtable',
  };
}
