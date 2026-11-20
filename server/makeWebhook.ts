import { getMakeWebhookUrl } from './config.ts';
import type { AppointmentRecord, Language } from '../shared/types.ts';

export type CanonicalMakeEvent =
  | 'appointment.created'
  | 'appointment.confirmed'
  | 'appointment.updated'
  | 'appointment.rescheduled'
  | 'appointment.cancelled'
  | 'appointment.reminder';

export interface MakeWebhookPayload {
  eventType:
    | 'booking_created'
    | 'appointment_confirmed'
    | 'appointment_updated'
    | 'appointment_rescheduled'
    | 'appointment_cancelled'
    | 'appointment_reminder'
    | 'client_change_request';
  event: CanonicalMakeEvent;
  airtableRecordId: string;
  bookingReference: string;
  clientName: string;
  phone: string;
  email: string;
  clientEmail: string;
  service: string;
  preferredDate: string;
  preferredTime: string;
  previousDate?: string;
  previousTime?: string;
  alternativeDate: string;
  alternativeTime: string;
  message: string;
  preferredLanguage: Language;
  appointmentStatus: string;
  createdAt: string;
  confirmationDate?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  requestedAction?: string;
  reminderEmailSent?: boolean;
}

export interface MakeTriggerResult {
  sent: boolean;
  skipped?: boolean;
  error?: string;
  statusCode?: number;
}

function toCanonicalMakeEvent(
  eventType: MakeWebhookPayload['eventType'],
): CanonicalMakeEvent {
  switch (eventType) {
    case 'booking_created':
      return 'appointment.created';
    case 'appointment_confirmed':
      return 'appointment.confirmed';
    case 'appointment_rescheduled':
      return 'appointment.rescheduled';
    case 'appointment_cancelled':
      return 'appointment.cancelled';
    case 'appointment_reminder':
      return 'appointment.reminder';
    case 'appointment_updated':
    case 'client_change_request':
    default:
      return 'appointment.updated';
  }
}

export function buildMakePayload(
  eventType: MakeWebhookPayload['eventType'],
  appointment: AppointmentRecord,
  extra?: Partial<MakeWebhookPayload>,
): MakeWebhookPayload {
  const clientEmail = appointment.clientEmail || '';
  return {
    eventType,
    event: toCanonicalMakeEvent(eventType),
    airtableRecordId: appointment.id,
    bookingReference: appointment.bookingReference,
    clientName: appointment.clientName || '',
    phone: appointment.clientPhone || '',
    email: clientEmail,
    clientEmail,
    service: appointment.serviceName || appointment.serviceId,
    preferredDate: appointment.preferredDate,
    preferredTime: appointment.preferredTime,
    alternativeDate: appointment.alternativeDate || '',
    alternativeTime: appointment.alternativeTime || '',
    message: appointment.clientMessage || '',
    preferredLanguage: appointment.preferredLanguage,
    appointmentStatus: appointment.status,
    createdAt: appointment.createdAt,
    confirmationDate: appointment.confirmationDate || undefined,
    cancellationReason: appointment.cancellationReason || undefined,
    reminderEmailSent: Boolean(appointment.reminderEmailSent),
    ...extra,
  };
}

export async function triggerMakeWebhook(
  payload: MakeWebhookPayload,
): Promise<MakeTriggerResult> {
  const webhookUrl = getMakeWebhookUrl();
  if (!webhookUrl) {
    return {
      sent: false,
      skipped: true,
      error: 'MAKE_BOOKING_WEBHOOK_URL is not configured in server environment variables.',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emie-Event': payload.eventType,
        'X-Emie-Canonical-Event': payload.event,
        'X-Emie-Record-Id': payload.airtableRecordId,
        'X-Emie-Booking-Ref': payload.bookingReference,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        sent: false,
        statusCode: res.status,
        error: `Make.com webhook returned HTTP ${res.status}${text ? `: ${text.slice(0, 160)}` : ''}`,
      };
    }

    return {
      sent: true,
      statusCode: res.status,
    };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : 'Make.com webhook request failed',
    };
  } finally {
    clearTimeout(timeout);
  }
}
