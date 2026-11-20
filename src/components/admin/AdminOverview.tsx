import { useMemo, useState } from 'react';
import type {
  AppointmentRecord,
  AppointmentStatus,
  ClinicService,
} from '../../../shared/types.ts';
import { useLanguage } from '../../i18n/LanguageContext.tsx';

interface OverviewMetrics {
  totalAppointments: number;
  newRequests: number;
  pendingConfirmations: number;
  confirmedAppointments: number;
  todaysAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  totalClients: number;
  unreadNotifications: number;
}

interface AdminOverviewProps {
  airtableConfigured: boolean;
  metrics: OverviewMetrics | null;
  appointments: AppointmentRecord[];
  services: ClinicService[];
  loadError?: string | null;
  onOpenAppointment: (appt: AppointmentRecord) => void;
  onGoToSettings: () => void;
}

export function AdminOverview({
  airtableConfigured,
  metrics,
  appointments,
  services,
  loadError = null,
  onOpenAppointment,
  onGoToSettings,
}: AdminOverviewProps) {
  const { t } = useLanguage();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (dateFrom && a.preferredDate < dateFrom) return false;
      if (dateTo && a.preferredDate > dateTo) return false;
      return true;
    });
  }, [appointments, dateFrom, dateTo]);

  const serviceBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of services) {
      counts.set(s.name, 0);
    }
    for (const a of filteredAppointments) {
      const label = a.serviceName || 'Autre';
      counts.set(label, (counts.get(label) || 0) + 1);
    }
    const entries = [...counts.entries()];
    const maxVal = Math.max(1, ...entries.map(([, v]) => v));
    return entries.map(([name, count]) => ({
      name,
      count,
      pct: Math.round((count / maxVal) * 100),
    }));
  }, [filteredAppointments, services]);

  const statusBreakdown = useMemo(() => {
    const statuses: AppointmentStatus[] = [
      'New Request',
      'Pending Confirmation',
      'Confirmed',
      'Rescheduled',
      'Completed',
      'Cancelled',
      'No Show',
    ];
    const total = Math.max(1, filteredAppointments.length);
    return statuses.map((st) => {
      const count = filteredAppointments.filter((a) => a.status === st).length;
      return {
        status: st,
        label: t.statuses[st],
        count,
        pct: Math.round((count / total) * 100),
      };
    });
  }, [filteredAppointments, t.statuses]);

  if (!airtableConfigured) {
    return (
      <div className="bg-white rounded-xl border border-[#EDEADE] p-8 space-y-4">
        <h2 className="font-display text-xl font-medium text-[#444343]">
          {t.admin.common.awaitingConfigTitle}
        </h2>
        <p className="text-sm text-[#6B6668] max-w-2xl leading-relaxed">
          {t.admin.common.awaitingConfigDesc}
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={onGoToSettings}
            className="px-5 py-2.5 rounded-lg bg-[#444343] text-white text-sm font-medium hover:bg-[#5B9D3F] transition-colors cursor-pointer"
          >
            {t.admin.nav.settings}
          </button>
        </div>
      </div>
    );
  }

  const kpiCards = [
    { label: t.admin.kpis.totalAppointments, value: metrics?.totalAppointments ?? 0 },
    { label: t.admin.kpis.newRequests, value: metrics?.newRequests ?? 0 },
    { label: t.admin.kpis.pendingConfirmations, value: metrics?.pendingConfirmations ?? 0 },
    { label: t.admin.kpis.confirmed, value: metrics?.confirmedAppointments ?? 0 },
    { label: t.admin.kpis.today, value: metrics?.todaysAppointments ?? 0 },
    { label: t.admin.kpis.upcoming, value: metrics?.upcomingAppointments ?? 0 },
    { label: t.admin.kpis.completed, value: metrics?.completedAppointments ?? 0 },
    { label: t.admin.kpis.cancelled, value: metrics?.cancelledAppointments ?? 0 },
    { label: t.admin.kpis.totalClients, value: metrics?.totalClients ?? 0 },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Grid (Real Airtable counts) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-[#EDEADE] p-4 space-y-1.5"
          >
            <div className="text-xs text-[#6B6668] truncate">{card.label}</div>
            <div className="font-display text-2xl font-medium text-[#444343] tabular-nums">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white rounded-xl border border-[#EDEADE] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm font-medium text-[#444343]">
          {t.admin.nav.reports} · {filteredAppointments.length}{' '}
          {t.admin.nav.appointments.toLowerCase()}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2 text-xs text-[#6B6668]">
            <span>{t.admin.common.dateFrom}</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-[#EDEADE] text-[#444343] tabular-nums"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-[#6B6668]">
            <span>{t.admin.common.dateTo}</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-[#EDEADE] text-[#444343] tabular-nums"
            />
          </label>
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="text-xs text-[#5B9D3F] hover:underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Real Data Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Demand Bar Chart */}
        <div className="bg-white rounded-xl border border-[#EDEADE] p-6 space-y-4">
          <h3 className="font-display text-base font-medium text-[#444343]">
            {t.admin.nav.services}
          </h3>
          {serviceBreakdown.length === 0 ? (
            <p className="text-sm text-[#6B6668]">{t.admin.common.noRecords}</p>
          ) : (
            <div className="space-y-3.5">
              {serviceBreakdown.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#444343] font-medium">{item.name}</span>
                    <span className="font-mono-tabular text-[#6B6668]">{item.count}</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[#F6F2E9] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#5B9D3F] transition-all"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-xl border border-[#EDEADE] p-6 space-y-4">
          <h3 className="font-display text-base font-medium text-[#444343]">
            {t.admin.common.filterStatus}
          </h3>
          <div className="space-y-3">
            {statusBreakdown.map((row) => (
              <div key={row.status} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#444343]">{row.label}</span>
                  <span className="font-mono-tabular text-[#6B6668]">
                    {row.count} ({row.pct}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#F6F2E9] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#AFC9A3]"
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="bg-white rounded-xl border border-[#EDEADE] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#EDEADE] flex items-center justify-between">
          <h3 className="font-display text-base font-medium text-[#444343]">
            {t.admin.nav.appointments}
          </h3>
        </div>
        {loadError && filteredAppointments.length === 0 ? (
          <div className="p-8 text-center text-sm text-red-800">{loadError}</div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#6B6668]">
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
                  <th className="px-4 py-3 text-start font-medium">Date</th>
                  <th className="px-4 py-3 text-start font-medium">{t.admin.common.filterStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEADE]">
                {filteredAppointments.slice(0, 8).map((appt) => (
                  <tr
                    key={appt.id}
                    onClick={() => onOpenAppointment(appt)}
                    className="hover:bg-[#F6F2E9]/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono-tabular text-xs text-[#444343]">
                      {appt.bookingReference}
                    </td>
                    <td className="px-4 py-3 font-medium text-[#444343]">
                      {appt.clientName || '—'}
                    </td>
                    <td className="px-4 py-3 text-[#6B6668]">{appt.serviceName || '—'}</td>
                    <td className="px-4 py-3 font-mono-tabular text-xs text-[#6B6668]">
                      {appt.preferredDate} · {appt.preferredTime}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-[#444343]">
                      {t.statuses[appt.status]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
