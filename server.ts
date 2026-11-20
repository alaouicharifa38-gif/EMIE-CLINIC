import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  AirtableError,
  createRecord,
  getAirtableDiagnosis,
  getRecord,
  listAllRecords,
  updateRecord,
  verifyAirtableSchema,
} from './server/airtable.ts';
import {
  getLastInitializationReport,
  initializeAirtableDatabase,
} from './server/airtableInit.ts';
import {
  type AuthenticatedRequest,
  authenticateAdminCredentials,
  authenticateSession,
  bootstrapSuperAdmin,
  clearSessionCookie,
  hashPassword,
  requireAuth,
  requireRole,
  setSessionCookie,
} from './server/auth.ts';
import {
  cancelClientAppointment,
  createStaffMember,
  deleteAppointmentPermanent,
  getAdminAvailableSlots,
  getAppointmentHistory,
  getClientAvailableSlots,
  getClinicSettings,
  getPublicAvailableSlots,
  listActivityLogs,
  listAdminUsers,
  listAppointments,
  listClients,
  listNotifications,
  listServices,
  listStaff,
  logActivity,
  lookupClientAppointment,
  markNotificationRead,
  modifyClientAppointment,
  retryAppointmentWebhook,
  sanitizeText,
  saveClinicSettings,
  seedOfficialServicesToAirtable,
  submitClientSelfServiceRequest,
  submitPublicBooking,
  updateAppointmentAdmin,
  updateClientRecord,
  updateServiceRecord,
  updateStaffMember,
} from './server/clinicData.ts';
import {
  AIRTABLE_TABLES,
  getAirtableCredentials,
  getIntegrationStatus,
} from './server/config.ts';
import type {
  AppointmentAdminUpdatePayload,
  AppointmentStatus,
  BookingSubmitPayload,
  Language,
  UserRole,
} from './shared/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(authenticateSession);

// Basic security headers suitable for iframe & production HTTPS
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many booking requests. Please wait a few minutes.' },
});

const availabilityLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many availability checks. Please wait a moment.' },
});

function handleApiError(res: express.Response, err: unknown): void {
  if (err instanceof AirtableError) {
    res.status(err.status).json({
      error: err.message,
      code: err.code,
    });
    return;
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message, code: 'INTERNAL_ERROR' });
}

// =============================================================================
// PUBLIC API ROUTES (No private client/appointment exposure)
// =============================================================================

let startupInitPromise: Promise<void> | null = null;

app.get('/api/health', async (req, res) => {
  const forceProbe = req.query.probe === '1' || req.query.probe === 'true';
  if (forceProbe && startupInitPromise) {
    await startupInitPromise.catch(() => undefined);
  }
  const diagnosis = await getAirtableDiagnosis(forceProbe);
  res.json({
    ok: true,
    integrations: getIntegrationStatus(diagnosis),
    diagnosis,
    initialization: getLastInitializationReport(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/public/bootstrap', async (_req, res) => {
  try {
    const [settings, servicesRes, diagnosis] = await Promise.all([
      getClinicSettings(),
      listServices(false),
      getAirtableDiagnosis(false),
    ]);
    const status = getIntegrationStatus(diagnosis);
    res.json({
      settings,
      services: servicesRes.services,
      servicesFromAirtable: servicesRes.fromAirtable,
      airtableConfigured: status.airtableConfigured,
      airtableDiagnosticCode: status.airtableDiagnosticCode,
      makeConfigured: status.makeConfigured,
    });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.get('/api/public/availability', availabilityLimiter, async (req, res) => {
  try {
    const result = await getPublicAvailableSlots({
      date: typeof req.query.date === 'string' ? req.query.date : '',
      serviceId: typeof req.query.serviceId === 'string' ? req.query.serviceId : undefined,
    });
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/bookings', bookingLimiter, async (req, res) => {
  try {
    const body = (req.body || {}) as Partial<BookingSubmitPayload>;
    const result = await submitPublicBooking({
      serviceId: String(body.serviceId || ''),
      fullName: String(body.fullName || ''),
      phone: String(body.phone || ''),
      email: body.email ? String(body.email) : '',
      preferredLanguage:
        body.preferredLanguage === 'en' || body.preferredLanguage === 'ar'
          ? body.preferredLanguage
          : 'fr',
      preferredDate: String(body.preferredDate || ''),
      preferredTime: String(body.preferredTime || ''),
      alternativeDate: body.alternativeDate ? String(body.alternativeDate) : '',
      alternativeTime: body.alternativeTime ? String(body.alternativeTime) : '',
      message: body.message ? String(body.message) : '',
      consentAccepted: Boolean(body.consentAccepted),
      submissionToken: String(body.submissionToken || ''),
    });

    res.status(201).json({
      bookingReference: result.appointment.bookingReference,
      status: result.appointment.status,
      serviceName: result.appointment.serviceName,
      preferredDate: result.appointment.preferredDate,
      preferredTime: result.appointment.preferredTime,
      makeNotificationSent: result.makeResult.sent,
      makeNotificationSkipped: Boolean(result.makeResult.skipped),
    });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/public/appointments/lookup', bookingLimiter, async (req, res) => {
  try {
    const result = await lookupClientAppointment({
      bookingReference: String(req.body?.bookingReference || ''),
      contact: String(req.body?.contact || ''),
    });
    res.json({ appointment: result });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/public/appointments/availability', availabilityLimiter, async (req, res) => {
  try {
    const result = await getClientAvailableSlots({
      bookingReference: String(req.body?.bookingReference || ''),
      contact: String(req.body?.contact || ''),
      date: String(req.body?.date || ''),
      serviceId: typeof req.body?.serviceId === 'string' ? req.body.serviceId : undefined,
      staffId:
        typeof req.body?.staffId === 'string'
          ? req.body.staffId
          : req.body?.staffId === null
          ? null
          : undefined,
    });
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/public/appointments/modify', bookingLimiter, async (req, res) => {
  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const result = await modifyClientAppointment({
      bookingReference: String(body.bookingReference || ''),
      contact: String(body.contact || ''),
      preferredDate: String(body.preferredDate || ''),
      preferredTime: String(body.preferredTime || ''),
      serviceId: typeof body.serviceId === 'string' ? body.serviceId : undefined,
      assignedStaffId:
        body.assignedStaffId === null
          ? null
          : typeof body.assignedStaffId === 'string'
          ? body.assignedStaffId
          : undefined,
      reason: typeof body.reason === 'string' ? body.reason : undefined,
    });
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/public/appointments/cancel', bookingLimiter, async (req, res) => {
  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const result = await cancelClientAppointment({
      bookingReference: String(body.bookingReference || ''),
      contact: String(body.contact || ''),
      reason: typeof body.reason === 'string' ? body.reason : undefined,
    });
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/public/appointments/request-change', bookingLimiter, async (req, res) => {
  try {
    const requestType =
      req.body?.requestType === 'cancel' ? 'cancel' : 'reschedule';
    const result = await submitClientSelfServiceRequest({
      bookingReference: String(req.body?.bookingReference || ''),
      contact: String(req.body?.contact || ''),
      requestType,
      requestedDate: req.body?.requestedDate ? String(req.body.requestedDate) : '',
      requestedTime: req.body?.requestedTime ? String(req.body.requestedTime) : '',
      reason: req.body?.reason ? String(req.body.reason) : '',
      serviceId: typeof req.body?.serviceId === 'string' ? req.body.serviceId : undefined,
      assignedStaffId:
        req.body?.assignedStaffId === null
          ? null
          : typeof req.body?.assignedStaffId === 'string'
          ? req.body.assignedStaffId
          : undefined,
    });
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

// =============================================================================
// AUTHENTICATION ROUTES
// =============================================================================

app.get('/api/auth/status', async (req: AuthenticatedRequest, res) => {
  const diagnosis = await getAirtableDiagnosis(false);
  const status = getIntegrationStatus(diagnosis);
  res.json({
    authenticated: Boolean(req.adminUser),
    user: req.adminUser || null,
    integrations: status,
  });
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const user = await authenticateAdminCredentials(email, password);
    if (!user) {
      res.status(401).json({
        error: 'Invalid email or password, or account inactive.',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    setSessionCookie(req, res, user);
    await logActivity({
      user: user.email,
      action: 'ADMIN_LOGIN',
      entityType: 'Auth',
      entityId: user.adminId,
      previousValue: '',
      newValue: user.role,
    });

    res.json({ user });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/auth/logout', (req: AuthenticatedRequest, res) => {
  if (req.adminUser) {
    void logActivity({
      user: req.adminUser.email,
      action: 'ADMIN_LOGOUT',
      entityType: 'Auth',
      entityId: req.adminUser.adminId,
      previousValue: '',
      newValue: '',
    });
  }
  clearSessionCookie(req, res);
  res.json({ ok: true });
});

app.post('/api/auth/setup', authLimiter, async (req, res) => {
  try {
    const setupToken = typeof req.body?.setupToken === 'string' ? req.body.setupToken : '';
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName : '';
    const email = typeof req.body?.email === 'string' ? req.body.email : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!fullName.trim() || !email.trim() || password.length < 8) {
      res.status(400).json({
        error: 'Full name, valid email, and password (min 8 chars) are required.',
      });
      return;
    }

    const user = await bootstrapSuperAdmin({
      setupToken,
      fullName,
      email,
      password,
    });
    setSessionCookie(req, res, user);
    res.status(201).json({ user });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Setup failed',
    });
  }
});

// =============================================================================
// ADMIN DASHBOARD ROUTES (Protected)
// =============================================================================

app.get('/api/admin/overview', requireAuth, async (req: AuthenticatedRequest, res) => {
  const diagnosis = await getAirtableDiagnosis(false);
  const status = getIntegrationStatus(diagnosis);
  if (!status.airtableConfigured) {
    res.json({
      airtableConfigured: false,
      integrations: status,
      metrics: null,
      appointments: [],
      services: [],
    });
    return;
  }

  try {
    const staffFilter =
      req.adminUser?.role === 'Staff' ? req.adminUser.linkedStaffId : undefined;
    const [appointments, clients, servicesRes, notifications] = await Promise.all([
      listAppointments({ linkedStaffId: staffFilter }),
      req.adminUser?.role === 'Staff' ? Promise.resolve([]) : listClients(),
      listServices(true),
      listNotifications(),
    ]);

    const todayStr = new Date().toISOString().slice(0, 10);
    const metrics = {
      totalAppointments: appointments.length,
      newRequests: appointments.filter((a) => a.status === 'New Request').length,
      pendingConfirmations: appointments.filter(
        (a) => a.status === 'Pending Confirmation' || a.status === 'New Request',
      ).length,
      confirmedAppointments: appointments.filter((a) => a.status === 'Confirmed').length,
      todaysAppointments: appointments.filter(
        (a) => a.preferredDate === todayStr && a.status !== 'Cancelled',
      ).length,
      upcomingAppointments: appointments.filter(
        (a) =>
          a.preferredDate >= todayStr &&
          (a.status === 'Confirmed' ||
            a.status === 'Pending Confirmation' ||
            a.status === 'Rescheduled' ||
            a.status === 'New Request'),
      ).length,
      completedAppointments: appointments.filter((a) => a.status === 'Completed').length,
      cancelledAppointments: appointments.filter((a) => a.status === 'Cancelled').length,
      totalClients:
        req.adminUser?.role === 'Staff'
          ? new Set(appointments.map((a) => a.clientId)).size
          : clients.length,
      unreadNotifications: notifications.filter((n) => !n.readStatus).length,
    };

    res.json({
      airtableConfigured: true,
      integrations: status,
      metrics,
      appointments,
      services: servicesRes.services,
    });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.get('/api/admin/appointments', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!getAirtableCredentials()) {
    res.json({ airtableConfigured: false, appointments: [] });
    return;
  }
  try {
    const staffFilter =
      req.adminUser?.role === 'Staff' ? req.adminUser.linkedStaffId : undefined;
    const appointments = await listAppointments({ linkedStaffId: staffFilter });
    res.json({ airtableConfigured: true, appointments });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.get('/api/admin/appointments/availability', requireAuth, async (req, res) => {
  try {
    const result = await getAdminAvailableSlots({
      date: typeof req.query.date === 'string' ? req.query.date : '',
      serviceId: typeof req.query.serviceId === 'string' ? req.query.serviceId : undefined,
      staffId: typeof req.query.staffId === 'string' ? req.query.staffId : undefined,
      excludeAppointmentId:
        typeof req.query.excludeAppointmentId === 'string'
          ? req.query.excludeAppointmentId
          : undefined,
    });
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.patch('/api/admin/appointments/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id;
    const body = (req.body || {}) as Record<string, unknown>;

    const parseLang = (val: unknown): Language | undefined => {
      if (val === 'fr' || val === 'en' || val === 'ar') return val;
      return undefined;
    };

    const payload: AppointmentAdminUpdatePayload = {
      clientName: typeof body.clientName === 'string' ? body.clientName : undefined,
      clientPhone: typeof body.clientPhone === 'string' ? body.clientPhone : undefined,
      clientEmail: typeof body.clientEmail === 'string' ? body.clientEmail : undefined,
      clientPreferredLanguage: parseLang(body.clientPreferredLanguage),
      serviceId: typeof body.serviceId === 'string' ? body.serviceId : undefined,
      preferredDate: typeof body.preferredDate === 'string' ? body.preferredDate : undefined,
      preferredTime: typeof body.preferredTime === 'string' ? body.preferredTime : undefined,
      alternativeDate: typeof body.alternativeDate === 'string' ? body.alternativeDate : undefined,
      alternativeTime: typeof body.alternativeTime === 'string' ? body.alternativeTime : undefined,
      assignedStaffId:
        body.assignedStaffId === null
          ? null
          : typeof body.assignedStaffId === 'string'
          ? body.assignedStaffId
          : undefined,
      internalNotes: typeof body.internalNotes === 'string' ? body.internalNotes : undefined,
      clientMessage: typeof body.clientMessage === 'string' ? body.clientMessage : undefined,
      preferredLanguage: parseLang(body.preferredLanguage),
      status: typeof body.status === 'string' ? (body.status as AppointmentStatus) : undefined,
      cancellationReason:
        typeof body.cancellationReason === 'string' ? body.cancellationReason : undefined,
      actionMode:
        body.actionMode === 'edit' ||
        body.actionMode === 'confirm' ||
        body.actionMode === 'reschedule' ||
        body.actionMode === 'cancel' ||
        body.actionMode === 'status'
          ? body.actionMode
          : undefined,
      actionReason: typeof body.actionReason === 'string' ? body.actionReason : undefined,
    };

    const result = await updateAppointmentAdmin(id, payload, req.adminUser!);
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.delete('/api/admin/appointments/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const actor = req.adminUser!;
    if (actor.role === 'Staff') {
      res.status(403).json({
        error: 'Staff accounts cannot permanently delete appointments.',
        code: 'FORBIDDEN',
      });
      return;
    }
    if (actor.role === 'Admin') {
      const settings = await getClinicSettings();
      if (!settings.allowAdminDeleteAppointments) {
        res.status(403).json({
          error: 'Permanent appointment deletion is restricted to Super Admin.',
          code: 'FORBIDDEN',
        });
        return;
      }
    }

    const reason = sanitizeText(req.body?.reason || '', 400);
    const deleted = await deleteAppointmentPermanent(req.params.id, actor, reason);
    res.json({ ok: true, ...deleted });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.get('/api/admin/appointments/:id/history', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id;
    const raw = await getRecord<Record<string, unknown>>(AIRTABLE_TABLES.APPOINTMENTS, id);
    if (req.adminUser?.role === 'Staff') {
      const assigned = Array.isArray(raw.fields['Assigned Staff'])
        ? String(raw.fields['Assigned Staff'][0] || '')
        : '';
      if (!req.adminUser.linkedStaffId || assigned !== req.adminUser.linkedStaffId) {
        res.status(403).json({ error: 'Access denied to this appointment history.', code: 'FORBIDDEN' });
        return;
      }
    }
    const bookingRef = String(raw.fields['Booking Reference'] || '');
    const logs = await getAppointmentHistory(id, bookingRef);
    res.json({ logs });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post(
  '/api/admin/appointments/:id/retry-webhook',
  requireAuth,
  requireRole(['Super Admin', 'Admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await retryAppointmentWebhook(req.params.id, req.adminUser!.email);
      res.json(result);
    } catch (err) {
      handleApiError(res, err);
    }
  },
);

app.get('/api/admin/clients', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!getAirtableCredentials()) {
    res.json({ airtableConfigured: false, clients: [] });
    return;
  }
  try {
    let clients = await listClients();
    if (req.adminUser?.role === 'Staff') {
      const staffAppts = await listAppointments({
        linkedStaffId: req.adminUser.linkedStaffId,
      });
      const allowedIds = new Set(staffAppts.map((a) => a.clientId));
      clients = clients
        .filter((c) => allowedIds.has(c.id))
        .map((c) => ({ ...c, internalNotes: '' }));
    }
    res.json({ airtableConfigured: true, clients });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.patch(
  '/api/admin/clients/:id',
  requireAuth,
  requireRole(['Super Admin', 'Admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const updated = await updateClientRecord(
        req.params.id,
        req.body || {},
        req.adminUser!.email,
      );
      res.json({ client: updated });
    } catch (err) {
      handleApiError(res, err);
    }
  },
);

app.get('/api/admin/services', requireAuth, async (_req, res) => {
  try {
    const { services, fromAirtable } = await listServices(true);
    res.json({
      airtableConfigured: Boolean(getAirtableCredentials()),
      fromAirtable,
      services,
    });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post(
  '/api/admin/services/seed',
  requireAuth,
  requireRole(['Super Admin', 'Admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const services = await seedOfficialServicesToAirtable(req.adminUser!.email);
      res.json({ services });
    } catch (err) {
      handleApiError(res, err);
    }
  },
);

app.patch(
  '/api/admin/services/:id',
  requireAuth,
  requireRole(['Super Admin', 'Admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const updated = await updateServiceRecord(
        req.params.id,
        req.body || {},
        req.adminUser!.email,
      );
      res.json({ service: updated });
    } catch (err) {
      handleApiError(res, err);
    }
  },
);

app.get('/api/admin/staff', requireAuth, async (_req, res) => {
  if (!getAirtableCredentials()) {
    res.json({ airtableConfigured: false, staff: [] });
    return;
  }
  try {
    const staff = await listStaff();
    res.json({ airtableConfigured: true, staff });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post(
  '/api/admin/staff',
  requireAuth,
  requireRole(['Super Admin', 'Admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const fullName = sanitizeText(req.body?.fullName, 120);
      const role = sanitizeText(req.body?.role, 120);
      if (!fullName || !role) {
        res.status(400).json({ error: 'Staff full name and role are required.' });
        return;
      }
      const member = await createStaffMember(
        {
          fullName,
          role,
          phone: req.body?.phone,
          email: req.body?.email,
          assignedServiceIds: Array.isArray(req.body?.assignedServiceIds)
            ? req.body.assignedServiceIds
            : [],
          availability: req.body?.availability,
          active: req.body?.active !== false,
        },
        req.adminUser!.email,
      );
      res.status(201).json({ member });
    } catch (err) {
      handleApiError(res, err);
    }
  },
);

app.patch(
  '/api/admin/staff/:id',
  requireAuth,
  requireRole(['Super Admin', 'Admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const member = await updateStaffMember(
        req.params.id,
        req.body || {},
        req.adminUser!.email,
      );
      res.json({ member });
    } catch (err) {
      handleApiError(res, err);
    }
  },
);

app.get('/api/admin/notifications', requireAuth, async (_req, res) => {
  if (!getAirtableCredentials()) {
    res.json({ airtableConfigured: false, notifications: [] });
    return;
  }
  try {
    const notifications = await listNotifications();
    res.json({ airtableConfigured: true, notifications });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.patch('/api/admin/notifications/:id', requireAuth, async (req, res) => {
  try {
    await markNotificationRead(req.params.id, Boolean(req.body?.readStatus ?? true));
    res.json({ ok: true });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.get(
  '/api/admin/activity-logs',
  requireAuth,
  requireRole(['Super Admin', 'Admin']),
  async (_req, res) => {
    if (!getAirtableCredentials()) {
      res.json({ airtableConfigured: false, logs: [] });
      return;
    }
    try {
      const logs = await listActivityLogs();
      res.json({ airtableConfigured: true, logs });
    } catch (err) {
      handleApiError(res, err);
    }
  },
);

app.get(
  '/api/admin/users',
  requireAuth,
  requireRole(['Super Admin']),
  async (_req, res) => {
    if (!getAirtableCredentials()) {
      res.json({ airtableConfigured: false, users: [] });
      return;
    }
    try {
      const users = await listAdminUsers();
      res.json({ airtableConfigured: true, users });
    } catch (err) {
      handleApiError(res, err);
    }
  },
);

app.post(
  '/api/admin/users',
  requireAuth,
  requireRole(['Super Admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const fullName = sanitizeText(req.body?.fullName, 120);
      const email = sanitizeText(req.body?.email, 160).toLowerCase();
      const password = String(req.body?.password || '');
      const role = (req.body?.role as UserRole) || 'Staff';
      const linkedStaffId = req.body?.linkedStaffId ? String(req.body.linkedStaffId) : '';

      if (!fullName || !email || password.length < 8) {
        res.status(400).json({ error: 'Name, email, and password (min 8 chars) are required.' });
        return;
      }

      const existing = await listAllRecords(AIRTABLE_TABLES.ADMIN_USERS, {
        filterByFormula: `LOWER({Email}) = '${email.replace(/'/g, "\\'")}'`,
        maxRecords: 1,
      });
      if (existing.length > 0) {
        res.status(409).json({ error: 'An admin user with this email already exists.' });
        return;
      }

      const adminId = `ADM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const now = new Date().toISOString();
      const created = await createRecord(AIRTABLE_TABLES.ADMIN_USERS, {
        'Admin ID': adminId,
        'Full Name': fullName,
        Email: email,
        'Password Hash': hashPassword(password),
        Role: role,
        'Linked Staff': linkedStaffId ? [linkedStaffId] : undefined,
        Active: true,
        'Created At': now,
      });

      await logActivity({
        user: req.adminUser!.email,
        action: 'ADMIN_USER_CREATED',
        entityType: 'Admin Users',
        entityId: created.id,
        previousValue: '',
        newValue: `${email} (${role})`,
      });

      res.status(201).json({
        user: {
          id: created.id,
          adminId,
          fullName,
          email,
          role,
          linkedStaffId,
          active: true,
          createdAt: now,
        },
      });
    } catch (err) {
      handleApiError(res, err);
    }
  },
);

app.patch(
  '/api/admin/users/:id',
  requireAuth,
  requireRole(['Super Admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const fields: Record<string, unknown> = {};
      if (req.body?.role) fields.Role = req.body.role;
      if (req.body?.active !== undefined) fields.Active = Boolean(req.body.active);
      if (req.body?.fullName) fields['Full Name'] = sanitizeText(req.body.fullName, 120);
      if (req.body?.password && String(req.body.password).length >= 8) {
        fields['Password Hash'] = hashPassword(String(req.body.password));
      }

      await updateRecord(AIRTABLE_TABLES.ADMIN_USERS, req.params.id, fields);
      await logActivity({
        user: req.adminUser!.email,
        action: 'ADMIN_USER_UPDATED',
        entityType: 'Admin Users',
        entityId: req.params.id,
        previousValue: '',
        newValue: JSON.stringify(Object.keys(fields)),
      });
      res.json({ ok: true });
    } catch (err) {
      handleApiError(res, err);
    }
  },
);

app.get('/api/admin/settings', requireAuth, async (_req, res) => {
  try {
    const [settings, diagnosis] = await Promise.all([
      getClinicSettings(),
      getAirtableDiagnosis(false),
    ]);
    res.json({
      settings,
      integrations: getIntegrationStatus(diagnosis),
    });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.put(
  '/api/admin/settings',
  requireAuth,
  requireRole(['Super Admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const settings = await saveClinicSettings(req.body || {}, req.adminUser!.email);
      res.json({ settings });
    } catch (err) {
      handleApiError(res, err);
    }
  },
);

app.get(
  '/api/admin/integrations/verify',
  requireAuth,
  requireRole(['Super Admin', 'Admin']),
  async (_req, res) => {
    const diagnosis = await getAirtableDiagnosis(true);
    const status = getIntegrationStatus(diagnosis);
    if (!status.airtableTokenPresent || !status.airtableBaseIdPresent) {
      res.json({
        diagnosis,
        integrations: status,
        tables: [],
        lastInitialization: getLastInitializationReport(),
      });
      return;
    }
    try {
      const tables = await verifyAirtableSchema();
      res.json({
        diagnosis,
        integrations: status,
        tables,
        lastInitialization: getLastInitializationReport(),
      });
    } catch (err) {
      handleApiError(res, err);
    }
  },
);

app.post(
  '/api/admin/integrations/initialize',
  requireAuth,
  requireRole(['Super Admin', 'Admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const report = await initializeAirtableDatabase(req.adminUser!.email);
      const diagnosis = await getAirtableDiagnosis(true);
      const status = getIntegrationStatus(diagnosis);
      res.json({
        report,
        diagnosis,
        integrations: status,
        tables: report.verifiedTables,
      });
    } catch (err) {
      handleApiError(res, err);
    }
  },
);

// =============================================================================
// VITE DEV SERVER / STATIC PRODUCTION SERVING
// =============================================================================

async function startServer(): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EMIE CLINIC server running on http://0.0.0.0:${PORT}`);
    if (getAirtableCredentials()) {
      startupInitPromise = initializeAirtableDatabase('system-startup')
        .then((initReport) => {
          console.log(
            `[Airtable Init] existing=${initReport.existingTables.length} created=${initReport.createdTables.length} verified=${initReport.allTablesVerified} services=${initReport.servicesCount} errors=${initReport.errors.length}`,
          );
          if (initReport.errors.length > 0) {
            console.warn(
              '[Airtable Init Diagnostics]',
              initReport.errors.map(
                (e) => `${e.step}: ${e.code} (${e.httpStatus || ''}) ${e.message}`,
              ),
            );
          }
        })
        .catch((err) => {
          console.warn(
            '[Airtable Init] Non-fatal startup check failure:',
            err instanceof Error ? err.message : 'Unknown error',
          );
        });
    }
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
