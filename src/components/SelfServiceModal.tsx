import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  UserCheck,
  X,
} from 'lucide-react';
import {
  CLINIC_TIME_SLOTS,
  type AppointmentStatus,
  type SelfServiceLookupResponse,
} from '../../shared/types.ts';
import { useLanguage } from '../i18n/LanguageContext.tsx';

interface SelfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_BADGE_CLASSES: Record<AppointmentStatus, string> = {
  'New Request': 'bg-amber-50 text-amber-800 border-amber-200',
  'Pending Confirmation': 'bg-amber-50 text-amber-800 border-amber-200',
  Confirmed: 'bg-[#AFC9A3]/25 text-[#376325] border-[#AFC9A3]',
  Rescheduled: 'bg-sky-50 text-sky-800 border-sky-200',
  Completed: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-red-50 text-red-800 border-red-200',
  'No Show': 'bg-zinc-100 text-zinc-700 border-zinc-200',
};

function getTodayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Casablanca',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function SelfServiceModal({ isOpen, onClose }: SelfServiceModalProps) {
  const { t, isRtl } = useLanguage();
  const [bookingReference, setBookingReference] = useState('');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingSlots, setCheckingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<SelfServiceLookupResponse | null>(null);

  const [mode, setMode] = useState<'modify' | 'cancel'>('modify');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [unavailableTimes, setUnavailableTimes] = useState<string[]>([]);
  const [modifyReason, setModifyReason] = useState('');

  const [cancelReason, setCancelReason] = useState('');
  const [cancelConfirmed, setCancelConfirmed] = useState(false);

  const [successBanner, setSuccessBanner] = useState<{
    title: string;
    body: string;
  } | null>(null);

  const todayStr = useMemo(() => getTodayIso(), []);

  const resetAndClose = useCallback(() => {
    setError(null);
    setSuccessBanner(null);
    setFound(null);
    setCancelConfirmed(false);
    onClose();
  }, [onClose]);

  const compatibleStaff = useMemo(() => {
    if (!found) return [];
    return found.availableStaff.filter(
      (member) =>
        member.assignedServiceIds.length === 0 ||
        !selectedServiceId ||
        member.assignedServiceIds.includes(selectedServiceId),
    );
  }, [found, selectedServiceId]);

  const availableTimeOptions = useMemo(() => {
    const base = [...CLINIC_TIME_SLOTS] as string[];
    if (found?.preferredTime && !base.includes(found.preferredTime)) {
      base.unshift(found.preferredTime);
    }
    return base;
  }, [found?.preferredTime]);

  const visibleTimeOptions = useMemo(
    () => availableTimeOptions.filter((slot) => !unavailableTimes.includes(slot)),
    [availableTimeOptions, unavailableTimes],
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        resetAndClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, resetAndClose]);

  const fetchSelfServiceAvailability = useCallback(
    async (
      ref: string,
      contactVal: string,
      dateVal: string,
      serviceIdVal: string,
      staffIdVal: string,
    ) => {
      setCheckingSlots(true);
      try {
        const res = await fetch('/api/public/appointments/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingReference: ref,
            contact: contactVal,
            date: dateVal,
            serviceId: serviceIdVal || undefined,
            staffId: staffIdVal || null,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { unavailableTimes?: string[] };
        const blocked = Array.isArray(data.unavailableTimes) ? data.unavailableTimes : [];
        setUnavailableTimes(blocked);
        setNewTime((prev) => (prev && blocked.includes(prev) ? '' : prev));
      } catch {
        setUnavailableTimes([]);
      } finally {
        setCheckingSlots(false);
      }
    },
    [],
  );

  // Fetch slot availability whenever verified appointment, selected date, service, or practitioner changes
  useEffect(() => {
    if (!isOpen || !found || !found.canModify || !newDate || mode !== 'modify') {
      return;
    }
    let cancelled = false;
    setCheckingSlots(true);

    fetch('/api/public/appointments/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingReference: found.bookingReference,
        contact,
        date: newDate,
        serviceId: selectedServiceId || found.serviceId,
        staffId: selectedStaffId || null,
      }),
    })
      .then((res) => res.json().catch(() => ({})))
      .then((data: { unavailableTimes?: string[] }) => {
        if (!cancelled && Array.isArray(data.unavailableTimes)) {
          setUnavailableTimes(data.unavailableTimes);
          setNewTime((prev) => (prev && data.unavailableTimes!.includes(prev) ? '' : prev));
        }
      })
      .catch(() => {
        if (!cancelled) setUnavailableTimes([]);
      })
      .finally(() => {
        if (!cancelled) setCheckingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    found?.bookingReference,
    found?.canModify,
    found?.serviceId,
    newDate,
    selectedServiceId,
    selectedStaffId,
    mode,
    contact,
  ]);

  if (!isOpen) return null;

  const hydrateEditableState = (appt: SelfServiceLookupResponse) => {
    setSelectedServiceId(appt.serviceId || appt.availableServices[0]?.id || '');
    setSelectedStaffId(appt.assignedStaffId || '');
    setNewDate(appt.preferredDate || '');
    setNewTime(appt.preferredTime || '');
    setModifyReason('');
    setCancelReason('');
    setCancelConfirmed(false);
    setUnavailableTimes([]);
  };

  const resetLookup = () => {
    setError(null);
    setSuccessBanner(null);
    setFound(null);
    setCancelConfirmed(false);
  };

  const mapSelfServiceError = (code?: string, fallback?: string): string => {
    switch (code) {
      case 'INVALID_INPUT':
        return t.selfService.missingFieldsError;
      case 'NOT_FOUND':
        return t.selfService.notFoundError;
      case 'SLOT_UNAVAILABLE':
        return t.selfService.slotUnavailableError;
      case 'NO_CHANGES':
        return t.selfService.noChangesError;
      case 'STATUS_LOCKED':
        return t.selfService.lockedStatus;
      case 'DEADLINE_PASSED':
        return t.selfService.deadlinePassedError;
      case 'INVALID_SCHEDULE':
      case 'INVALID_TIME_SLOT':
        return t.selfService.invalidScheduleError;
      default:
        return fallback || t.booking.errors.generic;
    }
  };

  const getLocalizedServiceName = (serviceIdOrSlug: string, fallbackName: string) => {
    const matched = found?.availableServices.find(
      (s) => s.id === serviceIdOrSlug || s.serviceId === serviceIdOrSlug,
    );
    const slug = matched?.serviceId || serviceIdOrSlug;
    const localized = t.servicesSection.officialDescriptions[slug];
    return localized?.name || matched?.name || fallbackName;
  };

  const handleServiceChange = (nextServiceId: string) => {
    setSelectedServiceId(nextServiceId);
    if (selectedStaffId && found) {
      const stillCompatible = found.availableStaff.some(
        (m) =>
          m.id === selectedStaffId &&
          (m.assignedServiceIds.length === 0 || m.assignedServiceIds.includes(nextServiceId)),
      );
      if (!stillCompatible) {
        setSelectedStaffId('');
      }
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessBanner(null);

    const trimmedRef = bookingReference.trim().toUpperCase();
    const trimmedContact = contact.trim();
    if (!trimmedRef || !trimmedContact) {
      setError(t.selfService.missingFieldsError);
      return;
    }

    setLoading(true);
    setFound(null);

    try {
      const res = await fetch('/api/public/appointments/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingReference: trimmedRef,
          contact: trimmedContact,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        appointment?: SelfServiceLookupResponse;
        code?: string;
        error?: string;
      };
      if (!res.ok || !data.appointment) {
        setError(mapSelfServiceError(data.code, data.error));
        return;
      }
      setBookingReference(trimmedRef);
      setContact(trimmedContact);
      setFound(data.appointment);
      setMode(data.appointment.canModify ? 'modify' : 'cancel');
      hydrateEditableState(data.appointment);
    } catch {
      setError(t.booking.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  const handleModifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!found) return;
    setError(null);
    setSuccessBanner(null);

    if (!newDate || !newTime) {
      setError(t.selfService.invalidScheduleError);
      return;
    }

    const unchanged =
      newDate === found.preferredDate &&
      newTime === found.preferredTime &&
      selectedServiceId === found.serviceId &&
      selectedStaffId === found.assignedStaffId;

    if (unchanged) {
      setError(t.selfService.noChangesError);
      return;
    }

    if (unavailableTimes.includes(newTime)) {
      setError(t.selfService.slotUnavailableError);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/public/appointments/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingReference: found.bookingReference,
          contact,
          preferredDate: newDate,
          preferredTime: newTime,
          serviceId: found.canChangeService ? selectedServiceId : undefined,
          assignedStaffId:
            found.availableStaff.length > 0 ? selectedStaffId || null : undefined,
          reason: modifyReason,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        appointment?: SelfServiceLookupResponse;
        code?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.appointment) {
        if (data.code === 'SLOT_UNAVAILABLE' || data.code === 'SLOT_CONFLICT') {
          void fetchSelfServiceAvailability(
            found.bookingReference,
            contact,
            newDate,
            selectedServiceId || found.serviceId,
            selectedStaffId,
          );
        }
        setError(mapSelfServiceError(data.code, data.error));
        return;
      }

      setFound(data.appointment);
      hydrateEditableState(data.appointment);
      setSuccessBanner({
        title: t.selfService.modifySuccessTitle,
        body: t.selfService.modifySuccessBody,
      });
    } catch {
      setError(t.booking.errors.generic);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!found) return;
    if (!cancelConfirmed) {
      setError(t.selfService.cancelConfirmRequiredError);
      return;
    }
    setError(null);
    setSuccessBanner(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/public/appointments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingReference: found.bookingReference,
          contact,
          reason: cancelReason,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        appointment?: SelfServiceLookupResponse;
        code?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.appointment) {
        setError(mapSelfServiceError(data.code, data.error));
        return;
      }

      setFound(data.appointment);
      hydrateEditableState(data.appointment);
      setSuccessBanner({
        title: t.selfService.cancelSuccessTitle,
        body: t.selfService.cancelSuccessBody,
      });
    } catch {
      setError(t.booking.errors.generic);
    } finally {
      setSubmitting(false);
    }
  };

  const isLocked = Boolean(found && !found.canModify && !found.canCancel);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#444343]/55 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="self-service-title"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="bg-white w-full max-w-xl rounded-xl border border-[#EDEADE] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="bg-[#F6F2E9] px-6 py-5 border-b border-[#EDEADE] flex items-start justify-between gap-4">
          <div>
            <h2
              id="self-service-title"
              className="font-display text-xl font-normal text-[#444343]"
            >
              {t.selfService.title}
            </h2>
            <p className="text-xs text-[#6B6668] mt-1">{t.selfService.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            aria-label={t.selfService.close}
            className="p-1.5 rounded-lg text-[#6B6668] hover:text-[#444343] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successBanner && (
            <div className="p-4 rounded-lg bg-[#F6F2E9] border border-[#AFC9A3] text-sm text-[#444343] flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#5B9D3F] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-medium text-[#444343]">{successBanner.title}</p>
                <p className="text-xs text-[#6B6668]">{successBanner.body}</p>
              </div>
            </div>
          )}

          {/* Verification Gate Form */}
          {!found ? (
            <form onSubmit={handleLookup} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#444343] mb-1.5">
                  {t.selfService.bookingRef}
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={bookingReference}
                  onChange={(e) => setBookingReference(e.target.value.toUpperCase())}
                  placeholder="EMIE-20261118-A1B2"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDEADE] text-sm font-mono-tabular focus:outline-none focus:border-[#5B9D3F]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#444343] mb-1.5">
                  {t.selfService.contact}
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder={t.selfService.contactPlaceholder}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDEADE] text-sm focus:outline-none focus:border-[#5B9D3F]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-[#444343] text-white text-sm font-medium hover:bg-[#5B9D3F] transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                {loading ? t.selfService.searching : t.selfService.lookupBtn}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              {/* Verified Appointment Summary */}
              <div className="p-4 rounded-xl bg-[#F9F9F9] border border-[#EDEADE] space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#EDEADE]">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-[#6B6668]">
                      {t.selfService.referenceLabel}
                    </span>
                    <div className="font-mono-tabular font-semibold text-sm text-[#444343]" dir="ltr">
                      {found.bookingReference}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-md border text-[11px] font-medium ${
                      STATUS_BADGE_CLASSES[found.status]
                    }`}
                  >
                    {t.statuses[found.status]}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-[#6B6668]">{t.selfService.service}</span>
                  <span className="font-medium text-[#444343] text-end">
                    {getLocalizedServiceName(found.serviceId, found.serviceName)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#6B6668]">{t.selfService.currentSlot}</span>
                  <span className="font-mono-tabular font-medium text-[#444343]" dir="ltr">
                    {found.preferredDate} · {found.preferredTime}
                  </span>
                </div>
                {found.availableStaff.length > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-[#6B6668]">{t.selfService.practitioner}</span>
                    <span className="font-medium text-[#444343] text-end">
                      {found.assignedStaffName || t.selfService.anyPractitioner}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-[#EDEADE] flex justify-end">
                  <button
                    type="button"
                    onClick={resetLookup}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#5B9D3F] hover:text-[#444343] cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {t.selfService.anotherLookup}
                  </button>
                </div>
              </div>

              {/* Action Area */}
              {isLocked ? (
                <div className="p-4 rounded-lg bg-[#F6F2E9] border border-[#EDEADE] text-xs text-[#444343] flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-[#6B6668] shrink-0 mt-0.5" />
                  <span>{t.selfService.lockedStatus}</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Mode Tabs */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {found.canModify && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('modify');
                          setError(null);
                        }}
                        className={`py-2.5 px-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                          mode === 'modify'
                            ? 'border-[#5B9D3F] bg-[#F6F2E9] text-[#444343]'
                            : 'border-[#EDEADE] text-[#6B6668] hover:border-[#444343]/30'
                        }`}
                      >
                        {t.selfService.requestReschedule}
                      </button>
                    )}
                    {found.canCancel && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('cancel');
                          setError(null);
                        }}
                        className={`py-2.5 px-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                          mode === 'cancel'
                            ? 'border-red-500 bg-red-50 text-red-900'
                            : 'border-[#EDEADE] text-[#6B6668] hover:border-red-300'
                        }`}
                      >
                        {t.selfService.requestCancel}
                      </button>
                    )}
                  </div>

                  {/* MODIFY FORM */}
                  {mode === 'modify' && found.canModify && (
                    <form onSubmit={handleModifySubmit} className="space-y-4">
                      {found.canChangeService && found.availableServices.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-[#444343] mb-1.5">
                            {t.selfService.selectService}
                          </label>
                          <select
                            value={selectedServiceId}
                            onChange={(e) => handleServiceChange(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDEADE] bg-white text-sm text-[#444343] focus:outline-none focus:border-[#5B9D3F]"
                          >
                            {found.availableServices.map((svc) => (
                              <option key={svc.id} value={svc.id}>
                                {getLocalizedServiceName(svc.serviceId, svc.name)} ({svc.durationMinutes}{' '}
                                {t.servicesSection.durationUnit})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {found.availableStaff.length > 0 && (
                        <div>
                          <label className="flex items-center gap-1.5 text-xs font-medium text-[#444343] mb-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-[#5B9D3F]" />
                            {t.selfService.selectPractitioner}
                          </label>
                          <select
                            value={selectedStaffId}
                            onChange={(e) => setSelectedStaffId(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDEADE] bg-white text-sm text-[#444343] focus:outline-none focus:border-[#5B9D3F]"
                          >
                            <option value="">{t.selfService.anyPractitioner}</option>
                            {compatibleStaff.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.fullName}
                                {member.role ? ` — ${member.role}` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-[#444343] mb-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#5B9D3F]" />
                          {t.selfService.newDate}
                        </label>
                        <input
                          type="date"
                          required
                          min={todayStr}
                          value={newDate}
                          onChange={(e) => setNewDate(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDEADE] text-sm tabular-nums focus:outline-none focus:border-[#5B9D3F]"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <label className="flex items-center gap-1.5 text-xs font-medium text-[#444343]">
                            <Clock className="w-3.5 h-3.5 text-[#5B9D3F]" />
                            {t.selfService.newTime}
                          </label>
                          {checkingSlots && (
                            <span className="text-[11px] text-[#6B6668]">
                              {t.selfService.checkingAvailability}
                            </span>
                          )}
                        </div>
                        {visibleTimeOptions.length === 0 && !checkingSlots ? (
                          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                            {t.selfService.noSlotsAvailable}
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" dir="ltr">
                            {visibleTimeOptions.map((slot) => {
                              const isSelected = newTime === slot;
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => {
                                    setError(null);
                                    setNewTime(slot);
                                  }}
                                  className={`py-2 px-2 rounded-lg border text-xs font-mono-tabular transition-colors ${
                                    isSelected
                                      ? 'border-[#5B9D3F] bg-[#5B9D3F] text-white font-semibold cursor-pointer'
                                      : 'border-[#EDEADE] bg-white text-[#444343] hover:border-[#5B9D3F] cursor-pointer'
                                  }`}
                                >
                                  {slot}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#444343] mb-1.5">
                          {t.selfService.reason}
                        </label>
                        <input
                          type="text"
                          value={modifyReason}
                          onChange={(e) => setModifyReason(e.target.value)}
                          placeholder={t.selfService.modifyReasonPlaceholder}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDEADE] text-sm focus:outline-none focus:border-[#5B9D3F]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitting || !newDate || !newTime}
                        className="w-full py-3 rounded-lg bg-[#5B9D3F] text-white text-sm font-medium hover:bg-[#4c8734] transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {submitting ? t.selfService.submitting : t.selfService.submitRequest}
                      </button>
                    </form>
                  )}

                  {/* CANCEL FORM */}
                  {mode === 'cancel' && found.canCancel && (
                    <form onSubmit={handleCancelSubmit} className="space-y-4">
                      <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-semibold">{t.selfService.cancelWarningTitle}</p>
                          <p className="leading-relaxed text-red-800">
                            {t.selfService.cancelWarningBody}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#444343] mb-1.5">
                          {t.selfService.cancelReasonLabel}
                        </label>
                        <input
                          type="text"
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder={t.selfService.cancelReasonPlaceholder}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDEADE] text-sm focus:outline-none focus:border-red-400"
                        />
                      </div>

                      <label className="flex items-start gap-2.5 text-xs text-[#444343] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={cancelConfirmed}
                          onChange={(e) => setCancelConfirmed(e.target.checked)}
                          className="mt-0.5 rounded border-[#EDEADE] text-red-600 focus:ring-red-500"
                        />
                        <span>{t.selfService.cancelAcknowledge}</span>
                      </label>

                      <button
                        type="submit"
                        disabled={submitting || !cancelConfirmed}
                        className="w-full py-3 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {submitting
                          ? t.selfService.cancellingBtn
                          : t.selfService.confirmCancelBtn}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
