import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  Edit3,
  History,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import {
  APPOINTMENT_STATUSES,
  CLINIC_TIME_SLOTS,
  type ActivityLogRecord,
  type AppointmentRecord,
  type AppointmentStatus,
  type ClinicService,
  type Language,
  type StaffMember,
  type UserRole,
} from '../../../shared/types.ts';
import { useLanguage } from '../../i18n/LanguageContext.tsx';

interface AppointmentsModuleProps {
  airtableConfigured: boolean;
  appointments: AppointmentRecord[];
  services: ClinicService[];
  staff: StaffMember[];
  userRole: UserRole;
  allowAdminDeleteAppointments: boolean;
  selectedAppointment: AppointmentRecord | null;
  onSelectAppointment: (appt: AppointmentRecord | null) => void;
  onRefresh: () => Promise<void>;
  refreshing?: boolean;
  loadError?: string | null;
}

function statusStyle(status: AppointmentStatus): string {
  switch (status) {
    case 'Confirmed':
      return 'text-[#16A34A]';
    case 'Pending Confirmation':
    case 'New Request':
      return 'text-[#D97706]';
    case 'Rescheduled':
      return 'text-[#2563EB]';
    case 'Cancelled':
    case 'No Show':
      return 'text-[#DC2626]';
    case 'Completed':
      return 'text-[#444343]';
    default:
      return 'text-[#6B6668]';
  }
}

export function AppointmentsModule({
  airtableConfigured,
  appointments,
  services,
  staff,
  userRole,
  allowAdminDeleteAppointments,
  selectedAppointment,
  onSelectAppointment,
  onRefresh,
  refreshing = false,
  loadError = null,
}: AppointmentsModuleProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Drawer section toggle
  const [drawerTab, setDrawerTab] = useState<'manage' | 'history'>('manage');
  const [historyLogs, setHistoryLogs] = useState<ActivityLogRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Full Edit Form State
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editClientEmail, setEditClientEmail] = useState('');
  const [editClientLang, setEditClientLang] = useState<Language>('fr');
  const [editServiceId, setEditServiceId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editAltDate, setEditAltDate] = useState('');
  const [editAltTime, setEditAltTime] = useState('');
  const [editStaffId, setEditStaffId] = useState('');
  const [editStatus, setEditStatus] = useState<AppointmentStatus>('Pending Confirmation');
  const [editClientMessage, setEditClientMessage] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Focused Action Modals
  const [confirmPrompt, setConfirmPrompt] = useState<{
    title: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const [rescheduleTarget, setRescheduleTarget] = useState<AppointmentRecord | null>(null);
  const [reschedDate, setReschedDate] = useState('');
  const [reschedTime, setReschedTime] = useState('');
  const [reschedStaffId, setReschedStaffId] = useState('');
  const [reschedReason, setReschedReason] = useState('');
  const [reschedConfirmStep, setReschedConfirmStep] = useState(false);
  const [reschedUnavailableTimes, setReschedUnavailableTimes] = useState<string[]>([]);
  const [editUnavailableTimes, setEditUnavailableTimes] = useState<string[]>([]);

  const [cancelTarget, setCancelTarget] = useState<AppointmentRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<AppointmentRecord | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const canFullEdit = userRole === 'Super Admin' || userRole === 'Admin';
  const canDelete =
    userRole === 'Super Admin' ||
    (userRole === 'Admin' && allowAdminDeleteAppointments);

  const syncFormFromAppointment = useCallback((appt: AppointmentRecord) => {
    setEditClientName(appt.clientName || '');
    setEditClientPhone(appt.clientPhone || '');
    setEditClientEmail(appt.clientEmail || '');
    setEditClientLang(appt.clientPreferredLanguage || appt.preferredLanguage || 'fr');
    setEditServiceId(appt.serviceId || '');
    setEditDate(appt.preferredDate || '');
    setEditTime(appt.preferredTime || '');
    setEditAltDate(appt.alternativeDate || '');
    setEditAltTime(appt.alternativeTime || '');
    setEditStaffId(appt.assignedStaffId || '');
    setEditStatus(appt.status);
    setEditClientMessage(appt.clientMessage || '');
    setEditNotes(appt.internalNotes || '');
  }, []);

  const loadHistory = useCallback(async (appointmentId: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/admin/appointments/${appointmentId}/history`);
      if (res.ok) {
        const data = (await res.json()) as { logs: ActivityLogRecord[] };
        setHistoryLogs(data.logs || []);
      }
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const openDetails = (appt: AppointmentRecord, initialTab: 'manage' | 'history' = 'manage') => {
    onSelectAppointment(appt);
    syncFormFromAppointment(appt);
    setDrawerTab(initialTab);
    setActionError(null);
    setActionSuccess(null);
  };

  useEffect(() => {
    if (selectedAppointment) {
      syncFormFromAppointment(selectedAppointment);
      void loadHistory(selectedAppointment.id);
    } else {
      setHistoryLogs([]);
      setEditUnavailableTimes([]);
    }
  }, [selectedAppointment, syncFormFromAppointment, loadHistory]);

  // Fetch occupied slots for Edit drawer when date/service/staff changes
  useEffect(() => {
    if (!selectedAppointment || !editDate) {
      setEditUnavailableTimes([]);
      return;
    }
    let cancelled = false;
    const qs = new URLSearchParams({
      date: editDate,
      excludeAppointmentId: selectedAppointment.id,
    });
    if (editServiceId) qs.set('serviceId', editServiceId);
    if (editStaffId) qs.set('staffId', editStaffId);
    fetch(`/api/admin/appointments/availability?${qs.toString()}`)
      .then((res) => (res.ok ? res.json() : { unavailableTimes: [] }))
      .then((data: { unavailableTimes?: string[] }) => {
        if (!cancelled) {
          setEditUnavailableTimes(Array.isArray(data.unavailableTimes) ? data.unavailableTimes : []);
        }
      })
      .catch(() => {
        if (!cancelled) setEditUnavailableTimes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAppointment?.id, editDate, editServiceId, editStaffId]);

  // Fetch occupied slots for Reschedule modal
  useEffect(() => {
    if (!rescheduleTarget || !reschedDate) {
      setReschedUnavailableTimes([]);
      return;
    }
    let cancelled = false;
    const qs = new URLSearchParams({
      date: reschedDate,
      serviceId: rescheduleTarget.serviceId,
      excludeAppointmentId: rescheduleTarget.id,
    });
    if (reschedStaffId) qs.set('staffId', reschedStaffId);
    fetch(`/api/admin/appointments/availability?${qs.toString()}`)
      .then((res) => (res.ok ? res.json() : { unavailableTimes: [] }))
      .then((data: { unavailableTimes?: string[] }) => {
        if (!cancelled) {
          const blocked = Array.isArray(data.unavailableTimes) ? data.unavailableTimes : [];
          setReschedUnavailableTimes(blocked);
          setReschedTime((prev) => (prev && blocked.includes(prev) ? '' : prev));
        }
      })
      .catch(() => {
        if (!cancelled) setReschedUnavailableTimes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [rescheduleTarget?.id, rescheduleTarget?.serviceId, reschedDate, reschedStaffId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return appointments.filter((a) => {
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
      if (serviceFilter !== 'ALL' && a.serviceId !== serviceFilter) return false;
      if (dateFilter && a.preferredDate !== dateFilter) return false;
      if (q) {
        const hay = `${a.bookingReference} ${a.clientName || ''} ${a.clientPhone || ''} ${a.clientEmail || ''} ${a.serviceName || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [appointments, search, statusFilter, serviceFilter, dateFilter]);

  const patchAppointment = async (
    id: string,
    payload: Record<string, unknown>,
    successMsg?: string,
  ): Promise<boolean> => {
    setSaving(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/admin/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        appointment?: AppointmentRecord;
        error?: string;
      };
      if (!res.ok) {
        if (res.status === 409 && rescheduleTarget && reschedDate) {
          const qs = new URLSearchParams({
            date: reschedDate,
            serviceId: rescheduleTarget.serviceId,
            excludeAppointmentId: rescheduleTarget.id,
          });
          if (reschedStaffId) qs.set('staffId', reschedStaffId);
          fetch(`/api/admin/appointments/availability?${qs.toString()}`)
            .then((r) => (r.ok ? r.json() : { unavailableTimes: [] }))
            .then((d: { unavailableTimes?: string[] }) => {
              const blocked = Array.isArray(d.unavailableTimes) ? d.unavailableTimes : [];
              setReschedUnavailableTimes(blocked);
              setReschedConfirmStep(false);
            })
            .catch(() => undefined);
        }
        setActionError(data.error || 'Failed to update appointment.');
        return false;
      }
      await onRefresh();
      if (data.appointment) {
        onSelectAppointment(data.appointment);
        syncFormFromAppointment(data.appointment);
        void loadHistory(data.appointment.id);
      }
      if (successMsg) setActionSuccess(successMsg);
      return true;
    } catch {
      setActionError('Network error while updating appointment.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFullEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    const payload: Record<string, unknown> = canFullEdit
      ? {
          actionMode: 'edit',
          clientName: editClientName,
          clientPhone: editClientPhone,
          clientEmail: editClientEmail,
          clientPreferredLanguage: editClientLang,
          serviceId: editServiceId,
          preferredDate: editDate,
          preferredTime: editTime,
          alternativeDate: editAltDate,
          alternativeTime: editAltTime,
          assignedStaffId: editStaffId || null,
          status: editStatus,
          clientMessage: editClientMessage,
          internalNotes: editNotes,
        }
      : {
          actionMode: 'status',
          status: editStatus,
          internalNotes: editNotes,
        };

    await patchAppointment(
      selectedAppointment.id,
      payload,
      t.admin.appointments.editSuccess,
    );
  };

  const openRescheduleDialog = (appt: AppointmentRecord) => {
    setRescheduleTarget(appt);
    setReschedDate(appt.preferredDate);
    setReschedTime(appt.preferredTime);
    setReschedStaffId(appt.assignedStaffId || '');
    setReschedReason('');
    setReschedConfirmStep(false);
    setActionError(null);
  };

  const executeReschedule = async () => {
    if (!rescheduleTarget) return;
    const ok = await patchAppointment(
      rescheduleTarget.id,
      {
        actionMode: 'reschedule',
        status: 'Rescheduled',
        preferredDate: reschedDate,
        preferredTime: reschedTime,
        assignedStaffId: reschedStaffId || null,
        actionReason: reschedReason,
      },
      t.admin.appointments.rescheduleSuccess,
    );
    if (ok) {
      setRescheduleTarget(null);
      setReschedConfirmStep(false);
    }
  };

  const openCancelDialog = (appt: AppointmentRecord) => {
    setCancelTarget(appt);
    setCancelReason(appt.cancellationReason || '');
    setActionError(null);
  };

  const executeCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget) return;
    const ok = await patchAppointment(
      cancelTarget.id,
      {
        actionMode: 'cancel',
        status: 'Cancelled',
        cancellationReason: cancelReason,
      },
      t.admin.appointments.cancelSuccess,
    );
    if (ok) {
      setCancelTarget(null);
    }
  };

  const openDeleteDialog = (appt: AppointmentRecord) => {
    setDeleteTarget(appt);
    setDeleteReason('');
    setActionError(null);
  };

  const executeDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteTarget) return;
    setSaving(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/admin/appointments/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deleteReason }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setActionError(data.error || 'Failed to delete appointment.');
        return;
      }
      if (selectedAppointment?.id === deleteTarget.id) {
        onSelectAppointment(null);
      }
      setDeleteTarget(null);
      await onRefresh();
      setActionSuccess(t.admin.appointments.deleteSuccess);
    } catch {
      setActionError('Network error while deleting appointment.');
    } finally {
      setSaving(false);
    }
  };

  const handleRetryWebhook = async (id: string) => {
    setSaving(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/appointments/${id}/retry-webhook`, {
        method: 'POST',
      });
      const data = (await res.json().catch(() => ({}))) as {
        sent?: boolean;
        error?: string;
      };
      if (!res.ok || data.sent === false) {
        setActionError(data.error || 'Webhook retry failed.');
      }
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const selectedReschedStaff = staff.find((s) => s.id === reschedStaffId);
  const availableReschedSlots = useMemo(() => {
    const slots = [...CLINIC_TIME_SLOTS] as string[];
    if (
      rescheduleTarget?.preferredTime &&
      reschedDate === rescheduleTarget.preferredDate &&
      !slots.includes(rescheduleTarget.preferredTime)
    ) {
      slots.unshift(rescheduleTarget.preferredTime);
    }
    return slots.filter((slot) => !reschedUnavailableTimes.includes(slot));
  }, [rescheduleTarget, reschedDate, reschedUnavailableTimes]);

  if (!airtableConfigured) {
    return (
      <div className="bg-white rounded-xl border border-[#EDEADE] p-8 text-sm text-[#6B6668]">
        {t.admin.common.awaitingConfigDesc}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {actionSuccess && !selectedAppointment && (
        <div className="p-3.5 rounded-xl bg-[#F6F2E9] border border-[#AFC9A3] text-sm text-[#444343] flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#5B9D3F]" />
            {actionSuccess}
          </span>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-xs text-[#6B6668] hover:text-[#444343] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && !selectedAppointment && !rescheduleTarget && !cancelTarget && !deleteTarget && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-900 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            {actionError}
          </span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-xs text-red-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters & Refresh */}
      <div className="bg-white rounded-xl border border-[#EDEADE] p-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#6B6668] absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.admin.common.search}
              className="w-full ps-9 pe-3 py-2 rounded-lg border border-[#EDEADE] text-sm text-[#444343] focus:outline-none focus:border-[#5B9D3F]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#EDEADE] text-sm text-[#444343] bg-white"
          >
            <option value="ALL">
              {t.admin.common.filterStatus}: {t.admin.common.all}
            </option>
            {APPOINTMENT_STATUSES.map((st) => (
              <option key={st} value={st}>
                {t.statuses[st]}
              </option>
            ))}
          </select>

          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#EDEADE] text-sm text-[#444343] bg-white"
          >
            <option value="ALL">
              {t.admin.common.filterService}: {t.admin.common.all}
            </option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#EDEADE] text-sm text-[#444343] tabular-nums"
          />
        </div>

        <button
          type="button"
          disabled={refreshing}
          onClick={() => void onRefresh()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[#EDEADE] text-sm font-medium text-[#444343] hover:border-[#5B9D3F] disabled:opacity-60 transition-colors shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 text-[#5B9D3F] ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? t.admin.common.refreshing : t.admin.common.refresh}</span>
        </button>
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-xl border border-[#EDEADE] overflow-hidden">
        {loadError && filtered.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="inline-flex items-center gap-2 text-sm text-red-900 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{loadError}</span>
            </div>
            <div>
              <button
                type="button"
                disabled={refreshing}
                onClick={() => void onRefresh()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#444343] text-white text-xs font-medium hover:bg-[#5B9D3F] disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                {t.admin.common.retry}
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#6B6668]">
            {t.admin.common.noRecords}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-[#F9F9F9] border-b border-[#EDEADE] text-xs text-[#6B6668]">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">Ref</th>
                  <th className="px-4 py-3 text-start font-medium">Client</th>
                  <th className="px-4 py-3 text-start font-medium">Service</th>
                  <th className="px-4 py-3 text-start font-medium">Date & Time</th>
                  <th className="px-4 py-3 text-start font-medium">{t.admin.common.assignedStaff}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.admin.common.filterStatus}</th>
                  <th className="px-4 py-3 text-end font-medium">{t.admin.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEADE]">
                {filtered.map((appt) => (
                  <tr key={appt.id} className="hover:bg-[#F6F2E9]/45">
                    <td className="px-4 py-3 font-mono-tabular text-xs text-[#444343] whitespace-nowrap">
                      {appt.bookingReference}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#444343]">{appt.clientName || '—'}</div>
                      <div className="text-xs text-[#6B6668] tabular-nums" dir="ltr">
                        {appt.clientPhone}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#444343]">{appt.serviceName || '—'}</td>
                    <td className="px-4 py-3 font-mono-tabular text-xs text-[#444343] whitespace-nowrap">
                      {appt.preferredDate} · {appt.preferredTime}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6B6668]">
                      {appt.assignedStaffName || t.admin.common.unassigned}
                    </td>
                    <td className={`px-4 py-3 text-xs font-medium whitespace-nowrap ${statusStyle(appt.status)}`}>
                      {t.statuses[appt.status]}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openDetails(appt, 'manage')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#EDEADE] text-xs font-medium text-[#444343] hover:border-[#5B9D3F] cursor-pointer"
                          title={canFullEdit ? t.admin.appointments.edit : t.admin.common.details}
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#5B9D3F]" />
                          {canFullEdit ? t.admin.appointments.edit : t.admin.common.details}
                        </button>
                        {canFullEdit && appt.status !== 'Cancelled' && appt.status !== 'Completed' && (
                          <button
                            type="button"
                            onClick={() => openRescheduleDialog(appt)}
                            className="p-1.5 rounded-lg border border-[#EDEADE] text-[#444343] hover:border-[#5B9D3F] cursor-pointer"
                            title={t.admin.common.reschedule}
                          >
                            <CalendarClock className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {appt.status !== 'Cancelled' && (
                          <button
                            type="button"
                            onClick={() => openCancelDialog(appt)}
                            className="p-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 cursor-pointer"
                            title={t.admin.common.reject}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => openDeleteDialog(appt)}
                            className="p-1.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 cursor-pointer"
                            title={t.admin.appointments.delete}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail & Full Edit Drawer Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-[#444343]/45">
          <div className="w-full max-w-2xl h-full bg-white border-s border-[#EDEADE] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#EDEADE]">
              <div>
                <div className="font-mono-tabular text-xs text-[#5B9D3F]">
                  {selectedAppointment.bookingReference}
                </div>
                <h3 className="font-display text-xl font-medium text-[#444343] mt-0.5">
                  {selectedAppointment.clientName}
                </h3>
                <div className="text-xs text-[#6B6668] mt-1">
                  {selectedAppointment.serviceName} · {t.statuses[selectedAppointment.status]} ·{' '}
                  <span className="font-mono-tabular">
                    {selectedAppointment.preferredDate} {selectedAppointment.preferredTime}
                  </span>
                  {selectedAppointment.confirmationDate && (
                    <span className="ms-2 text-[#16A34A] font-mono-tabular">
                      · {t.admin.appointments.confirmationDate}:{' '}
                      {selectedAppointment.confirmationDate.slice(0, 16).replace('T', ' ')}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectAppointment(null)}
                className="p-2 rounded-lg text-[#6B6668] hover:text-[#444343] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-900 text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}

            {actionSuccess && (
              <div className="p-3.5 rounded-lg bg-[#F6F2E9] border border-[#AFC9A3] text-[#444343] text-sm flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#5B9D3F] shrink-0 mt-0.5" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {/* Quick Contact & Primary Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {selectedAppointment.clientPhone && (
                  <a
                    href={`tel:${selectedAppointment.clientPhone.replace(/\s+/g, '')}`}
                    dir="ltr"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EDEADE] text-xs font-medium text-[#444343] hover:border-[#5B9D3F] tabular-nums"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#5B9D3F]" />
                    {selectedAppointment.clientPhone}
                  </a>
                )}
                {selectedAppointment.clientEmail && (
                  <a
                    href={`mailto:${selectedAppointment.clientEmail}`}
                    dir="ltr"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EDEADE] text-xs font-medium text-[#444343] hover:border-[#5B9D3F]"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#5B9D3F]" />
                    {selectedAppointment.clientEmail}
                  </a>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {canFullEdit && selectedAppointment.status !== 'Confirmed' && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      setConfirmPrompt({
                        title: `${t.admin.common.confirm} ${selectedAppointment.bookingReference}?`,
                        onConfirm: async () => {
                          await patchAppointment(selectedAppointment.id, {
                            actionMode: 'confirm',
                            status: 'Confirmed',
                            preferredDate: canFullEdit ? editDate : undefined,
                            preferredTime: canFullEdit ? editTime : undefined,
                            assignedStaffId: canFullEdit ? editStaffId || null : undefined,
                            internalNotes: editNotes,
                          });
                        },
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#5B9D3F] text-white text-xs font-medium hover:bg-[#4c8734] cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {t.admin.common.confirm}
                  </button>
                )}

                {canFullEdit && selectedAppointment.status !== 'Cancelled' && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => openRescheduleDialog(selectedAppointment)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#EDEADE] text-xs font-medium text-[#444343] hover:border-[#5B9D3F] cursor-pointer"
                  >
                    <CalendarClock className="w-3.5 h-3.5" />
                    {t.admin.common.reschedule}
                  </button>
                )}

                {selectedAppointment.status !== 'Cancelled' && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => openCancelDialog(selectedAppointment)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-200 text-red-700 text-xs font-medium hover:bg-red-50 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    {t.admin.common.reject}
                  </button>
                )}

                {canDelete && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => openDeleteDialog(selectedAppointment)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-300 bg-red-50 text-red-800 text-xs font-medium hover:bg-red-100 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t.admin.appointments.delete}
                  </button>
                )}
              </div>
            </div>

            {/* Make.com & Reminder Status Summary */}
            <div className="p-3.5 rounded-lg bg-[#F9F9F9] border border-[#EDEADE] flex flex-wrap items-center justify-between gap-4 text-xs">
              <span className="text-[#6B6668]">
                Make.com:{' '}
                {selectedAppointment.notificationSent
                  ? 'Sent'
                  : selectedAppointment.notificationError
                  ? `Error: ${selectedAppointment.notificationError}`
                  : 'Not triggered'}
                {' · '}
                {selectedAppointment.reminderEmailSent
                  ? t.admin.appointments.reminderSent
                  : t.admin.appointments.reminderNotSent}
                {selectedAppointment.cancellationReason && (
                  <>
                    {' · '}
                    <span className="text-red-700">
                      {t.admin.appointments.cancellationReason}:{' '}
                      {selectedAppointment.cancellationReason}
                    </span>
                  </>
                )}
              </span>
              {canFullEdit && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleRetryWebhook(selectedAppointment.id)}
                  className="inline-flex items-center gap-1 text-[#5B9D3F] font-medium hover:underline shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  {t.admin.common.retryWebhook}
                </button>
              )}
            </div>

            {/* Drawer Tabs: Edit vs Activity History */}
            <div className="flex items-center gap-2 border-b border-[#EDEADE]">
              <button
                type="button"
                onClick={() => setDrawerTab('manage')}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                  drawerTab === 'manage'
                    ? 'border-[#5B9D3F] text-[#444343]'
                    : 'border-transparent text-[#6B6668] hover:text-[#444343]'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                {t.admin.appointments.edit}
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('history')}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                  drawerTab === 'history'
                    ? 'border-[#5B9D3F] text-[#444343]'
                    : 'border-transparent text-[#6B6668] hover:text-[#444343]'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                {t.admin.appointments.history} ({historyLogs.length})
              </button>
            </div>

            {drawerTab === 'manage' ? (
              <form onSubmit={handleSaveFullEdit} className="space-y-4">
                {canFullEdit && (
                  <>
                    {/* Client Info Editing */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg bg-[#F9F9F9] border border-[#EDEADE]">
                      <div>
                        <label className="block text-xs font-medium text-[#6B6668] mb-1">
                          {t.admin.appointments.clientName}
                        </label>
                        <input
                          type="text"
                          required
                          value={editClientName}
                          onChange={(e) => setEditClientName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#6B6668] mb-1">
                          {t.admin.appointments.clientPhone}
                        </label>
                        <input
                          type="text"
                          required
                          dir="ltr"
                          value={editClientPhone}
                          onChange={(e) => setEditClientPhone(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] bg-white text-sm tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#6B6668] mb-1">
                          {t.admin.appointments.clientEmail}
                        </label>
                        <input
                          type="email"
                          dir="ltr"
                          value={editClientEmail}
                          onChange={(e) => setEditClientEmail(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#6B6668] mb-1">
                          {t.admin.appointments.clientLanguage}
                        </label>
                        <select
                          value={editClientLang}
                          onChange={(e) => setEditClientLang(e.target.value as Language)}
                          className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] bg-white text-sm"
                        >
                          <option value="fr">Français</option>
                          <option value="en">English</option>
                          <option value="ar">العربية</option>
                        </select>
                      </div>
                    </div>

                    {/* Service & Practitioner */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#6B6668] mb-1">
                          {t.admin.appointments.service}
                        </label>
                        <select
                          value={editServiceId}
                          onChange={(e) => setEditServiceId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] bg-white text-sm"
                        >
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.durationMinutes} min)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#6B6668] mb-1">
                          {t.admin.common.assignedStaff}
                        </label>
                        <select
                          value={editStaffId}
                          onChange={(e) => setEditStaffId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] bg-white text-sm"
                        >
                          <option value="">{t.admin.common.unassigned}</option>
                          {staff
                            .filter((m) => m.active || m.id === editStaffId)
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.fullName} ({m.role}){!m.active ? ' [Inactive]' : ''}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    {/* Preferred & Alternative Dates/Times */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#6B6668] mb-1">
                          {t.admin.appointments.preferredDate}
                        </label>
                        <input
                          type="date"
                          required
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] text-sm tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#6B6668] mb-1">
                          {t.admin.appointments.preferredTime}
                        </label>
                        <input
                          type="time"
                          required
                          value={editTime}
                          onChange={(e) => setEditTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] text-sm tabular-nums"
                        />
                        {editUnavailableTimes.includes(editTime) && (
                          <p className="mt-1 text-[11px] text-amber-800">
                            {t.admin.appointments.slotOccupiedWarning}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#6B6668] mb-1">
                          {t.admin.appointments.alternativeDate}
                        </label>
                        <input
                          type="date"
                          value={editAltDate}
                          onChange={(e) => setEditAltDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] text-sm tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#6B6668] mb-1">
                          {t.admin.appointments.alternativeTime}
                        </label>
                        <input
                          type="time"
                          value={editAltTime}
                          onChange={(e) => setEditAltTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] text-sm tabular-nums"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Status Selector */}
                <div>
                  <label className="block text-xs font-medium text-[#6B6668] mb-1.5">
                    {t.admin.common.filterStatus}
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as AppointmentStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] bg-white text-sm"
                  >
                    {APPOINTMENT_STATUSES.map((st) => (
                      <option
                        key={st}
                        value={st}
                        disabled={
                          !canFullEdit &&
                          st === 'Confirmed' &&
                          selectedAppointment.status !== 'Confirmed'
                        }
                      >
                        {t.statuses[st]}
                      </option>
                    ))}
                  </select>
                </div>

                {canFullEdit && (
                  <div>
                    <label className="block text-xs font-medium text-[#6B6668] mb-1">
                      {t.admin.appointments.clientMessage}
                    </label>
                    <textarea
                      rows={2}
                      value={editClientMessage}
                      onChange={(e) => setEditClientMessage(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[#6B6668] mb-1">
                    {t.admin.common.internalNotes}
                  </label>
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 rounded-lg bg-[#444343] text-white text-sm font-medium hover:bg-[#5B9D3F] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {saving ? '...' : t.admin.appointments.saveChanges}
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                {loadingHistory ? (
                  <p className="text-xs text-[#6B6668] py-4">
                    {t.admin.appointments.loadingHistory}
                  </p>
                ) : historyLogs.length === 0 ? (
                  <p className="text-xs text-[#6B6668] py-4">
                    {t.admin.appointments.noHistory}
                  </p>
                ) : (
                  <div className="divide-y divide-[#EDEADE] border border-[#EDEADE] rounded-lg">
                    {historyLogs.map((log) => (
                      <div key={log.id} className="p-3.5 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono-tabular font-medium text-[#5B9D3F]">
                            {log.action}
                          </span>
                          <span className="font-mono-tabular text-[#6B6668]">
                            {log.timestamp.slice(0, 19).replace('T', ' ')}
                          </span>
                        </div>
                        <div className="text-[#444343] font-medium">{log.user}</div>
                        {(log.previousValue || log.newValue) && (
                          <div className="text-[#6B6668] break-words">
                            {log.previousValue && (
                              <span className="line-through opacity-75 me-2">
                                {log.previousValue}
                              </span>
                            )}
                            <span>{log.newValue}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Prompt (Confirm Appointment) */}
      {confirmPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl border border-[#EDEADE] max-w-sm w-full p-6 space-y-4">
            <h4 className="font-display text-lg font-medium text-[#444343]">
              {confirmPrompt.title}
            </h4>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmPrompt(null)}
                className="px-4 py-2 rounded-lg border border-[#EDEADE] text-sm text-[#444343] cursor-pointer"
              >
                {t.admin.common.cancel}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  const fn = confirmPrompt.onConfirm;
                  setConfirmPrompt(null);
                  await fn();
                }}
                className="px-4 py-2 rounded-lg bg-[#5B9D3F] text-white text-sm font-medium cursor-pointer"
              >
                {t.admin.common.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Appointment Modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl border border-[#EDEADE] max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono-tabular text-xs text-[#5B9D3F]">
                  {rescheduleTarget.bookingReference}
                </div>
                <h4 className="font-display text-lg font-medium text-[#444343]">
                  {t.admin.appointments.confirmRescheduleTitle}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                className="text-[#6B6668] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
                {actionError}
              </div>
            )}

            <div className="p-3 rounded-lg bg-[#F9F9F9] border border-[#EDEADE] text-xs space-y-1">
              <div className="text-[#6B6668]">
                {t.admin.appointments.previousSlot}:{' '}
                <span className="font-mono-tabular font-medium text-[#444343]">
                  {rescheduleTarget.preferredDate} · {rescheduleTarget.preferredTime}
                </span>
              </div>
              {reschedConfirmStep && (
                <div className="text-[#5B9D3F]">
                  {t.admin.appointments.newSlot}:{' '}
                  <span className="font-mono-tabular font-semibold">
                    {reschedDate} · {reschedTime}
                  </span>
                </div>
              )}
            </div>

            {!reschedConfirmStep ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#6B6668] mb-1">
                      {t.admin.appointments.preferredDate}
                    </label>
                    <input
                      type="date"
                      required
                      value={reschedDate}
                      onChange={(e) => setReschedDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#6B6668] mb-1">
                      {t.admin.appointments.preferredTime}
                    </label>
                    <select
                      required
                      disabled={availableReschedSlots.length === 0}
                      value={reschedTime}
                      onChange={(e) => setReschedTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] text-sm bg-white tabular-nums disabled:bg-[#F9F9F9] disabled:text-[#6B6668]"
                    >
                      <option value="">--:--</option>
                      {availableReschedSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {reschedDate && availableReschedSlots.length === 0 && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {t.admin.appointments.noSlotsAvailable}
                  </p>
                )}

                <div>
                  <label className="block text-xs text-[#6B6668] mb-1">
                    {t.admin.common.assignedStaff}
                  </label>
                  <select
                    value={reschedStaffId}
                    onChange={(e) => setReschedStaffId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] text-sm bg-white"
                  >
                    <option value="">{t.admin.common.unassigned}</option>
                    {staff
                      .filter((m) => m.active)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.fullName} ({m.role})
                        </option>
                      ))}
                  </select>
                  {selectedReschedStaff?.availability && (
                    <p className="mt-1 text-[11px] text-[#6B6668]">
                      {t.admin.appointments.staffAvailability}: {selectedReschedStaff.availability}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-[#6B6668] mb-1">
                    {t.admin.appointments.rescheduleReason}
                  </label>
                  <input
                    type="text"
                    value={reschedReason}
                    onChange={(e) => setReschedReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] text-sm"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRescheduleTarget(null)}
                    className="px-4 py-2 rounded-lg border border-[#EDEADE] text-xs font-medium text-[#444343] cursor-pointer"
                  >
                    {t.admin.common.cancel}
                  </button>
                  <button
                    type="button"
                    disabled={!reschedDate || !reschedTime}
                    onClick={() => setReschedConfirmStep(true)}
                    className="px-4 py-2 rounded-lg bg-[#444343] text-white text-xs font-medium hover:bg-[#5B9D3F] cursor-pointer"
                  >
                    {t.admin.common.reschedule}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-[#6B6668]">
                  {t.admin.appointments.confirmRescheduleDesc}
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReschedConfirmStep(false)}
                    className="px-4 py-2 rounded-lg border border-[#EDEADE] text-xs font-medium text-[#444343] cursor-pointer"
                  >
                    {t.admin.common.cancel}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={executeReschedule}
                    className="px-4 py-2 rounded-lg bg-[#5B9D3F] text-white text-xs font-medium cursor-pointer"
                  >
                    {saving ? '...' : t.admin.common.confirm}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancel Appointment Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={executeCancel}
            className="bg-white rounded-xl border border-[#EDEADE] max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono-tabular text-xs text-red-700">
                  {cancelTarget.bookingReference}
                </div>
                <h4 className="font-display text-lg font-medium text-[#444343]">
                  {t.admin.appointments.confirmCancelTitle}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="text-[#6B6668] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#6B6668]">{t.admin.appointments.confirmCancelDesc}</p>

            {actionError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
                {actionError}
              </div>
            )}

            <div>
              <label className="block text-xs text-[#6B6668] mb-1">
                {t.admin.appointments.cancellationReason}
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2 rounded-lg border border-[#EDEADE] text-xs font-medium text-[#444343] cursor-pointer"
              >
                {t.admin.common.cancel}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-red-700 text-white text-xs font-medium hover:bg-red-800 cursor-pointer"
              >
                {saving ? '...' : t.admin.common.reject}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Permanent Delete Appointment Modal (Super Admin / permitted Admin only) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={executeDelete}
            className="bg-white rounded-xl border border-red-200 max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono-tabular text-xs text-red-700">
                  {deleteTarget.bookingReference} · {deleteTarget.clientName}
                </div>
                <h4 className="font-display text-lg font-medium text-red-900">
                  {t.admin.appointments.confirmDeleteTitle}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="text-[#6B6668] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 leading-relaxed flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{t.admin.appointments.confirmDeleteWarning}</span>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
                {actionError}
              </div>
            )}

            <div>
              <label className="block text-xs text-[#6B6668] mb-1">
                {t.admin.appointments.deleteReason}
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border border-[#EDEADE] text-xs font-medium text-[#444343] cursor-pointer"
              >
                {t.admin.common.cancel}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-red-700 text-white text-xs font-medium hover:bg-red-800 cursor-pointer"
              >
                {saving ? '...' : t.admin.appointments.delete}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
