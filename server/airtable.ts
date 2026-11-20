import {
  AIRTABLE_TABLES,
  getAirtableCredentialPresence,
  getAirtableCredentials,
} from './config.ts';
import type { AirtableConnectionDiagnosis } from '../shared/types.ts';

export interface AirtableRecord<TFields = Record<string, unknown>> {
  id: string;
  createdTime: string;
  fields: TFields;
}

export class AirtableError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 500, code = 'AIRTABLE_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function escapeFormulaString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function airtableRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const presence = getAirtableCredentialPresence();
  if (!presence.tokenPresent) {
    throw new AirtableError(
      'Missing AIRTABLE_ACCESS_TOKEN in server environment variables.',
      503,
      'AIRTABLE_MISSING_TOKEN',
    );
  }
  if (!presence.baseIdPresent) {
    throw new AirtableError(
      'Missing AIRTABLE_BASE_ID in server environment variables.',
      503,
      'AIRTABLE_MISSING_BASE_ID',
    );
  }
  const creds = getAirtableCredentials()!;

  const url = `https://api.airtable.com/v0/${encodeURIComponent(creds.baseId)}/${path}`;
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
      const msg = errObj?.message || `Airtable HTTP ${res.status}`;
      const code =
        res.status === 401
          ? 'AIRTABLE_INVALID_CREDENTIALS'
          : res.status === 403
          ? 'AIRTABLE_INSUFFICIENT_PERMISSIONS'
          : res.status === 404
          ? 'AIRTABLE_NOT_FOUND'
          : errObj?.type || 'AIRTABLE_HTTP_ERROR';
      throw new AirtableError(msg, res.status, code);
    }

    return data as T;
  } catch (err) {
    if (err instanceof AirtableError) throw err;
    throw new AirtableError(
      err instanceof Error ? err.message : 'Failed to communicate with Airtable API',
      502,
      'AIRTABLE_NETWORK_ERROR',
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function listAllRecords<TFields = Record<string, unknown>>(
  tableName: string,
  params: {
    filterByFormula?: string;
    sort?: Array<{ field: string; direction?: 'asc' | 'desc' }>;
    maxRecords?: number;
  } = {},
): Promise<AirtableRecord<TFields>[]> {
  try {
    return await executeListAllRecords<TFields>(tableName, params);
  } catch (err) {
    // Graceful fallback if sort field name is missing in an existing Airtable table
    if (
      err instanceof AirtableError &&
      err.status === 422 &&
      params.sort &&
      params.sort.length > 0
    ) {
      return executeListAllRecords<TFields>(tableName, {
        filterByFormula: params.filterByFormula,
        maxRecords: params.maxRecords,
      });
    }
    throw err;
  }
}

async function executeListAllRecords<TFields = Record<string, unknown>>(
  tableName: string,
  params: {
    filterByFormula?: string;
    sort?: Array<{ field: string; direction?: 'asc' | 'desc' }>;
    maxRecords?: number;
  },
): Promise<AirtableRecord<TFields>[]> {
  const all: AirtableRecord<TFields>[] = [];
  let offset: string | undefined;

  do {
    const search = new URLSearchParams();
    if (params.filterByFormula) {
      search.set('filterByFormula', params.filterByFormula);
    }
    if (params.maxRecords) {
      search.set('maxRecords', String(params.maxRecords));
    }
    if (params.sort) {
      params.sort.forEach((s, idx) => {
        search.set(`sort[${idx}][field]`, s.field);
        search.set(`sort[${idx}][direction]`, s.direction || 'asc');
      });
    }
    if (offset) {
      search.set('offset', offset);
    }

    const query = search.toString();
    const path = `${encodeURIComponent(tableName)}${query ? `?${query}` : ''}`;
    const page = await airtableRequest<{
      records: AirtableRecord<TFields>[];
      offset?: string;
    }>(path);

    all.push(...(page.records || []));
    offset = page.offset;
  } while (offset);

  return all;
}

export async function getRecord<TFields = Record<string, unknown>>(
  tableName: string,
  recordId: string,
): Promise<AirtableRecord<TFields>> {
  return airtableRequest<AirtableRecord<TFields>>(
    `${encodeURIComponent(tableName)}/${encodeURIComponent(recordId)}`,
  );
}

export async function createRecord<TFields = Record<string, unknown>>(
  tableName: string,
  fields: Record<string, unknown>,
): Promise<AirtableRecord<TFields>> {
  return airtableRequest<AirtableRecord<TFields>>(encodeURIComponent(tableName), {
    method: 'POST',
    body: JSON.stringify({ fields, typecast: true }),
  });
}

export async function updateRecord<TFields = Record<string, unknown>>(
  tableName: string,
  recordId: string,
  fields: Record<string, unknown>,
): Promise<AirtableRecord<TFields>> {
  return airtableRequest<AirtableRecord<TFields>>(
    `${encodeURIComponent(tableName)}/${encodeURIComponent(recordId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ fields, typecast: true }),
    },
  );
}

export async function deleteRecord(
  tableName: string,
  recordId: string,
): Promise<{ id: string; deleted: boolean }> {
  return airtableRequest<{ id: string; deleted: boolean }>(
    `${encodeURIComponent(tableName)}/${encodeURIComponent(recordId)}`,
    { method: 'DELETE' },
  );
}

export async function diagnoseAirtableConnection(): Promise<AirtableConnectionDiagnosis> {
  const checkedAt = new Date().toISOString();
  const presence = getAirtableCredentialPresence();

  if (!presence.tokenPresent) {
    return {
      code: 'missing_token',
      connected: false,
      message: 'Missing Airtable access token (AIRTABLE_ACCESS_TOKEN).',
      checkedAt,
    };
  }
  if (!presence.baseIdPresent) {
    return {
      code: 'missing_base_id',
      connected: false,
      message: 'Missing Airtable Base ID (AIRTABLE_BASE_ID).',
      checkedAt,
    };
  }

  const creds = getAirtableCredentials()!;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    let missingTables: string[] = [];
    let metaAvailable = false;

    // 1. Probe Base Metadata API (checks token validity + base existence + table names)
    const metaRes = await fetch(
      `https://api.airtable.com/v0/meta/bases/${encodeURIComponent(creds.baseId)}/tables`,
      {
        headers: { Authorization: `Bearer ${creds.token}` },
        signal: controller.signal,
      },
    );

    if (metaRes.status === 401) {
      return {
        code: 'invalid_credentials',
        connected: false,
        httpStatus: 401,
        message: 'Invalid Airtable Personal Access Token (HTTP 401).',
        checkedAt,
      };
    }

    if (metaRes.status === 404) {
      return {
        code: 'base_or_table_not_found',
        connected: false,
        httpStatus: 404,
        message: 'Airtable Base ID not found (HTTP 404). Verify AIRTABLE_BASE_ID.',
        checkedAt,
      };
    }

    if (metaRes.ok) {
      metaAvailable = true;
      const metaBody = (await metaRes.json().catch(() => ({}))) as {
        tables?: Array<{ name?: string }>;
      };
      const existingNames = new Set(
        (metaBody.tables || []).map((t) => String(t.name || '')),
      );
      missingTables = Object.values(AIRTABLE_TABLES).filter(
        (expected) => !existingNames.has(expected),
      );
      if (missingTables.length === Object.values(AIRTABLE_TABLES).length) {
        return {
          code: 'base_or_table_not_found',
          connected: false,
          httpStatus: 404,
          message: `Base is accessible, but none of the expected EMIE CLINIC tables were found (missing: ${missingTables.join(', ')}).`,
          checkedAt,
        };
      }
    }

    // 2. Always probe a real data table endpoint to verify data.records:read permissions
    const probeTable = missingTables.includes(AIRTABLE_TABLES.APPOINTMENTS)
      ? Object.values(AIRTABLE_TABLES).find((t) => !missingTables.includes(t)) ||
        AIRTABLE_TABLES.APPOINTMENTS
      : AIRTABLE_TABLES.APPOINTMENTS;

    const dataRes = await fetch(
      `https://api.airtable.com/v0/${encodeURIComponent(creds.baseId)}/${encodeURIComponent(probeTable)}?maxRecords=1`,
      {
        headers: { Authorization: `Bearer ${creds.token}` },
        signal: controller.signal,
      },
    );

    if (dataRes.ok) {
      if (metaAvailable && missingTables.length > 0) {
        return {
          code: 'base_or_table_not_found',
          connected: false,
          httpStatus: 404,
          message: `Airtable connected, but required table(s) missing in base: ${missingTables.join(', ')}.`,
          checkedAt,
        };
      }
      return {
        code: 'connected',
        connected: true,
        httpStatus: dataRes.status,
        message: metaAvailable
          ? 'Airtable API authenticated, Base ID accessible, and all 8 tables verified.'
          : 'Airtable API authenticated and records endpoint accessible.',
        checkedAt,
      };
    }

    if (dataRes.status === 401) {
      return {
        code: 'invalid_credentials',
        connected: false,
        httpStatus: 401,
        message: 'Invalid Airtable credentials (HTTP 401).',
        checkedAt,
      };
    }
    if (dataRes.status === 403) {
      return {
        code: 'insufficient_permissions',
        connected: false,
        httpStatus: 403,
        message:
          'Airtable token authenticated against base metadata, but data endpoint returned HTTP 403. Grant data.records:read and data.records:write scopes on this base to your Personal Access Token.',
        checkedAt,
      };
    }
    if (dataRes.status === 404) {
      return {
        code: 'base_or_table_not_found',
        connected: false,
        httpStatus: 404,
        message: `Airtable Base ID or table "${probeTable}" not found (HTTP 404). Verify AIRTABLE_BASE_ID and table names.`,
        checkedAt,
      };
    }

    return {
      code: 'network_error',
      connected: false,
      httpStatus: dataRes.status,
      message: `Unexpected Airtable response (HTTP ${dataRes.status}).`,
      checkedAt,
    };
  } catch (err) {
    return {
      code: 'network_error',
      connected: false,
      message: err instanceof Error ? err.message : 'Network error connecting to Airtable API.',
      checkedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}

let cachedDiagnosis: { value: AirtableConnectionDiagnosis; expiresAt: number } | null = null;

export async function getAirtableDiagnosis(
  forceRefresh = false,
): Promise<AirtableConnectionDiagnosis> {
  const now = Date.now();
  if (!forceRefresh && cachedDiagnosis && cachedDiagnosis.expiresAt > now) {
    return cachedDiagnosis.value;
  }
  const value = await diagnoseAirtableConnection();
  cachedDiagnosis = {
    value,
    expiresAt: now + 20_000,
  };
  return value;
}

export interface TableHealthCheck {
  table: string;
  accessible: boolean;
  recordCountSample: number;
  error?: string;
}

export async function verifyAirtableSchema(): Promise<TableHealthCheck[]> {
  const tableNames = Object.values(AIRTABLE_TABLES);
  const results: TableHealthCheck[] = [];

  for (const table of tableNames) {
    try {
      const records = await listAllRecords(table, { maxRecords: 1 });
      results.push({
        table,
        accessible: true,
        recordCountSample: records.length,
      });
    } catch (err) {
      results.push({
        table,
        accessible: false,
        recordCountSample: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return results;
}
