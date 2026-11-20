export type Language = 'fr' | 'en' | 'ar';

export type AppointmentStatus =
  | 'New Request'
  | 'Pending Confirmation'
  | 'Confirmed'
  | 'Rescheduled'
  | 'Completed'
  | 'Cancelled'
  | 'No Show';

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'New Request',
  'Pending Confirmation',
  'Confirmed',
  'Rescheduled',
  'Completed',
  'Cancelled',
  'No Show',
];

export type UserRole = 'Super Admin' | 'Admin' | 'Staff';

export type AirtableDiagnosticCode =
  | 'missing_token'
  | 'missing_base_id'
  | 'invalid_credentials'
  | 'insufficient_permissions'
  | 'base_or_table_not_found'
  | 'network_error'
  | 'connected'
  | 'not_probed';

export interface AirtableConnectionDiagnosis {
  code: AirtableDiagnosticCode;
  connected: boolean;
  httpStatus?: number;
  message: string;
  checkedAt: string;
}

export interface AirtableInitTableReport {
  table: string;
  status: 'existed' | 'created' | 'failed';
  tableId?: string;
  createdFields: string[];
  existingFieldsCount: number;
  error?: string;
}

export interface AirtableInitializationReport {
  ok: boolean;
  checkedAt: string;
  existingTables: string[];
  createdTables: string[];
  tables: AirtableInitTableReport[];
  verifiedTables: Array<{
    table: string;
    accessible: boolean;
    recordCountSample: number;
    error?: string;
  }>;
  allTablesVerified: boolean;
  servicesInitialized: boolean;
  servicesCount: number;
  backfill?: {
    checked: number;
    updated: number;
    skippedNoEmail: number;
  };
  errors: Array<{
    step: string;
    httpStatus?: number;
    code: string;
    message: string;
  }>;
}

export interface OfficialServiceSeed {
  serviceId: string;
  name: string;
  description: string;
  displayOrder: number;
  durationMinutes: number;
  active: boolean;
  imagePath: string;
}

export interface ClinicService {
  id: string; // Airtable record ID or official slug
  serviceId: string;
  name: string;
  description: string;
  active: boolean;
  displayOrder: number;
  durationMinutes: number;
  assignedStaffIds: string[];
  imagePath?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientRecord {
  id: string;
  clientId: string;
  fullName: string;
  phone: string;
  email: string;
  preferredLanguage: Language;
  internalNotes: string;
  appointmentIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentRecord {
  id: string;
  bookingReference: string;
  clientId: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientPreferredLanguage?: Language;
  serviceId: string;
  serviceName?: string;
  preferredDate: string;
  preferredTime: string;
  alternativeDate: string;
  alternativeTime: string;
  status: AppointmentStatus;
  clientMessage: string;
  preferredLanguage: Language;
  assignedStaffId: string;
  assignedStaffName?: string;
  createdAt: string;
  updatedAt: string;
  internalNotes: string;
  cancellationReason: string;
  confirmationDate: string;
  notificationSent: boolean;
  notificationError: string;
  reminderEmailSent?: boolean;
}

export interface AppointmentAdminUpdatePayload {
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientPreferredLanguage?: Language;
  serviceId?: string;
  preferredDate?: string;
  preferredTime?: string;
  alternativeDate?: string;
  alternativeTime?: string;
  assignedStaffId?: string | null;
  internalNotes?: string;
  clientMessage?: string;
  preferredLanguage?: Language;
  status?: AppointmentStatus;
  cancellationReason?: string;
  actionMode?: 'edit' | 'confirm' | 'reschedule' | 'cancel' | 'status';
  actionReason?: string;
}

export interface StaffMember {
  id: string;
  staffId: string;
  fullName: string;
  role: string;
  phone: string;
  email: string;
  assignedServiceIds: string[];
  availability: string;
  active: boolean;
  createdAt: string;
}

export interface AdminUserRecord {
  id: string;
  adminId: string;
  fullName: string;
  email: string;
  role: UserRole;
  linkedStaffId?: string;
  active: boolean;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  notificationId: string;
  notificationType:
    | 'new_booking'
    | 'confirmed'
    | 'rescheduled'
    | 'cancelled'
    | 'integration_error'
    | 'system';
  title: string;
  message: string;
  relatedAppointmentId?: string;
  recipient: string;
  readStatus: boolean;
  createdAt: string;
}

export interface ActivityLogRecord {
  id: string;
  logId: string;
  user: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue: string;
  newValue: string;
  timestamp: string;
}

export interface ClinicPublicSettings {
  clinicName: string;
  headline: string;
  subheadline: string;
  specialty: string;
  phone: string;
  address: string;
  instagramHandle: string;
  instagramUrl: string;
  emailOptional: boolean;
  requireEmail: boolean;
  openingHours: string;
  logoUrl: string;
  enabledLanguages: Language[];
  preventOverlappingConfirmed: boolean;
  slotDurationMinutes: number;
  allowPublicBooking: boolean;
  allowAdminDeleteAppointments: boolean;
  dataRetentionDays: number;
}

export interface IntegrationStatus {
  airtableConfigured: boolean;
  airtableTokenPresent: boolean;
  airtableBaseIdPresent: boolean;
  airtableBaseIdMasked: string | null;
  airtableDiagnosticCode: AirtableDiagnosticCode;
  airtableDiagnosticMessage: string;
  makeConfigured: boolean;
  superAdminConfigured: boolean;
  setupTokenConfigured: boolean;
  missingEnvVars: string[];
}

export interface AuthSessionUser {
  id: string;
  adminId: string;
  fullName: string;
  email: string;
  role: UserRole;
  linkedStaffId?: string;
  source: 'airtable' | 'env';
}

export interface BookingSubmitPayload {
  serviceId: string;
  fullName: string;
  phone: string;
  email?: string;
  preferredLanguage: Language;
  preferredDate: string;
  preferredTime: string;
  alternativeDate?: string;
  alternativeTime?: string;
  message?: string;
  consentAccepted: boolean;
  submissionToken: string;
}

export const CLINIC_TIME_SLOTS = [
  '09:00',
  '09:45',
  '10:30',
  '11:15',
  '12:00',
  '14:00',
  '14:45',
  '15:30',
  '16:15',
  '17:00',
  '17:45',
  '18:30',
] as const;

export interface SelfServiceServiceOption {
  id: string;
  serviceId: string;
  name: string;
  durationMinutes: number;
}

export interface SelfServiceStaffOption {
  id: string;
  fullName: string;
  role: string;
  assignedServiceIds: string[];
  availability: string;
}

export interface SelfServiceLookupResponse {
  bookingReference: string;
  serviceId: string;
  serviceName: string;
  preferredDate: string;
  preferredTime: string;
  alternativeDate: string;
  alternativeTime: string;
  status: AppointmentStatus;
  assignedStaffId: string;
  assignedStaffName: string;
  clientMessage: string;
  preferredLanguage: Language;
  canModify: boolean;
  canCancel: boolean;
  canChangeService: boolean;
  lockReason?: string;
  availableServices: SelfServiceServiceOption[];
  availableStaff: SelfServiceStaffOption[];
  modificationDeadlineHours: number | null;
  cancellationDeadlineHours: number | null;
}

export interface SelfServiceModifyPayload {
  bookingReference: string;
  contact: string;
  preferredDate: string;
  preferredTime: string;
  serviceId?: string;
  assignedStaffId?: string | null;
  reason?: string;
}

export interface SelfServiceCancelPayload {
  bookingReference: string;
  contact: string;
  reason?: string;
}

