# CLAUDE.md — Barries ERPNext app context

This file is read by AI coding assistants (Claude Code, Cursor, Cowork, etc.) at the start of a session. Keep it accurate and up-to-date as the project evolves.

## What is this?

`barries` is a custom Frappe app sitting on top of ERPNext, used at **Barrie's Ski and Sports** (a ski shop in Edmonton). The shop sells a mix of **new and used equipment** — skis, ski boots, e-bikes, analog bikes, watercraft, and more categories over time. The app bundles store-specific overrides, print formats, and pages that aren't available in stock ERPNext, plus the data model and workflows for Barrie's specific identity / pricing / used-equipment tracking needs.

Repo: <https://github.com/Barries-Development-Team/frappe-barries>
**Primary branch: `main`.** All feature branches cut off `main`, all PRs target `main`, branches are deleted after merge.
PR reviewer: **Carter**. All work goes through PR review — don't push directly to `main`, don't merge your own PRs.

> **Recent transition.** Until ~early May 2026, this team treated `Oscar-ClaudPrint` as the de facto main branch (with a literal `main` that was unused). That branch was squash-merged into actual `main` and deleted. If you see `Oscar-ClaudPrint` referenced in older commits or older copies of this file, that's why — `main` is the canonical primary now.

## Current state

- **Implemented and merged:** the ClaudPrint feature — bulk price-tag and swap-tag printing pages, two print formats, QZ Tray signing pipeline, Item / Purchase Receipt overrides supporting the print workflow.
- **Designed but not yet implemented:** the Item / Pricing data model in `design/phase-0-1-item-and-pricing.md`. When implementing, follow that doc.
- **Designed and not started:** Phase 2 (ingestion), Phase 3 (receiving), Work Orders. Specs not yet written.

## Environment

- **Host OS:** Windows 11 with WSL2 (Ubuntu).
- **Bench manager:** [Frappe Manager (`fm`)](https://github.com/rtcamp/frappe-manager) — wraps bench in Docker Compose.
- **Site:** `barriesdev.localhost` — accessible at <http://barriesdev.localhost> after `fm start`.
- **Bench path on host:** `~/frappe/sites/barriesdev.localhost/workspace/frappe-bench/`
- **App path on host:** `~/frappe/sites/barriesdev.localhost/workspace/frappe-bench/apps/barries/`
- **Container shell:** `fm shell barriesdev.localhost` drops into the container where `bench` commands run.

The bench's Python venv lives **inside** the container (`/workspace/.pyenv/...`). Symlinks at `apps/barries/env/bin/python` look broken from the host — that's expected. Always run `bench` commands inside `fm shell`.

The git working copy lives at `/mnt/c/dev/frappe-barries/` in WSL (`C:\dev\frappe-barries\` from Windows). It is **not** inside OneDrive — see Gotchas.

### Running it

```bash
fm start                                       # start the stack
fm shell barriesdev.localhost                  # enter container
# inside the container:
bench --site barriesdev.localhost migrate
bench --site barriesdev.localhost clear-cache
bench build --app barries --force
bench restart
exit
fm stop                                        # stop everything
```

Open <http://barriesdev.localhost> in a browser.

## Where things live

```
apps/barries/
├── barries/
│   ├── hooks.py                              # registers app_include_js, doctype_js, etc.
│   ├── public/js/
│   │   ├── qz_signing.js                     # global QZ Tray request signing (loaded on every desk page)
│   │   ├── item_list.js                      # Item List bulk actions (Print Swap/Price Tags)
│   │   └── purchase_receipt.js               # Purchase Receipt buttons (Print Swap/Price Tags)
│   ├── qz/
│   │   ├── __init__.py
│   │   └── sign.py                           # whitelisted endpoints: get_certificate(), sign(request)
│   ├── overrides/                            # Item / Item Barcode validate + after_insert hooks
│   ├── barries_erpnext_management_tools/
│   │   ├── custom/                           # custom field JSON for Item, Item Barcode
│   │   ├── print_format/
│   │   │   ├── swap_tag/                     # 4"×2" @ 300 DPI, prints to ZD420
│   │   │   └── barries_price_tag/            # 2.25"×1" @ 203 DPI, prints to ZD410
│   │   └── page/
│   │       ├── bulk_swap_tag_print/
│   │       └── bulk_price_tag_print/
│   └── ...
├── design/                                   # design docs (read before schema/workflow changes)
│   └── phase-0-1-item-and-pricing.md
├── CLAUDE.md                                 # this file
└── README.md
```

## Print pipeline

Two thermal label printers, two print formats:

| Tag         | Size        | DPI | Printer name (Windows)         |
|-------------|-------------|-----|--------------------------------|
| Swap Tag    | 4"×2"       | 300 | `ZDesigner ZD420-300dpi ZPL`   |
| Price Tag   | 2.25"×1"    | 203 | `ZDesigner ZD410-203dpi ZPL`   |

Both formats use Frappe's raw printing (`raw_printing: 1`, `raw_commands` populated with Jinja-rendered ZPL).

### QZ Tray signing (no more "Anonymous Request" prompts)

`barries/qz/sign.py` exposes two whitelisted methods:
- `barries.qz.sign.get_certificate()` → returns the public cert (PEM)
- `barries.qz.sign.sign(request)` → returns base64 SHA256 RSA signature

Keypair files live in **the site's private folder**:
- Cert: `sites/barriesdev.localhost/private/files/qz-cert.crt`
- Key:  `sites/barriesdev.localhost/private/files/qz-private-key.pem` (chmod 600)

Paths are configurable via `qz_cert_path` / `qz_private_key_path` in `site_config.json`.

The matching public cert is also placed in QZ Tray's install dir on each Windows station so QZ auto-trusts our signed requests:
- `C:\Program Files\QZ Tray\override.crt`
- `C:\Program Files\QZ Tray\auth\override.crt` (some QZ versions look here)

`barries/public/js/qz_signing.js` is loaded globally via `app_include_js`. It uses `Object.defineProperty` on `window.qz` to intercept the moment qz-tray.js loads, installs our cert/sign promises before Frappe core can override them with no-ops, then **locks the setters** so Frappe can't replace ours afterward. This is wired up to win a timing race that polling alone can't.

### Bulk tag printing

Two pages, parallel structure:
- `/app/bulk-swap-tag-print` (page route)
- `/app/bulk-price-tag-print`

Each has:
- Backend (`bulk_*_tag_print.py`): `get_item_by_barcode`, `get_item_by_code`, `get_zpl_batch(item_codes)` which renders the corresponding print format's ZPL via `frappe.render_template`.
- Frontend (`bulk_*_tag_print.js`): scan-to-queue UI with per-item qty, then loops `qz.print()` for each rendered ZPL string. Reads `?items=A:2,B,C:3` URL params on load to pre-populate the queue.

### Entry points (six total)

1. Standalone bulk page (×2)
2. **Item List → Actions menu** → Print Swap Tags / Print Price Tags
3. **Purchase Receipt → Print menu (submitted only)** → Print Swap Tags / Print Price Tags

All hand off via `?items=ITEM_CODE:QTY,...` URL params.

## Design docs

Design decisions live in `design/`. **Read these before making schema or workflow changes** — they exist specifically because the rationale for a decision is often not in the code.

- `design/phase-0-1-item-and-pricing.md` — Item data model, multi-barcode identity, used-equipment serials, condition assessment schema, five-tier pricing. **Locked in; reflect this in any Item / Serial / Pricing work.**

Future design docs (not yet written):
- Phase 2 — ingestion strategy (migration / vendor feeds / spreadsheet upload / manual entry).
- Phase 3 — receiving tool UX (scan-and-receive, label printing tie-in).
- Work orders — service/repair tracking, manufacturer-serial capture flow, service-history criteria for bikes/watercraft.

## Conventions

### Code style

- **Indentation:** tabs (matches existing Frappe convention in this app). Don't use spaces.
- **Print format Jinja:** keep `html` and `raw_commands` fields **identical** in `swap_tag.json` (Frappe checks `raw_printing` to decide which to use).
- **CSS class prefix in bulk pages:** `bstp-` (BulkSwapTagPrint) — kept in price tag page too even though it's not technically about swap tags. Renaming risks breaking the working page.
- **Adding entry points:** follow the URL handoff pattern (`?items=...`). Don't duplicate print logic — let the bulk page own it.
- **Print format design:** see the swap_tag.json header comment for the Jinja autofit pattern (4 buckets: ≤6 chars / ≤10 / ≤14 / else).

### Data model (from Phase 0+1 design)

These are settled. Don't reinvent them in new code.

**Item identification.** `item_code` is auto-generated, format `B-{group}-{####}` (e.g. `B-SKI-00417`) — internal Barrie's code, under our control, never reuses a manufacturer's code as primary key. External codes (UPC, EAN, MPN, Part Number) live in the standard `Item Barcode` child table with `barcode_type`. Custom barcode types `MPN` and `Part Number` are added. One barcode per item can be flagged `is_primary` — that's the one printed on default labels. Lookup at scan time hits all rows regardless of `is_primary`.

**New vs. Used.** Modeled as **separate Items under a shared Item Group hierarchy**: `Skis - New` / `Skis - Used`, etc. Not Item Variants. Used items have `has_serial_no = 1` set as Item Group default; New has `has_serial_no = 0` (with rare exceptions for warranty-tied items).

**Serial numbers** (Used items only). Auto-generated via `serial_no_series`, format `U-{group}-.YY.-.####` → `U-SKI-26-0001`. Rare serialized New items use parallel `N-{group}-.YY.-.####`. Manufacturer-stamped serials (bikes, etc.) captured separately in a `manufacturer_serial` field on Serial No — never in our internal serial. Vendor / batch / condition do *not* go in the serial string; they live in Serial No fields (`supplier`, `purchase_document_no`) and optional Batch No.

**Condition assessment.** Hybrid model. Every Serial No has an always-on `condition_notes` free-text field. Per Item Group, optional `Condition Criteria Schema` defines up to ~4 structured criteria with type Numeric Rating (1-10) / Numeric Measure (with unit) / Enum / Text. Locked schemas:
- Skis - Used: Base / Topsheet / Edges / Bindings, all 1-10
- Ski Boots - Used: Size (Mondo) / BSL (mm) / Condition (1-10)
- E-Bikes - Used: Mileage (miles)
- Analog Bikes - Used: Condition (1-10)
- Watercraft - Used: Condition (1-10)

Adding a new used category is purely a data change (new Item Group + schema rows + serial series) — no code change.

**Pricing.** Five Price Lists: **MSRP**, **Cost**, **Swap**, **Sale/Promo**, **Online**. Each Item gets zero-or-more `Item Price` rows; optionality is the rule — not every item carries every tier. USD only. Cost Price List = budgeted/typical cost (data entry); `valuation_rate` = computed by ERPnext from real stock movements. Don't conflate them — different doctypes, different reports. For serialized Used items, per-unit actual cost lives on Serial No `purchase_rate`, not in Item Price.

**Cross-references.** `related_item` Link field on Item soft-links New ↔ Used variants of the same model. Used in online listings ("Buy new from $X, or this used pair from $Y").

## Design philosophy

- **Stay on stock ERPnext where possible.** Every customization is upgrade debt. Reach for custom fields / doctypes only when stock can't express the requirement. The per-Item-Group condition schema is custom because flexibility *is* the requirement; almost everything else uses stock doctypes.
- **Minimize operational friction.** Default to one-scan checkout for fungible goods (new). Per-unit tracking only where unit identity matters (used). Don't impose serial-tracking burden on items where it doesn't pay off.

## Gotchas (things that have bitten us)

1. **Line endings.** Earlier development on Windows + WSL caused CRLF↔LF flipping that made every file show as "modified" in git. Fix: `git config --global core.autocrlf false` on the WSL side.
2. **Fixture sync timestamps.** `bench migrate` doesn't update DB records when `db.modified > file.modified`. Workaround for print formats: paste the raw_commands into the Print Format's UI directly, or set `modified` in the JSON fixture to a future date. Long-term: investigate why fixture sync respects timestamps even on direct fixture changes.
3. **Asset cache vs. browser cache.** Updating `app_include_js` files requires `bench build --app barries --force` AND `bench restart` AND a hard browser refresh (F12 → right-click refresh → Empty Cache and Hard Reload). Frappe sometimes serves stale JS otherwise.
4. **Container vs. host paths.** `bench` Python lives in the container. Don't try to run `apps/barries/env/bin/python` from the host — symlinks point at `/workspace/.pyenv/...` which only resolves inside Docker.
5. **GitHub Desktop dual-clone trap.** If GitHub Desktop is pointing at a different folder than your active git working copy, the two drift. Fix: point GH Desktop at the same path WSL uses — currently `C:\dev\frappe-barries\` (which is `/mnt/c/dev/frappe-barries/` from WSL).
6. **OneDrive corrupts git working copies.** OneDrive sync mangles `.git/objects/` (treats them as small files to "optimize") and leaves the repo unusable. **Never put a git working copy inside any OneDrive-synced folder.** Use `C:\dev\` or similar non-synced location.
7. **Squash-merge stale-branch problem.** A branch built off another feature branch (or off pre-squash-merge commits) will show "20 changed files" in a PR even when only one file was meant to change. Reason: squash merging produces a new commit on `main` with a different SHA than the original feature commits, so descendant branches still diverge from main at the file level even when content is identical. Fix: rebase your branch onto current `main`, or open a fresh branch off `main`. Always delete merged branches to avoid confusion.
8. **QZ Tray "Anonymous Request" prompt returns?** Check that `override.crt` is in the QZ install dir AND that QZ Tray was fully restarted (Task Manager → kill any lingering Java process). Then verify the JS patched: in browser console, `qz.security._barriesPatched` should be `true`.
9. **(Cowork-specific) Terminal paste corruption.** Long pastes into bash heredocs can silently truncate or get URL-linkified by the chat client (e.g., `sign.py` becomes `[sign.py](http://sign.py)`). Use base64 chunks of <2500 chars with cumulative `wc -c` checks if you must paste large content. Better yet, use Claude Code which writes files directly without paste.

## Branching

`main` is the team's primary branch. Branch from it for each new feature; PR back to it; delete the branch after merge.

```bash
git checkout main
git pull
git checkout -b Oscar-<feature-name>     # naming convention: Oscar-PascalCase
# work, commit, push
git push -u origin Oscar-<feature-name>
# open PR on GitHub.com targeting main, request review from Carter
```

After a PR is merged, delete the branch (GitHub's "automatically delete head branches" setting in repo settings handles this without thinking about it; recommended).

## Backlog (open work)

(Items here may be partially done — review and prune as appropriate.)

- Polish Swap Tag layout (specifics TBD)
- Polish Price Tag layout (centered + auto-fit treatment)
- Design + implement "Tag 3" (third tag type, spec TBD)
- Auto-print tags on Purchase Receipt submit (skipped for now — manual button works fine)
- Investigate fixture sync timestamp behavior so `bench migrate` reliably updates print formats
- Optionally upload a TTF font to QZ Tray for cleaner output than CG Triumvirate Bold Condensed
- **Implement Phase 0+1 design** — scaffold custom fields (`is_primary`, `condition_notes`, `manufacturer_serial`, `related_item`), new doctypes (`Condition Criteria Schema` child of Item Group, `Condition Assessment` child of Serial No), the New/Used Item Group hierarchy, the five Price List records, and `serial_no_series` for each used category. Currently being worked on in `Oscar-ItemModel`.
- **Write Phase 2 design** — ingestion strategy doc covering migration / vendor catalog feeds / spreadsheet upload / manual entry as one unified importer.
- **Write Phase 3 design** — receiving tool UX (the doc that started the original "build a receiving tool" ask).
- **Write work-order design** — service/repair tracking, manufacturer-serial capture flow, service-history criteria for bikes/watercraft.

## When you (the AI) start a new chat on this project

1. Read this file first.
2. Look at recent git history (`git log --oneline -20`) to see what's recently shipped.
3. Check `git branch -a` to see active feature branches.
4. **If your work touches Item / Pricing / Serial / Condition** — read `design/phase-0-1-item-and-pricing.md` before suggesting any schema changes. That doc is the source of truth for the data model.
5. Ask the user which feature/branch they're working on if it's not obvious.
6. **Don't recreate work that's already in the repo** — read the existing code before proposing changes.
7. Keep changes focused on the current feature; avoid touching unrelated files.
