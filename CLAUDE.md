# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
```

No test suite exists. Verify behavior by calling the API routes directly with `node` scripts using `fetch()` — never use shell `curl` with UTF-8 strings (Spanish accented characters get corrupted in the Windows terminal).

## Architecture

This is a Next.js 16 App Router app that uses an Excel file (`data/cursos.xlsx`) as its live read/write database. There is no SQL database or ORM.

### Role-based workflow

Three roles drive a state machine for course virtualization tracking:

- **Gestor**: records when content work starts/finishes (`inicio_contenido` → `enviado` → `corregido`)
- **Diseñador Instruccional (DI)**: records review start/end and approval/rejection (`inicio_revision` → `aprobado` or `devuelto`)
- **Super Admin**: view-only dashboard at `/admin`

All valid state transitions and their Excel column writes are defined in `config/estados.ts`. Each `EstadoOption.updates` maps an Excel column name to either a literal string or `'__TODAY__'` (replaced with `new Date()` in the API route).

### Excel I/O (`lib/excel.ts`)

The xlsx package is marked as a `serverExternalPackage` in `next.config.ts` so it runs only server-side.

The Excel sheets have **merged cells** for `Programa` and `Modalidad` — the actual cell value only appears on the first row of the group. `readSheet()` forward-fills these with `_programa` and `_modalidad` shadow fields on every row.

**Critical**: `updateCourse()` must use `readSheet()` (the `sheet_to_json` path) to locate the target row index, then map it back to the raw worksheet row as `range.s.r + 1 + logicalIdx`. Direct header-map cell scanning does not work reliably in the Next.js compiled context.

Column name matching uses `normalizeColName()` (strips diacritics, lowercases, trims) and a `COL_ALIASES` table to handle inconsistencies like trailing spaces (`'Gestor responsable '`) and alternate names across sheets.

### API routes

| Route | Purpose |
|---|---|
| `GET /api/data` | Dropdown data — `?type=gestores\|dis\|programas\|cursos&nivel=X&programa=Y` |
| `GET /api/course-info` | Current state of one course — `?nivel=X&programa=Y&asignatura=Z` |
| `POST /api/update` | Apply a state transition — body: `{rol, responsable, nivel, programa, curso, estadoId}` |
| `POST /api/send-email` | Send notification emails via nodemailer |
| `GET /api/admin` | All courses across all sheets for the admin dashboard |

### UI (`components/`)

`FormWizard.tsx` is the root client component. It owns all form state and orchestrates three steps:

1. **InformacionStep** — role/person/nivel/programa/curso dropdowns (cascading fetches)
2. **EstadoStep** — radio-card selection from `ESTADOS_GESTOR` or `ESTADOS_DI`
3. **ConfirmarStep** — summary + email recipients + optional message

On confirm, the wizard calls `/api/update` first, then `/api/send-email` if there are recipients. Super Admin selection on step 1 redirects directly to `/admin` instead of advancing the wizard.

### Cascading dropdowns (`components/steps/InformacionStep.tsx`)

`InformacionStep` uses three `useEffect` hooks that fetch from `/api/data` whenever upstream form state changes: rol → responsables list, nivel → programas list, programa → cursos list. All selections are controlled by `FormState` in `FormWizard` — resetting a parent field clears the children (e.g., changing nivel wipes programa and curso). This means testing the UI via vanilla JS requires triggering React's internal fiber onChange, not just native DOM events.

### Personnel (`config/personas.json`)

Source of truth for Gestor and DI names and email addresses. `NEXT_PUBLIC_MY_EMAIL` in `.env.local` is the logged-in user's address for the "send copy to me" checkbox.

### Email (`lib/email.ts`)

Reads `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` from env. If `SMTP_USER` or `SMTP_PASS` are empty, email is silently skipped (the update still succeeds).

### Environment variables (`.env.local`)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=                  # required for email; leave blank to skip
SMTP_PASS=                  # app password, not account password
NEXT_PUBLIC_MY_EMAIL=       # address pre-filled for "send copy to me"
```
