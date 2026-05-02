# CLAUDE.md — Barries ERPNext app context

This file is read by AI coding assistants (Claude Code, Cursor, etc.) at the
start of a session. Keep it accurate and up-to-date as the project evolves.

## What is this?

`barries` is a custom Frappe app sitting on top of ERPNext, used at **Barrie's
Ski and Sports** (a ski shop in Edmonton). It bundles store-specific overrides,
print formats, and pages that aren't available in stock ERPNext.

Repo: <https://github.com/Barries-Development-Team/frappe-barries>
Primary branch: `Oscar-ClaudPrint` (used as the team's main; not literally `main`).

## Environment

- **Host OS:** Windows 11 with WSL2 (Ubuntu).
- **Bench manager:** [Frappe Manager (`fm`)](https://github.com/rtcamp/frappe-manager) — wraps bench in Docker Compose.
- **Site:** `barriesdev.localhost` — accessible at <http://barriesdev.localhost> after `fm start`.
- **Bench path on host:** `~/frappe/sites/barriesdev.localhost/workspace/frappe-bench/`
- **App path on host:** `~/frappe/sites/barriesdev.localhost/workspace/frappe-bench/apps/barries/`
- **Container shell:** `fm shell barriesdev.localhost` drops into the container where `bench` commands run.

The bench's Python venv lives **inside** the container (`/workspace/.pyenv/...`). Symlinks at `apps/barries/env/bin/python` look broken from the host — that's expected. Always run `bench` commands inside `fm shell`.

### Running it

```bash
fm start                              # start the stack
fm shell barriesdev.localhost         # enter container
# inside the container:
bench --site barriesdev.localhost migrate
bench --site barriesdev.localhost clear-cache
bench build --app barries --force
bench restart
exit
fm stop                               # stop everything
```

Open <http://barriesdev.localhost> in a browser.

## Where things live

```
apps/barries/
├── barries/
│   ├── hooks.py                     # registers app_include_js, doctype_js, etc.
│   ├── public/js/
│   │   ├── qz_signing.js            # global QZ Tray request signing (loaded on every desk page)
│   │   ├── item_list.js             # Item List bulk actions (Print Swap/Price Tags)
│   │   └── purchase_receipt.js      # Purchase Receipt buttons (Print Swap/Price Tags)
│   ├── qz/
│   │   ├── __init__.py
│   │   └── sign.py                  # whitelisted endpoints: get_certificate(), sign(request)
│   ├── overrides/                   # Item / Item Barcode validate + after_insert hooks
│   ├── barries_erpnext_management_tools/
│   │   ├── custom/                  # custom field JSON for Item, Item Barcode
│   │   ├── print_format/
│   │   │   ├── swap_tag/            # 4"×2" @ 300 DPI, prints to ZD420
│   │   │   └── barries_price_tag/   # 2.25"×1" @ 203 DPI, prints to ZD410
│   │   └── page/
│   │       ├── bulk_swap_tag_print/
│   │       └── bulk_price_tag_print/
│   └── ...
├── CLAUDE.md                         # this file
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

`barries/public/js/qz_signing.js` is loaded globally via `app_include_js`. It uses `Object.defineProperty` on `window.qz` to intercept the moment qz-tray.js loads, installs our cert/sign promises before Frappe core can override them with no-ops, then **locks the setters** so Frappe can't replace ours afterward.

This is wired up to win a timing race that polling alone can't.

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

## Conventions

- **Indentation:** tabs (matches existing Frappe convention in this app).
- **Print format Jinja:** keep `html` and `raw_commands` fields **identical** in `swap_tag.json` (Frappe checks `raw_printing` to decide which to use).
- **CSS class prefix in bulk pages:** `bstp-` (BulkSwapTagPrint) — kept in price tag page too even though it's not technically about swap tags. Renaming risks breaking the working page.
- **Adding entry points:** follow the URL handoff pattern (`?items=...`). Don't duplicate print logic — let the bulk page own it.
- **Print format design:** see the swap_tag.json header comment for the Jinja autofit pattern (4 buckets: ≤6 chars / ≤10 / ≤14 / else).

## Gotchas (things that have bitten us)

1. **Line endings.** Earlier development on Windows + WSL caused CRLF↔LF flipping that made every file show as "modified" in git. Fix: `git config --global core.autocrlf false` on the WSL side.

2. **Fixture sync timestamps.** `bench migrate` doesn't update DB records when `db.modified > file.modified`. Workaround for print formats: paste the raw_commands into the Print Format's UI directly, or set `modified` in the JSON fixture to a future date. Long-term: investigate why fixture sync respects timestamps even on direct fixture changes.

3. **Asset cache vs. browser cache.** Updating `app_include_js` files requires `bench build --app barries --force` AND `bench restart` AND a hard browser refresh (F12 → right-click refresh → Empty Cache and Hard Reload). Frappe sometimes serves stale JS otherwise.

4. **Container vs. host paths.** `bench` Python lives in the container. Don't try to run `apps/barries/env/bin/python` from the host — symlinks point at `/workspace/.pyenv/...` which only resolves inside Docker.

5. **GitHub Desktop dual-clone trap (Cowork mode users).** If you have GitHub Desktop pointed at a Windows clone (`C:\Users\barri\dev\frappe-barries\`), it drifts out of sync with the WSL clone. Fix: point GH Desktop at the WSL clone via `\\wsl$\Ubuntu\home\barries\...`.

6. **QZ Tray "Anonymous Request" prompt returns?** Check that `override.crt` is in the QZ install dir AND that QZ Tray was fully restarted (Task Manager → kill any lingering Java process). Then verify the JS patched: in browser console, `qz.security._barriesPatched` should be `true`.

7. **(Cowork-specific) Terminal paste corruption.** Long pastes into bash heredocs can silently truncate or get URL-linkified by the chat client (e.g., `sign.py` becomes `[sign.py](http://sign.py)`). Use base64 chunks of <2500 chars with cumulative `wc -c` checks if you must paste large content. Better yet, use Claude Code which writes files directly without paste.

## Branching

`Oscar-ClaudPrint` is the team's main. Branch from it for each new feature:

```bash
git checkout Oscar-ClaudPrint
git pull
git checkout -b feature/<name>
# work, commit, push
git push -u origin feature/<name>
# open PR on GitHub.com targeting Oscar-ClaudPrint
```

## Backlog (open work)

- Polish Swap Tag layout (specifics TBD)
- Polish Price Tag layout (centered + auto-fit treatment)
- Design + implement "Tag 3" (third tag type, spec TBD)
- Auto-print tags on Purchase Receipt submit (skipped for now — manual button works fine)
- Build receiving tool (next major feature, spec TBD)
- Investigate fixture sync timestamp behavior so `bench migrate` reliably updates print formats
- Optionally upload a TTF font to QZ Tray for cleaner output than CG Triumvirate Bold Condensed

## When you (the AI) start a new chat on this project

1. Read this file first.
2. Look at recent git history (`git log --oneline -20`) to see what's recently shipped.
3. Check `git branch -a` to see active feature branches.
4. Ask the user which feature/branch they're working on if it's not obvious.
5. **Don't recreate work that's already in the repo** — read the existing code before proposing changes.
6. Keep changes focused on the current feature; avoid touching unrelated files.
