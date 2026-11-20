import crypto from 'node:crypto';
import type {
  AirtableConnectionDiagnosis,
  ClinicPublicSettings,
  IntegrationStatus,
  OfficialServiceSeed,
} from '../shared/types.ts';

export const AIRTABLE_TABLES = {
  CLIENTS: 'Clients',
  APPOINTMENTS: 'Appointments',
  SERVICES: 'Services',
  STAFF: 'Staff',
  ADMIN_USERS: 'Admin Users',
  NOTIFICATIONS: 'Notifications',
  ACTIVITY_LOGS: 'Activity Logs',
  CLINIC_SETTINGS: 'Clinic Settings',
} as const;

// Official EMIE CLINIC public information (from https://emieclinic.ma/ & brief)
// Do NOT invent opening hours or email addresses; editable via Admin Settings.
export const DEFAULT_CLINIC_SETTINGS: ClinicPublicSettings = {
  clinicName: 'EMIE CLINIC',
  headline: 'ICI, LE CORPS RETROUVE SON HARMONIE.',
  subheadline: 'Clinique où science et bien-être se rencontrent pour révéler le meilleur de vous-même.',
  specialty: 'Clinique médico-esthétique et kinésithérapie',
  phone: '+212 660 97 98 77',
  address: '7ème Etage Prince Bureaux, 217, Boulevard Mohamed Zerktouni, Racine, 22000, Casablanca, Maroc.',
  instagramHandle: '@emieclinic',
  instagramUrl: 'https://www.instagram.com/emieclinic/',
  emailOptional: true,
  requireEmail: false,
  openingHours: '',
  logoUrl: '',
  enabledLanguages: ['fr', 'en', 'ar'],
  preventOverlappingConfirmed: true,
  slotDurationMinutes: 60,
  allowPublicBooking: true,
  allowAdminDeleteAppointments: false,
  dataRetentionDays: 1095,
};

// Strictly the five official EMIE CLINIC services — no Nutrition or unapproved additions.
export const OFFICIAL_SERVICES_SEED: OfficialServiceSeed[] = [
  {
    serviceId: 'kinesitherapie',
    name: 'Kinésithérapie',
    description:
      'Rééducation post-blessure, soulagement des douleurs chroniques et optimisation de la récupération physique encadrée par nos spécialistes.',
    displayOrder: 1,
    durationMinutes: 45,
    active: true,
    imagePath: '/src/assets/images/service_kine_1795021968260.jpg',
  },
  {
    serviceId: 'osteopathie',
    name: 'Ostéopathie',
    description:
      "L'ostéopathie vise à restaurer l'équilibre global du corps en agissant sur les tensions musculaires, articulaires et viscérales.",
    displayOrder: 2,
    durationMinutes: 45,
    active: true,
    imagePath: '/src/assets/images/service_osteo_1795021969668.jpg',
  },
  {
    serviceId: 'amincissement',
    name: 'Amincissement',
    description:
      'Redessinez votre silhouette sans chirurgie grâce à des techniques esthétiques avancées et durables.',
    displayOrder: 3,
    durationMinutes: 60,
    active: true,
    imagePath: '/src/assets/images/service_amincissement_1795021969772.jpg',
  },
  {
    serviceId: 'cupping',
    name: 'Cupping / Hijama',
    description:
      'Technique manuelle puissante pour détendre les tissus profonds, relancer la circulation et favoriser la récupération musculaire.',
    displayOrder: 4,
    durationMinutes: 45,
    active: true,
    imagePath: '/src/assets/images/service_cupping_1795021969470.jpg',
  },
  {
    serviceId: 'soins-du-visage',
    name: 'Soins du visage',
    description:
      "Alliez technologie esthétique et gestuelle experte pour nettoyer, hydrater, lisser et raviver l'éclat naturel de votre peau.",
    displayOrder: 5,
    durationMinutes: 60,
    active: true,
    imagePath: '/src/assets/images/service_visage_1795021970454.jpg',
  },
];

let ephemeralSessionSecret: string | null = null;

export function getSessionSecret(): string {
  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }
  if (!ephemeralSessionSecret) {
    ephemeralSessionSecret = crypto.randomBytes(32).toString('hex');
  }
  return ephemeralSessionSecret;
}

export function getAirtableCredentialPresence(): {
  tokenPresent: boolean;
  baseIdPresent: boolean;
  baseIdMasked: string | null;
} {
  const token = process.env.AIRTABLE_ACCESS_TOKEN?.trim() || '';
  const baseId = process.env.AIRTABLE_BASE_ID?.trim() || '';
  return {
    tokenPresent: token.length > 0,
    baseIdPresent: baseId.length > 0,
    baseIdMasked:
      baseId.length >= 8
        ? `${baseId.slice(0, 6)}...${baseId.slice(-4)}`
        : baseId
        ? '***'
        : null,
  };
}

export function getAirtableCredentials(): { token: string; baseId: string } | null {
  const token = process.env.AIRTABLE_ACCESS_TOKEN?.trim();
  const baseId = process.env.AIRTABLE_BASE_ID?.trim();
  if (!token || !baseId) {
    return null;
  }
  return { token, baseId };
}

export function getMakeWebhookUrl(): string | null {
  const url = process.env.MAKE_BOOKING_WEBHOOK_URL?.trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function getIntegrationStatus(
  diagnosis?: AirtableConnectionDiagnosis | null,
): IntegrationStatus {
  const presence = getAirtableCredentialPresence();
  const makeUrl = getMakeWebhookUrl();
  const superAdminConfigured = Boolean(
    process.env.SUPER_ADMIN_EMAIL?.trim() && process.env.SUPER_ADMIN_PASSWORD?.trim(),
  );
  const setupTokenConfigured = Boolean(process.env.ADMIN_SETUP_TOKEN?.trim());

  const missingEnvVars: string[] = [];
  if (!presence.tokenPresent) missingEnvVars.push('AIRTABLE_ACCESS_TOKEN');
  if (!presence.baseIdPresent) missingEnvVars.push('AIRTABLE_BASE_ID');
  if (!makeUrl) missingEnvVars.push('MAKE_BOOKING_WEBHOOK_URL');
  if (!process.env.SESSION_SECRET?.trim()) missingEnvVars.push('SESSION_SECRET');
  if (!superAdminConfigured && !setupTokenConfigured) {
    missingEnvVars.push('SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD (or ADMIN_SETUP_TOKEN)');
  }

  let diagnosticCode = diagnosis?.code;
  let diagnosticMessage = diagnosis?.message;

  if (!diagnosticCode) {
    if (!presence.tokenPresent) {
      diagnosticCode = 'missing_token';
      diagnosticMessage = 'Missing AIRTABLE_ACCESS_TOKEN in server environment.';
    } else if (!presence.baseIdPresent) {
      diagnosticCode = 'missing_base_id';
      diagnosticMessage = 'Missing AIRTABLE_BASE_ID in server environment.';
    } else {
      diagnosticCode = 'not_probed';
      diagnosticMessage =
        'Airtable credentials are present in server environment. Run connection verification to test API access.';
    }
  }

  const airtableConfigured =
    presence.tokenPresent &&
    presence.baseIdPresent &&
    (diagnosticCode === 'connected' || diagnosticCode === 'not_probed');

  return {
    airtableConfigured,
    airtableTokenPresent: presence.tokenPresent,
    airtableBaseIdPresent: presence.baseIdPresent,
    airtableBaseIdMasked: presence.baseIdMasked,
    airtableDiagnosticCode: diagnosticCode,
    airtableDiagnosticMessage: diagnosticMessage || '',
    makeConfigured: Boolean(makeUrl),
    superAdminConfigured,
    setupTokenConfigured,
    missingEnvVars,
  };
}
