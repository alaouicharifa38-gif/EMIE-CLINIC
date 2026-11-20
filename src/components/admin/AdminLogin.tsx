import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import type { AuthSessionUser, IntegrationStatus } from '../../../shared/types.ts';
import { useLanguage } from '../../i18n/LanguageContext.tsx';
import { EmieLogo } from '../EmieLogo.tsx';
import { LanguageSwitcher } from '../LanguageSwitcher.tsx';

interface AdminLoginProps {
  integrations: IntegrationStatus;
  sessionNotice?: string | null;
  onSuccess: (user: AuthSessionUser) => void;
  onBackToPublic: () => void;
}

export function AdminLogin({
  integrations,
  sessionNotice,
  onSuccess,
  onBackToPublic,
}: AdminLoginProps) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'login' | 'setup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyCookieSession = async (): Promise<AuthSessionUser | null> => {
    const statusRes = await fetch('/api/auth/status', {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (!statusRes.ok) return null;
    const statusData = (await statusRes.json().catch(() => ({}))) as {
      authenticated?: boolean;
      user?: AuthSessionUser | null;
    };
    if (statusData.authenticated && statusData.user) {
      return statusData.user;
    }
    return null;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        user?: AuthSessionUser;
        error?: string;
      };
      if (!res.ok || !data.user) {
        setError(data.error || 'Authentication failed.');
        return;
      }

      const verifiedUser = await verifyCookieSession();
      if (!verifiedUser) {
        setError(t.admin.errors.cookieBlocked);
        return;
      }

      onSuccess(verifiedUser);
    } catch {
      setError('Unable to reach authentication server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupToken, fullName, email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        user?: AuthSessionUser;
        error?: string;
      };
      if (!res.ok || !data.user) {
        setError(data.error || 'Super Admin setup failed.');
        return;
      }

      const verifiedUser = await verifyCookieSession();
      if (!verifiedUser) {
        setError(t.admin.errors.cookieBlocked);
        return;
      }

      onSuccess(verifiedUser);
    } catch {
      setError('Unable to complete setup.');
    } finally {
      setLoading(false);
    }
  };

  const displayedError = error || sessionNotice;

  return (
    <div className="min-h-screen bg-[#F6F2E9] flex flex-col justify-between p-4 sm:p-8">
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between gap-4">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onBackToPublic();
          }}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#444343] hover:text-[#5B9D3F] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.admin.backToWebsite}
        </a>
        <LanguageSwitcher />
      </div>

      <div className="max-w-md w-full mx-auto my-8 space-y-6">
        <div className="bg-white rounded-xl border border-[#EDEADE] p-7 sm:p-8 space-y-6">
          <div className="space-y-2">
            <EmieLogo compact />
            <h1 className="font-display text-2xl font-normal text-[#444343] pt-2">
              {mode === 'login' ? t.admin.loginTitle : t.admin.setupTitle}
            </h1>
            <p className="text-sm text-[#6B6668]">
              {mode === 'login' ? t.admin.loginSubtitle : t.admin.setupSubtitle}
            </p>
          </div>

          {displayedError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-900 text-sm"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{displayedError}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[#6B6668] mb-1.5">
                  {t.admin.email}
                </label>
                <input
                  type="email"
                  required
                  dir="ltr"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDEADE] text-sm text-[#444343] focus:outline-none focus:border-[#5B9D3F]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[#6B6668] mb-1.5">
                  {t.admin.password}
                </label>
                <input
                  type="password"
                  required
                  dir="ltr"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDEADE] text-sm text-[#444343] focus:outline-none focus:border-[#5B9D3F]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-[#444343] text-white text-sm font-medium hover:bg-[#5B9D3F] disabled:opacity-60 transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                {loading ? t.admin.signingIn : t.admin.signIn}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[#6B6668] mb-1.5">
                  {t.admin.setupToken}
                </label>
                <input
                  type="password"
                  required
                  dir="ltr"
                  value={setupToken}
                  onChange={(e) => setSetupToken(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDEADE] text-sm text-[#444343] focus:outline-none focus:border-[#5B9D3F]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[#6B6668] mb-1.5">
                  {t.admin.fullName}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDEADE] text-sm text-[#444343] focus:outline-none focus:border-[#5B9D3F]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[#6B6668] mb-1.5">
                  {t.admin.email}
                </label>
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDEADE] text-sm text-[#444343] focus:outline-none focus:border-[#5B9D3F]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[#6B6668] mb-1.5">
                  {t.admin.password} (min. 8)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDEADE] text-sm text-[#444343] focus:outline-none focus:border-[#5B9D3F]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-[#5B9D3F] text-white text-sm font-medium hover:bg-[#4c8734] disabled:opacity-60 transition-colors cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                {t.admin.createSuperAdmin}
              </button>
            </form>
          )}

          {integrations.setupTokenConfigured && (
            <div className="pt-4 border-t border-[#EDEADE] text-center">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode(mode === 'login' ? 'setup' : 'login');
                }}
                className="text-xs font-medium text-[#5B9D3F] hover:underline cursor-pointer"
              >
                {mode === 'login' ? t.admin.setupTitle : t.admin.signIn}
              </button>
            </div>
          )}
        </div>

        {/* Honest Environment Configuration Readiness Summary */}
        <div className="bg-white rounded-xl border border-[#EDEADE] p-5 space-y-3 text-xs">
          <div className="font-medium text-[#444343] flex items-center gap-2">
            {integrations.airtableConfigured && integrations.superAdminConfigured ? (
              <CheckCircle2 className="w-4 h-4 text-[#5B9D3F]" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-amber-600" />
            )}
            <span>Server Integration Readiness</span>
          </div>
          <div className="space-y-1.5 text-[#6B6668]">
            <div className="flex items-center justify-between gap-2">
              <span>Airtable Database</span>
              <span
                className={
                  integrations.airtableDiagnosticCode === 'connected'
                    ? 'text-[#5B9D3F] font-medium'
                    : integrations.airtableConfigured
                    ? 'text-amber-700 font-medium'
                    : 'text-red-700 font-medium'
                }
              >
                {integrations.airtableDiagnosticCode === 'connected'
                  ? `${t.admin.diagnostics.connected} (${integrations.airtableBaseIdMasked})`
                  : t.admin.diagnostics[integrations.airtableDiagnosticCode]}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Make.com Webhook</span>
              <span
                className={
                  integrations.makeConfigured
                    ? 'text-[#5B9D3F] font-medium'
                    : 'text-amber-700 font-medium'
                }
              >
                {integrations.makeConfigured ? 'Configured' : 'Awaiting Configuration'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Super Admin Env Auth</span>
              <span
                className={
                  integrations.superAdminConfigured || integrations.setupTokenConfigured
                    ? 'text-[#5B9D3F] font-medium'
                    : 'text-amber-700 font-medium'
                }
              >
                {integrations.superAdminConfigured
                  ? 'Configured'
                  : integrations.setupTokenConfigured
                  ? 'Setup Token Ready'
                  : 'Awaiting Configuration'}
              </span>
            </div>
          </div>

          {integrations.missingEnvVars.length > 0 && (
            <div className="pt-2 border-t border-[#EDEADE] text-[11px] text-[#6B6668]">
              <span className="font-medium text-[#444343]">Missing server env vars: </span>
              <span className="font-mono-tabular">
                {integrations.missingEnvVars.join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-[#6B6668]">
        EMIE CLINIC · Casablanca
      </div>
    </div>
  );
}
