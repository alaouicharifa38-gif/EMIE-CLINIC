import { useCallback, useEffect, useState } from 'react';
import type {
  AuthSessionUser,
  ClinicPublicSettings,
  ClinicService,
  IntegrationStatus,
} from '../shared/types.ts';
import { LanguageProvider } from './i18n/LanguageContext.tsx';
import { PublicWebsite } from './components/PublicWebsite.tsx';
import { AdminLogin } from './components/admin/AdminLogin.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';

const FALLBACK_SETTINGS: ClinicPublicSettings = {
  clinicName: 'EMIE CLINIC',
  headline: 'ICI, LE CORPS RETROUVE SON HARMONIE.',
  subheadline:
    'Clinique où science et bien-être se rencontrent pour révéler le meilleur de vous-même.',
  specialty: 'Clinique médico-esthétique et kinésithérapie',
  phone: '+212 660 97 98 77',
  address:
    '7ème Etage Prince Bureaux, 217, Boulevard Mohamed Zerktouni, Racine, 22000, Casablanca, Maroc.',
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

const FALLBACK_INTEGRATIONS: IntegrationStatus = {
  airtableConfigured: false,
  airtableTokenPresent: false,
  airtableBaseIdPresent: false,
  airtableBaseIdMasked: null,
  airtableDiagnosticCode: 'not_probed',
  airtableDiagnosticMessage: '',
  makeConfigured: false,
  superAdminConfigured: false,
  setupTokenConfigured: false,
  missingEnvVars: [],
};

function isAdminRoute(): boolean {
  const { pathname, hash } = window.location;
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  const cleanHash = hash.split('?')[0].replace(/\/+$/, '');
  return (
    cleanPath === '/admin' ||
    cleanPath.startsWith('/admin/') ||
    cleanHash === '#/admin' ||
    cleanHash.startsWith('#/admin/')
  );
}

function AppContent() {
  const [adminView, setAdminView] = useState<boolean>(() => isAdminRoute());
  const [settings, setSettings] = useState<ClinicPublicSettings>(FALLBACK_SETTINGS);
  const [services, setServices] = useState<ClinicService[]>([]);
  const [authUser, setAuthUser] = useState<AuthSessionUser | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [integrations, setIntegrations] =
    useState<IntegrationStatus>(FALLBACK_INTEGRATIONS);
  const [bootstrapped, setBootstrapped] = useState(false);

  const loadPublicBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/public/bootstrap');
      if (res.ok) {
        const data = (await res.json()) as {
          settings: ClinicPublicSettings;
          services: ClinicService[];
        };
        if (data.settings) setSettings(data.settings);
        if (Array.isArray(data.services)) setServices(data.services);
      }
    } catch {
      // Keep fallback settings if offline
    }
  }, []);

  const loadAuthStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/status', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (res.ok) {
        const data = (await res.json()) as {
          authenticated: boolean;
          user: AuthSessionUser | null;
          integrations: IntegrationStatus;
        };
        setAuthUser(data.authenticated ? data.user || null : null);
        if (data.integrations) setIntegrations(data.integrations);
      }
    } finally {
      setBootstrapped(true);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadPublicBootstrap(), loadAuthStatus()]);
  }, [loadPublicBootstrap, loadAuthStatus]);

  useEffect(() => {
    const onHashOrPop = () => setAdminView(isAdminRoute());
    window.addEventListener('hashchange', onHashOrPop);
    window.addEventListener('popstate', onHashOrPop);
    return () => {
      window.removeEventListener('hashchange', onHashOrPop);
      window.removeEventListener('popstate', onHashOrPop);
    };
  }, []);

  const goToAdmin = useCallback(() => {
    const targetAdminUrl = `/admin${window.location.search}`;
    try {
      window.history.pushState({ view: 'admin' }, '', targetAdminUrl);
    } catch {
      window.location.hash = '#/admin';
    }
    setAdminView(true);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const goToPublic = useCallback(() => {
    const targetPublicUrl = `/${window.location.search}`;
    try {
      window.history.pushState({ view: 'public' }, '', targetPublicUrl);
      if (window.location.hash) {
        window.history.replaceState({ view: 'public' }, '', targetPublicUrl);
      }
    } catch {
      if (window.location.hash) {
        window.location.hash = '';
      }
    }
    setAdminView(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
    });
    setAuthUser(null);
    setAuthNotice(null);
  };

  const handleUnauthorized = useCallback((message?: string) => {
    setAuthUser(null);
    setAuthNotice(message || null);
  }, []);

  if (adminView) {
    if (!bootstrapped) {
      return (
        <div className="min-h-screen bg-[#F6F2E9] flex items-center justify-center text-sm text-[#6B6668]">
          EMIE CLINIC...
        </div>
      );
    }
    if (!authUser) {
      return (
        <AdminLogin
          integrations={integrations}
          sessionNotice={authNotice}
          onSuccess={(user) => {
            setAuthNotice(null);
            setAuthUser(user);
          }}
          onBackToPublic={goToPublic}
        />
      );
    }
    return (
      <AdminDashboard
        user={authUser}
        integrations={integrations}
        initialSettings={settings}
        onLogout={handleLogout}
        onUnauthorized={handleUnauthorized}
        onBackToPublic={goToPublic}
        onSettingsChanged={loadPublicBootstrap}
      />
    );
  }

  return (
    <PublicWebsite
      settings={settings}
      services={services}
      onNavigateAdmin={goToAdmin}
    />
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
