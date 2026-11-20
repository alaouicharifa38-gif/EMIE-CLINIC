import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  APPOINTMENT_STATUSES,
  type AppointmentRecord,
  type ClinicService,
} from '../../../shared/types.ts';
import { useLanguage } from '../../i18n/LanguageContext.tsx';

interface CalendarModuleProps {
  airtableConfigured: boolean;
  appointments: AppointmentRecord[];
  services: ClinicService[];
  onOpenAppointment: (appt: AppointmentRecord) => void;
}

type CalendarView = 'day' | 'week' | 'month';

function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function CalendarModule({
  airtableConfigured,
  appointments,
  services,
  onOpenAppointment,
}: CalendarModuleProps) {
  const { t, isRtl } = useLanguage();
  const [view, setView] = useState<CalendarView>('week');
  const [cursorDate, setCursorDate] = useState<Date>(() => new Date());
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      if (serviceFilter !== 'ALL' && a.serviceId !== serviceFilter) return false;
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
      return true;
    });
  }, [appointments, serviceFilter, statusFilter]);

  const byDate = useMemo(() => {
    const map = new Map<string, AppointmentRecord[]>();
    for (const appt of filtered) {
      if (!appt.preferredDate) continue;
      const list = map.get(appt.preferredDate) || [];
      list.push(appt);
      map.set(appt.preferredDate, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.preferredTime.localeCompare(b.preferredTime));
    }
    return map;
  }, [filtered]);

  const shiftCursor = (dir: number) => {
    const next = new Date(cursorDate);
    if (view === 'day') next.setDate(next.getDate() + dir);
    else if (view === 'week') next.setDate(next.getDate() + dir * 7);
    else next.setMonth(next.getMonth() + dir);
    setCursorDate(next);
  };

  const weekDays = useMemo(() => {
    const start = new Date(cursorDate);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday start
    start.setDate(start.getDate() + diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursorDate]);

  const monthCells = useMemo(() => {
    const year = cursorDate.getFullYear();
    const month = cursorDate.getMonth();
    const first = new Date(year, month, 1);
    const startDay = first.getDay() === 0 ? 6 : first.getDay() - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<Date | null> = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [cursorDate]);

  if (!airtableConfigured) {
    return (
      <div className="bg-white rounded-xl border border-[#EDEADE] p-8 text-sm text-[#6B6668]">
        {t.admin.common.awaitingConfigDesc}
      </div>
    );
  }

  const PrevIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;
  const cursorIso = formatIsoDate(cursorDate);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-[#EDEADE] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftCursor(-1)}
            className="p-2 rounded-lg border border-[#EDEADE] text-[#444343] hover:border-[#5B9D3F] cursor-pointer"
          >
            <PrevIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCursorDate(new Date())}
            className="px-3 py-1.5 rounded-lg border border-[#EDEADE] text-xs font-medium text-[#444343] hover:border-[#5B9D3F] cursor-pointer"
          >
            {t.admin.kpis.today}
          </button>
          <button
            type="button"
            onClick={() => shiftCursor(1)}
            className="p-2 rounded-lg border border-[#EDEADE] text-[#444343] hover:border-[#5B9D3F] cursor-pointer"
          >
            <NextIcon className="w-4 h-4" />
          </button>
          <span className="font-mono-tabular text-sm font-medium text-[#444343] ps-2">
            {view === 'month'
              ? `${cursorDate.getFullYear()}-${String(cursorDate.getMonth() + 1).padStart(2, '0')}`
              : cursorIso}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[#EDEADE] text-xs bg-white text-[#444343]"
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

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[#EDEADE] text-xs bg-white text-[#444343]"
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

          <div className="inline-flex p-0.5 rounded-lg bg-[#F6F2E9] border border-[#EDEADE]">
            {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize cursor-pointer ${
                  view === v ? 'bg-white text-[#444343] shadow-xs' : 'text-[#6B6668]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Day View */}
      {view === 'day' && (
        <div className="bg-white rounded-xl border border-[#EDEADE] divide-y divide-[#EDEADE]">
          {(byDate.get(cursorIso) || []).length === 0 ? (
            <div className="p-8 text-center text-sm text-[#6B6668]">
              {t.admin.common.noRecords}
            </div>
          ) : (
            (byDate.get(cursorIso) || []).map((appt) => (
              <button
                key={appt.id}
                type="button"
                onClick={() => onOpenAppointment(appt)}
                className="w-full text-start p-4 hover:bg-[#F6F2E9]/50 flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono-tabular text-sm font-medium text-[#5B9D3F]">
                    {appt.preferredTime}
                  </span>
                  <div>
                    <div className="font-medium text-[#444343]">{appt.clientName}</div>
                    <div className="text-xs text-[#6B6668]">
                      {appt.serviceName} · {appt.bookingReference}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-medium text-[#444343]">
                  {t.statuses[appt.status]}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Week View */}
      {view === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((d) => {
            const iso = formatIsoDate(d);
            const list = byDate.get(iso) || [];
            return (
              <div
                key={iso}
                className="bg-white rounded-xl border border-[#EDEADE] p-3 min-h-[220px] flex flex-col gap-2"
              >
                <div className="pb-2 border-b border-[#EDEADE] flex items-center justify-between text-xs">
                  <span className="font-medium text-[#444343]">
                    {d.toLocaleDateString(undefined, { weekday: 'short' })}
                  </span>
                  <span className="font-mono-tabular text-[#6B6668]">{iso.slice(5)}</span>
                </div>
                <div className="space-y-2 flex-1">
                  {list.map((appt) => (
                    <button
                      key={appt.id}
                      type="button"
                      onClick={() => onOpenAppointment(appt)}
                      className="w-full text-start p-2 rounded-lg border border-[#EDEADE] bg-[#F9F9F9] hover:border-[#5B9D3F] text-xs space-y-0.5 cursor-pointer"
                    >
                      <div className="font-mono-tabular font-medium text-[#5B9D3F]">
                        {appt.preferredTime}
                      </div>
                      <div className="font-medium text-[#444343] truncate">
                        {appt.clientName}
                      </div>
                      <div className="text-[11px] text-[#6B6668] truncate">
                        {t.statuses[appt.status]}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Month View */}
      {view === 'month' && (
        <div className="bg-white rounded-xl border border-[#EDEADE] p-4">
          <div className="grid grid-cols-7 gap-2">
            {monthCells.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} className="min-h-[88px] rounded-lg bg-[#F9F9F9]/50" />;
              }
              const iso = formatIsoDate(cell);
              const list = byDate.get(iso) || [];
              return (
                <div
                  key={iso}
                  className="min-h-[88px] rounded-lg border border-[#EDEADE] p-2 space-y-1"
                >
                  <div className="font-mono-tabular text-xs text-[#6B6668]">
                    {cell.getDate()}
                  </div>
                  {list.slice(0, 3).map((appt) => (
                    <button
                      key={appt.id}
                      type="button"
                      onClick={() => onOpenAppointment(appt)}
                      className="w-full text-start px-1.5 py-0.5 rounded bg-[#F6F2E9] text-[11px] text-[#444343] truncate hover:bg-[#AFC9A3]/40 cursor-pointer"
                    >
                      {appt.preferredTime} {appt.clientName}
                    </button>
                  ))}
                  {list.length > 3 && (
                    <div className="text-[10px] text-[#5B9D3F] font-medium">
                      +{list.length - 3}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
