import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  DatabaseZap,
  Download,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import type {
  ActivityLogRecord,
  AdminUserRecord,
  AirtableInitializationReport,
  AppointmentRecord,
  ClinicPublicSettings,
  ClinicService,
  ClientRecord,
  IntegrationStatus,
  NotificationRecord,
  UserRole,
} from '../../../shared/types.ts';
import { useLanguage } from '../../i18n/LanguageContext.tsx';

// =============================================================================
// NOTIFICATIONS MODULE
// =============================================================================

export function NotificationsModule({
  airtableConfigured,
  notifications,
  onRefresh,
}: {
  airtableConfigured: boolean;
  notifications: NotificationRecord[];
  onRefresh: () => Promise<void>;
}) {
  const { t } = useLanguage();

  const toggleRead = async (n: NotificationRecord) => {
    await fetch(`/api/admin/notifications/${n.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ readStatus: !n.readStatus }),
    });
    await onRefresh();
  };

  if (!airtableConfigured) {
    return (
      <div className="bg-white rounded-xl border border-[#EDEADE] p-8 text-sm text-[#6B6668]">
        {t.admin.common.awaitingConfigDesc}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#EDEADE] divide-y divide-[#EDEADE]">
      {notifications.length === 0 ? (
        <div className="p-10 text-center text-sm text-[#6B6668]">
          {t.admin.common.noRecords}
        </div>
      ) : (
        notifications.map((n) => (
          <div
            key={n.id}
            className={`p-4 flex items-start justify-between gap-4 ${
              n.readStatus ? 'bg-white' : 'bg-[#F6F2E9]/50'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-[#6B6668]">
                <span className="font-medium text-[#5B9D3F] uppercase">
                  {n.notificationType}
                </span>
                <span>·</span>
                <span className="font-mono-tabular">
                  {n.createdAt.slice(0, 16).replace('T', ' ')}
                </span>
              </div>
              <div className="font-medium text-sm text-[#444343]">{n.title}</div>
              <p className="text-xs text-[#6B6668]">{n.message}</p>
            </div>
            <button
              type="button"
              onClick={() => toggleRead(n)}
              className="px-3 py-1.5 rounded-lg border border-[#EDEADE] text-xs font-medium text-[#444343] shrink-0 cursor-pointer"
            >
              {n.readStatus ? 'Unread' : 'Mark read'}
            </button>
          </div>
        ))
      )}
    </div>
  );
}

// =============================================================================
// REPORTS MODULE
// =============================================================================

export function ReportsModule({
  airtableConfigured,
  appointments,
  clients,
  services,
}: {
  airtableConfigured: boolean;
  appointments: AppointmentRecord[];
  clients: ClientRecord[];
  services: ClinicService[];
}) {
  const { t } = useLanguage();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      if (dateFrom && a.preferredDate < dateFrom) return false;
      if (dateTo && a.preferredDate > dateTo) return false;
      return true;
    });
  }, [appointments, dateFrom, dateTo]);

  const exportCsv = () => {
    const header = [
      'Booking Reference',
      'Client Name',
      'Phone',
      'Email',
      'Service',
      'Preferred Date',
      'Preferred Time',
      'Status',
      'Preferred Language',
      'Created At',
    ];
    const rows = filtered.map((a) => [
      a.bookingReference,
      a.clientName || '',
      a.clientPhone || '',
      a.clientEmail || '',
      a.serviceName || '',
      a.preferredDate,
      a.preferredTime,
      a.status,
      a.preferredLanguage,
      a.createdAt,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emie-clinic-appointments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!airtableConfigured) {
    return (
      <div className="bg-white rounded-xl border border-[#EDEADE] p-8 text-sm text-[#6B6668]">
        {t.admin.common.awaitingConfigDesc}
      </div>
    );
  }

  const completedCount = filtered.filter((a) => a.status === 'Completed').length;
  const cancelledCount = filtered.filter((a) => a.status === 'Cancelled').length;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-[#EDEADE] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-2 text-[#6B6668]">
            <span>{t.admin.common.dateFrom}</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-[#EDEADE] text-[#444343] tabular-nums"
            />
          </label>
          <label className="flex items-center gap-2 text-[#6B6668]">
            <span>{t.admin.common.dateTo}</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-[#EDEADE] text-[#444343] tabular-nums"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#444343] text-white text-xs font-medium hover:bg-[#5B9D3F] cursor-pointer"
        >
          <Download className="w-4 h-4" />
          {t.admin.common.exportCsv}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#EDEADE] p-5">
          <div className="text-xs text-[#6B6668]">Appointment Volume</div>
          <div className="font-display text-2xl font-medium text-[#444343] tabular-nums mt-1">
            {filtered.length}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#EDEADE] p-5">
          <div className="text-xs text-[#6B6668]">{t.admin.kpis.completed}</div>
          <div className="font-display text-2xl font-medium text-[#5B9D3F] tabular-nums mt-1">
            {completedCount}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#EDEADE] p-5">
          <div className="text-xs text-[#6B6668]">{t.admin.kpis.cancelled}</div>
          <div className="font-display text-2xl font-medium text-[#DC2626] tabular-nums mt-1">
            {cancelledCount}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#EDEADE] p-5">
          <div className="text-xs text-[#6B6668]">{t.admin.kpis.totalClients}</div>
          <div className="font-display text-2xl font-medium text-[#444343] tabular-nums mt-1">
            {clients.length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#EDEADE] p-6 space-y-4">
        <h3 className="font-display text-base font-medium text-[#444343]">
          Service Demand Breakdown
        </h3>
        <div className="divide-y divide-[#EDEADE] text-sm">
          {services.map((s) => {
            const count = filtered.filter((a) => a.serviceId === s.id).length;
            return (
              <div key={s.id} className="py-2.5 flex items-center justify-between">
                <span className="text-[#444343]">{s.name}</span>
                <span className="font-mono-tabular text-[#444343] font-medium">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SETTINGS, INTEGRATIONS, USERS & AUDIT LOGS MODULE
// =============================================================================

export function SettingsModule({
  settings,
  integrations,
  userRole,
  adminUsers,
  activityLogs,
  onRefresh,
}: {
  settings: ClinicPublicSettings;
  integrations: IntegrationStatus;
  userRole: UserRole;
  adminUsers: AdminUserRecord[];
  activityLogs: ActivityLogRecord[];
  onRefresh: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState<ClinicPublicSettings>(settings);
  const [liveIntegrations, setLiveIntegrations] =
    useState<IntegrationStatus>(integrations);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [schemaCheck, setSchemaCheck] = useState<
    Array<{ table: string; accessible: boolean; error?: string }>
  >([]);
  const [initReport, setInitReport] = useState<AirtableInitializationReport | null>(
    null,
  );
  const [checkingSchema, setCheckingSchema] = useState(false);
  const [initializingSchema, setInitializingSchema] = useState(false);

  // Admin user creation form
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Admin');
  const [userError, setUserError] = useState<string | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSaveMessage('Settings saved to Airtable.');
        await onRefresh();
      } else {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setSaveMessage(d.error || 'Failed to save settings.');
      }
    } finally {
      setSaving(false);
    }
  };

  const runVerifyIntegrations = useCallback(async () => {
    setCheckingSchema(true);
    try {
      const res = await fetch('/api/admin/integrations/verify');
      const data = (await res.json()) as {
        integrations?: IntegrationStatus;
        tables?: Array<{ table: string; accessible: boolean; error?: string }>;
        lastInitialization?: AirtableInitializationReport | null;
      };
      if (data.integrations) setLiveIntegrations(data.integrations);
      setSchemaCheck(data.tables || []);
      if (data.lastInitialization) setInitReport(data.lastInitialization);
    } finally {
      setCheckingSchema(false);
    }
  }, []);

  const runInitializeAirtable = async () => {
    setInitializingSchema(true);
    try {
      const res = await fetch('/api/admin/integrations/initialize', {
        method: 'POST',
      });
      const data = (await res.json()) as {
        report?: AirtableInitializationReport;
        integrations?: IntegrationStatus;
        tables?: Array<{ table: string; accessible: boolean; error?: string }>;
      };
      if (data.integrations) setLiveIntegrations(data.integrations);
      if (data.report) setInitReport(data.report);
      if (data.tables) setSchemaCheck(data.tables);
      await onRefresh();
    } finally {
      setInitializingSchema(false);
    }
  };

  useEffect(() => {
    if (userRole !== 'Staff') {
      void runVerifyIntegrations();
    }
  }, [userRole, runVerifyIntegrations]);

  const handleCreateAdminUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setUserError(data.error || 'Failed to create user.');
      return;
    }
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    await onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Integrations Status Card */}
      <div className="bg-white rounded-xl border border-[#EDEADE] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-lg font-medium text-[#444343]">
            Airtable & Make.com Integrations
          </h3>
          {userRole !== 'Staff' && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={initializingSchema || checkingSchema}
                onClick={runInitializeAirtable}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#5B9D3F] text-white text-xs font-medium hover:bg-[#4c8734] disabled:opacity-50 cursor-pointer"
              >
                <DatabaseZap className={`w-3.5 h-3.5 ${initializingSchema ? 'animate-pulse' : ''}`} />
                {initializingSchema ? 'Initializing Schema...' : 'Initialize Missing Tables & Services'}
              </button>
              <button
                type="button"
                disabled={checkingSchema || initializingSchema}
                onClick={runVerifyIntegrations}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#EDEADE] text-xs font-medium text-[#444343] hover:border-[#5B9D3F] disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingSchema ? 'animate-spin' : ''}`} />
                Verify Airtable Tables
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 rounded-lg bg-[#F9F9F9] border border-[#EDEADE] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-[#444343]">Airtable Database</span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium ${
                  liveIntegrations.airtableDiagnosticCode === 'connected'
                    ? 'text-[#5B9D3F]'
                    : liveIntegrations.airtableConfigured
                    ? 'text-amber-700'
                    : 'text-red-700'
                }`}
              >
                {liveIntegrations.airtableDiagnosticCode === 'connected' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t.admin.diagnostics.connected}
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" />
                    {t.admin.diagnostics[liveIntegrations.airtableDiagnosticCode]}
                  </>
                )}
              </span>
            </div>
            {liveIntegrations.airtableDiagnosticMessage && (
              <p className="text-xs text-[#444343]">
                {liveIntegrations.airtableDiagnosticMessage}
              </p>
            )}
            <p className="text-xs text-[#6B6668]">
              Token: {liveIntegrations.airtableTokenPresent ? 'Present' : 'Missing'} · Base ID:{' '}
              {liveIntegrations.airtableBaseIdMasked || 'Missing'}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#F9F9F9] border border-[#EDEADE] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#444343]">Make.com Automation Webhook</span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium ${
                  liveIntegrations.makeConfigured ? 'text-[#5B9D3F]' : 'text-amber-700'
                }`}
              >
                {liveIntegrations.makeConfigured ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Configured
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" /> Awaiting Configuration
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-[#6B6668]">
              Server env var: <code className="font-mono-tabular">MAKE_BOOKING_WEBHOOK_URL</code>
            </p>
          </div>
        </div>

        {schemaCheck.length > 0 && (
          <div className="pt-3 border-t border-[#EDEADE] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            {schemaCheck.map((row) => (
              <div
                key={row.table}
                className={`p-2.5 rounded-lg border ${
                  row.accessible
                    ? 'border-[#AFC9A3] bg-[#F6F2E9]/50 text-[#444343]'
                    : 'border-red-200 bg-red-50 text-red-900'
                }`}
              >
                <div className="font-medium">{row.table}</div>
                <div className="text-[11px] opacity-80">
                  {row.accessible ? 'Accessible' : row.error || 'Missing'}
                </div>
              </div>
            ))}
          </div>
        )}

        {initReport && (
          <div className="pt-3 border-t border-[#EDEADE] space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[#444343]">
              <span className="font-medium">
                Schema Initialization Report ({initReport.checkedAt.slice(0, 19).replace('T', ' ')} UTC)
              </span>
              <span className={initReport.allTablesVerified ? 'text-[#5B9D3F] font-medium' : 'text-amber-700 font-medium'}>
                Tables verified: {initReport.verifiedTables.filter((t) => t.accessible).length}/8 · Services: {initReport.servicesCount}/5
              </span>
            </div>
            {initReport.errors.length > 0 && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-900 space-y-1">
                {initReport.errors.map((err, i) => (
                  <div key={`${err.step}-${i}`}>
                    <span className="font-mono-tabular font-semibold">{err.step}</span> ({err.code}
                    {err.httpStatus ? ` HTTP ${err.httpStatus}` : ''}): {err.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clinic Settings Form (Super Admin) */}
      {userRole === 'Super Admin' && (
        <form
          onSubmit={handleSaveSettings}
          className="bg-white rounded-xl border border-[#EDEADE] p-6 space-y-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-medium text-[#444343]">
              Clinic Profile & Scheduling Rules
            </h3>
            {saveMessage && <span className="text-xs text-[#5B9D3F]">{saveMessage}</span>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs text-[#6B6668] mb-1">Clinic Name</label>
              <input
                type="text"
                value={form.clinicName}
                onChange={(e) => setForm((p) => ({ ...p, clinicName: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#EDEADE]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B6668] mb-1">Phone</label>
              <input
                type="text"
                dir="ltr"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#EDEADE]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-[#6B6668] mb-1">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#EDEADE]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B6668] mb-1">Instagram Handle</label>
              <input
                type="text"
                value={form.instagramHandle}
                onChange={(e) =>
                  setForm((p) => ({ ...p, instagramHandle: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-[#EDEADE]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B6668] mb-1">
                Opening Hours (leave blank if not published)
              </label>
              <input
                type="text"
                value={form.openingHours}
                onChange={(e) =>
                  setForm((p) => ({ ...p, openingHours: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-[#EDEADE]"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 text-sm pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.requireEmail}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    requireEmail: e.target.checked,
                    emailOptional: !e.target.checked,
                  }))
                }
                className="accent-[#5B9D3F]"
              />
              <span>Require email on booking form</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.preventOverlappingConfirmed}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    preventOverlappingConfirmed: e.target.checked,
                  }))
                }
                className="accent-[#5B9D3F]"
              />
              <span>Prevent overlapping Confirmed appointments</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.allowAdminDeleteAppointments}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    allowAdminDeleteAppointments: e.target.checked,
                  }))
                }
                className="accent-[#5B9D3F]"
              />
              <span>{t.admin.diagnostics.allowAdminDeleteLabel}</span>
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !liveIntegrations.airtableConfigured}
              className="px-5 py-2.5 rounded-lg bg-[#444343] text-white text-sm font-medium hover:bg-[#5B9D3F] disabled:opacity-50 cursor-pointer"
            >
              {t.admin.common.save}
            </button>
          </div>
        </form>
      )}

      {/* User Roles & Admin Accounts (Super Admin only) */}
      {userRole === 'Super Admin' && integrations.airtableConfigured && (
        <div className="bg-white rounded-xl border border-[#EDEADE] p-6 space-y-5">
          <h3 className="font-display text-lg font-medium text-[#444343]">
            Admin Users & Roles
          </h3>

          {userError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
              {userError}
            </div>
          )}

          <form
            onSubmit={handleCreateAdminUser}
            className="grid grid-cols-1 sm:grid-cols-5 gap-3"
          >
            <input
              type="text"
              required
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Full Name"
              className="px-3 py-2 rounded-lg border border-[#EDEADE] text-sm"
            />
            <input
              type="email"
              required
              dir="ltr"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="Email"
              className="px-3 py-2 rounded-lg border border-[#EDEADE] text-sm"
            />
            <input
              type="password"
              required
              minLength={8}
              dir="ltr"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              placeholder="Password (min 8)"
              className="px-3 py-2 rounded-lg border border-[#EDEADE] text-sm"
            />
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as UserRole)}
              className="px-3 py-2 rounded-lg border border-[#EDEADE] text-sm bg-white"
            >
              <option value="Super Admin">Super Admin</option>
              <option value="Admin">Admin</option>
              <option value="Staff">Staff</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#5B9D3F] text-white text-xs font-medium cursor-pointer"
            >
              Create User
            </button>
          </form>

          <div className="divide-y divide-[#EDEADE] text-sm">
            {adminUsers.map((u) => (
              <div key={u.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <span className="font-medium text-[#444343]">{u.fullName}</span>{' '}
                  <span className="text-xs text-[#6B6668]">
                    ({u.email}) · {u.role}
                  </span>
                </div>
                <span
                  className={`text-xs font-medium ${
                    u.active ? 'text-[#5B9D3F]' : 'text-[#6B6668]'
                  }`}
                >
                  {u.active ? t.admin.common.active : t.admin.common.inactive}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Logs Audit History */}
      {userRole !== 'Staff' && integrations.airtableConfigured && (
        <div className="bg-white rounded-xl border border-[#EDEADE] p-6 space-y-4">
          <h3 className="font-display text-lg font-medium text-[#444343]">
            Activity Audit Logs
          </h3>
          {activityLogs.length === 0 ? (
            <p className="text-sm text-[#6B6668]">{t.admin.common.noRecords}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-[#F9F9F9] border-b border-[#EDEADE] text-[#6B6668]">
                  <tr>
                    <th className="px-3 py-2 text-start font-medium">Timestamp</th>
                    <th className="px-3 py-2 text-start font-medium">User</th>
                    <th className="px-3 py-2 text-start font-medium">Action</th>
                    <th className="px-3 py-2 text-start font-medium">Entity</th>
                    <th className="px-3 py-2 text-start font-medium">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEADE]">
                  {activityLogs.slice(0, 25).map((log) => (
                    <tr key={log.id}>
                      <td className="px-3 py-2 font-mono-tabular text-[#6B6668] whitespace-nowrap">
                        {log.timestamp.slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="px-3 py-2 text-[#444343]">{log.user}</td>
                      <td className="px-3 py-2 font-mono-tabular text-[#5B9D3F]">
                        {log.action}
                      </td>
                      <td className="px-3 py-2 text-[#6B6668]">
                        {log.entityType} ({log.entityId})
                      </td>
                      <td className="px-3 py-2 text-[#6B6668]">
                        {log.previousValue ? `${log.previousValue} → ` : ''}
                        {log.newValue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
