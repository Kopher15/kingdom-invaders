# spec.md — FCA CVR Sprints 6–8

> Architect: Claude · Code Engine: DeepSeek · Bridge: Kopher Ken
> Stack: Static HTML/CSS/JS (GitHub Pages) · Apps Script · Google Sheets · Google Drive
> Conventions: snake_case sheets · camelCase JS · kebab-case HTML IDs · `--kebab-case` CSS vars

---

## 1. Scope

| Sprint | Items | Theme |
|---|---|---|
| **S6 — Manage & Player Detail** | 5, 8 | Admin CRUD polish + player drill-down |
| **S7 — Attendance Flow** | 6 | Bulk attendance roster UX |
| **S8 — Calendar + Analytics** | 7, 11, 13 | Month calendar + admin Dashboard page |

(Item 10 — Mobile FAB — explicitly deferred.)

---

## 2. Entities (Sheet Schema Changes)

### 2.1 `users` — add column
| Column | Type | Notes |
|---|---|---|
| `status` | `"active"` \| `"inactive"` | Default `"active"`. Soft delete sets to `"inactive"`. |

### 2.2 No new sheets
All analytics computed on-the-fly from existing `attendance`, `events`, `players`, `users`, `photos`.

### 2.3 Default values for existing rows
`status` column must default to `"active"` for all existing users on first deploy. Migration handled by a one-off function `migrateUserStatus()`.

---

## 3. API Contracts (New / Modified Apps Script Actions)

### S6
| Action | Method | Auth | Params | Returns |
|---|---|---|---|---|
| `deleteVolunteer` | POST | admin | `{ token, user_id }` | `{ success: true }` — sets `status="inactive"` |
| `restoreVolunteer` | POST | admin | `{ token, user_id }` | `{ success: true }` — sets `status="active"` |
| `getPlayerDetail` | GET | any logged-in | `?action=getPlayerDetail&player_id=X&token=T` | `{ player, attendance:[…], stats:{ attended, total, pct } }` |

`handleGetStaffing_` and any user-listing handlers must **filter out `status="inactive"`** by default. Add `?include_inactive=1` flag for admin's "show inactive" toggle.

### S7
| Action | Method | Auth | Params | Returns |
|---|---|---|---|---|
| `getEventRoster` | GET | any logged-in | `?action=getEventRoster&event_id=X&token=T` | `{ event, players:[{player_id, full_name, present, praises, prayer_requests}] }` — pre-loaded from existing attendance rows if any |
| `submitBulkAttendance` | POST | any logged-in | `{ token, event_id, records:[{player_id, present, praises, prayer_requests}] }` | `{ success: true, saved: N }` |

`submitBulkAttendance` upserts: if a record exists for `(event_id, player_id)`, update; else insert. Records with `present=false` are still saved (used for attendance %).

### S8
| Action | Method | Auth | Params | Returns |
|---|---|---|---|---|
| `getCalendarEvents` | GET | any logged-in | `?action=getCalendarEvents&year=YYYY&month=MM&token=T` | `[{ event_id, date, time, campus_id, campus_name, category_name, topic_title }]` |
| `getDashboardStats` | GET | admin | `?action=getDashboardStats&from=YYYY-MM-DD&to=YYYY-MM-DD&token=T` | `{ totals:{events,players,attendance_pct}, perCampus:[{campus_id,campus_name,events,attendance_pct,unique_players}], volunteerActivity:[{user_id,full_name,events_count,last_active}] }` |

---

## 4. UI Spec per Sprint

### Sprint 6 — Manage & Player Detail

**`manage.html`**
- Volunteer row: add **Delete** button (red, small) next to existing Edit.
- Click → confirm modal "Deactivate {name}? They will no longer appear in staffing/lists but their history is preserved."
- Add toggle at top of Volunteers section: **"Show inactive"** (admin only) — when on, fetches with `include_inactive=1`, renders inactive rows greyed out with a **Restore** button instead of Delete.

**`players.html`**
- Each player card/row becomes clickable → opens **Player Detail modal**.
- Modal contents:
  - Header: full name · campus · category · date registered
  - Stats strip: `Attended X / Y events · Z% attendance`
  - Attendance history table (date, event type, praises, prayer requests) sorted desc.
  - Close button.
- Mobile: modal goes fullscreen <600px.

### Sprint 7 — Bulk Attendance

**`attendance.html`** (or new flow accessible from Calendar event)
- Step 1: pick event (existing event dropdown).
- Step 2: page renders **Roster** — table:

| Player | Present | Praise | Prayer Request |
|---|---|---|---|
| Juan Cruz | ☑ | _input_ | _input_ |
| Maria Santos | ☐ | _input_ | _input_ |

- "Mark all present" button at top.
- "Save All" button at bottom — calls `submitBulkAttendance`, shows toast `Saved N records`.
- Pre-loads existing values from prior submissions (edit mode).
- Mobile: table collapses to card-per-player layout <600px.

### Sprint 8 — Calendar + Dashboard

**`calendar.html` — new month view**
- Top bar: ← Month YYYY → buttons · "Today" button · campus filter dropdown.
- Desktop/tablet (≥600px): 7-column grid, days 1–31. Each day cell shows colored event dots (1 color per campus). Hover dot → tooltip with event title.
- Click a day → modal list of that day's events.
- Mobile (<600px): vertical list grouped by date headers, each event shown with colored left border = campus color.
- Campus color palette (CSS vars, signed off — clean, high-contrast, complementary): `--cal-c1:#14B8A6` (teal), `--cal-c2:#F97316` (orange), `--cal-c3:#A855F7` (purple), `--cal-c4:#3B82F6` (blue), `--cal-c5:#EC4899` (pink). Assigned in order of `campuses` sheet.

**`dashboard.html` — new page, admin-only**
- Sidebar nav link **Dashboard** placed **directly below Home** (admin-only).
- Date range pills: **This week · Last 30 days (default) · Last 90 days · This year · All time** · custom date inputs.
- Section 1 — **Totals**: 3 stat cards (Events, Players, Avg Attendance %).
- Section 2 — **Per Campus** bar chart: events count + attendance % per campus.
  - Use vanilla SVG bars (no chart library, keeps it dependency-free per ARCHITECT.md "Vanilla").
- Section 3 — **Volunteer Activity** table: rank by `events_count`, columns: Name · Events covered · Last active date.

---

## 5. Frontend / Backend Files Touched

| Sprint | Files |
|---|---|
| S6 | `Code.gs` (deleteVolunteer, restoreVolunteer, getPlayerDetail, filter status), `manage.html`, `players.html`, `css/style.css` (modal styles if not already present) |
| S7 | `Code.gs` (getEventRoster, submitBulkAttendance), `attendance.html`, `css/style.css` (roster table) |
| S8 | `Code.gs` (getCalendarEvents, getDashboardStats), `calendar.html`, `dashboard.html` (new), all HTML nav lists (add Dashboard link with `admin-only` class), `css/style.css` (calendar grid + dashboard cards/SVG bars) |

---

## 6. Verification Checklists

### S6
- [ ] `migrateUserStatus()` ran once; all existing users have `status="active"`
- [ ] Delete a volunteer → no longer appears in staffing list or volunteer dropdowns
- [ ] Their historical attendance/photo records still display correctly (lookup by user_id works)
- [ ] "Show inactive" toggle reveals deactivated users with Restore button
- [ ] Restore re-activates and they show in lists again
- [ ] Player Detail modal opens on player click, shows correct attendance count + %
- [ ] Modal closes via X, Esc, and backdrop click
- [ ] Mobile <600px: modal fullscreen, no horizontal scroll

### S7
- [ ] Event roster loads all players in event's category
- [ ] Mark-all-present toggles every checkbox in one click
- [ ] Save All persists; reload restores state from sheet
- [ ] Editing an already-saved attendance updates the row (no duplicates)
- [ ] `attendance_pct` calculated correctly: present rows / total roster rows for that event
- [ ] Mobile <600px: roster renders as cards, fully usable on phone

### S8
- [ ] Calendar grid shows events on correct dates
- [ ] Campus filter narrows visible events
- [ ] Month nav (← →) loads new data via `getCalendarEvents`
- [ ] Click day → modal lists that day's events
- [ ] Mobile <600px: switches to vertical list grouping
- [ ] Dashboard date range pills swap data correctly
- [ ] Bar chart bars scale correctly relative to max value
- [ ] Volunteer activity sorted desc by events_count
- [ ] Dashboard hidden from non-admin sidebar (`admin-only` class)
- [ ] All views render on 375px screen with no overflow

---

## 7. Hard Rules Compliance (per ARCHITECT.md)

- ✅ No code before sign-off
- ✅ One sprint at a time
- ✅ No rewrite of approved files — only Edit-tool patches on existing
- ✅ Ask, never assume — Discovery completed
- ✅ Verification checklists above
- ✅ No credentials in code
- ✅ Mobile-first verified at 375px in each sprint's checklist

---

## 8. Sign-Off — APPROVED 2026-05-15

1. ✅ Sprint order: **S6 → S7 → S8**
2. ✅ Campus palette: teal/orange/purple/blue/pink (high-contrast, easy to identify)
3. ✅ Dashboard nav link: **directly below Home**
4. ✅ "Show inactive" toggle: **above Volunteers list**

Proceeding to Sprint 6 Handoff Prompt.
