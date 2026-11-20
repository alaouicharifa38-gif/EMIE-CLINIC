# EMIE CLINIC MANAGEMENT SYSTEM — Airtable, Auth & Make.com Setup Guide

This document defines the dedicated Airtable database (`EMIE CLINIC MANAGEMENT SYSTEM`), environment variables, authentication setup, and Make.com webhook integration.

> Do **not** reuse any existing NEXORA or external Airtable base. Create a completely new Airtable Base named **`EMIE CLINIC MANAGEMENT SYSTEM`**.

---

## 1. Server Environment Variables

Configure these variables on your Node.js server (never in frontend `VITE_*` variables):

| Variable | Required | Description |
| --- | --- | --- |
| `AIRTABLE_ACCESS_TOKEN` | Yes | Airtable Personal Access Token with `data.records:read`, `data.records:write`, and `schema.bases:read` scopes restricted to the new base. |
| `AIRTABLE_BASE_ID` | Yes | Base ID (starts with `app...`) for `EMIE CLINIC MANAGEMENT SYSTEM`. |
| `MAKE_BOOKING_WEBHOOK_URL` | Recommended | Make.com Custom Webhook URL (`https://hook...make.com/...`). |
| `SESSION_SECRET` | Yes | Cryptographic secret (32+ random characters) for signing `HttpOnly` admin session cookies. |
| `SUPER_ADMIN_EMAIL` | Yes (or Setup Token) | Initial Super Admin login email. |
| `SUPER_ADMIN_PASSWORD` | Yes (or Setup Token) | Initial Super Admin password (or `SUPER_ADMIN_PASSWORD_HASH` with bcrypt). |
| `ADMIN_SETUP_TOKEN` | Optional | Secret bootstrap token enabling first-time Super Admin creation via `/api/auth/setup` into Airtable `Admin Users`. |

---

## 2. Dedicated Airtable Base Schema (`EMIE CLINIC MANAGEMENT SYSTEM`)

Create the following **8 tables** with exact table names and field names:

### Table 1 — `Clients`
| Field Name | Airtable Field Type | Notes / Options |
| --- | --- | --- |
| `Client ID` | Single line text | Unique identifier (e.g., `CLI-A1B2C3`) |
| `Full Name` | Single line text | Primary display field |
| `Phone` | Phone number | Normalized E.164 format (`+212...`) |
| `Email` | Email | Optional depending on clinic settings |
| `Preferred Language` | Single select | `fr`, `en`, `ar` |
| `Created At` | Date (include time) | ISO timestamp |
| `Updated At` | Date (include time) | ISO timestamp |
| `Internal Notes` | Long text | Restricted to Admin / Super Admin |
| `Appointments` | Link to another record | Linked to `Appointments` (auto-created inverse link) |

### Table 2 — `Appointments`
| Field Name | Airtable Field Type | Notes / Options |
| --- | --- | --- |
| `Booking Reference` | Single line text | Primary field (`EMIE-YYYYMMDD-XXXX`) |
| `Client` | Link to another record | Link to `Clients` (single link) |
| `Service` | Link to another record | Link to `Services` (single link) |
| `Preferred Date` | Date | ISO date (`YYYY-MM-DD`) |
| `Preferred Time` | Single line text | 24h time (`HH:mm`) |
| `Alternative Date` | Date | Optional |
| `Alternative Time` | Single line text | Optional |
| `Status` | Single select | `New Request`, `Pending Confirmation`, `Confirmed`, `Rescheduled`, `Completed`, `Cancelled`, `No Show` |
| `Client Message` | Long text | Optional message from booking form |
| `Preferred Language` | Single select | `fr`, `en`, `ar` |
| `Assigned Staff` | Link to another record | Link to `Staff` (single link) |
| `Created At` | Date (include time) | ISO timestamp |
| `Updated At` | Date (include time) | ISO timestamp |
| `Internal Notes` | Long text | Private staff/admin notes |
| `Cancellation Reason` | Long text | Recorded upon cancellation |
| `Confirmation Date` | Date (include time) | Populated when confirmed |
| `Notification Sent` | Checkbox | Duplicate webhook guard |
| `Notification Error` | Long text | Logs Make.com webhook failures for retry |

### Table 3 — `Services`
| Field Name | Airtable Field Type | Notes / Options |
| --- | --- | --- |
| `Service ID` | Single line text | `kinesitherapie`, `osteopathie`, `amincissement`, `cupping`, `soins-du-visage` |
| `Service Name` | Single line text | Official service name |
| `Description` | Long text | Official description |
| `Active` | Checkbox | Controls visibility in public site & booking |
| `Display Order` | Number (Integer) | `1` to `5` |
| `Duration Minutes` | Number (Integer) | Default `45` or `60` |
| `Assigned Staff` | Link to another record | Link to `Staff` |
| `Created At` | Date (include time) | ISO timestamp |
| `Updated At` | Date (include time) | ISO timestamp |

> Once connected, open **Admin Dashboard → Services** and click **Initialize 5 Official Services** to populate the 5 official EMIE CLINIC services automatically.

### Table 4 — `Staff`
| Field Name | Airtable Field Type | Notes / Options |
| --- | --- | --- |
| `Staff ID` | Single line text | `STF-XXXXXX` |
| `Full Name` | Single line text | Practitioner name |
| `Role` | Single line text | Specialty / clinical role |
| `Phone` | Phone number | Contact phone |
| `Email` | Email | Contact email |
| `Assigned Services` | Link to another record | Link to `Services` |
| `Availability` | Long text | Weekly availability text |
| `Active` | Checkbox | Enabled/disabled |
| `Created At` | Date (include time) | ISO timestamp |

### Table 5 — `Admin Users`
| Field Name | Airtable Field Type | Notes / Options |
| --- | --- | --- |
| `Admin ID` | Single line text | `ADM-XXXXXX` |
| `Full Name` | Single line text | User full name |
| `Email` | Email | Login email |
| `Password Hash` | Single line text | Bcrypt hash (`$2a$12$...`) — **never plain-text** |
| `Role` | Single select | `Super Admin`, `Admin`, `Staff` |
| `Linked Staff` | Link to another record | Link to `Staff` (used for Staff-scoped views) |
| `Active` | Checkbox | Account status |
| `Created At` | Date (include time) | ISO timestamp |

### Table 6 — `Notifications`
| Field Name | Airtable Field Type | Notes / Options |
| --- | --- | --- |
| `Notification ID` | Single line text | `NTF-XXXXXX` |
| `Notification Type` | Single select | `new_booking`, `confirmed`, `rescheduled`, `cancelled`, `integration_error`, `system` |
| `Title` | Single line text | Summary title |
| `Message` | Long text | Details |
| `Related Appointment` | Link to another record | Link to `Appointments` |
| `Recipient` | Single line text | Target role/user |
| `Read Status` | Checkbox | Read/unread flag |
| `Created At` | Date (include time) | ISO timestamp |

### Table 7 — `Activity Logs`
| Field Name | Airtable Field Type | Notes / Options |
| --- | --- | --- |
| `Log ID` | Single line text | `LOG-XXXXXX` |
| `User` | Single line text | Actor email or `Public Booking Portal` |
| `Action` | Single line text | e.g., `BOOKING_CREATED`, `APPOINTMENT_CONFIRMED` |
| `Entity Type` | Single line text | Table/entity name |
| `Entity ID` | Single line text | Record ID or Booking Reference |
| `Previous Value` | Long text | Previous state |
| `New Value` | Long text | New state |
| `Timestamp` | Date (include time) | ISO timestamp |

### Table 8 — `Clinic Settings`
| Field Name | Airtable Field Type | Notes / Options |
| --- | --- | --- |
| `Setting Name` | Single line text | Configuration key (`phone`, `address`, `openingHours`, etc.) |
| `Setting Value` | Long text | Serialized setting value |
| `Updated At` | Date (include time) | ISO timestamp |

---

## 3. Make.com Automation Webhook Setup

1. Create a new Scenario in **Make.com** with a **Webhooks → Custom webhook** trigger.
2. Copy the generated webhook URL into the server environment variable `MAKE_BOOKING_WEBHOOK_URL`.
3. The backend sends a `POST` request with `Content-Type: application/json` and headers `X-Emie-Event` and `X-Emie-Booking-Ref`:

```json
{
  "eventType": "booking_created",
  "bookingReference": "EMIE-20261118-A4F9",
  "clientName": "Salma Bennani",
  "phone": "+212600000000",
  "email": "salma@example.ma",
  "service": "Kinésithérapie",
  "preferredDate": "2026-11-25",
  "preferredTime": "10:30",
  "alternativeDate": "2026-11-26",
  "alternativeTime": "14:00",
  "message": "...",
  "preferredLanguage": "fr",
  "appointmentStatus": "Pending Confirmation",
  "createdAt": "2026-11-18T17:15:00.000Z"
}
```

4. Supported `eventType` values for Router branching in Make.com:
   - `booking_created` — Send internal alert + client acknowledgement email/WhatsApp ("Pending Confirmation").
   - `appointment_confirmed` — Send client confirmation message.
   - `appointment_rescheduled` — Notify client of updated date/time (includes `previousDate`, `previousTime`).
   - `appointment_cancelled` — Notify client and include `cancellationReason`, `cancelledBy`, `cancelledAt`.
   - `client_change_request` — Notifies clinic reception when a verified client requests a reschedule or cancellation via the self-service lookup modal.
5. Reliability guarantee: Appointments are always saved to Airtable **before** calling Make.com. If the webhook fails, the appointment stays safely in Airtable, the error is logged in `Notification Error` and `Notifications`, and administrators can retry delivery from the appointment detail panel.
6. **Note on AI Studio Project Secrets**: Adding or updating secrets (`AIRTABLE_ACCESS_TOKEN`, `AIRTABLE_BASE_ID`, etc.) in project settings requires restarting or redeploying the Node.js backend process for `process.env` to receive the updated values. Use `/api/health?probe=1` or **Settings → Verify Airtable Tables** to run a live API diagnostic check.
