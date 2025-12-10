Below is a complete package you can drop into your project:

* RLS policies for public form submission
* Zod schemas for frontend validation
* Supabase RPC functions for inserts
* Drizzle ORM models matching your SQL schema

I’ll assume the tables are exactly as defined earlier:

* `contact_forms`
* `waitlist`
* `refill_requests`
* `transfer_requests`
* `splash_modal_signups`

---

## 1. RLS policies for public form submission

Goal:

* `anon` and `authenticated` can `INSERT`
* No one (except `service_role`) can `SELECT`, `UPDATE`, or `DELETE` by default

```sql
-- Enable RLS
alter table contact_forms enable row level security;
alter table waitlist enable row level security;
alter table refill_requests enable row level security;
alter table transfer_requests enable row level security;
alter table splash_modal_signups enable row level security;

-- Optional: drop any default permissive policies if they exist
-- (Uncomment if you already created policies)
-- drop policy if exists "Allow all" on contact_forms;
-- ...

/* ============================================
   CONTACT FORMS
   ============================================ */

create policy "Allow inserts for public (contact_forms)"
  on contact_forms
  for insert
  to anon, authenticated
  with check (true);

/* ============================================
   WAITLIST
   ============================================ */

create policy "Allow inserts for public (waitlist)"
  on waitlist
  for insert
  to anon, authenticated
  with check (true);

/* ============================================
   REFILL REQUESTS
   ============================================ */

create policy "Allow inserts for public (refill_requests)"
  on refill_requests
  for insert
  to anon, authenticated
  with check (true);

/* ============================================
   TRANSFER REQUESTS
   ============================================ */

create policy "Allow inserts for public (transfer_requests)"
  on transfer_requests
  for insert
  to anon, authenticated
  with check (true);

/* ============================================
   SPLASH MODAL SIGNUPS
   ============================================ */

create policy "Allow inserts for public (splash_modal_signups)"
  on splash_modal_signups
  for insert
  to anon, authenticated
  with check (true);
```

Unless you add additional `SELECT/UPDATE/DELETE` policies, public clients will not be able to read or change stored submissions.

---

## 2. Zod schemas for frontend validation

These mirror your TypeScript interfaces and the DB types.
You can adjust strictness (e.g., require `consent === true`) as needed.

```ts
import { z } from "zod";

/* ============================================
   Shared enums
   ============================================ */

export const ContactReasonSchema = z.enum([
  "general",
  "new",
  "transfer",
  "refill",
  "rpm",
]);

export const WaitlistStatusSchema = z.enum([
  "active",
  "contacted",
  "enrolled",
]);

export const ServicePreferenceSchema = z.enum([
  "pickup",
  "delivery",
]);

/* Simple helpers */

const phoneSchema = z
  .string()
  .min(7, "Phone number is too short")
  .max(30, "Phone number is too long");

const emailSchema = z
  .string()
  .email("Invalid email address");

/* ============================================
   ContactFormData
   ============================================ */

export const ContactFormDataSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: phoneSchema,
  email: emailSchema,
  reason: ContactReasonSchema,
  message: z.string().min(1, "Message is required"),
  consent: z.boolean(),
  // If you want to enforce explicit opt-in:
  // consent: z.literal(true, { errorMap: () => ({ message: "Consent is required" }) }),
});

export type ContactFormData = z.infer<typeof ContactFormDataSchema>;

/* ============================================
   WaitlistFormData & WaitlistEntry
   ============================================ */

export const WaitlistFormDataSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: emailSchema,
  phone: phoneSchema,
});

export type WaitlistFormData = z.infer<typeof WaitlistFormDataSchema>;

export const WaitlistEntrySchema = WaitlistFormDataSchema.extend({
  id: z.string().uuid(),
  timestamp: z.string(), // will typically be ISO string of created_at
  status: WaitlistStatusSchema,
});

export type WaitlistEntry = z.infer<typeof WaitlistEntrySchema>;

/* ============================================
   RefillFormData
   ============================================ */

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const RefillFormDataSchema = z.object({
  patientName: z.string().min(1, "Patient name is required"),
  dob: dateStringSchema,
  phone: phoneSchema,
  email: emailSchema.optional().or(z.literal("").transform(() => undefined)),
  prescriptionNumbers: z.string().min(1, "Prescription numbers are required"),
  medicationNames: z.string().min(1, "Medication names are required"),
  preferredService: ServicePreferenceSchema,
  notes: z.string().optional(),
  consent: z.boolean(),
});

export type RefillFormData = z.infer<typeof RefillFormDataSchema>;

/* ============================================
   TransferFormData
   ============================================ */

export const TransferFormDataSchema = z.object({
  rxNumber: z.string().min(1, "Rx number is required"),
  rxFillDate: dateStringSchema,

  transferToPharmacyName: z.string().min(1),
  transferToPharmacyAddress1: z.string().min(1),
  transferToPharmacyAddress2: z.string().optional(),
  transferToPharmacyCity: z.string().min(1),
  transferToPharmacyState: z.string().min(2),
  transferToPharmacyZip: z.string().min(3),
  transferToPharmacyPhone: phoneSchema,
  transferToPharmacyNCPDP: z.string().optional(),

  transferRxRemark: z.string().optional(),
  consent: z.boolean(),
});

export type TransferFormData = z.infer<typeof TransferFormDataSchema>;

/* ============================================
   SplashModalFormData
   ============================================ */

export const SplashModalFormDataSchema = z.object({
  email: emailSchema,
});

export type SplashModalFormData = z.infer<typeof SplashModalFormDataSchema>;
```

---

## 3. Supabase RPC functions (SQL)

These are convenient wrappers you can call via `supabase.rpc`.
They honor RLS (no `security definer`), and simply insert and return the new row’s `id`.

```sql
/* ============================================
   Contact form RPC
   ============================================ */

create or replace function public.submit_contact_form(
  p_name text,
  p_phone text,
  p_email text,
  p_reason contact_reason,
  p_message text,
  p_consent boolean
)
returns uuid
language sql
as $$
  insert into contact_forms (
    name,
    phone,
    email,
    reason,
    message,
    consent
  )
  values (
    p_name,
    p_phone,
    p_email,
    p_reason,
    p_message,
    p_consent
  )
  returning id;
$$;


/* ============================================
   Waitlist RPC
   ============================================ */

create or replace function public.submit_waitlist_entry(
  p_name text,
  p_email text,
  p_phone text
)
returns uuid
language sql
as $$
  insert into waitlist (
    name,
    email,
    phone
  )
  values (
    p_name,
    p_email,
    p_phone
  )
  returning id;
$$;


/* ============================================
   Refill requests RPC
   ============================================ */

create or replace function public.submit_refill_request(
  p_patient_name text,
  p_dob date,
  p_phone text,
  p_email text,
  p_prescription_numbers text,
  p_medication_names text,
  p_preferred_service service_preference,
  p_notes text,
  p_consent boolean
)
returns uuid
language sql
as $$
  insert into refill_requests (
    patient_name,
    dob,
    phone,
    email,
    prescription_numbers,
    medication_names,
    preferred_service,
    notes,
    consent
  )
  values (
    p_patient_name,
    p_dob,
    p_phone,
    nullif(p_email, ''),
    p_prescription_numbers,
    p_medication_names,
    p_preferred_service,
    p_notes,
    p_consent
  )
  returning id;
$$;


/* ============================================
   Transfer requests RPC
   ============================================ */

create or replace function public.submit_transfer_request(
  p_rx_number text,
  p_rx_fill_date date,
  p_transfer_to_pharmacy_name text,
  p_transfer_to_pharmacy_address1 text,
  p_transfer_to_pharmacy_address2 text,
  p_transfer_to_pharmacy_city text,
  p_transfer_to_pharmacy_state text,
  p_transfer_to_pharmacy_zip text,
  p_transfer_to_pharmacy_phone text,
  p_transfer_to_pharmacy_ncpdp text,
  p_transfer_rx_remark text,
  p_consent boolean
)
returns uuid
language sql
as $$
  insert into transfer_requests (
    rx_number,
    rx_fill_date,
    transfer_to_pharmacy_name,
    transfer_to_pharmacy_address1,
    transfer_to_pharmacy_address2,
    transfer_to_pharmacy_city,
    transfer_to_pharmacy_state,
    transfer_to_pharmacy_zip,
    transfer_to_pharmacy_phone,
    transfer_to_pharmacy_ncpdp,
    transfer_rx_remark,
    consent
  )
  values (
    p_rx_number,
    p_rx_fill_date,
    p_transfer_to_pharmacy_name,
    p_transfer_to_pharmacy_address1,
    p_transfer_to_pharmacy_address2,
    p_transfer_to_pharmacy_city,
    p_transfer_to_pharmacy_state,
    p_transfer_to_pharmacy_zip,
    p_transfer_to_pharmacy_phone,
    p_transfer_to_pharmacy_ncpdp,
    p_transfer_rx_remark,
    p_consent
  )
  returning id;
$$;


/* ============================================
   Splash modal signup RPC
   ============================================ */

create or replace function public.submit_splash_modal_signup(
  p_email text
)
returns uuid
language sql
as $$
  insert into splash_modal_signups (email)
  values (p_email)
  returning id;
$$;
```

Client usage example:

```ts
const { data, error } = await supabase.rpc("submit_contact_form", {
  p_name: values.name,
  p_phone: values.phone,
  p_email: values.email,
  p_reason: values.reason,
  p_message: values.message,
  p_consent: values.consent,
});
```

`data` will be the UUID of the inserted row.

---

## 4. Drizzle ORM models (Postgres / Supabase)

Assuming Drizzle with `pg-core`:

```ts
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  pgEnum,
} from "drizzle-orm/pg-core";

/* ============================================
   Enums
   ============================================ */

export const contactReason = pgEnum("contact_reason", [
  "general",
  "new",
  "transfer",
  "refill",
  "rpm",
]);

export const waitlistStatus = pgEnum("waitlist_status", [
  "active",
  "contacted",
  "enrolled",
]);

export const servicePreference = pgEnum("service_preference", [
  "pickup",
  "delivery",
]);

/* ============================================
   Tables
   ============================================ */

export const contactForms = pgTable("contact_forms", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  reason: contactReason("reason").notNull(),
  message: text("message").notNull(),
  consent: boolean("consent").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const waitlist = pgTable("waitlist", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  status: waitlistStatus("status").notNull().default("active"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const refillRequests = pgTable("refill_requests", {
  id: uuid("id").defaultRandom().primaryKey(),

  patientName: text("patient_name").notNull(),
  dob: date("dob").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  prescriptionNumbers: text("prescription_numbers").notNull(),
  medicationNames: text("medication_names").notNull(),

  preferredService: servicePreference("preferred_service").notNull(),
  notes: text("notes"),
  consent: boolean("consent").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const transferRequests = pgTable("transfer_requests", {
  id: uuid("id").defaultRandom().primaryKey(),

  rxNumber: text("rx_number").notNull(),
  rxFillDate: date("rx_fill_date").notNull(),

  transferToPharmacyName: text("transfer_to_pharmacy_name").notNull(),
  transferToPharmacyAddress1: text("transfer_to_pharmacy_address1").notNull(),
  transferToPharmacyAddress2: text("transfer_to_pharmacy_address2"),
  transferToPharmacyCity: text("transfer_to_pharmacy_city").notNull(),
  transferToPharmacyState: text("transfer_to_pharmacy_state").notNull(),
  transferToPharmacyZip: text("transfer_to_pharmacy_zip").notNull(),
  transferToPharmacyPhone: text("transfer_to_pharmacy_phone").notNull(),
  transferToPharmacyNcpdp: text("transfer_to_pharmacy_ncpdp"),

  transferRxRemark: text("transfer_rx_remark"),
  consent: boolean("consent").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const splashModalSignups = pgTable("splash_modal_signups", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* ============================================
   Type helpers
   ============================================ */

export type ContactForm = typeof contactForms.$inferSelect;
export type NewContactForm = typeof contactForms.$inferInsert;

export type WaitlistRow = typeof waitlist.$inferSelect;
export type NewWaitlistRow = typeof waitlist.$inferInsert;

export type RefillRequestRow = typeof refillRequests.$inferSelect;
export type NewRefillRequestRow = typeof refillRequests.$inferInsert;

export type TransferRequestRow = typeof transferRequests.$inferSelect;
export type NewTransferRequestRow = typeof transferRequests.$inferInsert;

export type SplashModalSignupRow = typeof splashModalSignups.$inferSelect;
export type NewSplashModalSignupRow = typeof splashModalSignups.$inferInsert;
```

---

If you want, next step I can:

* Wire up example React hooks (`useContactForm`, `useRefillForm`) that integrate Zod + React Hook Form + Supabase RPC, using these schemas and functions end-to-end.
