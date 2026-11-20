import crypto from 'node:crypto';
import {
  AirtableError,
  type AirtableRecord,
  createRecord,
  deleteRecord,
  escapeFormulaString,
  getRecord,
  listAllRecords,
  updateRecord,
} from './airtable.ts';
import {
  AIRTABLE_TABLES,
  DEFAULT_CLINIC_SETTINGS,
  OFFICIAL_SERVICES_SEED,
  getAirtableCredentials,
} from './config.ts';
import {
  buildMakePayload,
  triggerMakeWebhook,
} from './makeWebhook.ts';
import {
  type ActivityLogRecord,
  type AdminUserRecord,
  type AppointmentAdminUpdatePayload,
  type AppointmentRecord,
  type AppointmentStatus,
  type AuthSessionUser,
  type BookingSubmitPayload,
  CLINIC_TIME_SLOTS,
  type ClinicPublicSettings,
  type ClinicService,
  type ClientRecord,
  type Language,
  type NotificationRecord,
  type SelfServiceLookupResponse,
  type SelfServiceServiceOption,
  type SelfServiceStaffOption,
  type StaffMember,
  type UserRole,
} from '../shared/types.ts';

// Deduplication guard against rapid accidental double-clicks within 10 minutes
const recentSubmissionTokens = new Map<string, { bookingReference: string; expiresAt: number }>();

function cleanupSubmissionTokens(): void {
  const now = Date.now();
  for (const [token, entry] of recentSubmissionTokens.entries()) {
    if (entry.expiresAt < now) {
      recentSubmissionTokens.delete(token);
    }
  }
}

export function sanitizeText(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[<>]/g, '').trim().slice(0, maxLength);
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('0') && digits.length === 10) {
    return `+212${digits.slice(1)}`;
  }
  return digits;
}

export function generateBookingReference(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const code = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `EMIE-${y}${m}${d}-${code}`;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-().]/g, '');
  return /^\+?\d{8,15}$/.test(cleaned);
}

// =============================================================================
// CLINIC SETTINGS
// =============================================================================

export async function getClinicSettings(): Promise<ClinicPublicSettings> {
  if (!getAirtableCredentials()) {
    return { ...DEFAULT_CLINIC_SETTINGS };
  }

  try {
    const rows = await listAllRecords<{
      'Setting Name'?: string;
      'Setting Value'?: string;
    }>(AIRTABLE_TABLES.CLINIC_SETTINGS);

    const settings: ClinicPublicSettings = { ...DEFAULT_CLINIC_SETTINGS };
    const map = new Map<string, string>();
    for (const row of rows) {
      const key = row.fields['Setting Name'];
      const val = row.fields['Setting Value'];
      if (key && typeof val === 'string') {
        map.set(key, val);
      }
    }

    if (map.has('clinicName')) settings.clinicName = map.get('clinicName') || settings.clinicName;
    if (map.has('headline')) settings.headline = map.get('headline') || settings.headline;
    if (map.has('subheadline')) settings.subheadline = map.get('subheadline') || settings.subheadline;
    if (map.has('specialty')) settings.specialty = map.get('specialty') || settings.specialty;
    if (map.has('phone')) settings.phone = map.get('phone') || settings.phone;
    if (map.has('address')) settings.address = map.get('address') || settings.address;
    if (map.has('instagramHandle')) settings.instagramHandle = map.get('instagramHandle') || settings.instagramHandle;
    if (map.has('instagramUrl')) settings.instagramUrl = map.get('instagramUrl') || settings.instagramUrl;
    if (map.has('openingHours')) settings.openingHours = map.get('openingHours') ?? '';
    if (map.has('logoUrl')) settings.logoUrl = map.get('logoUrl') ?? '';
    if (map.has('emailOptional')) settings.emailOptional = map.get('emailOptional') === 'true';
    if (map.has('requireEmail')) settings.requireEmail = map.get('requireEmail') === 'true';
    if (map.has('preventOverlappingConfirmed')) {
      settings.preventOverlappingConfirmed = map.get('preventOverlappingConfirmed') !== 'false';
    }
    if (map.has('allowPublicBooking')) {
      settings.allowPublicBooking = map.get('allowPublicBooking') !== 'false';
    }
    if (map.has('allowAdminDeleteAppointments')) {
      settings.allowAdminDeleteAppointments =
        map.get('allowAdminDeleteAppointments') === 'true';
    }
    if (map.has('slotDurationMinutes')) {
      const num = Number(map.get('slotDurationMinutes'));
      if (Number.isFinite(num) && num >= 15) settings.slotDurationMinutes = num;
    }
    if (map.has('dataRetentionDays')) {
      const num = Number(map.get('dataRetentionDays'));
      if (Number.isFinite(num) && num >= 30) settings.dataRetentionDays = num;
    }
    if (map.has('enabledLanguages')) {
      try {
        const parsed = JSON.parse(map.get('enabledLanguages') || '[]') as Language[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          settings.enabledLanguages = parsed;
        }
      } catch {
        // ignore invalid JSON
      }
    }

    return settings;
  } catch {
    return { ...DEFAULT_CLINIC_SETTINGS };
  }
}

export async function saveClinicSettings(
  updates: Partial<ClinicPublicSettings>,
  actorEmail: string,
): Promise<ClinicPublicSettings> {
  const existingRows = await listAllRecords<{
    'Setting Name'?: string;
    'Setting Value'?: string;
  }>(AIRTABLE_TABLES.CLINIC_SETTINGS);

  const byName = new Map<string, AirtableRecord<{ 'Setting Name'?: string; 'Setting Value'?: string }>>();
  for (const row of existingRows) {
    if (row.fields['Setting Name']) {
      byName.set(row.fields['Setting Name'], row);
    }
  }

  const now = new Date().toISOString();
  const entries = Object.entries(updates) as Array<[keyof ClinicPublicSettings, unknown]>;

  for (const [key, rawVal] of entries) {
    if (rawVal === undefined) continue;
    const stringVal = Array.isArray(rawVal)
      ? JSON.stringify(rawVal)
      : String(rawVal);

    const existing = byName.get(key);
    if (existing) {
      await updateRecord(AIRTABLE_TABLES.CLINIC_SETTINGS, existing.id, {
        'Setting Value': stringVal,
        'Updated At': now,
      });
    } else {
      await createRecord(AIRTABLE_TABLES.CLINIC_SETTINGS, {
        'Setting Name': key,
        'Setting Value': stringVal,
        'Updated At': now,
      });
    }
  }

  await logActivity({
    user: actorEmail,
    action: 'SETTINGS_UPDATED',
    entityType: 'Clinic Settings',
    entityId: 'global',
    previousValue: '',
    newValue: JSON.stringify(Object.keys(updates)),
  });

  return getClinicSettings();
}

// =============================================================================
// SERVICES
// =============================================================================

function mapOfficialFallbackServices(): ClinicService[] {
  return OFFICIAL_SERVICES_SEED.map((s) => ({
    id: s.serviceId,
    serviceId: s.serviceId,
    name: s.name,
    description: s.description,
    active: s.active,
    displayOrder: s.displayOrder,
    durationMinutes: s.durationMinutes,
    assignedStaffIds: [],
    imagePath: s.imagePath,
  }));
}

export async function listServices(includeInactive = false): Promise<{
  services: ClinicService[];
  fromAirtable: boolean;
}> {
  if (!getAirtableCredentials()) {
    return { services: mapOfficialFallbackServices(), fromAirtable: false };
  }

  try {
    const records = await listAllRecords<{
      'Service ID'?: string;
      'Service Name'?: string;
      Description?: string;
      Active?: boolean;
      'Display Order'?: number;
      'Duration Minutes'?: number;
      'Assigned Staff'?: string[];
      'Created At'?: string;
      'Updated At'?: string;
    }>(AIRTABLE_TABLES.SERVICES, {
      sort: [{ field: 'Display Order', direction: 'asc' }],
    });

    if (records.length === 0) {
      return { services: mapOfficialFallbackServices(), fromAirtable: false };
    }

    const seedImageMap = new Map(
      OFFICIAL_SERVICES_SEED.map((s) => [s.serviceId, s.imagePath]),
    );

    const mapped: ClinicService[] = records.map((r, index) => {
      const serviceId = String(r.fields['Service ID'] || r.id);
      return {
        id: r.id,
        serviceId,
        name: String(r.fields['Service Name'] || ''),
        description: String(r.fields.Description || ''),
        active: Boolean(r.fields.Active),
        displayOrder: Number(r.fields['Display Order'] ?? index + 1),
        durationMinutes: Number(r.fields['Duration Minutes'] ?? 45),
        assignedStaffIds: Array.isArray(r.fields['Assigned Staff'])
          ? r.fields['Assigned Staff']
          : [],
        imagePath: seedImageMap.get(serviceId),
        createdAt: r.fields['Created At'],
        updatedAt: r.fields['Updated At'],
      };
    });

    return {
      services: includeInactive ? mapped : mapped.filter((s) => s.active),
      fromAirtable: true,
    };
  } catch {
    return { services: mapOfficialFallbackServices(), fromAirtable: false };
  }
}

export async function seedOfficialServicesToAirtable(actorEmail: string): Promise<ClinicService[]> {
  const existing = await listAllRecords<{
    'Service ID'?: string;
    'Service Name'?: string;
  }>(AIRTABLE_TABLES.SERVICES);
  const existingIds = new Set(
    existing.map((r) => String(r.fields['Service ID'] || '').trim()).filter(Boolean),
  );
  const existingNames = new Set(
    existing.map((r) => String(r.fields['Service Name'] || '').trim().toLowerCase()).filter(Boolean),
  );
  const now = new Date().toISOString();
  let createdCount = 0;

  for (const seed of OFFICIAL_SERVICES_SEED) {
    const idExists = existingIds.has(seed.serviceId);
    const nameExists = existingNames.has(seed.name.trim().toLowerCase());
    if (!idExists && !nameExists) {
      await createRecord(AIRTABLE_TABLES.SERVICES, {
        'Service ID': seed.serviceId,
        'Service Name': seed.name,
        Description: seed.description,
        Active: seed.active,
        'Display Order': seed.displayOrder,
        'Duration Minutes': seed.durationMinutes,
        'Created At': now,
        'Updated At': now,
      });
      createdCount += 1;
    }
  }

  if (createdCount > 0) {
    await logActivity({
      user: actorEmail,
      action: 'SERVICES_SEEDED',
      entityType: 'Services',
      entityId: 'official-5',
      previousValue: String(existing.length),
      newValue: String(existing.length + createdCount),
    });
  }

  const { services } = await listServices(true);
  return services;
}

export async function updateServiceRecord(
  recordId: string,
  updates: Partial<{
    name: string;
    description: string;
    active: boolean;
    displayOrder: number;
    durationMinutes: number;
    assignedStaffIds: string[];
  }>,
  actorEmail: string,
): Promise<ClinicService> {
  const fields: Record<string, unknown> = {
    'Updated At': new Date().toISOString(),
  };
  if (updates.name !== undefined) fields['Service Name'] = sanitizeText(updates.name, 120);
  if (updates.description !== undefined) fields.Description = sanitizeText(updates.description, 800);
  if (updates.active !== undefined) fields.Active = Boolean(updates.active);
  if (updates.displayOrder !== undefined) fields['Display Order'] = Number(updates.displayOrder);
  if (updates.durationMinutes !== undefined) fields['Duration Minutes'] = Number(updates.durationMinutes);
  if (updates.assignedStaffIds !== undefined) fields['Assigned Staff'] = updates.assignedStaffIds;

  const updated = await updateRecord<{
    'Service ID'?: string;
    'Service Name'?: string;
    Description?: string;
    Active?: boolean;
    'Display Order'?: number;
    'Duration Minutes'?: number;
    'Assigned Staff'?: string[];
  }>(AIRTABLE_TABLES.SERVICES, recordId, fields);

  await logActivity({
    user: actorEmail,
    action: 'SERVICE_UPDATED',
    entityType: 'Services',
    entityId: recordId,
    previousValue: '',
    newValue: JSON.stringify(updates),
  });

  return {
    id: updated.id,
    serviceId: String(updated.fields['Service ID'] || updated.id),
    name: String(updated.fields['Service Name'] || ''),
    description: String(updated.fields.Description || ''),
    active: Boolean(updated.fields.Active),
    displayOrder: Number(updated.fields['Display Order'] ?? 1),
    durationMinutes: Number(updated.fields['Duration Minutes'] ?? 45),
    assignedStaffIds: Array.isArray(updated.fields['Assigned Staff'])
      ? updated.fields['Assigned Staff']
      : [],
  };
}

// =============================================================================
// CLIENTS
// =============================================================================

function mapClientRecord(r: AirtableRecord<Record<string, unknown>>): ClientRecord {
  const f = r.fields;
  return {
    id: r.id,
    clientId: String(f['Client ID'] || r.id),
    fullName: String(f['Full Name'] || ''),
    phone: String(f.Phone || ''),
    email: String(f.Email || ''),
    preferredLanguage: ((f['Preferred Language'] as Language) || 'fr'),
    internalNotes: String(f['Internal Notes'] || ''),
    appointmentIds: Array.isArray(f.Appointments) ? (f.Appointments as string[]) : [],
    createdAt: String(f['Created At'] || r.createdTime),
    updatedAt: String(f['Updated At'] || r.createdTime),
  };
}

export async function listClients(): Promise<ClientRecord[]> {
  const records = await listAllRecords<Record<string, unknown>>(AIRTABLE_TABLES.CLIENTS, {
    sort: [{ field: 'Created At', direction: 'desc' }],
  });
  return records.map(mapClientRecord);
}

export async function findOrCreateClient(params: {
  fullName: string;
  phone: string;
  email: string;
  preferredLanguage: Language;
}): Promise<ClientRecord> {
  const normPhone = normalizePhone(params.phone);
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanNameLower = params.fullName.trim().replace(/\s+/g, ' ').toLowerCase();

  // Match cleanly without mixing up distinct clients who share a phone number
  const existingClients = await listClients();
  const emailOwner = cleanEmail
    ? existingClients.find((c) => c.email && c.email.trim().toLowerCase() === cleanEmail)
    : undefined;
  const phoneMatched = normPhone
    ? existingClients.find((c) => normalizePhone(c.phone) === normPhone)
    : undefined;

  let matched: ClientRecord | undefined;
  if (emailOwner && phoneMatched && emailOwner.id === phoneMatched.id) {
    matched = emailOwner;
  } else if (emailOwner) {
    matched = emailOwner;
  } else if (phoneMatched) {
    const existingNameLower = phoneMatched.fullName.trim().replace(/\s+/g, ' ').toLowerCase();
    const samePersonName =
      !existingNameLower ||
      !cleanNameLower ||
      existingNameLower === cleanNameLower ||
      existingNameLower.includes(cleanNameLower) ||
      cleanNameLower.includes(existingNameLower);
    if (!cleanEmail || !phoneMatched.email || samePersonName) {
      matched = phoneMatched;
    }
  }

  const now = new Date().toISOString();

  if (matched) {
    const previousEmail = matched.email.trim().toLowerCase();
    const patch: Record<string, unknown> = {
      'Updated At': now,
      'Preferred Language': params.preferredLanguage,
    };
    const shouldUpdateEmail = Boolean(cleanEmail && cleanEmail !== previousEmail && !emailOwner);
    if ((!matched.email && cleanEmail) || shouldUpdateEmail) {
      patch.Email = cleanEmail;
    }
    if (!matched.phone && normPhone) patch.Phone = normPhone;
    if (params.fullName.trim() && matched.fullName !== params.fullName.trim() && !phoneMatched) {
      patch['Full Name'] = params.fullName.trim();
    } else if (params.fullName.trim() && matched.fullName !== params.fullName.trim() && phoneMatched?.id === matched.id) {
      patch['Full Name'] = params.fullName.trim();
    }
    const updated = await updateRecord<Record<string, unknown>>(
      AIRTABLE_TABLES.CLIENTS,
      matched.id,
      patch,
    );
    const updatedClient = mapClientRecord(updated);

    // If this returning client updated their email, sync Client Email across their active/upcoming appointments
    if (shouldUpdateEmail && updatedClient.appointmentIds.length > 0) {
      for (const apptId of updatedClient.appointmentIds) {
        const apptRec = await getRecord<Record<string, unknown>>(
          AIRTABLE_TABLES.APPOINTMENTS,
          apptId,
        ).catch(() => null);
        const st = String(apptRec?.fields?.Status || '');
        if (
          apptRec &&
          st !== 'Completed' &&
          st !== 'Cancelled' &&
          st !== 'No Show'
        ) {
          await updateRecord(AIRTABLE_TABLES.APPOINTMENTS, apptId, {
            'Client Email': cleanEmail,
          }).catch(() => undefined);
        }
      }
    }

    return updatedClient;
  }

  const clientId = `CLI-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const created = await createRecord<Record<string, unknown>>(AIRTABLE_TABLES.CLIENTS, {
    'Client ID': clientId,
    'Full Name': params.fullName.trim(),
    Phone: normPhone || params.phone.trim(),
    Email: cleanEmail || undefined,
    'Preferred Language': params.preferredLanguage,
    'Created At': now,
    'Updated At': now,
  });

  return mapClientRecord(created);
}

export async function updateClientRecord(
  recordId: string,
  updates: Partial<{
    fullName: string;
    phone: string;
    email: string;
    preferredLanguage: Language;
    internalNotes: string;
  }>,
  actorEmail: string,
): Promise<ClientRecord> {
  const fields: Record<string, unknown> = {
    'Updated At': new Date().toISOString(),
  };
  if (updates.fullName !== undefined) fields['Full Name'] = sanitizeText(updates.fullName, 120);
  if (updates.phone !== undefined) fields.Phone = normalizePhone(sanitizeText(updates.phone, 40));
  if (updates.email !== undefined) fields.Email = sanitizeText(updates.email, 160).toLowerCase();
  if (updates.preferredLanguage !== undefined) fields['Preferred Language'] = updates.preferredLanguage;
  if (updates.internalNotes !== undefined) fields['Internal Notes'] = sanitizeText(updates.internalNotes, 2000);

  const updated = await updateRecord<Record<string, unknown>>(
    AIRTABLE_TABLES.CLIENTS,
    recordId,
    fields,
  );

  const updatedClient = mapClientRecord(updated);

  if (updates.email !== undefined) {
    const syncedEmail = updatedClient.email.trim().toLowerCase();
    for (const apptId of updatedClient.appointmentIds) {
      await updateRecord(AIRTABLE_TABLES.APPOINTMENTS, apptId, {
        'Client Email': syncedEmail,
      }).catch(() => undefined);
    }
  }

  await logActivity({
    user: actorEmail,
    action: 'CLIENT_UPDATED',
    entityType: 'Clients',
    entityId: recordId,
    previousValue: '',
    newValue: JSON.stringify(Object.keys(updates)),
  });

  return updatedClient;
}

// =============================================================================
// STAFF
// =============================================================================

function mapStaffRecord(r: AirtableRecord<Record<string, unknown>>): StaffMember {
  const f = r.fields;
  return {
    id: r.id,
    staffId: String(f['Staff ID'] || r.id),
    fullName: String(f['Full Name'] || ''),
    role: String(f.Role || ''),
    phone: String(f.Phone || ''),
    email: String(f.Email || ''),
    assignedServiceIds: Array.isArray(f['Assigned Services'])
      ? (f['Assigned Services'] as string[])
      : [],
    availability: String(f.Availability || ''),
    active: Boolean(f.Active),
    createdAt: String(f['Created At'] || r.createdTime),
  };
}

export async function listStaff(): Promise<StaffMember[]> {
  const records = await listAllRecords<Record<string, unknown>>(AIRTABLE_TABLES.STAFF, {
    sort: [{ field: 'Full Name', direction: 'asc' }],
  });
  return records.map(mapStaffRecord);
}

export async function createStaffMember(
  input: {
    fullName: string;
    role: string;
    phone?: string;
    email?: string;
    assignedServiceIds?: string[];
    availability?: string;
    active?: boolean;
  },
  actorEmail: string,
): Promise<StaffMember> {
  const staffId = `STF-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const now = new Date().toISOString();

  const created = await createRecord<Record<string, unknown>>(AIRTABLE_TABLES.STAFF, {
    'Staff ID': staffId,
    'Full Name': sanitizeText(input.fullName, 120),
    Role: sanitizeText(input.role, 120),
    Phone: input.phone ? normalizePhone(sanitizeText(input.phone, 40)) : undefined,
    Email: input.email ? sanitizeText(input.email, 160).toLowerCase() : undefined,
    'Assigned Services': input.assignedServiceIds || [],
    Availability: sanitizeText(input.availability || '', 1000),
    Active: input.active !== false,
    'Created At': now,
  });

  await logActivity({
    user: actorEmail,
    action: 'STAFF_CREATED',
    entityType: 'Staff',
    entityId: created.id,
    previousValue: '',
    newValue: input.fullName,
  });

  return mapStaffRecord(created);
}

export async function updateStaffMember(
  recordId: string,
  updates: Partial<{
    fullName: string;
    role: string;
    phone: string;
    email: string;
    assignedServiceIds: string[];
    availability: string;
    active: boolean;
  }>,
  actorEmail: string,
): Promise<StaffMember> {
  const fields: Record<string, unknown> = {};
  if (updates.fullName !== undefined) fields['Full Name'] = sanitizeText(updates.fullName, 120);
  if (updates.role !== undefined) fields.Role = sanitizeText(updates.role, 120);
  if (updates.phone !== undefined) fields.Phone = normalizePhone(sanitizeText(updates.phone, 40));
  if (updates.email !== undefined) fields.Email = sanitizeText(updates.email, 160).toLowerCase();
  if (updates.assignedServiceIds !== undefined) fields['Assigned Services'] = updates.assignedServiceIds;
  if (updates.availability !== undefined) fields.Availability = sanitizeText(updates.availability, 1000);
  if (updates.active !== undefined) fields.Active = Boolean(updates.active);

  const updated = await updateRecord<Record<string, unknown>>(
    AIRTABLE_TABLES.STAFF,
    recordId,
    fields,
  );

  await logActivity({
    user: actorEmail,
    action: 'STAFF_UPDATED',
    entityType: 'Staff',
    entityId: recordId,
    previousValue: '',
    newValue: JSON.stringify(Object.keys(updates)),
  });

  return mapStaffRecord(updated);
}

// =============================================================================
// SLOT CONFLICT & CONCURRENCY HELPERS
// =============================================================================

const dateSlotLocks = new Map<string, Promise<unknown>>();

async function withDateSlotLock<T>(dateKey: string, fn: () => Promise<T>): Promise<T> {
  const key = dateKey || '__global__';
  const prev = dateSlotLocks.get(key) || Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = prev.then(() => next, () => next);
  dateSlotLocks.set(key, chained);

  await prev.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release();
    if (dateSlotLocks.get(key) === chained) {
      dateSlotLocks.delete(key);
    }
  }
}

export function parseTimeToMinutes(timeStr: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(timeStr.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function doTimeIntervalsOverlap(
  startA: number,
  durationA: number,
  startB: number,
  durationB: number,
): boolean {
  const endA = startA + Math.max(1, durationA);
  const endB = startB + Math.max(1, durationB);
  return startA < endB && startB < endA;
}

function getRecordDurationMinutes(
  recFields: Record<string, unknown>,
  serviceMap: Map<string, ClinicService>,
  fallbackDurationMinutes: number,
): number {
  const svcId = Array.isArray(recFields.Service) ? String(recFields.Service[0] || '') : '';
  const duration = serviceMap.get(svcId)?.durationMinutes;
  return duration && duration > 0 ? duration : fallbackDurationMinutes;
}

function doesRecordOverlapTarget(params: {
  record: AirtableRecord<Record<string, unknown>>;
  excludeAppointmentId?: string;
  targetTime: string;
  targetDurationMinutes: number;
  targetStaffId: string;
  serviceMap: Map<string, ClinicService>;
  fallbackDurationMinutes: number;
}): boolean {
  if (params.excludeAppointmentId && params.record.id === params.excludeAppointmentId) {
    return false;
  }
  const otherStaff = Array.isArray(params.record.fields['Assigned Staff'])
    ? String(params.record.fields['Assigned Staff'][0] || '')
    : '';
  // Conflict if either has no distinct staff assigned, or both target the same practitioner
  if (params.targetStaffId && otherStaff && params.targetStaffId !== otherStaff) {
    return false;
  }
  const otherTime = String(params.record.fields['Preferred Time'] || '');
  const targetStart = parseTimeToMinutes(params.targetTime);
  const otherStart = parseTimeToMinutes(otherTime);
  if (targetStart === null || otherStart === null) {
    return otherTime.trim() === params.targetTime.trim();
  }
  const otherDuration = getRecordDurationMinutes(
    params.record.fields,
    params.serviceMap,
    params.fallbackDurationMinutes,
  );
  return doTimeIntervalsOverlap(
    targetStart,
    params.targetDurationMinutes,
    otherStart,
    otherDuration,
  );
}

async function listOccupiedAppointmentsForDate(
  date: string,
): Promise<AirtableRecord<Record<string, unknown>>[]> {
  return listAllRecords<Record<string, unknown>>(AIRTABLE_TABLES.APPOINTMENTS, {
    filterByFormula: `AND(OR({Status} = 'Confirmed', {Status} = 'Rescheduled'), IF({Preferred Date}, DATESTR({Preferred Date}) = '${escapeFormulaString(date)}'))`,
  });
}

async function findSlotConflict(params: {
  date: string;
  time: string;
  durationMinutes: number;
  staffId: string;
  excludeAppointmentId?: string;
  serviceMap: Map<string, ClinicService>;
  fallbackDurationMinutes: number;
  preventOverlappingConfirmed: boolean;
}): Promise<AirtableRecord<Record<string, unknown>> | null> {
  if (!params.preventOverlappingConfirmed) return null;
  const sameDayOccupied = await listOccupiedAppointmentsForDate(params.date);
  return (
    sameDayOccupied.find((rec) =>
      doesRecordOverlapTarget({
        record: rec,
        excludeAppointmentId: params.excludeAppointmentId,
        targetTime: params.time,
        targetDurationMinutes: params.durationMinutes,
        targetStaffId: params.staffId,
        serviceMap: params.serviceMap,
        fallbackDurationMinutes: params.fallbackDurationMinutes,
      }),
    ) || null
  );
}

// =============================================================================
// APPOINTMENTS & BOOKING WORKFLOW
// =============================================================================

function mapAppointmentRecord(
  r: AirtableRecord<Record<string, unknown>>,
  clientMap?: Map<string, ClientRecord>,
  serviceMap?: Map<string, ClinicService>,
  staffMap?: Map<string, StaffMember>,
): AppointmentRecord {
  const f = r.fields;
  const clientId = Array.isArray(f.Client) ? String(f.Client[0] || '') : '';
  const serviceId = Array.isArray(f.Service) ? String(f.Service[0] || '') : '';
  const staffId = Array.isArray(f['Assigned Staff']) ? String(f['Assigned Staff'][0] || '') : '';

  const client = clientMap?.get(clientId);
  const service = serviceMap?.get(serviceId);
  const staff = staffMap?.get(staffId);

  return {
    id: r.id,
    bookingReference: String(f['Booking Reference'] || ''),
    clientId,
    clientName: client?.fullName || String(f['Client Name'] || ''),
    clientPhone: client?.phone || '',
    clientEmail: client?.email || String(f['Client Email'] || ''),
    clientPreferredLanguage: client?.preferredLanguage || 'fr',
    serviceId,
    serviceName: service?.name || '',
    preferredDate: String(f['Preferred Date'] || ''),
    preferredTime: String(f['Preferred Time'] || ''),
    alternativeDate: String(f['Alternative Date'] || ''),
    alternativeTime: String(f['Alternative Time'] || ''),
    status: (f.Status as AppointmentStatus) || 'Pending Confirmation',
    clientMessage: String(f['Client Message'] || ''),
    preferredLanguage: ((f['Preferred Language'] as Language) || 'fr'),
    assignedStaffId: staffId,
    assignedStaffName: staff?.fullName || '',
    createdAt: String(f['Created At'] || r.createdTime),
    updatedAt: String(f['Updated At'] || r.createdTime),
    internalNotes: String(f['Internal Notes'] || ''),
    cancellationReason: String(f['Cancellation Reason'] || ''),
    confirmationDate: String(f['Confirmation Date'] || ''),
    notificationSent: Boolean(f['Notification Sent']),
    notificationError: String(f['Notification Error'] || ''),
    reminderEmailSent: Boolean(f['Reminder Email Sent']),
  };
}

export async function listAppointments(options?: {
  linkedStaffId?: string;
}): Promise<AppointmentRecord[]> {
  const [rawAppointments, clients, servicesRes, staff] = await Promise.all([
    listAllRecords<Record<string, unknown>>(AIRTABLE_TABLES.APPOINTMENTS, {
      sort: [{ field: 'Created At', direction: 'desc' }],
    }),
    listClients(),
    listServices(true),
    listStaff(),
  ]);

  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const serviceMap = new Map(servicesRes.services.map((s) => [s.id, s]));
  const staffMap = new Map(staff.map((m) => [m.id, m]));

  let mapped = rawAppointments.map((r) =>
    mapAppointmentRecord(r, clientMap, serviceMap, staffMap),
  );

  if (options?.linkedStaffId) {
    mapped = mapped.filter((a) => a.assignedStaffId === options.linkedStaffId);
  }

  return mapped;
}

export async function submitPublicBooking(
  payload: BookingSubmitPayload,
): Promise<{
  appointment: AppointmentRecord;
  makeResult: { sent: boolean; skipped?: boolean; error?: string };
}> {
  cleanupSubmissionTokens();

  if (!getAirtableCredentials()) {
    throw new AirtableError(
      'Airtable database is not configured yet. Please configure AIRTABLE_ACCESS_TOKEN and AIRTABLE_BASE_ID on the server.',
      503,
      'AIRTABLE_NOT_CONFIGURED',
    );
  }

  if (!payload.consentAccepted) {
    throw new AirtableError(
      'Consent is required before submitting an appointment request.',
      400,
      'CONSENT_REQUIRED',
    );
  }

  // Prevent duplicate submission with same client token
  const token = sanitizeText(payload.submissionToken, 80);
  if (token && recentSubmissionTokens.has(token)) {
    const existing = recentSubmissionTokens.get(token)!;
    throw new AirtableError(
      `Duplicate submission prevented. Request already recorded under reference ${existing.bookingReference}.`,
      409,
      'DUPLICATE_SUBMISSION',
    );
  }

  const fullName = sanitizeText(payload.fullName, 120);
  const phone = sanitizeText(payload.phone, 40);
  const email = sanitizeText(payload.email || '', 160).toLowerCase();
  const preferredDate = sanitizeText(payload.preferredDate, 20);
  const preferredTime = sanitizeText(payload.preferredTime, 10);
  const alternativeDate = sanitizeText(payload.alternativeDate || '', 20);
  const alternativeTime = sanitizeText(payload.alternativeTime || '', 10);
  const message = sanitizeText(payload.message || '', 1000);
  const preferredLanguage: Language =
    payload.preferredLanguage === 'en' || payload.preferredLanguage === 'ar'
      ? payload.preferredLanguage
      : 'fr';

  if (fullName.length < 2) {
    throw new AirtableError('Full name is required.', 400, 'INVALID_NAME');
  }
  if (!isValidPhone(phone)) {
    throw new AirtableError('Valid phone number is required.', 400, 'INVALID_PHONE');
  }
  const settings = await getClinicSettings();
  if (settings.requireEmail && !email) {
    throw new AirtableError('Email address is required.', 400, 'EMAIL_REQUIRED');
  }
  if (email && !isValidEmail(email)) {
    throw new AirtableError('Email address format is invalid.', 400, 'INVALID_EMAIL');
  }
  if (!preferredDate || !preferredTime) {
    throw new AirtableError('Preferred date and time are required.', 400, 'INVALID_SCHEDULE');
  }

  // Resolve service record in Airtable (auto-seed 5 official services if table is empty)
  let { services, fromAirtable } = await listServices(true);
  if (!fromAirtable) {
    services = await seedOfficialServicesToAirtable('system-bootstrap');
  }

  const service = services.find(
    (s) => s.id === payload.serviceId || s.serviceId === payload.serviceId,
  );
  if (!service || !service.active) {
    throw new AirtableError('Selected service is unavailable.', 400, 'INVALID_SERVICE');
  }

  // 1. Find or create deduplicated Client record (always allows repeat bookings for existing clients)
  const client = await findOrCreateClient({
    fullName,
    phone,
    email,
    preferredLanguage,
  });

  // 2 & 3. Check slot conflicts & create Appointment record inside per-date lock
  const serviceMap = new Map(services.map((s) => [s.id, s]));
  const bookingReference = generateBookingReference();
  const now = new Date().toISOString();
  const appointmentEmail = client.email || email || '';

  const createdRaw = await withDateSlotLock(preferredDate, async () => {
    const conflict = await findSlotConflict({
      date: preferredDate,
      time: preferredTime,
      durationMinutes: service.durationMinutes || settings.slotDurationMinutes,
      staffId: '',
      serviceMap,
      fallbackDurationMinutes: settings.slotDurationMinutes,
      preventOverlappingConfirmed: settings.preventOverlappingConfirmed,
    });
    if (conflict) {
      throw new AirtableError(
        `The time slot ${preferredDate} at ${preferredTime} is already booked. Please select another available date and time.`,
        409,
        'SLOT_UNAVAILABLE',
      );
    }

    return createRecord<Record<string, unknown>>(AIRTABLE_TABLES.APPOINTMENTS, {
      'Booking Reference': bookingReference,
      Client: [client.id],
      'Client Email': appointmentEmail,
      Service: [service.id],
      'Preferred Date': preferredDate,
      'Preferred Time': preferredTime,
      'Alternative Date': alternativeDate || undefined,
      'Alternative Time': alternativeTime || undefined,
      Status: 'Pending Confirmation',
      'Client Message': message || undefined,
      'Preferred Language': preferredLanguage,
      'Created At': now,
      'Updated At': now,
      'Notification Sent': false,
      'Reminder Email Sent': false,
    });
  });

  if (token) {
    recentSubmissionTokens.set(token, {
      bookingReference,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
  }

  const appointment: AppointmentRecord = {
    id: createdRaw.id,
    bookingReference,
    clientId: client.id,
    clientName: client.fullName,
    clientPhone: client.phone,
    clientEmail: appointmentEmail,
    serviceId: service.id,
    serviceName: service.name,
    preferredDate,
    preferredTime,
    alternativeDate,
    alternativeTime,
    status: 'Pending Confirmation',
    clientMessage: message,
    preferredLanguage,
    assignedStaffId: '',
    createdAt: now,
    updatedAt: now,
    internalNotes: '',
    cancellationReason: '',
    confirmationDate: '',
    notificationSent: false,
    notificationError: '',
    reminderEmailSent: false,
  };

  // 4. Create internal Notification & Activity Log
  await Promise.allSettled([
    createNotification({
      type: 'new_booking',
      title: `Nouvelle demande — ${bookingReference}`,
      message: `${client.fullName} · ${service.name} · ${preferredDate} ${preferredTime}`,
      relatedAppointmentId: appointment.id,
      recipient: 'Admin',
    }),
    logActivity({
      user: 'Public Booking Portal',
      action: 'BOOKING_CREATED',
      entityType: 'Appointments',
      entityId: appointment.id,
      previousValue: '',
      newValue: `${bookingReference} (${service.name})`,
    }),
  ]);

  // 5. Trigger Make.com webhook AFTER saving (never delete appointment if webhook fails!)
  const makePayload = buildMakePayload('booking_created', appointment);
  const makeResult = await triggerMakeWebhook(makePayload);

  if (makeResult.sent) {
    await updateRecord(AIRTABLE_TABLES.APPOINTMENTS, appointment.id, {
      'Notification Sent': true,
      'Notification Error': '',
    }).catch(() => undefined);
    appointment.notificationSent = true;
  } else if (!makeResult.skipped) {
    const errMsg = makeResult.error || 'Webhook delivery failed';
    await updateRecord(AIRTABLE_TABLES.APPOINTMENTS, appointment.id, {
      'Notification Sent': false,
      'Notification Error': errMsg,
    }).catch(() => undefined);
    appointment.notificationError = errMsg;

    await createNotification({
      type: 'integration_error',
      title: `Erreur Make.com — ${bookingReference}`,
      message: errMsg,
      relatedAppointmentId: appointment.id,
      recipient: 'Super Admin',
    }).catch(() => undefined);
  }

  return { appointment, makeResult };
}

export async function updateAppointmentAdmin(
  recordId: string,
  updates: AppointmentAdminUpdatePayload,
  actor: AuthSessionUser,
): Promise<{
  appointment: AppointmentRecord;
  makeResult?: { sent: boolean; skipped?: boolean; error?: string };
}> {
  const existingRaw = await getRecord<Record<string, unknown>>(
    AIRTABLE_TABLES.APPOINTMENTS,
    recordId,
  );

  const [clients, servicesRes, staff] = await Promise.all([
    listClients(),
    listServices(true),
    listStaff(),
  ]);
  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const serviceMap = new Map(servicesRes.services.map((s) => [s.id, s]));
  const staffMap = new Map(staff.map((m) => [m.id, m]));

  const previous = mapAppointmentRecord(existingRaw, clientMap, serviceMap, staffMap);

  // Enforce Staff role boundaries on the server
  if (actor.role === 'Staff') {
    if (!actor.linkedStaffId || previous.assignedStaffId !== actor.linkedStaffId) {
      throw new AirtableError(
        'Staff users may only update appointments assigned to them.',
        403,
        'FORBIDDEN',
      );
    }
    if (updates.status === 'Confirmed' || updates.actionMode === 'confirm') {
      throw new AirtableError(
        'Only an authorized Admin or Super Admin can confirm appointments.',
        403,
        'FORBIDDEN',
      );
    }
    const disallowedForStaff =
      updates.clientName !== undefined ||
      updates.clientPhone !== undefined ||
      updates.clientEmail !== undefined ||
      updates.clientPreferredLanguage !== undefined ||
      updates.serviceId !== undefined ||
      updates.assignedStaffId !== undefined ||
      updates.preferredDate !== undefined ||
      updates.preferredTime !== undefined ||
      updates.alternativeDate !== undefined ||
      updates.alternativeTime !== undefined;
    if (disallowedForStaff) {
      throw new AirtableError(
        'Staff users may only update completion/attendance status and internal notes on assigned appointments.',
        403,
        'FORBIDDEN',
      );
    }
  }

  const nextStatus = updates.status || previous.status;
  const nextDate =
    updates.preferredDate !== undefined ? sanitizeText(updates.preferredDate, 20) : previous.preferredDate;
  const nextTime =
    updates.preferredTime !== undefined ? sanitizeText(updates.preferredTime, 10) : previous.preferredTime;
  const nextAltDate =
    updates.alternativeDate !== undefined
      ? sanitizeText(updates.alternativeDate, 20)
      : previous.alternativeDate;
  const nextAltTime =
    updates.alternativeTime !== undefined
      ? sanitizeText(updates.alternativeTime, 10)
      : previous.alternativeTime;
  const nextServiceId =
    updates.serviceId !== undefined ? updates.serviceId : previous.serviceId;
  const nextStaffId =
    updates.assignedStaffId !== undefined
      ? updates.assignedStaffId || ''
      : previous.assignedStaffId;

  if (!nextDate || !nextTime) {
    throw new AirtableError('Preferred date and time cannot be empty.', 400, 'INVALID_SCHEDULE');
  }

  // Resolve and validate Service if changed
  let resolvedService = serviceMap.get(nextServiceId);
  if (updates.serviceId !== undefined && updates.serviceId !== previous.serviceId) {
    const svc = servicesRes.services.find(
      (s) => s.id === updates.serviceId || s.serviceId === updates.serviceId,
    );
    if (!svc) {
      throw new AirtableError('Selected service does not exist in Airtable.', 400, 'INVALID_SERVICE');
    }
    resolvedService = svc;
  }

  // Validate staff availability & active status when assigning or rescheduling
  if (nextStaffId) {
    const staffMember = staffMap.get(nextStaffId);
    if (!staffMember) {
      throw new AirtableError('Selected staff member does not exist.', 400, 'INVALID_STAFF');
    }
    if (!staffMember.active && updates.assignedStaffId !== undefined) {
      throw new AirtableError(
        `Staff member ${staffMember.fullName} is currently inactive.`,
        400,
        'STAFF_INACTIVE',
      );
    }
  }

  // Enforce clinic scheduling rule inside per-date concurrency lock
  const scheduleChanged =
    nextDate !== previous.preferredDate || nextTime !== previous.preferredTime;
  const isScheduleCheckNeeded =
    nextStatus === 'Confirmed' ||
    updates.actionMode === 'confirm' ||
    updates.actionMode === 'reschedule' ||
    updates.status === 'Rescheduled' ||
    (scheduleChanged && nextStatus !== 'Cancelled' && nextStatus !== 'No Show');

  const clientChanges: string[] = [];
  let updatedRaw!: AirtableRecord<Record<string, unknown>>;
  let now = new Date().toISOString();

  await withDateSlotLock(nextDate, async () => {
    const settings = await getClinicSettings();
    const targetDuration = resolvedService?.durationMinutes || settings.slotDurationMinutes;

    if (isScheduleCheckNeeded) {
      const conflict = await findSlotConflict({
        date: nextDate,
        time: nextTime,
        durationMinutes: targetDuration,
        staffId: nextStaffId,
        excludeAppointmentId: recordId,
        serviceMap,
        fallbackDurationMinutes: settings.slotDurationMinutes,
        preventOverlappingConfirmed: settings.preventOverlappingConfirmed,
      });
      if (conflict) {
        const conflictRef = String(conflict.fields['Booking Reference'] || conflict.id);
        const conflictTime = String(conflict.fields['Preferred Time'] || nextTime);
        throw new AirtableError(
          `Scheduling conflict: slot ${nextDate} at ${nextTime} overlaps with confirmed appointment ${conflictRef} (${conflictTime}). Please choose another available date and time.`,
          409,
          'SLOT_CONFLICT',
        );
      }
    }

    // Update linked client record if client fields were edited by Admin / Super Admin
    if (previous.clientId && actor.role !== 'Staff') {
      const linkedClient = clientMap.get(previous.clientId);
      const clientPatch: Record<string, unknown> = {};
      const prevClientSummary: Record<string, unknown> = {};
      const nextClientSummary: Record<string, unknown> = {};

      if (
        updates.clientName !== undefined &&
        sanitizeText(updates.clientName, 120) !== (linkedClient?.fullName || '')
      ) {
        const val = sanitizeText(updates.clientName, 120);
        if (val.length < 2) {
          throw new AirtableError('Client full name must be at least 2 characters.', 400, 'INVALID_NAME');
        }
        clientPatch['Full Name'] = val;
        prevClientSummary.fullName = linkedClient?.fullName || '';
        nextClientSummary.fullName = val;
        clientChanges.push('clientName');
      }

      if (
        updates.clientPhone !== undefined &&
        normalizePhone(sanitizeText(updates.clientPhone, 40)) !==
          normalizePhone(linkedClient?.phone || '')
      ) {
        const rawPhone = sanitizeText(updates.clientPhone, 40);
        if (!isValidPhone(rawPhone)) {
          throw new AirtableError('Client phone number is invalid.', 400, 'INVALID_PHONE');
        }
        const norm = normalizePhone(rawPhone);
        clientPatch.Phone = norm;
        prevClientSummary.phone = linkedClient?.phone || '';
        nextClientSummary.phone = norm;
        clientChanges.push('clientPhone');
      }

      if (updates.clientEmail !== undefined) {
        const cleanEmail = sanitizeText(updates.clientEmail, 160).toLowerCase();
        if (cleanEmail && !isValidEmail(cleanEmail)) {
          throw new AirtableError('Client email format is invalid.', 400, 'INVALID_EMAIL');
        }
        if (cleanEmail !== (linkedClient?.email || '').toLowerCase()) {
          clientPatch.Email = cleanEmail;
          prevClientSummary.email = linkedClient?.email || '';
          nextClientSummary.email = cleanEmail;
          clientChanges.push('clientEmail');
        }
      }

      if (
        updates.clientPreferredLanguage !== undefined &&
        updates.clientPreferredLanguage !== linkedClient?.preferredLanguage
      ) {
        clientPatch['Preferred Language'] = updates.clientPreferredLanguage;
        prevClientSummary.preferredLanguage = linkedClient?.preferredLanguage || 'fr';
        nextClientSummary.preferredLanguage = updates.clientPreferredLanguage;
        clientChanges.push('clientPreferredLanguage');
      }

      if (Object.keys(clientPatch).length > 0) {
        clientPatch['Updated At'] = new Date().toISOString();
        const updatedClientRaw = await updateRecord<Record<string, unknown>>(
          AIRTABLE_TABLES.CLIENTS,
          previous.clientId,
          clientPatch,
        );
        const mappedClient = mapClientRecord(updatedClientRaw);
        clientMap.set(previous.clientId, mappedClient);

        if (clientChanges.includes('clientEmail')) {
          for (const otherApptId of mappedClient.appointmentIds) {
            if (otherApptId !== recordId) {
              await updateRecord(AIRTABLE_TABLES.APPOINTMENTS, otherApptId, {
                'Client Email': mappedClient.email,
              }).catch(() => undefined);
            }
          }
        }

        await logActivity({
          user: actor.email,
          action: 'CLIENT_UPDATED_FROM_APPOINTMENT',
          entityType: 'Clients',
          entityId: `${linkedClient?.clientId || previous.clientId} (${previous.bookingReference})`,
          previousValue: JSON.stringify(prevClientSummary),
          newValue: JSON.stringify(nextClientSummary),
        });
      }
    }

    now = new Date().toISOString();
    const latestClientEmail =
      (previous.clientId ? clientMap.get(previous.clientId)?.email : '') ||
      previous.clientEmail ||
      '';
    const currentStoredApptEmail = String(existingRaw.fields['Client Email'] || '');

    const patch: Record<string, unknown> = {
      'Updated At': now,
    };
    if (latestClientEmail !== currentStoredApptEmail) {
      patch['Client Email'] = latestClientEmail;
    }
    if (updates.status !== undefined) patch.Status = updates.status;
    if (updates.serviceId !== undefined && resolvedService) {
      patch.Service = [resolvedService.id];
    }
    if (updates.preferredDate !== undefined) patch['Preferred Date'] = nextDate;
    if (updates.preferredTime !== undefined) patch['Preferred Time'] = nextTime;
    if (updates.alternativeDate !== undefined) {
      patch['Alternative Date'] = nextAltDate || null;
    }
    if (updates.alternativeTime !== undefined) {
      patch['Alternative Time'] = nextAltTime || '';
    }
    if (updates.internalNotes !== undefined) {
      patch['Internal Notes'] = sanitizeText(updates.internalNotes, 3000);
    }
    if (updates.clientMessage !== undefined) {
      patch['Client Message'] = sanitizeText(updates.clientMessage, 1000);
    }
    if (updates.preferredLanguage !== undefined) {
      patch['Preferred Language'] = updates.preferredLanguage;
    }
    if (updates.cancellationReason !== undefined) {
      patch['Cancellation Reason'] = sanitizeText(updates.cancellationReason, 1000);
    }
    if (updates.assignedStaffId !== undefined) {
      patch['Assigned Staff'] = nextStaffId ? [nextStaffId] : [];
    }
    if (updates.status === 'Confirmed' && previous.status !== 'Confirmed') {
      patch['Confirmation Date'] = now;
    }
    if (scheduleChanged) {
      patch['Reminder Email Sent'] = false;
    }

    updatedRaw = await updateRecord<Record<string, unknown>>(
      AIRTABLE_TABLES.APPOINTMENTS,
      recordId,
      patch,
    );

    // Post-PATCH optimistic race protection across multi-instance / external writes
    if (isScheduleCheckNeeded && settings.preventOverlappingConfirmed) {
      const postOccupied = await listOccupiedAppointmentsForDate(nextDate);
      const raceConflict = postOccupied.find((r) => {
        if (r.id === recordId) return false;
        const overlaps = doesRecordOverlapTarget({
          record: r,
          excludeAppointmentId: recordId,
          targetTime: nextTime,
          targetDurationMinutes: targetDuration,
          targetStaffId: nextStaffId,
          serviceMap,
          fallbackDurationMinutes: settings.slotDurationMinutes,
        });
        if (!overlaps) return false;
        const otherStamp = String(r.fields['Confirmation Date'] || r.createdTime || '');
        const ourStamp = String(updatedRaw.fields['Confirmation Date'] || now);
        return otherStamp < ourStamp || (otherStamp === ourStamp && r.id < recordId);
      });

      if (raceConflict) {
        await updateRecord(AIRTABLE_TABLES.APPOINTMENTS, recordId, {
          Status: previous.status,
          'Preferred Date': previous.preferredDate,
          'Preferred Time': previous.preferredTime,
          'Confirmation Date': previous.confirmationDate || null,
          'Updated At': new Date().toISOString(),
        }).catch(() => undefined);

        const conflictRef = String(raceConflict.fields['Booking Reference'] || raceConflict.id);
        throw new AirtableError(
          `Scheduling conflict: another administrator simultaneously confirmed appointment ${conflictRef} for ${nextDate} at ${nextTime}. Please select another available date and time.`,
          409,
          'SLOT_CONFLICT',
        );
      }
    }
  });

  const updated = mapAppointmentRecord(updatedRaw, clientMap, serviceMap, staffMap);

  // Build structured audit diff
  const prevAudit: Record<string, unknown> = {};
  const nextAudit: Record<string, unknown> = {};
  if (previous.status !== updated.status) {
    prevAudit.status = previous.status;
    nextAudit.status = updated.status;
  }
  if (previous.serviceId !== updated.serviceId) {
    prevAudit.service = previous.serviceName;
    nextAudit.service = updated.serviceName;
  }
  if (previous.preferredDate !== updated.preferredDate || previous.preferredTime !== updated.preferredTime) {
    prevAudit.schedule = `${previous.preferredDate} ${previous.preferredTime}`;
    nextAudit.schedule = `${updated.preferredDate} ${updated.preferredTime}`;
  }
  if (previous.alternativeDate !== updated.alternativeDate || previous.alternativeTime !== updated.alternativeTime) {
    prevAudit.alternative = `${previous.alternativeDate || '—'} ${previous.alternativeTime || ''}`.trim();
    nextAudit.alternative = `${updated.alternativeDate || '—'} ${updated.alternativeTime || ''}`.trim();
  }
  if (previous.assignedStaffId !== updated.assignedStaffId) {
    prevAudit.staff = previous.assignedStaffName || 'Unassigned';
    nextAudit.staff = updated.assignedStaffName || 'Unassigned';
  }
  if (previous.internalNotes !== updated.internalNotes) {
    prevAudit.internalNotes = previous.internalNotes;
    nextAudit.internalNotes = updated.internalNotes;
  }
  if (previous.clientMessage !== updated.clientMessage) {
    prevAudit.clientMessage = previous.clientMessage;
    nextAudit.clientMessage = updated.clientMessage;
  }
  if (updated.cancellationReason && updated.status === 'Cancelled') {
    nextAudit.cancellationReason = updated.cancellationReason;
  }
  if (updates.actionReason) {
    nextAudit.reason = sanitizeText(updates.actionReason, 500);
  }
  if (clientChanges.length > 0) {
    nextAudit.clientFieldsUpdated = clientChanges;
  }

  const actionName =
    updates.actionMode === 'reschedule' ||
    (nextStatus === 'Rescheduled' && previous.status !== 'Rescheduled')
      ? 'APPOINTMENT_RESCHEDULED'
      : nextStatus === 'Cancelled' && previous.status !== 'Cancelled'
      ? 'APPOINTMENT_CANCELLED'
      : nextStatus === 'Confirmed' && previous.status !== 'Confirmed'
      ? 'APPOINTMENT_CONFIRMED'
      : updates.actionMode === 'edit'
      ? 'APPOINTMENT_EDITED'
      : `APPOINTMENT_${nextStatus.toUpperCase().replace(/\s+/g, '_')}`;

  await logActivity({
    user: actor.email,
    action: actionName,
    entityType: 'Appointments',
    entityId: `${updated.bookingReference || recordId} (${recordId})`,
    previousValue: JSON.stringify(prevAudit),
    newValue: JSON.stringify(nextAudit),
  });

  // Trigger notifications & Make.com ONLY AFTER Airtable update succeeds
  let makeResult: { sent: boolean; skipped?: boolean; error?: string } | undefined;
  let eventType:
    | 'appointment_confirmed'
    | 'appointment_updated'
    | 'appointment_rescheduled'
    | 'appointment_cancelled'
    | null = null;
  let extraPayload: Record<string, unknown> = {};

  if (updates.status === 'Confirmed' && previous.status !== 'Confirmed') {
    eventType = 'appointment_confirmed';
    await createNotification({
      type: 'confirmed',
      title: `Rendez-vous confirmé — ${updated.bookingReference}`,
      message: `${updated.clientName} · ${updated.serviceName} · ${updated.preferredDate} ${updated.preferredTime}`,
      relatedAppointmentId: updated.id,
      recipient: 'Admin',
    }).catch(() => undefined);
  } else if (
    updates.actionMode === 'reschedule' ||
    ((updates.status === 'Rescheduled' ||
      (updates.preferredDate && updates.preferredDate !== previous.preferredDate) ||
      (updates.preferredTime && updates.preferredTime !== previous.preferredTime)) &&
      updates.status !== 'Cancelled')
  ) {
    eventType = 'appointment_rescheduled';
    extraPayload = {
      previousDate: previous.preferredDate,
      previousTime: previous.preferredTime,
    };
    await createNotification({
      type: 'rescheduled',
      title: `Rendez-vous replanifié — ${updated.bookingReference}`,
      message: `${updated.clientName} · ${previous.preferredDate} ${previous.preferredTime} → ${updated.preferredDate} ${updated.preferredTime}`,
      relatedAppointmentId: updated.id,
      recipient: 'Admin',
    }).catch(() => undefined);
  } else if (updates.status === 'Cancelled' && previous.status !== 'Cancelled') {
    eventType = 'appointment_cancelled';
    extraPayload = {
      cancelledBy: actor.email,
      cancelledAt: now,
    };
    await createNotification({
      type: 'cancelled',
      title: `Rendez-vous annulé — ${updated.bookingReference}`,
      message: `${updated.clientName} (par ${actor.fullName})${updated.cancellationReason ? ` · ${updated.cancellationReason}` : ''}`,
      relatedAppointmentId: updated.id,
      recipient: 'Admin',
    }).catch(() => undefined);
  } else if (
    updates.actionMode === 'edit' ||
    updates.actionMode === 'status' ||
    Object.keys(nextAudit).length > 0
  ) {
    eventType = 'appointment_updated';
    extraPayload = {
      requestedAction: `Updated by ${actor.email} (${actor.role})`,
    };
  }

  if (eventType) {
    makeResult = await triggerMakeWebhook(buildMakePayload(eventType, updated, extraPayload));
    if (!makeResult.sent && !makeResult.skipped) {
      await updateRecord(AIRTABLE_TABLES.APPOINTMENTS, updated.id, {
        'Notification Error': makeResult.error || 'Webhook failed',
      }).catch(() => undefined);
      updated.notificationError = makeResult.error || 'Webhook failed';
    } else if (makeResult.sent) {
      await updateRecord(AIRTABLE_TABLES.APPOINTMENTS, updated.id, {
        'Notification Sent': true,
        'Notification Error': '',
      }).catch(() => undefined);
      updated.notificationSent = true;
      updated.notificationError = '';
    }
  }

  return { appointment: updated, makeResult };
}

export async function deleteAppointmentPermanent(
  recordId: string,
  actor: AuthSessionUser,
  reason = '',
): Promise<{ deletedId: string; bookingReference: string }> {
  const existingRaw = await getRecord<Record<string, unknown>>(
    AIRTABLE_TABLES.APPOINTMENTS,
    recordId,
  );
  const [clients, servicesRes, staff] = await Promise.all([
    listClients(),
    listServices(true),
    listStaff(),
  ]);
  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const serviceMap = new Map(servicesRes.services.map((s) => [s.id, s]));
  const staffMap = new Map(staff.map((m) => [m.id, m]));
  const appt = mapAppointmentRecord(existingRaw, clientMap, serviceMap, staffMap);

  const snapshot = {
    bookingReference: appt.bookingReference,
    clientId: appt.clientId,
    clientName: appt.clientName,
    serviceName: appt.serviceName,
    preferredDate: appt.preferredDate,
    preferredTime: appt.preferredTime,
    status: appt.status,
    assignedStaffName: appt.assignedStaffName || 'Unassigned',
  };

  // Preserve full audit snapshot in Activity Logs BEFORE deleting the Airtable record
  await createRecord(AIRTABLE_TABLES.ACTIVITY_LOGS, {
    'Log ID': `LOG-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    User: `${actor.email} (${actor.role})`,
    Action: 'APPOINTMENT_DELETED',
    'Entity Type': 'Appointments',
    'Entity ID': `${appt.bookingReference || recordId} (${recordId})`,
    'Previous Value': JSON.stringify(snapshot).slice(0, 1000),
    'New Value': reason ? `Permanently deleted · Reason: ${sanitizeText(reason, 400)}` : 'Permanently deleted',
    Timestamp: new Date().toISOString(),
  });

  await createNotification({
    type: 'system',
    title: `Rendez-vous supprimé — ${appt.bookingReference}`,
    message: `${appt.clientName} · ${appt.serviceName} · ${appt.preferredDate} ${appt.preferredTime} (par ${actor.email})`,
    recipient: 'Super Admin',
  }).catch(() => undefined);

  // Permanently delete ONLY this appointment record (never delete linked client or unrelated appointments)
  await deleteRecord(AIRTABLE_TABLES.APPOINTMENTS, recordId);

  return {
    deletedId: recordId,
    bookingReference: appt.bookingReference,
  };
}

export async function getAppointmentHistory(
  recordId: string,
  bookingReference: string,
): Promise<ActivityLogRecord[]> {
  const logs = await listActivityLogs();
  return logs.filter((log) => {
    const entity = log.entityId || '';
    return (
      entity === recordId ||
      (bookingReference && entity.includes(bookingReference)) ||
      entity.includes(recordId)
    );
  });
}

// =============================================================================
// CLIENT SELF-SERVICE ARCHITECTURE (Verification-gated; never exposes raw Airtable)
// =============================================================================

const SELF_SERVICE_LOCKED_STATUSES = new Set<AppointmentStatus>([
  'Cancelled',
  'Completed',
  'No Show',
]);

function isValidIsoDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() + 1 === m &&
    dt.getUTCDate() === d
  );
}

function getCasablancaNow(): { date: string; time: string; timestampMs: number } {
  const now = new Date();
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Casablanca',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Casablanca',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
  return { date, time, timestampMs: now.getTime() };
}

function isPastCasablancaSlot(dateStr: string, timeStr: string): boolean {
  const now = getCasablancaNow();
  if (dateStr < now.date) return true;
  if (dateStr === now.date && timeStr <= now.time) return true;
  return false;
}

function isSlotAllowedByDeadline(
  preferredDate: string,
  preferredTime: string,
  deadlineHours: number | null,
): boolean {
  if (deadlineHours === null || deadlineHours <= 0) return true;
  if (!isValidIsoDate(preferredDate) || !/^\d{2}:\d{2}$/.test(preferredTime)) return true;
  // Casablanca clinic time (UTC+01:00)
  const slotMs = Date.parse(`${preferredDate}T${preferredTime}:00+01:00`);
  if (!Number.isFinite(slotMs)) return true;
  return Date.now() <= slotMs - deadlineHours * 3600_000;
}

async function getConfiguredSelfServiceDeadlines(): Promise<{
  modificationDeadlineHours: number | null;
  cancellationDeadlineHours: number | null;
}> {
  if (!getAirtableCredentials()) {
    return { modificationDeadlineHours: null, cancellationDeadlineHours: null };
  }
  try {
    const rows = await listAllRecords<{
      'Setting Name'?: string;
      'Setting Value'?: string;
    }>(AIRTABLE_TABLES.CLINIC_SETTINGS);
    let modHours: number | null = null;
    let cancelHours: number | null = null;
    for (const row of rows) {
      const name = row.fields['Setting Name'];
      const num = Number(row.fields['Setting Value']);
      if (name === 'modificationDeadlineHours' && Number.isFinite(num) && num > 0) {
        modHours = num;
      }
      if (name === 'cancellationDeadlineHours' && Number.isFinite(num) && num > 0) {
        cancelHours = num;
      }
    }
    return {
      modificationDeadlineHours: modHours,
      cancellationDeadlineHours: cancelHours,
    };
  } catch {
    return { modificationDeadlineHours: null, cancellationDeadlineHours: null };
  }
}

interface VerifiedClientContext {
  appointment: AppointmentRecord;
  services: ClinicService[];
  staff: StaffMember[];
  settings: ClinicPublicSettings;
  modificationDeadlineHours: number | null;
  cancellationDeadlineHours: number | null;
}

function buildSafeLookupResponse(ctx: VerifiedClientContext): SelfServiceLookupResponse {
  const { appointment, services, staff, modificationDeadlineHours, cancellationDeadlineHours } = ctx;
  const activeServices: SelfServiceServiceOption[] = services
    .filter((s) => s.active)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((s) => ({
      id: s.id,
      serviceId: s.serviceId,
      name: s.name,
      durationMinutes: s.durationMinutes,
    }));

  const activeStaff: SelfServiceStaffOption[] = staff
    .filter((m) => m.active)
    .map((m) => ({
      id: m.id,
      fullName: m.fullName,
      role: m.role,
      assignedServiceIds: m.assignedServiceIds,
      availability: m.availability,
    }));

  const statusLocked = SELF_SERVICE_LOCKED_STATUSES.has(appointment.status);
  const modifyDeadlineOk = isSlotAllowedByDeadline(
    appointment.preferredDate,
    appointment.preferredTime,
    modificationDeadlineHours,
  );
  const cancelDeadlineOk = isSlotAllowedByDeadline(
    appointment.preferredDate,
    appointment.preferredTime,
    cancellationDeadlineHours,
  );

  const canModify = !statusLocked && modifyDeadlineOk;
  const canCancel = !statusLocked && cancelDeadlineOk;
  const canChangeService = canModify && activeServices.length > 0;

  let lockReason: string | undefined;
  if (statusLocked) {
    lockReason = 'This appointment can no longer be modified online. Please contact EMIE CLINIC reception.';
  } else if (!modifyDeadlineOk || !cancelDeadlineOk) {
    lockReason = 'The online modification window for this appointment has closed. Please contact EMIE CLINIC reception.';
  }

  return {
    bookingReference: appointment.bookingReference,
    serviceId: appointment.serviceId,
    serviceName: appointment.serviceName || '',
    preferredDate: appointment.preferredDate,
    preferredTime: appointment.preferredTime,
    alternativeDate: appointment.alternativeDate,
    alternativeTime: appointment.alternativeTime,
    status: appointment.status,
    assignedStaffId: appointment.assignedStaffId,
    assignedStaffName: appointment.assignedStaffName || '',
    clientMessage: appointment.clientMessage,
    preferredLanguage: appointment.preferredLanguage,
    canModify,
    canCancel,
    canChangeService,
    lockReason,
    availableServices: activeServices,
    availableStaff: activeStaff,
    modificationDeadlineHours,
    cancellationDeadlineHours,
  };
}

async function verifyClientAppointmentAccess(params: {
  bookingReference: string;
  contact: string;
}): Promise<VerifiedClientContext> {
  const ref = sanitizeText(params.bookingReference, 40).toUpperCase();
  const contactRaw = sanitizeText(params.contact, 160);
  if (!ref || !contactRaw) {
    throw new AirtableError(
      'Booking reference and phone or email are required.',
      400,
      'INVALID_INPUT',
    );
  }

  const genericNotFound = () =>
    new AirtableError(
      'No matching appointment found for this booking reference and contact detail.',
      404,
      'NOT_FOUND',
    );

  if (!/^EMIE-\d{8}-[A-Z0-9]{4,}$/.test(ref)) {
    throw genericNotFound();
  }

  const matchingRaw = await listAllRecords<Record<string, unknown>>(
    AIRTABLE_TABLES.APPOINTMENTS,
    {
      filterByFormula: `{Booking Reference} = '${escapeFormulaString(ref)}'`,
      maxRecords: 2,
    },
  );
  const rawAppt = matchingRaw[0];
  if (!rawAppt) {
    throw genericNotFound();
  }

  const linkedClientId = Array.isArray(rawAppt.fields.Client)
    ? String(rawAppt.fields.Client[0] || '')
    : '';
  if (!linkedClientId) {
    throw genericNotFound();
  }

  let linkedClientRaw: AirtableRecord<Record<string, unknown>>;
  try {
    linkedClientRaw = await getRecord<Record<string, unknown>>(
      AIRTABLE_TABLES.CLIENTS,
      linkedClientId,
    );
  } catch {
    throw genericNotFound();
  }

  const linkedClient = mapClientRecord(linkedClientRaw);
  const isEmailInput = contactRaw.includes('@');
  let verified = false;

  if (isEmailInput) {
    const cleanEmail = contactRaw.trim().toLowerCase();
    verified =
      isValidEmail(cleanEmail) &&
      Boolean(linkedClient.email) &&
      linkedClient.email.trim().toLowerCase() === cleanEmail;
  } else {
    const normInputPhone = normalizePhone(contactRaw);
    const digitsOnly = normInputPhone.replace(/\D/g, '');
    verified =
      digitsOnly.length >= 8 &&
      Boolean(linkedClient.phone) &&
      normalizePhone(linkedClient.phone) === normInputPhone;
  }

  if (!verified) {
    throw genericNotFound();
  }

  const [servicesRes, staff, settings, deadlines] = await Promise.all([
    listServices(true),
    listStaff(),
    getClinicSettings(),
    getConfiguredSelfServiceDeadlines(),
  ]);

  const clientMap = new Map([[linkedClient.id, linkedClient]]);
  const serviceMap = new Map(servicesRes.services.map((s) => [s.id, s]));
  const staffMap = new Map(staff.map((m) => [m.id, m]));

  const appointment = mapAppointmentRecord(rawAppt, clientMap, serviceMap, staffMap);

  return {
    appointment,
    services: servicesRes.services,
    staff,
    settings,
    modificationDeadlineHours: deadlines.modificationDeadlineHours,
    cancellationDeadlineHours: deadlines.cancellationDeadlineHours,
  };
}

export async function lookupClientAppointment(params: {
  bookingReference: string;
  contact: string;
}): Promise<SelfServiceLookupResponse> {
  const ctx = await verifyClientAppointmentAccess(params);
  return buildSafeLookupResponse(ctx);
}

export async function getPublicAvailableSlots(params: {
  date: string;
  serviceId?: string;
}): Promise<{ date: string; unavailableTimes: string[] }> {
  const targetDate = sanitizeText(params.date, 20);
  if (!isValidIsoDate(targetDate)) {
    throw new AirtableError('Valid date (YYYY-MM-DD) is required.', 400, 'INVALID_SCHEDULE');
  }

  if (!getAirtableCredentials()) {
    const pastOnly = CLINIC_TIME_SLOTS.filter((slot) => isPastCasablancaSlot(targetDate, slot));
    return { date: targetDate, unavailableTimes: [...pastOnly] };
  }

  const [servicesRes, settings] = await Promise.all([listServices(true), getClinicSettings()]);
  const serviceMap = new Map(servicesRes.services.map((s) => [s.id, s]));
  const selectedSvc = params.serviceId
    ? servicesRes.services.find(
        (s) => s.id === params.serviceId || s.serviceId === params.serviceId,
      )
    : undefined;
  const targetDuration = selectedSvc?.durationMinutes || settings.slotDurationMinutes;

  const occupiedRows = settings.preventOverlappingConfirmed
    ? await listOccupiedAppointmentsForDate(targetDate)
    : [];

  const unavailableTimes: string[] = [];
  for (const slot of CLINIC_TIME_SLOTS) {
    if (isPastCasablancaSlot(targetDate, slot)) {
      unavailableTimes.push(slot);
      continue;
    }
    const conflict = occupiedRows.some((r) =>
      doesRecordOverlapTarget({
        record: r,
        targetTime: slot,
        targetDurationMinutes: targetDuration,
        targetStaffId: '',
        serviceMap,
        fallbackDurationMinutes: settings.slotDurationMinutes,
      }),
    );
    if (conflict) {
      unavailableTimes.push(slot);
    }
  }

  return { date: targetDate, unavailableTimes };
}

export async function getAdminAvailableSlots(params: {
  date: string;
  serviceId?: string;
  staffId?: string | null;
  excludeAppointmentId?: string;
}): Promise<{ date: string; unavailableTimes: string[] }> {
  const targetDate = sanitizeText(params.date, 20);
  if (!isValidIsoDate(targetDate)) {
    throw new AirtableError('Valid date (YYYY-MM-DD) is required.', 400, 'INVALID_SCHEDULE');
  }

  if (!getAirtableCredentials()) {
    return { date: targetDate, unavailableTimes: [] };
  }

  const [servicesRes, settings] = await Promise.all([listServices(true), getClinicSettings()]);
  const serviceMap = new Map(servicesRes.services.map((s) => [s.id, s]));
  const selectedSvc = params.serviceId
    ? servicesRes.services.find(
        (s) => s.id === params.serviceId || s.serviceId === params.serviceId,
      )
    : undefined;
  const targetDuration = selectedSvc?.durationMinutes || settings.slotDurationMinutes;
  const staffId = params.staffId ? sanitizeText(params.staffId, 60) : '';
  const excludeId = params.excludeAppointmentId ? sanitizeText(params.excludeAppointmentId, 60) : undefined;

  const occupiedRows = settings.preventOverlappingConfirmed
    ? await listOccupiedAppointmentsForDate(targetDate)
    : [];

  const unavailableTimes: string[] = [];
  for (const slot of CLINIC_TIME_SLOTS) {
    const conflict = occupiedRows.some((r) =>
      doesRecordOverlapTarget({
        record: r,
        excludeAppointmentId: excludeId,
        targetTime: slot,
        targetDurationMinutes: targetDuration,
        targetStaffId: staffId,
        serviceMap,
        fallbackDurationMinutes: settings.slotDurationMinutes,
      }),
    );
    if (conflict) {
      unavailableTimes.push(slot);
    }
  }

  return { date: targetDate, unavailableTimes };
}

export async function getClientAvailableSlots(params: {
  bookingReference: string;
  contact: string;
  date: string;
  serviceId?: string;
  staffId?: string | null;
}): Promise<{ date: string; unavailableTimes: string[] }> {
  const ctx = await verifyClientAppointmentAccess({
    bookingReference: params.bookingReference,
    contact: params.contact,
  });

  const targetDate = sanitizeText(params.date, 20);
  if (!isValidIsoDate(targetDate)) {
    throw new AirtableError('Valid date (YYYY-MM-DD) is required.', 400, 'INVALID_SCHEDULE');
  }

  const staffId = params.staffId ? sanitizeText(params.staffId, 60) : '';
  const serviceMap = new Map(ctx.services.map((s) => [s.id, s]));
  const selectedSvc = params.serviceId
    ? ctx.services.find((s) => s.id === params.serviceId || s.serviceId === params.serviceId)
    : undefined;
  const targetDuration =
    selectedSvc?.durationMinutes ||
    serviceMap.get(ctx.appointment.serviceId)?.durationMinutes ||
    ctx.settings.slotDurationMinutes;

  const occupiedRows = ctx.settings.preventOverlappingConfirmed
    ? await listOccupiedAppointmentsForDate(targetDate)
    : [];

  const unavailableTimes: string[] = [];
  for (const slot of CLINIC_TIME_SLOTS) {
    if (isPastCasablancaSlot(targetDate, slot)) {
      unavailableTimes.push(slot);
      continue;
    }
    const conflict = occupiedRows.some((r) =>
      doesRecordOverlapTarget({
        record: r,
        excludeAppointmentId: ctx.appointment.id,
        targetTime: slot,
        targetDurationMinutes: targetDuration,
        targetStaffId: staffId,
        serviceMap,
        fallbackDurationMinutes: ctx.settings.slotDurationMinutes,
      }),
    );
    if (conflict) {
      unavailableTimes.push(slot);
    }
  }

  return { date: targetDate, unavailableTimes };
}

export async function modifyClientAppointment(params: {
  bookingReference: string;
  contact: string;
  preferredDate: string;
  preferredTime: string;
  serviceId?: string;
  assignedStaffId?: string | null;
  reason?: string;
}): Promise<{
  ok: boolean;
  appointment: SelfServiceLookupResponse;
  makeNotificationSent: boolean;
  makeNotificationSkipped: boolean;
}> {
  const ctx = await verifyClientAppointmentAccess({
    bookingReference: params.bookingReference,
    contact: params.contact,
  });
  const { appointment: previous, services, staff, settings, modificationDeadlineHours } = ctx;

  if (SELF_SERVICE_LOCKED_STATUSES.has(previous.status)) {
    throw new AirtableError(
      'This appointment can no longer be modified online. Please contact EMIE CLINIC reception.',
      409,
      'STATUS_LOCKED',
    );
  }
  if (
    !isSlotAllowedByDeadline(
      previous.preferredDate,
      previous.preferredTime,
      modificationDeadlineHours,
    )
  ) {
    throw new AirtableError(
      'The online modification deadline for this appointment has passed. Please contact EMIE CLINIC reception.',
      409,
      'DEADLINE_PASSED',
    );
  }

  const nextDate = sanitizeText(params.preferredDate, 20);
  const nextTime = sanitizeText(params.preferredTime, 10);
  const cleanReason = sanitizeText(params.reason || '', 500);

  if (!isValidIsoDate(nextDate) || !/^\d{2}:\d{2}$/.test(nextTime)) {
    throw new AirtableError('Valid date and time are required.', 400, 'INVALID_SCHEDULE');
  }
  const isKnownSlot = (CLINIC_TIME_SLOTS as readonly string[]).includes(nextTime);
  if (!isKnownSlot && nextTime !== previous.preferredTime) {
    throw new AirtableError('Please select one of the clinic available time slots.', 400, 'INVALID_TIME_SLOT');
  }
  if (isPastCasablancaSlot(nextDate, nextTime)) {
    throw new AirtableError(
      'Selected date and time are in the past. Please choose an upcoming slot.',
      409,
      'SLOT_UNAVAILABLE',
    );
  }

  // Validate service selection according to clinic business rules
  let nextService = services.find((s) => s.id === previous.serviceId);
  if (params.serviceId !== undefined && params.serviceId !== '') {
    const requestedSvc = services.find(
      (s) => s.id === params.serviceId || s.serviceId === params.serviceId,
    );
    if (!requestedSvc || !requestedSvc.active) {
      throw new AirtableError('Selected service is not available.', 400, 'INVALID_SERVICE');
    }
    nextService = requestedSvc;
  }
  if (!nextService) {
    throw new AirtableError('Appointment service record not found.', 400, 'INVALID_SERVICE');
  }

  // Validate optional staff selection
  let nextStaffId = previous.assignedStaffId;
  if (params.assignedStaffId !== undefined) {
    if (params.assignedStaffId === null || params.assignedStaffId === '') {
      nextStaffId = '';
    } else {
      const requestedStaffId = sanitizeText(params.assignedStaffId, 60);
      const staffMember = staff.find((m) => m.id === requestedStaffId);
      if (!staffMember || !staffMember.active) {
        throw new AirtableError('Selected practitioner is not available.', 400, 'STAFF_INACTIVE');
      }
      if (
        staffMember.assignedServiceIds.length > 0 &&
        !staffMember.assignedServiceIds.includes(nextService.id)
      ) {
        throw new AirtableError(
          'Selected practitioner does not perform the chosen service.',
          400,
          'STAFF_SERVICE_MISMATCH',
        );
      }
      nextStaffId = staffMember.id;
    }
  } else if (nextStaffId && nextService.id !== previous.serviceId) {
    const currentStaff = staff.find((m) => m.id === nextStaffId);
    if (
      currentStaff &&
      currentStaff.assignedServiceIds.length > 0 &&
      !currentStaff.assignedServiceIds.includes(nextService.id)
    ) {
      nextStaffId = '';
    }
  }

  const unchanged =
    nextDate === previous.preferredDate &&
    nextTime === previous.preferredTime &&
    nextService.id === previous.serviceId &&
    nextStaffId === previous.assignedStaffId;
  if (unchanged) {
    throw new AirtableError(
      'No modification detected. Please choose a new date, time, service, or practitioner.',
      400,
      'NO_CHANGES',
    );
  }

  const serviceMap = new Map(services.map((s) => [s.id, s]));
  const staffMap = new Map(staff.map((m) => [m.id, m]));
  const now = new Date().toISOString();

  // Availability & overlap enforcement + Airtable update inside per-date lock
  const updatedRaw = await withDateSlotLock(nextDate, async () => {
    const conflict = await findSlotConflict({
      excludeAppointmentId: previous.id,
      date: nextDate,
      time: nextTime,
      durationMinutes: nextService.durationMinutes || settings.slotDurationMinutes,
      staffId: nextStaffId,
      serviceMap,
      fallbackDurationMinutes: settings.slotDurationMinutes,
      preventOverlappingConfirmed: settings.preventOverlappingConfirmed,
    });
    if (conflict) {
      throw new AirtableError(
        'This time slot is no longer available. Please choose another date or time.',
        409,
        'SLOT_UNAVAILABLE',
      );
    }

    const patch: Record<string, unknown> = {
      'Preferred Date': nextDate,
      'Preferred Time': nextTime,
      Service: [nextService.id],
      'Assigned Staff': nextStaffId ? [nextStaffId] : [],
      Status: 'Rescheduled',
      'Client Email': previous.clientEmail || '',
      'Reminder Email Sent': false,
      'Updated At': now,
    };

    return updateRecord<Record<string, unknown>>(
      AIRTABLE_TABLES.APPOINTMENTS,
      previous.id,
      patch,
    );
  });

  const clientMap = new Map<string, ClientRecord>();
  if (previous.clientId) {
    clientMap.set(previous.clientId, {
      id: previous.clientId,
      clientId: previous.clientId,
      fullName: previous.clientName || '',
      phone: previous.clientPhone || '',
      email: previous.clientEmail || '',
      preferredLanguage: previous.clientPreferredLanguage || 'fr',
      internalNotes: '',
      appointmentIds: [],
      createdAt: '',
      updatedAt: '',
    });
  }
  const updated = mapAppointmentRecord(updatedRaw, clientMap, serviceMap, staffMap);

  const prevSnapshot = {
    status: previous.status,
    service: previous.serviceName,
    preferredDate: previous.preferredDate,
    preferredTime: previous.preferredTime,
    assignedStaff: previous.assignedStaffName || 'Unassigned',
  };
  const nextSnapshot = {
    status: updated.status,
    service: updated.serviceName,
    preferredDate: updated.preferredDate,
    preferredTime: updated.preferredTime,
    assignedStaff: updated.assignedStaffName || 'Unassigned',
    ...(cleanReason ? { reason: cleanReason } : {}),
  };

  await Promise.allSettled([
    logActivity({
      user: `Client (${previous.bookingReference})`,
      action: 'CLIENT_APPOINTMENT_RESCHEDULED',
      entityType: 'Appointments',
      entityId: `${previous.bookingReference} (${previous.id})`,
      previousValue: JSON.stringify(prevSnapshot),
      newValue: JSON.stringify(nextSnapshot),
    }),
    createNotification({
      type: 'rescheduled',
      title: `Rendez-vous modifié par le client — ${updated.bookingReference}`,
      message: `${updated.clientName || updated.bookingReference} · ${previous.preferredDate} ${previous.preferredTime} → ${updated.preferredDate} ${updated.preferredTime}${updated.serviceName !== previous.serviceName ? ` (${updated.serviceName})` : ''}${cleanReason ? ` · ${cleanReason}` : ''}`,
      relatedAppointmentId: updated.id,
      recipient: 'Admin',
    }),
  ]);

  // Trigger Make.com AFTER Airtable update succeeds (never revert appointment if webhook fails)
  const makeResult = await triggerMakeWebhook(
    buildMakePayload('appointment_rescheduled', updated, {
      previousDate: previous.preferredDate,
      previousTime: previous.preferredTime,
      requestedAction: cleanReason
        ? `Client self-service reschedule (${cleanReason})`
        : 'Client self-service reschedule',
    }),
  );

  if (makeResult.sent) {
    await updateRecord(AIRTABLE_TABLES.APPOINTMENTS, updated.id, {
      'Notification Sent': true,
      'Notification Error': '',
    }).catch(() => undefined);
  } else if (!makeResult.skipped) {
    await updateRecord(AIRTABLE_TABLES.APPOINTMENTS, updated.id, {
      'Notification Error': makeResult.error || 'Webhook failed',
    }).catch(() => undefined);
  }

  return {
    ok: true,
    appointment: buildSafeLookupResponse({
      ...ctx,
      appointment: updated,
    }),
    makeNotificationSent: makeResult.sent,
    makeNotificationSkipped: Boolean(makeResult.skipped),
  };
}

export async function cancelClientAppointment(params: {
  bookingReference: string;
  contact: string;
  reason?: string;
}): Promise<{
  ok: boolean;
  appointment: SelfServiceLookupResponse;
  makeNotificationSent: boolean;
  makeNotificationSkipped: boolean;
}> {
  const ctx = await verifyClientAppointmentAccess({
    bookingReference: params.bookingReference,
    contact: params.contact,
  });
  const { appointment: previous, services, staff, cancellationDeadlineHours } = ctx;

  if (SELF_SERVICE_LOCKED_STATUSES.has(previous.status)) {
    throw new AirtableError(
      'This appointment can no longer be cancelled online. Please contact EMIE CLINIC reception.',
      409,
      'STATUS_LOCKED',
    );
  }
  if (
    !isSlotAllowedByDeadline(
      previous.preferredDate,
      previous.preferredTime,
      cancellationDeadlineHours,
    )
  ) {
    throw new AirtableError(
      'The online cancellation deadline for this appointment has passed. Please contact EMIE CLINIC reception.',
      409,
      'DEADLINE_PASSED',
    );
  }

  const cleanReason = sanitizeText(params.reason || '', 500);
  const now = new Date().toISOString();
  const storedReason = cleanReason || 'Cancelled by client via self-service';

  const updatedRaw = await updateRecord<Record<string, unknown>>(
    AIRTABLE_TABLES.APPOINTMENTS,
    previous.id,
    {
      Status: 'Cancelled',
      'Cancellation Reason': storedReason,
      'Updated At': now,
    },
  );

  const clientMap = new Map<string, ClientRecord>();
  if (previous.clientId) {
    clientMap.set(previous.clientId, {
      id: previous.clientId,
      clientId: previous.clientId,
      fullName: previous.clientName || '',
      phone: previous.clientPhone || '',
      email: previous.clientEmail || '',
      preferredLanguage: previous.clientPreferredLanguage || 'fr',
      internalNotes: '',
      appointmentIds: [],
      createdAt: '',
      updatedAt: '',
    });
  }
  const serviceMap = new Map(services.map((s) => [s.id, s]));
  const staffMap = new Map(staff.map((m) => [m.id, m]));
  const updated = mapAppointmentRecord(updatedRaw, clientMap, serviceMap, staffMap);

  const prevSnapshot = {
    status: previous.status,
    service: previous.serviceName,
    preferredDate: previous.preferredDate,
    preferredTime: previous.preferredTime,
    assignedStaff: previous.assignedStaffName || 'Unassigned',
  };
  const nextSnapshot = {
    status: 'Cancelled',
    cancellationReason: storedReason,
  };

  await Promise.allSettled([
    logActivity({
      user: `Client (${previous.bookingReference})`,
      action: 'CLIENT_APPOINTMENT_CANCELLED',
      entityType: 'Appointments',
      entityId: `${previous.bookingReference} (${previous.id})`,
      previousValue: JSON.stringify(prevSnapshot),
      newValue: JSON.stringify(nextSnapshot),
    }),
    createNotification({
      type: 'cancelled',
      title: `Rendez-vous annulé par le client — ${updated.bookingReference}`,
      message: `${updated.clientName || updated.bookingReference} · ${updated.serviceName} (${updated.preferredDate} ${updated.preferredTime})${cleanReason ? ` · ${cleanReason}` : ''}`,
      relatedAppointmentId: updated.id,
      recipient: 'Admin',
    }),
  ]);

  const makeResult = await triggerMakeWebhook(
    buildMakePayload('appointment_cancelled', updated, {
      cancelledBy: `Client (${previous.bookingReference})`,
      cancelledAt: now,
      cancellationReason: storedReason,
    }),
  );

  if (makeResult.sent) {
    await updateRecord(AIRTABLE_TABLES.APPOINTMENTS, updated.id, {
      'Notification Sent': true,
      'Notification Error': '',
    }).catch(() => undefined);
  } else if (!makeResult.skipped) {
    await updateRecord(AIRTABLE_TABLES.APPOINTMENTS, updated.id, {
      'Notification Error': makeResult.error || 'Webhook failed',
    }).catch(() => undefined);
  }

  return {
    ok: true,
    appointment: buildSafeLookupResponse({
      ...ctx,
      appointment: updated,
    }),
    makeNotificationSent: makeResult.sent,
    makeNotificationSkipped: Boolean(makeResult.skipped),
  };
}

export async function submitClientSelfServiceRequest(params: {
  bookingReference: string;
  contact: string;
  requestType: 'reschedule' | 'cancel';
  requestedDate?: string;
  requestedTime?: string;
  reason?: string;
  serviceId?: string;
  assignedStaffId?: string | null;
}): Promise<{
  ok: boolean;
  message: string;
  appointment?: SelfServiceLookupResponse;
  makeNotificationSent?: boolean;
  makeNotificationSkipped?: boolean;
}> {
  if (params.requestType === 'cancel') {
    const res = await cancelClientAppointment({
      bookingReference: params.bookingReference,
      contact: params.contact,
      reason: params.reason,
    });
    return {
      ok: true,
      message: 'Your appointment has been cancelled.',
      appointment: res.appointment,
      makeNotificationSent: res.makeNotificationSent,
      makeNotificationSkipped: res.makeNotificationSkipped,
    };
  }

  const res = await modifyClientAppointment({
    bookingReference: params.bookingReference,
    contact: params.contact,
    preferredDate: params.requestedDate || '',
    preferredTime: params.requestedTime || '',
    serviceId: params.serviceId,
    assignedStaffId: params.assignedStaffId,
    reason: params.reason,
  });
  return {
    ok: true,
    message: 'Your appointment has been updated.',
    appointment: res.appointment,
    makeNotificationSent: res.makeNotificationSent,
    makeNotificationSkipped: res.makeNotificationSkipped,
  };
}

export async function retryAppointmentWebhook(
  recordId: string,
  actorEmail: string,
): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
  const appointments = await listAppointments();
  const appointment = appointments.find((a) => a.id === recordId);
  if (!appointment) {
    throw new AirtableError('Appointment not found.', 404, 'NOT_FOUND');
  }

  if (appointment.notificationSent && !appointment.notificationError) {
    return { sent: true, skipped: true };
  }

  const eventType =
    appointment.status === 'Confirmed'
      ? 'appointment_confirmed'
      : appointment.status === 'Cancelled'
      ? 'appointment_cancelled'
      : appointment.status === 'Rescheduled'
      ? 'appointment_rescheduled'
      : 'booking_created';

  const result = await triggerMakeWebhook(buildMakePayload(eventType, appointment));

  await updateRecord(AIRTABLE_TABLES.APPOINTMENTS, recordId, {
    'Notification Sent': result.sent,
    'Notification Error': result.sent ? '' : result.error || 'Retry failed',
  });

  await logActivity({
    user: actorEmail,
    action: result.sent ? 'WEBHOOK_RETRY_SUCCESS' : 'WEBHOOK_RETRY_FAILED',
    entityType: 'Appointments',
    entityId: appointment.bookingReference,
    previousValue: appointment.notificationError,
    newValue: result.sent ? 'Sent' : result.error || 'Failed',
  });

  return result;
}

export async function backfillAppointmentClientEmails(
  actorEmail = 'system-backfill',
): Promise<{ checked: number; updated: number; skippedNoEmail: number }> {
  if (!getAirtableCredentials()) {
    return { checked: 0, updated: 0, skippedNoEmail: 0 };
  }

  const [rawAppointments, clients] = await Promise.all([
    listAllRecords<Record<string, unknown>>(AIRTABLE_TABLES.APPOINTMENTS),
    listClients(),
  ]);

  const clientMap = new Map(clients.map((c) => [c.id, c]));
  let updated = 0;
  let skippedNoEmail = 0;

  for (const rec of rawAppointments) {
    const linkedClientId = Array.isArray(rec.fields.Client)
      ? String(rec.fields.Client[0] || '')
      : '';
    const client = clientMap.get(linkedClientId);
    const clientEmail = (client?.email || '').trim().toLowerCase();
    if (!clientEmail) {
      skippedNoEmail += 1;
      continue;
    }

    const currentFieldEmail = String(rec.fields['Client Email'] || '').trim().toLowerCase();
    if (currentFieldEmail !== clientEmail) {
      await updateRecord(AIRTABLE_TABLES.APPOINTMENTS, rec.id, {
        'Client Email': clientEmail,
      });
      updated += 1;
    }
  }

  if (updated > 0) {
    await logActivity({
      user: actorEmail,
      action: 'APPOINTMENTS_CLIENT_EMAIL_BACKFILLED',
      entityType: 'Appointments',
      entityId: 'bulk-backfill',
      previousValue: String(rawAppointments.length),
      newValue: `${updated} updated`,
    });
  }

  return {
    checked: rawAppointments.length,
    updated,
    skippedNoEmail,
  };
}

export async function dispatchAppointmentReminder(
  recordId: string,
  actor: AuthSessionUser,
): Promise<{
  sent: boolean;
  skipped?: boolean;
  reminderEmailSent: boolean;
  error?: string;
}> {
  const appointments = await listAppointments();
  const appointment = appointments.find((a) => a.id === recordId);
  if (!appointment) {
    throw new AirtableError('Appointment not found.', 404, 'NOT_FOUND');
  }

  const normalizedStatus = String(appointment.status || '').trim();
  if (normalizedStatus !== 'Confirmed') {
    throw new AirtableError(
      `Reminders cannot be sent for appointments with status "${normalizedStatus}". Only Confirmed appointments are eligible.`,
      409,
      'REMINDER_STATUS_INELIGIBLE',
    );
  }

  if (!appointment.clientEmail || !isValidEmail(appointment.clientEmail.trim())) {
    throw new AirtableError(
      'Cannot send reminder: no valid Client Email is associated with this appointment.',
      400,
      'REMINDER_EMAIL_MISSING',
    );
  }

  if (appointment.reminderEmailSent) {
    return {
      sent: false,
      skipped: true,
      reminderEmailSent: true,
      error: 'Reminder email has already been sent for this appointment.',
    };
  }

  // Ensure Airtable record itself has Client Email populated before Make.com triggers
  await updateRecord(AIRTABLE_TABLES.APPOINTMENTS, appointment.id, {
    'Client Email': appointment.clientEmail.trim().toLowerCase(),
  }).catch(() => undefined);

  const result = await triggerMakeWebhook(buildMakePayload('appointment_reminder', appointment));

  if (result.sent) {
    await updateRecord(AIRTABLE_TABLES.APPOINTMENTS, appointment.id, {
      'Reminder Email Sent': true,
      'Notification Error': '',
    });

    await logActivity({
      user: actor.email,
      action: 'REMINDER_EMAIL_SENT',
      entityType: 'Appointments',
      entityId: `${appointment.bookingReference} (${appointment.id})`,
      previousValue: 'Reminder Email Sent=false',
      newValue: `Reminder Email Sent=true (${appointment.clientEmail})`,
    });

    return {
      sent: true,
      reminderEmailSent: true,
    };
  }

  // Explicitly preserve Reminder Email Sent = false when delivery fails or is skipped
  if (!result.skipped) {
    await updateRecord(AIRTABLE_TABLES.APPOINTMENTS, appointment.id, {
      'Notification Error': result.error || 'Reminder webhook delivery failed',
    }).catch(() => undefined);
  }

  return {
    sent: false,
    skipped: result.skipped,
    reminderEmailSent: false,
    error: result.error || 'Reminder delivery failed',
  };
}

// =============================================================================
// NOTIFICATIONS & ACTIVITY LOGS & ADMIN USERS
// =============================================================================

export async function createNotification(input: {
  type: NotificationRecord['notificationType'];
  title: string;
  message: string;
  relatedAppointmentId?: string;
  recipient: string;
}): Promise<void> {
  if (!getAirtableCredentials()) return;
  const notificationId = `NTF-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  await createRecord(AIRTABLE_TABLES.NOTIFICATIONS, {
    'Notification ID': notificationId,
    'Notification Type': input.type,
    Title: input.title,
    Message: input.message,
    'Related Appointment': input.relatedAppointmentId ? [input.relatedAppointmentId] : undefined,
    Recipient: input.recipient,
    'Read Status': false,
    'Created At': new Date().toISOString(),
  });
}

export async function listNotifications(): Promise<NotificationRecord[]> {
  const records = await listAllRecords<Record<string, unknown>>(
    AIRTABLE_TABLES.NOTIFICATIONS,
    { sort: [{ field: 'Created At', direction: 'desc' }], maxRecords: 100 },
  );
  return records.map((r) => ({
    id: r.id,
    notificationId: String(r.fields['Notification ID'] || r.id),
    notificationType:
      (r.fields['Notification Type'] as NotificationRecord['notificationType']) || 'system',
    title: String(r.fields.Title || ''),
    message: String(r.fields.Message || ''),
    relatedAppointmentId: Array.isArray(r.fields['Related Appointment'])
      ? String(r.fields['Related Appointment'][0] || '')
      : undefined,
    recipient: String(r.fields.Recipient || 'Admin'),
    readStatus: Boolean(r.fields['Read Status']),
    createdAt: String(r.fields['Created At'] || r.createdTime),
  }));
}

export async function markNotificationRead(recordId: string, read: boolean): Promise<void> {
  await updateRecord(AIRTABLE_TABLES.NOTIFICATIONS, recordId, {
    'Read Status': read,
  });
}

export async function logActivity(input: {
  user: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue: string;
  newValue: string;
}): Promise<void> {
  if (!getAirtableCredentials()) return;
  const logId = `LOG-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  await createRecord(AIRTABLE_TABLES.ACTIVITY_LOGS, {
    'Log ID': logId,
    User: input.user,
    Action: input.action,
    'Entity Type': input.entityType,
    'Entity ID': input.entityId,
    'Previous Value': input.previousValue.slice(0, 1000),
    'New Value': input.newValue.slice(0, 1000),
    Timestamp: new Date().toISOString(),
  }).catch(() => undefined);
}

export async function listActivityLogs(): Promise<ActivityLogRecord[]> {
  const records = await listAllRecords<Record<string, unknown>>(
    AIRTABLE_TABLES.ACTIVITY_LOGS,
    { sort: [{ field: 'Timestamp', direction: 'desc' }], maxRecords: 100 },
  );
  return records.map((r) => ({
    id: r.id,
    logId: String(r.fields['Log ID'] || r.id),
    user: String(r.fields.User || ''),
    action: String(r.fields.Action || ''),
    entityType: String(r.fields['Entity Type'] || ''),
    entityId: String(r.fields['Entity ID'] || ''),
    previousValue: String(r.fields['Previous Value'] || ''),
    newValue: String(r.fields['New Value'] || ''),
    timestamp: String(r.fields.Timestamp || r.createdTime),
  }));
}

export async function listAdminUsers(): Promise<AdminUserRecord[]> {
  const records = await listAllRecords<Record<string, unknown>>(AIRTABLE_TABLES.ADMIN_USERS, {
    sort: [{ field: 'Created At', direction: 'desc' }],
  });
  return records.map((r) => ({
    id: r.id,
    adminId: String(r.fields['Admin ID'] || r.id),
    fullName: String(r.fields['Full Name'] || ''),
    email: String(r.fields.Email || ''),
    role: (r.fields.Role as UserRole) || 'Staff',
    linkedStaffId: Array.isArray(r.fields['Linked Staff'])
      ? String(r.fields['Linked Staff'][0] || '')
      : undefined,
    active: Boolean(r.fields.Active),
    createdAt: String(r.fields['Created At'] || r.createdTime),
  }));
}
