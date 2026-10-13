# Vishal Chugera Properties India Pvt. Ltd. — Enquiry Form OCR System

A production-ready internal business web application that digitizes, extracts, verifies, and synchronizes physical real-estate enquiry forms using **Sarvam DocAI**, featuring side-by-side human-in-the-loop verification, duplicate detection, and reliable dual persistence to both the local database and external CRM.

---

## 1. System Architecture & Design Philosophy

- **Minimalist Business UI**: Designed with a pure white theme, charcoal text (`#111827`), restrained neutral-grey borders (`#e5e7eb`), subtle corner radii, and zero decorative clutter.
- **Human Approval is Mandatory**: Raw OCR results never touch the CRM. Confirmation requires explicit employee verification and validation before saving and synchronizing.
- **Dual Persistence Architecture**:
  - **Application Database (System of Record)**: SQLite (default, zero external setup) or PostgreSQL via Prisma ORM. Preserves raw extraction separately from human-reviewed values.
  - **CRM Integration Adapter**: Supports simulated CRM with audit trail (`mock`), HTTP JSON webhooks (`webhook`), or REST endpoints (`rest`) with idempotency keys and outbox retry logs.
- **Sarvam DocAI Backend Integration**: Direct backend integration calling `POST /doc-ai/v1/job/extract`, status polling `GET /doc-ai/v1/job/{id}/status`, and results fetching `GET /doc-ai/v1/job/{id}/results`. The API key is strictly server-side and never exposed to the browser.
- **Document Storage**: Local secure filesystem storage in `storage/documents/` with streaming endpoint `/api/documents/[id]`.

---

## 2. The 20 Physical Enquiry Form Fields

Implemented to match the physical paper enquiry form of Vishal Chugera Properties:

### Customer & Identification
1. **Enquiry Date** — Date written on the physical form (`DD/MM/YYYY` or `YYYY-MM-DD`).
2. **Lead ID** — Preserves existing handwritten/stamped Lead ID, or generates `VCP-YYYY-XXXXX`.
3. **Customer Name** — Required string, preserved handwritten letters.
4. **Contact Number** — Required string, minimum 10 digits without altering digits.
5. **Email ID** — Optional string with email syntax validation.
6. **Occupation** — Enum: `Self Employed`, `Salaried`, `Professional`, `Other`.
7. **Occupation (Other)** — Text specification if Other is chosen.
8. **Company Name** — Optional string.
9. **Designation** — Optional job title.
10. **Address** — Multiline residential or office address.

### Lead Source & Intent
11. **Lead Source** — Enum: `Newspaper`, `Website`, `Referral`, `Hoardings`, `Channel Partner`, `Other`.
12. **Lead Source (Other)** — Text specification if Other is chosen.
13. **Booking Timeline** — Enum: `Now`, `Within a week`, `Within a month`, `After a month or more`.
14. **Requires Bank Finance** — Enum: `Yes`, `No`, `Unknown` (conservative unchecked box handling).

### Client Acknowledgement
15. **Client Signature** — Verified presence on paper document (never treated as plain text).

### Office Use Only (Staff Section)
16. **Office Date** — Kept empty if not written on paper. Never replaced with system timestamps.
17. **Office Time** — Kept empty if not written on paper.
18. **Allocated To** — Assigned sales executive name.
19. **Attended By** — Attending staff member name.
20. **Office Remarks** — Handwritten staff notes.

---

## 3. Environment Variables Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | Prisma database connection string. | `file:./dev.db` |
| `SARVAM_API_KEY` | Sarvam subscription key (`api-subscription-key`). | *(Blank for development fixture mode)* |
| `SARVAM_CONFIG_ID` | Optional reusable Sarvam DocAI configuration ID. | *(Blank uses inline JSON schema)* |
| `CRM_TYPE` | CRM adapter type: `mock`, `webhook`, or `rest`. | `mock` |
| `CRM_ENDPOINT_URL` | Target CRM REST or Webhook URL. | *(Optional)* |
| `CRM_API_KEY` | Target CRM Bearer token or API key. | *(Optional)* |
| `CONFIDENCE_THRESHOLD` | Threshold below which confidence badge warns employee. | `0.75` |

> **Development Mode / Offline Testing**: When `SARVAM_API_KEY` is not provided, the application automatically runs in a clearly-labelled **Development Fixture Mode**, enabling full end-to-end testing with the bundled Vishal Chugera Properties sample form (`image.png`). When an API key is provided, live HTTP requests are sent to `https://api.sarvam.ai`.

---

## 4. Setup & Running the Application

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Database (Prisma)
```bash
npx prisma db push
npx prisma generate
```

To switch to PostgreSQL:
1. Change `provider = "postgresql"` in `prisma/schema.prisma`.
2. Set `DATABASE_URL="postgresql://user:password@localhost:5432/vcp_ocr?schema=public"` in `.env`.
3. Run `npx prisma db push`.

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3002](http://localhost:3002) in your browser.

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## 5. Key Workflows Tested

1. **Upload & Ingestion**:
   - Supports file picker, drag-and-drop, and mobile camera capture (`capture="environment"`).
   - "Quick Test with Sample Form" loads the included real enquiry form (`image.png`).
   - File format and 50MB size validation on client and server.
2. **Sarvam DocAI Extraction**:
   - Structured JSON schema payload with conservative extraction instructions.
   - Job submission and status polling until terminal state (`completed`, `partially_completed`, `failed`).
   - Normalization into typed enquiry fields and separate raw extraction persistence.
3. **Side-by-Side Review Workspace**:
   - Desktop (>= 1024px): Interactive Document Viewer on left (zoom, 90° rotate, pan, download) and 20-field editable form on right.
   - Mobile (< 1024px): Responsive segmented control (`Original Document`, `Digital Form (20 Fields)`, `Stacked View`) with zero horizontal overflow.
   - Field-level confidence badges (`conf >= 75%` in green, `conf < 75%` highlighted in amber).
4. **Duplicate Warning**:
   - Real-time duplicate detection on phone number, lead ID, and email. Displays matched records and prevents silent overwriting.
5. **Human Confirmation & Dual Persistence**:
   - Saves verified enquiry to application database.
   - Synchronizes record to CRM with unique idempotency key (`SHA256(enquiryId + confirmedAt)`).
   - Records CRM sync attempt, request payload, response, and external record ID in `CrmSyncLog`.
   - "Retry CRM Sync" action available for failed synchronizations.
