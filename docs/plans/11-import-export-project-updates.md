# Plan 11 — Import/Export Upgrade + Project Updates

**Goal:** agencies bring their existing Excel sheets in without reformatting them, get Excel back out, and keep the whole sales team current on project news (prices, launches, availability).
**Order:** eleventh.
**Status:** ☑ complete

---

## 1. Lead import ✅

- `POST /import-jobs/preview {fileAssetId}` (`import-job.create`, plan `importExport`): reads the file and returns headers, the first 10 rows, the row count, every importable field (core + active custom fields) and a **suggested mapping**.
  - Headers are matched in Arabic and English after normalising case, spaces, punctuation, diacritics and أ/إ/آ, ة/ه, ى/ي variants (`الاسم`، `رقم الموبايل`، `الجوال`، `المصدر`، `المشروع`، `الميزانية`، `ملاحظات`, `Phone 2`, …). Exact matches first, then the longest contained synonym; one column per field. The old template headers (`fullName`, `primaryPhone`, …) still work.
- `POST /import-jobs/leads {fileAssetId, mapping?, defaults?, duplicatePolicy?}`
  - `mapping`: field → zero-based column (`cf:<key>` for custom fields). Omitted: auto-matched when the job runs (old clients keep working).
  - `defaults`: `sourceId`, `pipelineId`/`stageId`, `projectId`, `assignedUserId`; a value in the row wins.
  - `duplicatePolicy`: `SKIP` (default; counted in `skippedRows`, listed as `kind: "duplicate"`) or `CREATE`.
- Files: **.xlsx** (exceljs, first sheet) and **.csv** (UTF-8, falls back to Windows-1256 for Arabic Excel exports). Max 10,000 rows.
- Cell clean-up: Arabic-Indic digits; the trunk zero Excel drops from numeric phone cells is restored for the workspace country (`1012345678` → `01012345678`); budgets like `1,500,000`, `2.5M`, `٣ مليون`; projects split on `, ، ; | /`; custom fields coerced (yes/no/نعم/لا, day-first dates, options matched case-insensitively) and validated with the same rules as the lead form.
- Sources are matched by name and created when new (≤ 50 per job); projects matched by name; agents by email or unique name, and only inside the importer's scope.
- Imported notes become a lead note; unassigned leads go through round-robin when auto-assign is on (imports did not trigger it before).
- **Retry safety:** `Lead.importJobId + importRowNumber` is unique. A worker retry re-claims the `PROCESSING` job and skips rows already imported — no duplicates (closes the "import retry can duplicate leads" gap).
- Guard rails: an import file can only be previewed/used by its uploader unless the user has `lead.read-all`; mapping an assignee column or a default assignee needs `lead.assign`.

## 2. Duplicate detection across phone formats ✅

- `phoneMatchVariants()` treats `010…`, `+2010…`, `2010…` and `002010…` as one number (workspace country; EG, SA, AE, KW, QA, BH, OM, JO, LB, MA). Used by lead create/update warnings, import duplicate checks and the inbound webhook ownership rule. Stored values are unchanged, so no data migration.

## 3. Export ✅

- `format: "XLSX"` (text phones keep leading zeros, frozen header, auto-filter, real dates) alongside CSV.
- Both formats add `Budget From`, `Budget To` and one column per active custom field.

## 4. Project updates ✅

- `ProjectUpdate` (`PRICE_CHANGE | NEW_PHASE | AVAILABILITY | GENERAL`, title, body).
- `GET /project-updates` (feed, cursor `before`), `GET /projects/:id/updates` (`project.read`); `POST` / `DELETE /projects/:id/updates/:updateId` (`project.update`, audited).
- New notification type `PROJECT_UPDATE` (preference category **Project updates**) to every active user who can read projects, except the author; `notify: false` posts silently. Price changes are high priority.

## 5. Project files library ✅

- `PROJECT_BROCHURE` uploads attached to a project (`projectId`), for brochures, price sheets and floor plans. Uploading and deleting need `project.update`; everyone with `file.read` can list (`GET /files?projectId=`) and download.

## 6. Web ✅

- Import is a 3-step wizard: upload (.xlsx/.csv) → match columns (per-field selects, example values, preview table showing what is and isn't imported, warning for unmapped required custom fields) → review (defaults, duplicate policy) → start. Import details show skipped duplicates.
- Export dialog: Excel or CSV.
- Projects: clicking a project opens a drawer with **Updates** (post, list, delete) and **Files** (upload, download, delete). Deep link `/projects?projectId=…&tab=updates` (used by notifications and Today).
- Today: "Latest project updates" widget.
- Notifications: icons/links for `PROJECT_UPDATE`, `SLA_BREACHED`, `LEAD_RESUBMITTED`.

## Seed
Three demo project updates (Mivida price change, Palm Hills phase launch, Madinaty availability).

**Accept (verified live):** an .xlsx with Arabic headers imported with columns auto-matched, `1012345678` stored as `01012345678`, `2.5M` as 2,500,000, project/source linked and the lead round-robin assigned; a row whose phone matched a seeded `+20…` lead was skipped as a duplicate; the row without a phone failed with "Missing phone". XLSX export opened with Arabic names and custom/budget columns. Agents get 403 on posting updates and on uploading/deleting project files, but receive the update notification and see the files.

---

## Out of scope
Updating existing leads from a file (merge), multi-sheet workbooks, scheduled imports, attachments on updates.

## Definition of done
An agency can import its own Excel sheet as-is, export to Excel, and broadcast project news and files to the team.
