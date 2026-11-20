import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
} from 'lucide-react';
import {
  CLINIC_TIME_SLOTS,
  type ClinicPublicSettings,
  type ClinicService,
  type Language,
} from '../../shared/types.ts';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import { LanguageSwitcher } from './LanguageSwitcher.tsx';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: ClinicService[];
  settings: ClinicPublicSettings;
  preselectedServiceId?: string;
}

interface BookingFormState {
  serviceId: string;
  fullName: string;
  phone: string;
  email: string;
  preferredLanguage: Language;
  preferredDate: string;
  preferredTime: string;
  alternativeDate: string;
  alternativeTime: string;
  message: string;
  consentAccepted: boolean;
}

const TIME_SLOTS = [...CLINIC_TIME_SLOTS];

function createToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function BookingModal({
  isOpen,
  onClose,
  services,
  settings,
  preselectedServiceId,
}: BookingModalProps) {
  const { language, t, isRtl } = useLanguage();
  const [step, setStep] = useState<number>(0); // 0..4 (Steps 1..5)
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submissionToken, setSubmissionToken] = useState<string>(() => createToken());
  const [unavailableTimes, setUnavailableTimes] = useState<string[]>([]);
  const [altUnavailableTimes, setAltUnavailableTimes] = useState<string[]>([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    bookingReference: string;
    serviceName: string;
    preferredDate: string;
    preferredTime: string;
  } | null>(null);

  const [form, setForm] = useState<BookingFormState>({
    serviceId: preselectedServiceId || '',
    fullName: '',
    phone: '',
    email: '',
    preferredLanguage: language,
    preferredDate: '',
    preferredTime: '',
    alternativeDate: '',
    alternativeTime: '',
    message: '',
    consentAccepted: false,
  });

  // Preselect service when opened from a specific service card without wiping entered fields
  useEffect(() => {
    if (isOpen && preselectedServiceId) {
      setForm((prev) => ({ ...prev, serviceId: preselectedServiceId }));
    }
  }, [isOpen, preselectedServiceId]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Fetch unavailable confirmed slots for selected date & service
  useEffect(() => {
    if (!isOpen || step !== 2 || !form.preferredDate) {
      setUnavailableTimes([]);
      return;
    }
    let cancelled = false;
    setCheckingAvailability(true);
    const qs = new URLSearchParams({ date: form.preferredDate });
    if (form.serviceId) qs.set('serviceId', form.serviceId);
    fetch(`/api/public/availability?${qs.toString()}`)
      .then((res) => (res.ok ? res.json() : { unavailableTimes: [] }))
      .then((data: { unavailableTimes?: string[] }) => {
        if (cancelled) return;
        const blocked = Array.isArray(data.unavailableTimes) ? data.unavailableTimes : [];
        setUnavailableTimes(blocked);
        if (form.preferredTime && blocked.includes(form.preferredTime)) {
          setForm((p) => ({ ...p, preferredTime: '' }));
          setErrorMessage(t.booking.errors.slotConflict);
        }
      })
      .catch(() => {
        if (!cancelled) setUnavailableTimes([]);
      })
      .finally(() => {
        if (!cancelled) setCheckingAvailability(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, step, form.preferredDate, form.serviceId]);

  // Fetch unavailable confirmed slots for optional alternative date
  useEffect(() => {
    if (!isOpen || step !== 2 || !form.alternativeDate) {
      setAltUnavailableTimes([]);
      return;
    }
    if (form.alternativeDate === form.preferredDate) {
      setAltUnavailableTimes(unavailableTimes);
      return;
    }
    let cancelled = false;
    const qs = new URLSearchParams({ date: form.alternativeDate });
    if (form.serviceId) qs.set('serviceId', form.serviceId);
    fetch(`/api/public/availability?${qs.toString()}`)
      .then((res) => (res.ok ? res.json() : { unavailableTimes: [] }))
      .then((data: { unavailableTimes?: string[] }) => {
        if (cancelled) return;
        const blocked = Array.isArray(data.unavailableTimes) ? data.unavailableTimes : [];
        setAltUnavailableTimes(blocked);
        if (form.alternativeTime && blocked.includes(form.alternativeTime)) {
          setForm((p) => ({ ...p, alternativeTime: '' }));
        }
      })
      .catch(() => {
        if (!cancelled) setAltUnavailableTimes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, step, form.alternativeDate, form.preferredDate, form.serviceId, unavailableTimes]);

  const activeServices = useMemo(
    () => services.filter((s) => s.active).sort((a, b) => a.displayOrder - b.displayOrder),
    [services],
  );

  const getLocalizedServiceName = (service: ClinicService) => {
    const localized = t.servicesSection.officialDescriptions[service.serviceId];
    return localized?.name || service.name;
  };

  const getLocalizedServiceDesc = (service: ClinicService) => {
    const localized = t.servicesSection.officialDescriptions[service.serviceId];
    return localized?.description || service.description;
  };

  const selectedService = activeServices.find(
    (s) => s.id === form.serviceId || s.serviceId === form.serviceId,
  );

  const minDate = useMemo(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }, []);

  const availablePreferredSlots = useMemo(
    () => TIME_SLOTS.filter((slot) => !unavailableTimes.includes(slot)),
    [unavailableTimes],
  );

  const availableAlternativeSlots = useMemo(
    () => TIME_SLOTS.filter((slot) => !altUnavailableTimes.includes(slot)),
    [altUnavailableTimes],
  );

  if (!isOpen) return null;

  const validateStep = (targetStep: number): string | null => {
    if (targetStep === 0) {
      if (!form.serviceId || !selectedService) {
        return t.booking.errors.selectService;
      }
    }
    if (targetStep === 1) {
      if (form.fullName.trim().length < 2) {
        return t.booking.errors.fullNameRequired;
      }
      const cleanedPhone = form.phone.replace(/[\s\-().]/g, '');
      if (!/^\+?\d{8,15}$/.test(cleanedPhone)) {
        return t.booking.errors.phoneInvalid;
      }
      if (settings.requireEmail && !form.email.trim()) {
        return t.booking.errors.emailRequired;
      }
      if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        return t.booking.errors.emailInvalid;
      }
    }
    if (targetStep === 2) {
      if (!form.preferredDate) return t.booking.errors.dateRequired;
      if (!form.preferredTime) return t.booking.errors.timeRequired;
      if (unavailableTimes.includes(form.preferredTime)) return t.booking.errors.slotConflict;
    }
    if (targetStep === 3) {
      if (!form.consentAccepted) return t.booking.errors.consentRequired;
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) {
      setErrorMessage(err);
      return;
    }
    setErrorMessage(null);
    setStep((s) => Math.min(4, s + 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep(3);
    if (err) {
      setErrorMessage(err);
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: form.serviceId,
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          preferredLanguage: form.preferredLanguage,
          preferredDate: form.preferredDate,
          preferredTime: form.preferredTime,
          alternativeDate: form.alternativeDate,
          alternativeTime: form.alternativeTime,
          message: form.message.trim(),
          consentAccepted: form.consentAccepted,
          submissionToken,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        bookingReference?: string;
        serviceName?: string;
        preferredDate?: string;
        preferredTime?: string;
        error?: string;
        code?: string;
      };

      if (!res.ok) {
        if (data.code === 'AIRTABLE_NOT_CONFIGURED') {
          setErrorMessage(t.booking.errors.airtableMissing);
        } else if (data.code === 'SLOT_CONFLICT' || data.code === 'SLOT_UNAVAILABLE') {
          if (form.preferredDate) {
            const qs = new URLSearchParams({ date: form.preferredDate });
            if (form.serviceId) qs.set('serviceId', form.serviceId);
            const availRes = await fetch(`/api/public/availability?${qs.toString()}`).catch(() => null);
            if (availRes?.ok) {
              const availData = (await availRes.json().catch(() => ({}))) as {
                unavailableTimes?: string[];
              };
              const blocked = Array.isArray(availData.unavailableTimes)
                ? availData.unavailableTimes
                : [];
              setUnavailableTimes(blocked);
              if (form.preferredTime && blocked.includes(form.preferredTime)) {
                setForm((p) => ({ ...p, preferredTime: '' }));
              }
            }
          }
          setStep(2);
          setErrorMessage(t.booking.errors.slotConflict);
        } else {
          setErrorMessage(data.error || t.booking.errors.generic);
        }
        return;
      }

      setConfirmation({
        bookingReference: data.bookingReference || '',
        serviceName:
          (selectedService && getLocalizedServiceName(selectedService)) ||
          data.serviceName ||
          '',
        preferredDate: data.preferredDate || form.preferredDate,
        preferredTime: data.preferredTime || form.preferredTime,
      });
      setStep(4);
    } catch {
      setErrorMessage(t.booking.errors.generic);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForNew = () => {
    setForm({
      serviceId: '',
      fullName: '',
      phone: '',
      email: '',
      preferredLanguage: language,
      preferredDate: '',
      preferredTime: '',
      alternativeDate: '',
      alternativeTime: '',
      message: '',
      consentAccepted: false,
    });
    setConfirmation(null);
    setErrorMessage(null);
    setSubmissionToken(createToken());
    setStep(0);
  };

  const NextIcon = isRtl ? ChevronLeft : ChevronRight;
  const BackIcon = isRtl ? ChevronRight : ChevronLeft;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#444343]/55 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-xl border border-[#EDEADE] shadow-xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 bg-[#F6F2E9] border-b border-[#EDEADE]">
          <div>
            <h2
              id="booking-modal-title"
              className="font-display text-xl sm:text-2xl font-normal text-[#444343]"
            >
              {t.booking.title}
            </h2>
            <p className="text-sm text-[#6B6668] mt-1">{t.booking.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher enabledLanguages={settings.enabledLanguages} />
            <button
              type="button"
              onClick={onClose}
              aria-label={t.booking.close}
              className="p-2 rounded-lg text-[#6B6668] hover:text-[#444343] hover:bg-white/70 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stepper */}
        <div className="px-6 py-3.5 border-b border-[#EDEADE] bg-white overflow-x-auto">
          <ol className="flex items-center justify-between gap-2 min-w-[460px]">
            {t.booking.steps.map((label, idx) => {
              const completed = idx < step;
              const current = idx === step;
              return (
                <li key={label} className="flex items-center gap-2 flex-1">
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center shrink-0 tabular-nums transition-colors ${
                      completed
                        ? 'bg-[#5B9D3F] text-white'
                        : current
                        ? 'bg-[#444343] text-white'
                        : 'bg-[#F6F2E9] text-[#6B6668] border border-[#EDEADE]'
                    }`}
                  >
                    {completed ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </span>
                  <span
                    className={`text-xs whitespace-nowrap ${
                      current
                        ? 'font-semibold text-[#444343]'
                        : completed
                        ? 'text-[#5B9D3F] font-medium'
                        : 'text-[#6B6668]'
                    }`}
                  >
                    {label}
                  </span>
                  {idx < 4 && <span className="h-px flex-1 bg-[#EDEADE]" aria-hidden="true" />}
                </li>
              );
            })}
          </ol>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 max-h-[72vh] overflow-y-auto">
          {errorMessage && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-900 text-sm"
            >
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Step 1: Service selection */}
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-[#444343] mb-3">
                {t.booking.selectServicePrompt}
              </p>
              <div className="grid grid-cols-1 gap-3">
                {activeServices.map((service) => {
                  const selected =
                    form.serviceId === service.id || form.serviceId === service.serviceId;
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, serviceId: service.id }));
                        setErrorMessage(null);
                      }}
                      className={`w-full text-start p-4 rounded-lg border transition-colors cursor-pointer flex items-start justify-between gap-4 ${
                        selected
                          ? 'border-[#5B9D3F] bg-[#F6F2E9]/70'
                          : 'border-[#EDEADE] bg-white hover:border-[#AFC9A3]'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-medium text-[#444343]">
                            {getLocalizedServiceName(service)}
                          </span>
                          <span className="text-xs text-[#6B6668] tabular-nums">
                            · {service.durationMinutes} {t.servicesSection.durationUnit}
                          </span>
                        </div>
                        <p className="text-sm text-[#6B6668] leading-relaxed">
                          {getLocalizedServiceDesc(service)}
                        </p>
                      </div>
                      <span
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          selected
                            ? 'border-[#5B9D3F] bg-[#5B9D3F] text-white'
                            : 'border-[#EDEADE]'
                        }`}
                      >
                        {selected && <Check className="w-3 h-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Client information */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#444343] mb-1.5">
                  {t.booking.fullName} *
                </label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDEADE] text-[#444343] text-sm focus:outline-none focus:border-[#5B9D3F]"
                  placeholder="Salma Bennani"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#444343] mb-1.5">
                    {t.booking.phone} *
                  </label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDEADE] text-[#444343] text-sm focus:outline-none focus:border-[#5B9D3F] tabular-nums"
                    placeholder="+212 6XX XX XX XX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#444343] mb-1.5">
                    {t.booking.email}{' '}
                    {!settings.requireEmail && (
                      <span className="text-xs font-normal text-[#6B6668]">
                        ({t.booking.emailOptionalHint})
                      </span>
                    )}
                    {settings.requireEmail && ' *'}
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    required={settings.requireEmail}
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDEADE] text-[#444343] text-sm focus:outline-none focus:border-[#5B9D3F]"
                    placeholder="contact@exemple.ma"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#444343] mb-1.5">
                  {t.booking.preferredLanguage}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'fr', label: 'Français' },
                      { id: 'en', label: 'English' },
                      { id: 'ar', label: 'العربية' },
                    ] as Array<{ id: Language; label: string }>
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setForm((p) => ({ ...p, preferredLanguage: opt.id }))
                      }
                      className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                        form.preferredLanguage === opt.id
                          ? 'bg-[#444343] text-white border-[#444343]'
                          : 'bg-white text-[#444343] border-[#EDEADE] hover:border-[#AFC9A3]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Appointment preferences */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-[#444343] mb-1.5">
                    <Calendar className="w-4 h-4 text-[#5B9D3F]" />
                    {t.booking.preferredDate} *
                  </label>
                  <input
                    type="date"
                    min={minDate}
                    required
                    value={form.preferredDate}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, preferredDate: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDEADE] text-[#444343] text-sm focus:outline-none focus:border-[#5B9D3F] tabular-nums"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-[#444343] mb-1.5">
                    <Clock className="w-4 h-4 text-[#5B9D3F]" />
                    {t.booking.preferredTime} *
                  </label>
                  <select
                    required
                    disabled={Boolean(form.preferredDate && !checkingAvailability && availablePreferredSlots.length === 0)}
                    value={form.preferredTime}
                    onChange={(e) => {
                      setErrorMessage(null);
                      setForm((p) => ({ ...p, preferredTime: e.target.value }));
                    }}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDEADE] text-[#444343] text-sm bg-white focus:outline-none focus:border-[#5B9D3F] tabular-nums disabled:bg-[#F9F9F9] disabled:text-[#6B6668]"
                  >
                    <option value="">--:--</option>
                    {availablePreferredSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                  {checkingAvailability && (
                    <p className="mt-1 text-[11px] text-[#6B6668]">
                      {t.booking.checkingAvailability}
                    </p>
                  )}
                  {form.preferredDate &&
                    !checkingAvailability &&
                    availablePreferredSlots.length === 0 && (
                      <p className="mt-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                        {t.booking.noSlotsAvailable}
                      </p>
                    )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#EDEADE]/70">
                <div>
                  <label className="block text-sm font-medium text-[#444343] mb-1.5">
                    {t.booking.alternativeDate}{' '}
                    <span className="text-xs font-normal text-[#6B6668]">
                      ({t.booking.optionalLabel})
                    </span>
                  </label>
                  <input
                    type="date"
                    min={minDate}
                    value={form.alternativeDate}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, alternativeDate: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDEADE] text-[#444343] text-sm focus:outline-none focus:border-[#5B9D3F] tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#444343] mb-1.5">
                    {t.booking.alternativeTime}{' '}
                    <span className="text-xs font-normal text-[#6B6668]">
                      ({t.booking.optionalLabel})
                    </span>
                  </label>
                  <select
                    value={form.alternativeTime}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, alternativeTime: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDEADE] text-[#444343] text-sm bg-white focus:outline-none focus:border-[#5B9D3F] tabular-nums"
                  >
                    <option value="">--:--</option>
                    {availableAlternativeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#444343] mb-1.5">
                  {t.booking.message}{' '}
                  <span className="text-xs font-normal text-[#6B6668]">
                    ({t.booking.optionalLabel})
                  </span>
                </label>
                <textarea
                  rows={3}
                  maxLength={800}
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                  placeholder={t.booking.messagePlaceholder}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDEADE] text-[#444343] text-sm focus:outline-none focus:border-[#5B9D3F]"
                />
              </div>
            </div>
          )}

          {/* Step 4: Review & Consent */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-[#444343]">{t.booking.reviewTitle}</h3>
              </div>

              <div className="divide-y divide-[#EDEADE] border border-[#EDEADE] rounded-lg bg-[#F9F9F9]">
                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-[#6B6668]">{t.booking.steps[0]}</div>
                    <div className="font-medium text-[#444343] mt-0.5">
                      {selectedService ? getLocalizedServiceName(selectedService) : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="text-xs font-medium text-[#5B9D3F] hover:underline cursor-pointer"
                  >
                    {t.booking.edit}
                  </button>
                </div>

                <div className="p-4 flex items-start justify-between gap-4">
                  <div className="space-y-1 text-sm">
                    <div className="text-xs text-[#6B6668]">{t.booking.steps[1]}</div>
                    <div className="font-medium text-[#444343]">{form.fullName}</div>
                    <div className="text-[#6B6668] tabular-nums" dir="ltr">
                      {form.phone}
                      {form.email ? ` · ${form.email}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs font-medium text-[#5B9D3F] hover:underline cursor-pointer"
                  >
                    {t.booking.edit}
                  </button>
                </div>

                <div className="p-4 flex items-start justify-between gap-4">
                  <div className="space-y-1 text-sm">
                    <div className="text-xs text-[#6B6668]">{t.booking.steps[2]}</div>
                    <div className="font-medium text-[#444343] tabular-nums">
                      {form.preferredDate} · {form.preferredTime}
                    </div>
                    {(form.alternativeDate || form.alternativeTime) && (
                      <div className="text-xs text-[#6B6668] tabular-nums">
                        {t.booking.alternativeDate}: {form.alternativeDate || '—'}{' '}
                        {form.alternativeTime || ''}
                      </div>
                    )}
                    {form.message && (
                      <p className="text-xs text-[#6B6668] pt-1">{form.message}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-xs font-medium text-[#5B9D3F] hover:underline cursor-pointer"
                  >
                    {t.booking.edit}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[#F6F2E9] border border-[#EDEADE] text-xs text-[#444343] leading-relaxed">
                {t.booking.reviewNotice}
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consentAccepted}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, consentAccepted: e.target.checked }))
                  }
                  className="mt-1 w-4 h-4 accent-[#5B9D3F] rounded"
                />
                <span className="text-xs sm:text-sm text-[#444343] leading-relaxed">
                  {t.booking.consentText}
                </span>
              </label>
            </div>
          )}

          {/* Step 5: Confirmation */}
          {step === 4 && confirmation && (
            <div className="py-4 text-center space-y-5">
              <div className="w-12 h-12 rounded-full bg-[#AFC9A3]/30 text-[#5B9D3F] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-2xl font-normal text-[#444343]">
                  {t.booking.successTitle}
                </h3>
                <p className="text-sm text-[#6B6668] max-w-md mx-auto leading-relaxed">
                  {t.booking.successBody}
                </p>
              </div>

              <div className="max-w-sm mx-auto p-5 rounded-lg bg-[#F6F2E9] border border-[#EDEADE] space-y-2.5 text-sm">
                <div className="text-xs text-[#6B6668]">{t.booking.referenceLabel}</div>
                <div className="font-mono-tabular text-lg font-medium text-[#444343] tracking-wider">
                  {confirmation.bookingReference}
                </div>
                <div className="pt-2 border-t border-[#EDEADE] text-xs text-[#6B6668] flex items-center justify-center gap-2">
                  <span>{confirmation.serviceName}</span>
                  <span>·</span>
                  <span className="tabular-nums">
                    {confirmation.preferredDate} {confirmation.preferredTime}
                  </span>
                </div>
                <div className="text-xs font-medium text-[#5B9D3F]">
                  {t.booking.statusPendingBadge}
                </div>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="mt-6 pt-5 border-t border-[#EDEADE] flex items-center justify-between gap-3">
            {step > 0 && step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setStep((s) => s - 1);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-[#EDEADE] text-sm font-medium text-[#444343] hover:bg-[#F9F9F9] transition-colors cursor-pointer"
              >
                <BackIcon className="w-4 h-4" />
                {t.booking.back}
              </button>
            ) : (
              <div />
            )}

            {step < 3 && (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#444343] text-white text-sm font-medium hover:bg-[#5B9D3F] transition-colors cursor-pointer"
              >
                {t.booking.next}
                <NextIcon className="w-4 h-4" />
              </button>
            )}

            {step === 3 && (
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#5B9D3F] text-white text-sm font-medium hover:bg-[#4c8734] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {submitting ? t.booking.submitting : t.booking.submit}
              </button>
            )}

            {step === 4 && (
              <div className="flex items-center justify-end gap-3 w-full">
                <button
                  type="button"
                  onClick={handleResetForNew}
                  className="px-4 py-2 rounded-lg border border-[#EDEADE] text-sm font-medium text-[#444343] hover:bg-[#F9F9F9] cursor-pointer"
                >
                  {t.booking.newBooking}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-lg bg-[#444343] text-white text-sm font-medium hover:bg-[#5B9D3F] cursor-pointer"
                >
                  {t.booking.close}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
