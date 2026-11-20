import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bell,
  BriefcaseMedical,
  Calendar,
  CalendarCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Settings,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import type {
  ActivityLogRecord,
  AdminUserRecord,
  AppointmentRecord,
  AuthSessionUser,
  ClinicPublicSettings,
  ClinicService,
  ClientRecord,
  IntegrationStatus,
  NotificationRecord,
  StaffMember,
} from '../../../shared/types.ts';
import { useLanguage } from '../../i18n/LanguageContext.tsx';
import { EmieLogo } from '../EmieLogo.tsx';
import { LanguageSwitcher } from '../LanguageSwitcher.tsx';
import { AdminOverview } from './AdminOverview.tsx';
import { AppointmentsModule } from './AppointmentsModule.tsx';
import { CalendarModule } from './CalendarModule.tsx';
import {
  ClientsModule,
  ServicesModule,
  StaffModule,
} from './ClientsServicesStaff.tsx';
import {
  NotificationsModule,
  ReportsModule,
  SettingsModule,
} from './NotificationsReportsSettings.tsx';

type AdminTab =
  | 'overview'
  | 'appointments'
  | 'calendar'
  | 'clients'
  | 'services'
  | 'staff'
  | 'notifications'
  | 'reports'
  | 'settings';

interface AdminDashboardProps {
  user: AuthSessionUser;
  integrations: IntegrationStatus;
  initialSettings: ClinicPublicSettings;
  onLogout: () => Promise<void>;
  onUnauthorized: (message?: string) => void;
  onBackToPublic: () => void;
  onSettingsChanged: () => Promise<void>;
}

export function AdminDashboard({
  user,
  integrations,
  initialSettings,
  onLogout,
  onUnauthorized,
  onBackToPublic,
  onSettingsChanged,
}: AdminDashboardProps) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [liveIntegrations, setLiveIntegrations] =
    useState<IntegrationStatus>(integrations);
  const [airtableConfigured, setAirtableConfigured] = useState(
    integrations.airtableConfigured,
  );
  const [metrics, setMetrics] = useState<{
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
  } | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [services, setServices] = useState<ClinicService[]>([]);
  const [servicesFromAirtable, setServicesFromAirtable] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRecord[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([]);
  const [settings, setSettings] = useState<ClinicPublicSettings>(initialSettings);
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentRecord | null>(null);

  const loadAll = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = Boolean(options?.silent);
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const fetchOpts: RequestInit = {
        credentials: 'same-origin',
        cache: 'no-store',
      };

      try {
        const [ovRes, clRes, srvRes, stfRes, ntfRes, setRes] = await Promise.all([
          fetch('/api/admin/overview', fetchOpts),
          fetch('/api/admin/clients', fetchOpts),
          fetch('/api/admin/services', fetchOpts),
          fetch('/api/admin/staff', fetchOpts),
          fetch('/api/admin/notifications', fetchOpts),
          fetch('/api/admin/settings', fetchOpts),
        ]);

        const responses = [ovRes, clRes, srvRes, stfRes, ntfRes, setRes];
        if (responses.some((r) => r.status === 401)) {
          onUnauthorized(t.admin.errors.sessionExpired);
          return;
        }

        const errors: string[] = [];

        if (ovRes.ok) {
          const ov = (await ovRes.json()) as {
            airtableConfigured: boolean;
            integrations?: IntegrationStatus;
            metrics: typeof metrics;
            appointments: AppointmentRecord[];
          };
          setAirtableConfigured(ov.airtableConfigured);
          if (ov.integrations) setLiveIntegrations(ov.integrations);
          setMetrics(ov.metrics);
          setAppointments(ov.appointments || []);
          setAppointmentsError(null);
        } else {
          const errBody = (await ovRes.json().catch(() => ({}))) as { error?: string };
          const msg = errBody.error || `${t.admin.errors.loadFailed} (HTTP ${ovRes.status})`;
          errors.push(msg);
          setAppointmentsError(msg);
        }

        if (clRes.ok) {
          const cl = (await clRes.json()) as { clients: ClientRecord[] };
          setClients(cl.clients || []);
        } else {
          const errBody = (await clRes.json().catch(() => ({}))) as { error?: string };
          errors.push(errBody.error || `Clients error (HTTP ${clRes.status})`);
        }

        if (srvRes.ok) {
          const srv = (await srvRes.json()) as {
            services: ClinicService[];
            fromAirtable: boolean;
          };
          setServices(srv.services || []);
          setServicesFromAirtable(Boolean(srv.fromAirtable));
        }

        if (stfRes.ok) {
          const stf = (await stfRes.json()) as { staff: StaffMember[] };
          setStaff(stf.staff || []);
        }

        if (ntfRes.ok) {
          const ntf = (await ntfRes.json()) as { notifications: NotificationRecord[] };
          setNotifications(ntf.notifications || []);
        }

        if (setRes.ok) {
          const sData = (await setRes.json()) as { settings: ClinicPublicSettings };
          if (sData.settings) setSettings(sData.settings);
        }

        if (user.role !== 'Staff') {
          const logRes = await fetch('/api/admin/activity-logs', fetchOpts);
          if (logRes.status === 401) {
            onUnauthorized(t.admin.errors.sessionExpired);
            return;
          }
          if (logRes.ok) {
            const logData = (await logRes.json()) as { logs: ActivityLogRecord[] };
            setActivityLogs(logData.logs || []);
          }
        }

        if (user.role === 'Super Admin') {
          const usrRes = await fetch('/api/admin/users', fetchOpts);
          if (usrRes.status === 401) {
            onUnauthorized(t.admin.errors.sessionExpired);
            return;
          }
          if (usrRes.ok) {
            const usrData = (await usrRes.json()) as { users: AdminUserRecord[] };
            setAdminUsers(usrData.users || []);
          }
        }

        setLoadError(errors.length > 0 ? errors[0] : null);
      } catch {
        setLoadError(t.admin.errors.loadFailed);
        setAppointmentsError(t.admin.errors.loadFailed);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [onUnauthorized, t.admin.errors.loadFailed, t.admin.errors.sessionExpired, user.role],
  );

  const refreshAppointments = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/appointments', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (res.status === 401) {
        onUnauthorized(t.admin.errors.sessionExpired);
        return;
      }
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        const msg = errBody.error || `${t.admin.errors.loadFailed} (HTTP ${res.status})`;
        setAppointmentsError(msg);
        setLoadError(msg);
        return;
      }
      const data = (await res.json()) as {
        airtableConfigured: boolean;
        appointments: AppointmentRecord[];
      };
      setAirtableConfigured(data.airtableConfigured);
      setAppointments(data.appointments || []);
      setAppointmentsError(null);
      setLoadError(null);
      // Keep overview KPIs, clients, and notifications in sync as well
      void loadAll({ silent: true });
    } catch {
      setAppointmentsError(t.admin.errors.loadFailed);
      setLoadError(t.admin.errors.loadFailed);
    } finally {
      setRefreshing(false);
    }
  }, [loadAll, onUnauthorized, t.admin.errors.loadFailed, t.admin.errors.sessionExpired]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const navItems: Array<{
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'overview', label: t.admin.nav.overview, icon: LayoutDashboard },
    { id: 'appointments', label: t.admin.nav.appointments, icon: CalendarCheck },
    { id: 'calendar', label: t.admin.nav.calendar, icon: Calendar },
    { id: 'clients', label: t.admin.nav.clients, icon: Users },
    { id: 'services', label: t.admin.nav.services, icon: BriefcaseMedical },
    { id: 'staff', label: t.admin.nav.staff, icon: UserCheck },
    {
      id: 'notifications',
      label: t.admin.nav.notifications,
      icon: Bell,
      badge: metrics?.unreadNotifications || 0,
    },
    ...(user.role !== 'Staff'
      ? [{ id: 'reports' as AdminTab, label: t.admin.nav.reports, icon: BarChart3 }]
      : []),
    { id: 'settings', label: t.admin.nav.settings, icon: Settings },
  ];

  const openAppointmentFromAnywhere = (appt: AppointmentRecord) => {
    setSelectedAppointment(appt);
    setTab('appointments');
  };

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 start-0 z-50 w-64 bg-white border-e border-[#EDEADE] flex flex-col justify-between overflow-y-auto transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'
        }`}
      >
        <div>
          <div className="h-16 px-5 border-b border-[#EDEADE] flex items-center justify-between">
            <EmieLogo compact />
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 text-[#6B6668]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id);
                    setSidebarOpen(false);
                    if (item.id === 'appointments') {
                      void refreshAppointments();
                    } else {
                      void loadAll({ silent: true });
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#F6F2E9] text-[#444343]'
                      : 'text-[#6B6668] hover:text-[#444343] hover:bg-[#F9F9F9]'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${active ? 'text-[#5B9D3F]' : 'text-[#6B6668]'}`}
                    />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </span>
                  {item.badge ? (
                    <span className="font-mono-tabular text-xs text-[#5B9D3F]">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-[#EDEADE] space-y-3">
          <div className="text-xs">
            <div className="font-medium text-[#444343] truncate">{user.fullName}</div>
            <div className="text-[#6B6668] truncate">{user.role}</div>
          </div>
          <div className="flex flex-col gap-2">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                setSidebarOpen(false);
                onBackToPublic();
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-[#EDEADE] text-xs font-medium text-[#444343] hover:border-[#5B9D3F] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t.admin.backToWebsite}
            </a>
            <button
              type="button"
              onClick={onLogout}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#444343] text-white text-xs font-medium hover:bg-red-700 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t.admin.logout}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-[#EDEADE] px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-[#EDEADE] text-[#444343]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm text-[#6B6668] flex items-center gap-2">
              <span className="hidden sm:inline">EMIE CLINIC</span>
              <span className="hidden sm:inline">/</span>
              <span className="font-medium text-[#444343]">
                {navItems.find((n) => n.id === tab)?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                setSidebarOpen(false);
                onBackToPublic();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EDEADE] text-xs font-medium text-[#444343] hover:border-[#5B9D3F] hover:text-[#5B9D3F] transition-colors whitespace-nowrap cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t.admin.backToWebsite}</span>
            </a>
            <LanguageSwitcher variant="subtle" />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-5">
          {loadError && !loading && (
            <div
              role="alert"
              className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-900 flex flex-wrap items-center justify-between gap-3"
            >
              <span className="inline-flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{loadError}</span>
              </span>
              <button
                type="button"
                disabled={refreshing}
                onClick={() => void loadAll({ silent: true })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-red-200 text-xs font-medium text-red-900 hover:bg-red-100 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                {t.admin.common.retry}
              </button>
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-xl border border-[#EDEADE] p-10 text-center text-sm text-[#6B6668]">
              {t.admin.common.loading}
            </div>
          ) : (
            <>
              {tab === 'overview' && (
                <AdminOverview
                  airtableConfigured={airtableConfigured}
                  metrics={metrics}
                  appointments={appointments}
                  services={services}
                  loadError={loadError}
                  onOpenAppointment={openAppointmentFromAnywhere}
                  onGoToSettings={() => setTab('settings')}
                />
              )}

              {tab === 'appointments' && (
                <AppointmentsModule
                  airtableConfigured={airtableConfigured}
                  appointments={appointments}
                  services={services}
                  staff={staff}
                  userRole={user.role}
                  allowAdminDeleteAppointments={settings.allowAdminDeleteAppointments}
                  selectedAppointment={selectedAppointment}
                  onSelectAppointment={setSelectedAppointment}
                  onRefresh={refreshAppointments}
                  refreshing={refreshing}
                  loadError={appointmentsError}
                />
              )}

              {tab === 'calendar' && (
                <CalendarModule
                  airtableConfigured={airtableConfigured}
                  appointments={appointments}
                  services={services}
                  onOpenAppointment={openAppointmentFromAnywhere}
                />
              )}

              {tab === 'clients' && (
                <ClientsModule
                  airtableConfigured={airtableConfigured}
                  clients={clients}
                  appointments={appointments}
                  userRole={user.role}
                  onRefresh={loadAll}
                  onOpenAppointment={openAppointmentFromAnywhere}
                />
              )}

              {tab === 'services' && (
                <ServicesModule
                  airtableConfigured={airtableConfigured}
                  fromAirtable={servicesFromAirtable}
                  services={services}
                  userRole={user.role}
                  onRefresh={async () => {
                    await loadAll();
                    await onSettingsChanged();
                  }}
                />
              )}

              {tab === 'staff' && (
                <StaffModule
                  airtableConfigured={airtableConfigured}
                  staff={staff}
                  services={services}
                  appointments={appointments}
                  userRole={user.role}
                  onRefresh={loadAll}
                />
              )}

              {tab === 'notifications' && (
                <NotificationsModule
                  airtableConfigured={airtableConfigured}
                  notifications={notifications}
                  onRefresh={loadAll}
                />
              )}

              {tab === 'reports' && (
                <ReportsModule
                  airtableConfigured={airtableConfigured}
                  appointments={appointments}
                  clients={clients}
                  services={services}
                />
              )}

              {tab === 'settings' && (
                <SettingsModule
                  settings={settings}
                  integrations={liveIntegrations}
                  userRole={user.role}
                  adminUsers={adminUsers}
                  activityLogs={activityLogs}
                  onRefresh={async () => {
                    await loadAll();
                    await onSettingsChanged();
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
