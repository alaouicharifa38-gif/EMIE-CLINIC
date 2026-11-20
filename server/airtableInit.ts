import {
  getAirtableDiagnosis,
  listAllRecords,
  verifyAirtableSchema,
} from './airtable.ts';
import {
  backfillAppointmentClientEmails,
  seedOfficialServicesToAirtable,
} from './clinicData.ts';
import {
  AIRTABLE_TABLES,
  getAirtableCredentialPresence,
  getAirtableCredentials,
} from './config.ts';
import type {
  AirtableInitTableReport,
  AirtableInitializationReport,
} from '../shared/types.ts';

interface MetaFieldSpec {
  name: string;
  type: string;
  options?: Record<string, unknown>;
  linkedTableName?: string;
}

interface MetaTableSchema {
  id: string;
  name: string;
  primaryFieldId: string;
  fields: Array<{
    id: string;
    name: string;
    type: string;
    options?: Record<string, unknown>;
  }>;
}

const DATE_OPTIONS = { dateFormat: { name: 'iso', format: 'YYYY-MM-DD' } };
const DATETIME_OPTIONS = {
  dateFormat: { name: 'iso', format: 'YYYY-MM-DD' },
  timeFormat: { name: '24hour', format: 'HH:mm' },
  timeZone: 'utc',
};
const CHECKBOX_OPTIONS = { icon: 'check', color: 'greenBright' };
const INTEGER_OPTIONS = { precision: 0 };

function choices(names: string[]): { choices: Array<{ name: string }> } {
  return { choices: names.map((name) => ({ name })) };
}

// Exact schema derived from server/clinicData.ts, server/auth.ts, server.ts & AIRTABLE_AND_MAKE_SETUP.md
const EXPECTED_TABLES: Array<{
  name: string;
  description: string;
  fields: MetaFieldSpec[];
}> = [
  {
    name: AIRTABLE_TABLES.CLIENTS,
    description: 'Deduplicated EMIE CLINIC patients & clients',
    fields: [
      { name: 'Client ID', type: 'singleLineText' },
      { name: 'Full Name', type: 'singleLineText' },
      { name: 'Phone', type: 'phoneNumber' },
      { name: 'Email', type: 'email' },
      {
        name: 'Preferred Language',
        type: 'singleSelect',
        options: choices(['fr', 'en', 'ar']),
      },
      { name: 'Internal Notes', type: 'multilineText' },
      { name: 'Created At', type: 'dateTime', options: DATETIME_OPTIONS },
      { name: 'Updated At', type: 'dateTime', options: DATETIME_OPTIONS },
      // Inverse link field 'Appointments' is created automatically when Appointments.Client links to Clients
    ],
  },
  {
    name: AIRTABLE_TABLES.SERVICES,
    description: 'Official EMIE CLINIC services catalog',
    fields: [
      { name: 'Service ID', type: 'singleLineText' },
      { name: 'Service Name', type: 'singleLineText' },
      { name: 'Description', type: 'multilineText' },
      { name: 'Active', type: 'checkbox', options: CHECKBOX_OPTIONS },
      { name: 'Display Order', type: 'number', options: INTEGER_OPTIONS },
      { name: 'Duration Minutes', type: 'number', options: INTEGER_OPTIONS },
      {
        name: 'Assigned Staff',
        type: 'multipleRecordLinks',
        linkedTableName: AIRTABLE_TABLES.STAFF,
      },
      { name: 'Created At', type: 'dateTime', options: DATETIME_OPTIONS },
      { name: 'Updated At', type: 'dateTime', options: DATETIME_OPTIONS },
    ],
  },
  {
    name: AIRTABLE_TABLES.STAFF,
    description: 'EMIE CLINIC practitioners and clinical staff',
    fields: [
      { name: 'Staff ID', type: 'singleLineText' },
      { name: 'Full Name', type: 'singleLineText' },
      { name: 'Role', type: 'singleLineText' },
      { name: 'Phone', type: 'phoneNumber' },
      { name: 'Email', type: 'email' },
      {
        name: 'Assigned Services',
        type: 'multipleRecordLinks',
        linkedTableName: AIRTABLE_TABLES.SERVICES,
      },
      { name: 'Availability', type: 'multilineText' },
      { name: 'Active', type: 'checkbox', options: CHECKBOX_OPTIONS },
      { name: 'Created At', type: 'dateTime', options: DATETIME_OPTIONS },
    ],
  },
  {
    name: AIRTABLE_TABLES.APPOINTMENTS,
    description: 'Clinic appointment requests and bookings',
    fields: [
      { name: 'Booking Reference', type: 'singleLineText' },
      {
        name: 'Client',
        type: 'multipleRecordLinks',
        linkedTableName: AIRTABLE_TABLES.CLIENTS,
      },
      {
        name: 'Service',
        type: 'multipleRecordLinks',
        linkedTableName: AIRTABLE_TABLES.SERVICES,
      },
      { name: 'Preferred Date', type: 'date', options: DATE_OPTIONS },
      { name: 'Preferred Time', type: 'singleLineText' },
      { name: 'Alternative Date', type: 'date', options: DATE_OPTIONS },
      { name: 'Alternative Time', type: 'singleLineText' },
      {
        name: 'Status',
        type: 'singleSelect',
        options: choices([
          'New Request',
          'Pending Confirmation',
          'Confirmed',
          'Rescheduled',
          'Completed',
          'Cancelled',
          'No Show',
        ]),
      },
      { name: 'Client Message', type: 'multilineText' },
      {
        name: 'Preferred Language',
        type: 'singleSelect',
        options: choices(['fr', 'en', 'ar']),
      },
      {
        name: 'Assigned Staff',
        type: 'multipleRecordLinks',
        linkedTableName: AIRTABLE_TABLES.STAFF,
      },
      { name: 'Created At', type: 'dateTime', options: DATETIME_OPTIONS },
      { name: 'Updated At', type: 'dateTime', options: DATETIME_OPTIONS },
      { name: 'Internal Notes', type: 'multilineText' },
      { name: 'Cancellation Reason', type: 'multilineText' },
      { name: 'Confirmation Date', type: 'dateTime', options: DATETIME_OPTIONS },
      { name: 'Notification Sent', type: 'checkbox', options: CHECKBOX_OPTIONS },
      { name: 'Notification Error', type: 'multilineText' },
      { name: 'Client Email', type: 'singleLineText' },
      { name: 'Reminder Email Sent', type: 'checkbox', options: CHECKBOX_OPTIONS },
    ],
  },
  {
    name: AIRTABLE_TABLES.ADMIN_USERS,
    description: 'Role-based administration & practitioner accounts',
    fields: [
      { name: 'Admin ID', type: 'singleLineText' },
      { name: 'Full Name', type: 'singleLineText' },
      { name: 'Email', type: 'email' },
      { name: 'Password Hash', type: 'singleLineText' },
      {
        name: 'Role',
        type: 'singleSelect',
        options: choices(['Super Admin', 'Admin', 'Staff']),
      },
      {
        name: 'Linked Staff',
        type: 'multipleRecordLinks',
        linkedTableName: AIRTABLE_TABLES.STAFF,
      },
      { name: 'Active', type: 'checkbox', options: CHECKBOX_OPTIONS },
      { name: 'Created At', type: 'dateTime', options: DATETIME_OPTIONS },
    ],
  },
  {
    name: AIRTABLE_TABLES.NOTIFICATIONS,
    description: 'Internal clinic alerts and integration notifications',
    fields: [
      { name: 'Notification ID', type: 'singleLineText' },
      {
        name: 'Notification Type',
        type: 'singleSelect',
        options: choices([
          'new_booking',
          'confirmed',
          'rescheduled',
          'cancelled',
          'integration_error',
          'system',
        ]),
      },
      { name: 'Title', type: 'singleLineText' },
      { name: 'Message', type: 'multilineText' },
      {
        name: 'Related Appointment',
        type: 'multipleRecordLinks',
        linkedTableName: AIRTABLE_TABLES.APPOINTMENTS,
      },
      { name: 'Recipient', type: 'singleLineText' },
      { name: 'Read Status', type: 'checkbox', options: CHECKBOX_OPTIONS },
      { name: 'Created At', type: 'dateTime', options: DATETIME_OPTIONS },
    ],
  },
  {
    name: AIRTABLE_TABLES.ACTIVITY_LOGS,
    description: 'Immutable audit trail for appointments and administration',
    fields: [
      { name: 'Log ID', type: 'singleLineText' },
      { name: 'User', type: 'singleLineText' },
      { name: 'Action', type: 'singleLineText' },
      { name: 'Entity Type', type: 'singleLineText' },
      { name: 'Entity ID', type: 'singleLineText' },
      { name: 'Previous Value', type: 'multilineText' },
      { name: 'New Value', type: 'multilineText' },
      { name: 'Timestamp', type: 'dateTime', options: DATETIME_OPTIONS },
    ],
  },
  {
    name: AIRTABLE_TABLES.CLINIC_SETTINGS,
    description: 'Configurable clinic profile and scheduling rules',
    fields: [
      { name: 'Setting Name', type: 'singleLineText' },
      { name: 'Setting Value', type: 'multilineText' },
      { name: 'Updated At', type: 'dateTime', options: DATETIME_OPTIONS },
    ],
  },
];

let lastInitializationReport: AirtableInitializationReport | null = null;

export function getLastInitializationReport(): AirtableInitializationReport | null {
  return lastInitializationReport;
}

class MetaApiError extends Error {
  httpStatus: number;
  code: string;

  constructor(message: string, httpStatus: number, code: string) {
    super(message);
    this.httpStatus = httpStatus;
    this.code = code;
  }
}

async function airtableMetaFetch<T>(
  subPath: string,
  options: RequestInit = {},
): Promise<T> {
  const creds = getAirtableCredentials();
  if (!creds) {
    throw new MetaApiError(
      'Missing AIRTABLE_ACCESS_TOKEN or AIRTABLE_BASE_ID on server.',
      503,
      'AIRTABLE_NOT_CONFIGURED',
    );
  }

  const url = `https://api.airtable.com/v0/meta/bases/${encodeURIComponent(creds.baseId)}${subPath}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${creds.token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const errObj = data.error as { type?: string; message?: string } | undefined;
      const baseMsg = errObj?.message || `Airtable Metadata HTTP ${res.status}`;
      const code =
        res.status === 401
          ? 'INVALID_CREDENTIALS'
          : res.status === 403
          ? 'MISSING_SCHEMA_WRITE_PERMISSION'
          : res.status === 404
          ? 'BASE_OR_TABLE_NOT_FOUND'
          : errObj?.type || `HTTP_${res.status}`;
      const hint =
        res.status === 403
          ? ' (Verify the Personal Access Token includes schema.bases:read and schema.bases:write scopes on this base.)'
          : '';
      throw new MetaApiError(`${baseMsg}${hint}`, res.status, code);
    }
    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchBaseTables(): Promise<MetaTableSchema[]> {
  const data = await airtableMetaFetch<{ tables?: MetaTableSchema[] }>('/tables');
  return data.tables || [];
}

function buildFieldPayload(
  spec: MetaFieldSpec,
  tableByName: Map<string, MetaTableSchema>,
): Record<string, unknown> | null {
  if (spec.type === 'multipleRecordLinks') {
    if (!spec.linkedTableName) return null;
    const target = tableByName.get(spec.linkedTableName);
    if (!target) return null;
    return {
      name: spec.name,
      type: 'multipleRecordLinks',
      options: { linkedTableId: target.id },
    };
  }

  const payload: Record<string, unknown> = {
    name: spec.name,
    type: spec.type,
  };
  if (spec.options) {
    payload.options = spec.options;
  }
  return payload;
}

export async function initializeAirtableDatabase(
  actorEmail = 'system-startup',
): Promise<AirtableInitializationReport> {
  const checkedAt = new Date().toISOString();
  const presence = getAirtableCredentialPresence();
  const errors: AirtableInitializationReport['errors'] = [];

  if (!presence.tokenPresent || !presence.baseIdPresent) {
    const report: AirtableInitializationReport = {
      ok: false,
      checkedAt,
      existingTables: [],
      createdTables: [],
      tables: [],
      verifiedTables: [],
      allTablesVerified: false,
      servicesInitialized: false,
      servicesCount: 0,
      errors: [
        {
          step: 'credentials',
          httpStatus: 503,
          code: !presence.tokenPresent ? 'MISSING_TOKEN' : 'MISSING_BASE_ID',
          message: !presence.tokenPresent
            ? 'Missing AIRTABLE_ACCESS_TOKEN on server.'
            : 'Missing AIRTABLE_BASE_ID on server.',
        },
      ],
    };
    lastInitializationReport = report;
    return report;
  }

  let currentTables: MetaTableSchema[];
  try {
    currentTables = await fetchBaseTables();
  } catch (err) {
    const e = err instanceof MetaApiError ? err : new MetaApiError(String(err), 500, 'META_ERROR');
    const report: AirtableInitializationReport = {
      ok: false,
      checkedAt,
      existingTables: [],
      createdTables: [],
      tables: [],
      verifiedTables: [],
      allTablesVerified: false,
      servicesInitialized: false,
      servicesCount: 0,
      errors: [
        {
          step: 'inspect_base_schema',
          httpStatus: e.httpStatus,
          code: e.code,
          message: e.message,
        },
      ],
    };
    lastInitializationReport = report;
    return report;
  }

  const tableByName = new Map<string, MetaTableSchema>(
    currentTables.map((t) => [t.name, t]),
  );
  const existingTables: string[] = [];
  const createdTables: string[] = [];
  const tableReports = new Map<string, AirtableInitTableReport>();

  for (const expected of EXPECTED_TABLES) {
    const found = tableByName.get(expected.name);
    if (found) {
      existingTables.push(expected.name);
      tableReports.set(expected.name, {
        table: expected.name,
        status: 'existed',
        tableId: found.id,
        createdFields: [],
        existingFieldsCount: found.fields.length,
      });
    }
  }

  // Phase 1: Create ONLY missing tables with their scalar fields (primary field first)
  for (const expected of EXPECTED_TABLES) {
    if (tableByName.has(expected.name)) continue;

    const scalarFields = expected.fields
      .filter((f) => f.type !== 'multipleRecordLinks')
      .map((f) => buildFieldPayload(f, tableByName))
      .filter((f): f is Record<string, unknown> => Boolean(f));

    try {
      const created = await airtableMetaFetch<MetaTableSchema>('/tables', {
        method: 'POST',
        body: JSON.stringify({
          name: expected.name,
          description: expected.description,
          fields: scalarFields,
        }),
      });
      tableByName.set(expected.name, created);
      createdTables.push(expected.name);
      tableReports.set(expected.name, {
        table: expected.name,
        status: 'created',
        tableId: created.id,
        createdFields: created.fields.map((f) => f.name),
        existingFieldsCount: 0,
      });
    } catch (err) {
      const e = err instanceof MetaApiError ? err : new MetaApiError(String(err), 500, 'CREATE_TABLE_FAILED');
      errors.push({
        step: `create_table:${expected.name}`,
        httpStatus: e.httpStatus,
        code: e.code,
        message: e.message,
      });
      tableReports.set(expected.name, {
        table: expected.name,
        status: 'failed',
        createdFields: [],
        existingFieldsCount: 0,
        error: e.message,
      });
    }
  }

  // Phase 2: Refresh metadata and ensure any missing scalar or linked fields on existing/new tables
  try {
    currentTables = await fetchBaseTables();
    tableByName.clear();
    for (const t of currentTables) {
      tableByName.set(t.name, t);
    }
  } catch (err) {
    const e = err instanceof MetaApiError ? err : new MetaApiError(String(err), 500, 'REFRESH_SCHEMA_FAILED');
    errors.push({
      step: 'refresh_base_schema',
      httpStatus: e.httpStatus,
      code: e.code,
      message: e.message,
    });
  }

  // Ensure scalar fields first on pre-existing tables (never delete/overwrite existing fields)
  for (const expected of EXPECTED_TABLES) {
    const table = tableByName.get(expected.name);
    const reportEntry = tableReports.get(expected.name);
    if (!table || !reportEntry) continue;

    const existingFieldNames = new Set(table.fields.map((f) => f.name));
    for (const spec of expected.fields) {
      if (spec.type === 'multipleRecordLinks') continue;
      if (existingFieldNames.has(spec.name)) continue;

      const payload = buildFieldPayload(spec, tableByName);
      if (!payload) continue;

      try {
        await airtableMetaFetch(`/tables/${encodeURIComponent(table.id)}/fields`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        existingFieldNames.add(spec.name);
        reportEntry.createdFields.push(spec.name);
      } catch (err) {
        const e = err instanceof MetaApiError ? err : new MetaApiError(String(err), 500, 'ADD_FIELD_FAILED');
        errors.push({
          step: `add_field:${expected.name}.${spec.name}`,
          httpStatus: e.httpStatus,
          code: e.code,
          message: e.message,
        });
      }
    }
  }

  // Ensure linked-record fields cleanly without duplicating bidirectional pairs:
  // Order:
  // 1. Appointments.Client -> Clients (auto-creates Clients.Appointments inverse)
  // 2. Appointments.Service -> Services
  // 3. Appointments.Assigned Staff -> Staff
  // 4. Staff.Assigned Services -> Services (then rename auto-created inverse on Services to 'Assigned Staff' if needed)
  // 5. Admin Users.Linked Staff -> Staff
  // 6. Notifications.Related Appointment -> Appointments
  const orderedLinks: Array<{ tableName: string; fieldName: string }> = [
    { tableName: AIRTABLE_TABLES.APPOINTMENTS, fieldName: 'Client' },
    { tableName: AIRTABLE_TABLES.APPOINTMENTS, fieldName: 'Service' },
    { tableName: AIRTABLE_TABLES.APPOINTMENTS, fieldName: 'Assigned Staff' },
    { tableName: AIRTABLE_TABLES.STAFF, fieldName: 'Assigned Services' },
    { tableName: AIRTABLE_TABLES.ADMIN_USERS, fieldName: 'Linked Staff' },
    { tableName: AIRTABLE_TABLES.NOTIFICATIONS, fieldName: 'Related Appointment' },
  ];

  for (const linkRef of orderedLinks) {
    const table = tableByName.get(linkRef.tableName);
    const expectedTable = EXPECTED_TABLES.find((t) => t.name === linkRef.tableName);
    const spec = expectedTable?.fields.find((f) => f.name === linkRef.fieldName);
    const reportEntry = tableReports.get(linkRef.tableName);
    if (!table || !spec || !reportEntry) continue;

    if (table.fields.some((f) => f.name === spec.name)) {
      continue;
    }

    const payload = buildFieldPayload(spec, tableByName);
    if (!payload) continue;

    try {
      await airtableMetaFetch(`/tables/${encodeURIComponent(table.id)}/fields`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      reportEntry.createdFields.push(spec.name);

      // Refresh metadata so auto-created inverse link fields are visible
      currentTables = await fetchBaseTables();
      tableByName.clear();
      for (const t of currentTables) {
        tableByName.set(t.name, t);
      }

      // If we just created Staff.Assigned Services -> Services, check Services for inverse field to name 'Assigned Staff'
      if (
        linkRef.tableName === AIRTABLE_TABLES.STAFF &&
        linkRef.fieldName === 'Assigned Services'
      ) {
        const servicesTbl = tableByName.get(AIRTABLE_TABLES.SERVICES);
        const staffTbl = tableByName.get(AIRTABLE_TABLES.STAFF);
        const servicesReport = tableReports.get(AIRTABLE_TABLES.SERVICES);
        if (servicesTbl && staffTbl && !servicesTbl.fields.some((f) => f.name === 'Assigned Staff')) {
          const inverseLink = servicesTbl.fields.find(
            (f) =>
              f.type === 'multipleRecordLinks' &&
              f.options?.linkedTableId === staffTbl.id,
          );
          if (inverseLink) {
            try {
              await airtableMetaFetch(
                `/tables/${encodeURIComponent(servicesTbl.id)}/fields/${encodeURIComponent(inverseLink.id)}`,
                {
                  method: 'PATCH',
                  body: JSON.stringify({ name: 'Assigned Staff' }),
                },
              );
              servicesReport?.createdFields.push('Assigned Staff');
            } catch {
              // If rename fails, fallback to adding explicit field below
            }
          }
        }
      }
    } catch (err) {
      const e = err instanceof MetaApiError ? err : new MetaApiError(String(err), 500, 'ADD_LINK_FAILED');
      errors.push({
        step: `add_link:${linkRef.tableName}.${linkRef.fieldName}`,
        httpStatus: e.httpStatus,
        code: e.code,
        message: e.message,
      });
    }
  }

  // Final check for Services.Assigned Staff if it wasn't created via Staff inverse rename
  try {
    currentTables = await fetchBaseTables();
    tableByName.clear();
    for (const t of currentTables) tableByName.set(t.name, t);

    const servicesTbl = tableByName.get(AIRTABLE_TABLES.SERVICES);
    const staffTbl = tableByName.get(AIRTABLE_TABLES.STAFF);
    const servicesReport = tableReports.get(AIRTABLE_TABLES.SERVICES);
    if (servicesTbl && staffTbl && !servicesTbl.fields.some((f) => f.name === 'Assigned Staff')) {
      await airtableMetaFetch(`/tables/${encodeURIComponent(servicesTbl.id)}/fields`, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Assigned Staff',
          type: 'multipleRecordLinks',
          options: { linkedTableId: staffTbl.id },
        }),
      });
      servicesReport?.createdFields.push('Assigned Staff');
    }
  } catch (err) {
    const e = err instanceof MetaApiError ? err : new MetaApiError(String(err), 500, 'ADD_LINK_FAILED');
    errors.push({
      step: 'add_link:Services.Assigned Staff',
      httpStatus: e.httpStatus,
      code: e.code,
      message: e.message,
    });
  }

  // Phase 3: Initialize 5 official EMIE CLINIC services ONLY if they do not already exist
  let servicesInitialized = false;
  let servicesCount = 0;
  try {
    const existingServiceRecords = await listAllRecords(AIRTABLE_TABLES.SERVICES);
    if (existingServiceRecords.length >= 0) {
      const seeded = await seedOfficialServicesToAirtable(actorEmail);
      servicesCount = seeded.length;
      servicesInitialized = servicesCount >= 5;
    }
  } catch (err) {
    errors.push({
      step: 'seed_official_services',
      httpStatus: (err as { status?: number })?.status,
      code: (err as { code?: string })?.code || 'SEED_SERVICES_FAILED',
      message: err instanceof Error ? err.message : 'Failed to initialize official services.',
    });
  }

  // Phase 3b: Backfill missing 'Client Email' values on existing Appointments from linked Clients
  let backfill: { checked: number; updated: number; skippedNoEmail: number } | undefined;
  try {
    backfill = await backfillAppointmentClientEmails(actorEmail);
  } catch (err) {
    errors.push({
      step: 'backfill_appointment_client_emails',
      httpStatus: (err as { status?: number })?.status,
      code: (err as { code?: string })?.code || 'BACKFILL_CLIENT_EMAIL_FAILED',
      message:
        err instanceof Error ? err.message : 'Failed to backfill Client Email on appointments.',
    });
  }

  // Phase 4: Fresh verification of all 8 tables & live diagnosis
  await getAirtableDiagnosis(true);
  const verifiedTables = await verifyAirtableSchema();
  const allTablesVerified =
    verifiedTables.length === EXPECTED_TABLES.length &&
    verifiedTables.every((t) => t.accessible);

  const report: AirtableInitializationReport = {
    ok: allTablesVerified && servicesInitialized && errors.length === 0,
    checkedAt: new Date().toISOString(),
    existingTables,
    createdTables,
    tables: EXPECTED_TABLES.map(
      (t) =>
        tableReports.get(t.name) || {
          table: t.name,
          status: 'failed',
          createdFields: [],
          existingFieldsCount: 0,
        },
    ),
    verifiedTables,
    allTablesVerified,
    servicesInitialized,
    servicesCount,
    backfill,
    errors,
  };

  lastInitializationReport = report;
  return report;
}
