// barries/barries/page/bulk_price_tag_print/bulk_price_tag_print.js

frappe.pages["bulk-price-tag-print"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Bulk Price Tag Print",
		single_column: true,
	});

	// ── State ──────────────────────────────────────────────────────────────────
	let queue = []; // [{ item_code, item_name, brand, custom_swap_price, qty }]

	// ── Styles ─────────────────────────────────────────────────────────────────
	frappe.dom.set_style(`
		.bstp-wrap {
			max-width: 780px;
			margin: 24px auto;
			font-family: var(--font-stack);
		}

		/* ── Input bar ── */
		.bstp-input-row {
			display: flex;
			gap: 8px;
			margin-bottom: 20px;
		}
		.bstp-input-row input {
			flex: 1;
			padding: 10px 14px;
			font-size: 15px;
			font-family: var(--font-stack);
			border: 2px solid var(--border-color);
			border-radius: var(--border-radius);
			background: var(--control-bg);
			outline: none;
			transition: border-color 0.15s;
		}
		.bstp-input-row input:focus {
			border-color: var(--primary);
		}
		.bstp-input-row input::placeholder {
			color: var(--text-light);
			font-style: italic;
		}
		.bstp-add-btn {
			padding: 10px 20px;
			background: var(--text-color);
			color: var(--white);
			font-family: var(--font-stack);
			font-size: 15px;
			font-weight: bold;
			border: 2px solid var(--text-color);
			cursor: pointer;
			transition: background 0.15s, color 0.15s;
			letter-spacing: 1px;
		}
		.bstp-add-btn:hover {
			background: var(--primary);
			border-color: var(--primary);
		}

		/* ── Queue table ── */
		.bstp-table-wrap {
			border: 2px solid var(--border-color);
			margin-bottom: 16px;
		}
		.bstp-table {
			width: 100%;
			border-collapse: collapse;
		}
		.bstp-table thead tr {
			background: var(--text-color);
			color: var(--white);
		}
		.bstp-table thead th {
			padding: 9px 12px;
			text-align: left;
			font-size: 11px;
			letter-spacing: 2px;
			text-transform: uppercase;
			font-weight: bold;
		}
		.bstp-table thead th.bstp-th-right {
			text-align: right;
		}
		.bstp-table tbody tr {
			border-bottom: 1px solid var(--border-color);
			transition: background 0.1s;
		}
		.bstp-table tbody tr:last-child {
			border-bottom: none;
		}
		.bstp-table tbody tr:hover {
			background: var(--bg-light-gray);
		}
		.bstp-table td {
			padding: 9px 12px;
			font-size: 13px;
			vertical-align: middle;
		}
		.bstp-item-code {
			font-weight: bold;
			font-size: 13px;
		}
		.bstp-item-name {
			color: var(--text-muted);
			font-size: 11px;
			margin-top: 2px;
		}
		.bstp-price {
			text-align: right;
			font-weight: bold;
		}
		.bstp-qty-input {
			width: 60px;
			padding: 5px 8px;
			font-size: 13px;
			font-family: var(--font-stack);
			border: 1px solid var(--border-color);
			text-align: center;
			border-radius: 0;
		}
		.bstp-qty-input:focus {
			outline: none;
			border-color: var(--primary);
		}
		.bstp-remove-btn {
			background: none;
			border: none;
			color: var(--text-light);
			font-size: 18px;
			cursor: pointer;
			padding: 0 4px;
			line-height: 1;
			transition: color 0.15s;
		}
		.bstp-remove-btn:hover {
			color: var(--primary);
		}

		/* ── Empty state ── */
		.bstp-empty {
			padding: 40px;
			text-align: center;
			color: var(--text-light);
			font-size: 13px;
			letter-spacing: 1px;
		}

		/* ── Footer bar ── */
		.bstp-footer {
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		.bstp-clear-btn {
			padding: 9px 18px;
			background: var(--card-bg);
			color: var(--text-color);
			font-family: var(--font-stack);
			font-size: 13px;
			border: 2px solid var(--border-color);
			cursor: pointer;
			letter-spacing: 1px;
			transition: background 0.15s, color 0.15s;
		}
		.bstp-clear-btn:hover {
			background: var(--text-color);
			color: var(--white);
		}
		.bstp-print-btn {
			padding: 10px 28px;
			background: var(--primary);
			color: var(--white);
			font-family: var(--font-stack);
			font-size: 14px;
			font-weight: bold;
			border: 2px solid var(--primary);
			cursor: pointer;
			letter-spacing: 1px;
			transition: background 0.15s;
		}
		.bstp-print-btn:hover {
			background: var(--primary-dark);
			border-color: var(--primary-dark);
		}
		.bstp-print-btn:disabled {
			background: var(--disabled-control-bg);
			border-color: var(--disabled-control-bg);
			cursor: not-allowed;
		}
		.bstp-total-label {
			color: var(--text-muted);
			font-size: 12px;
			letter-spacing: 1px;
		}
	`);

	// ── DOM ────────────────────────────────────────────────────────────────────
	$(page.body).html(`
		<div class="bstp-wrap">
			<div class="bstp-input-row">
				<input
					id="bstp-input"
					type="text"
					placeholder="Scan barcode or type Item Code, then press Enter or click +"
					autocomplete="off"
					autocorrect="off"
					spellcheck="false"
				/>
				<button class="bstp-add-btn" id="bstp-add-btn">+ ADD</button>
			</div>

			<div class="bstp-table-wrap">
				<table class="bstp-table">
					<thead>
						<tr>
							<th>Item</th>
							<th>Brand</th>
							<th class="bstp-th-right">Swap Price</th>
							<th style="text-align:center;">Qty</th>
							<th></th>
						</tr>
					</thead>
					<tbody id="bstp-tbody">
						<tr>
							<td colspan="5" class="bstp-empty">
								QUEUE EMPTY — SCAN OR ENTER AN ITEM TO BEGIN
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="bstp-footer">
				<button class="bstp-clear-btn" id="bstp-clear-btn">CLEAR ALL</button>
				<span class="bstp-total-label" id="bstp-total-label"></span>
				<button class="bstp-print-btn" id="bstp-print-btn" disabled>PRINT (0)</button>
			</div>
		</div>
	`);

	// ── Helpers ────────────────────────────────────────────────────────────────
	function totalLabels() {
		return queue.reduce((sum, row) => sum + (parseInt(row.qty) || 1), 0);
	}

	function formatPrice(val) {
		return "$" + parseFloat(val || 0).toFixed(2);
	}

	function renderQueue() {
		const tbody = $("#bstp-tbody");
		tbody.empty();

		if (queue.length === 0) {
			tbody.html(`
				<tr>
					<td colspan="5" class="bstp-empty">
						QUEUE EMPTY — SCAN OR ENTER AN ITEM TO BEGIN
					</td>
				</tr>
			`);
		} else {
			queue.forEach((row, idx) => {
				tbody.append(`
					<tr data-idx="${idx}">
						<td>
							<div class="bstp-item-code">${frappe.utils.escape_html(row.item_code)}</div>
							<div class="bstp-item-name">${frappe.utils.escape_html(row.item_name)}</div>
						</td>
						<td>${frappe.utils.escape_html(row.brand || "—")}</td>
						<td class="bstp-price">${formatPrice(row.custom_swap_price)}</td>
						<td style="text-align:center;">
							<input
								class="bstp-qty-input"
								type="number"
								min="1"
								value="${row.qty || 1}"
								data-idx="${idx}"
							/>
						</td>
						<td style="text-align:center;">
							<button class="bstp-remove-btn" data-idx="${idx}" title="Remove">×</button>
						</td>
					</tr>
				`);
			});
		}

		const total = totalLabels();
		$("#bstp-print-btn")
			.text(`PRINT (${total})`)
			.prop("disabled", queue.length === 0);
		$("#bstp-total-label").text(
			queue.length > 0 ? `${queue.length} item(s) · ${total} label(s)` : ""
		);
	}

	function addItemToQueue(details) {
		// If item already in queue, just bump qty instead of duplicating
		const existing = queue.find((r) => r.item_code === details.item_code);
		if (existing) {
			existing.qty = (parseInt(existing.qty) || 1) + 1;
			frappe.show_alert({
				message: `${details.item_code} already in queue — qty increased`,
				indicator: "blue",
			});
		} else {
			queue.push({ ...details, qty: 1 });
			frappe.show_alert({
				message: `Added: ${details.item_code}`,
				indicator: "green",
			});
		}
		renderQueue();
	}

	function resolveInput(raw) {
		const val = (raw || "").trim();
		if (!val) return;

		// Try barcode first, fall back to direct item code lookup
		frappe.call({
			method: "barries.barries_erpnext_management_tools.page.bulk_price_tag_print.bulk_price_tag_print.get_item_by_barcode",
			args: { barcode: val },
			callback: (r) => {
				if (r.message) addItemToQueue(r.message);
				$("#bstp-input").val("").focus();
			},
			// Barcode not found — try as Item Code
			error: () => {
				frappe.call({
					method: "barries.barries_erpnext_management_tools.page.bulk_price_tag_print.bulk_price_tag_print.get_item_by_code",
					args: { item_code: val },
					callback: (r) => {
						if (r.message) addItemToQueue(r.message);
						$("#bstp-input").val("").focus();
					},
				});
			},
		});
	}

	// ── Events ─────────────────────────────────────────────────────────────────
	$(page.body).on("click", "#bstp-add-btn", () => {
		resolveInput($("#bstp-input").val());
	});

	$(page.body).on("keydown", "#bstp-input", (e) => {
		if (e.key === "Enter") resolveInput($(e.target).val());
	});

	$(page.body).on("change", ".bstp-qty-input", (e) => {
		const idx = parseInt($(e.target).data("idx"));
		const val = Math.max(1, parseInt($(e.target).val()) || 1);
		queue[idx].qty = val;
		$(e.target).val(val);
		const total = totalLabels();
		$("#bstp-print-btn").text(`PRINT (${total})`);
		$("#bstp-total-label").text(`${queue.length} item(s) · ${total} label(s)`);
	});

	$(page.body).on("click", ".bstp-remove-btn", (e) => {
		const idx = parseInt($(e.currentTarget).data("idx"));
		queue.splice(idx, 1);
		renderQueue();
	});

	$(page.body).on("click", "#bstp-clear-btn", () => {
		if (queue.length === 0) return;
		frappe.confirm("Clear all items from the queue?", () => {
			queue = [];
			renderQueue();
		});
	});

	// ── QZ Tray printer config (the Zebra ZD420 as Windows sees it) ────────────
	const QZ_PRINTER_NAME = "ZDesigner ZD410-203dpi ZPL";

	// Frappe ships qz-tray.js as a vendored asset; load it lazily on first print.
	function loadQz() {
		if (typeof window.qz !== "undefined") return Promise.resolve();
		const candidates = [
			"/assets/frappe/node_modules/qz-tray/qz-tray.js",
			"/assets/frappe/js/lib/qz-tray.js",
		];
		return new Promise((resolve, reject) => {
			let i = 0;
			function tryNext() {
				if (i >= candidates.length) {
					reject(new Error("qz-tray.js not found at expected paths"));
					return;
				}
				frappe.require(candidates[i++])
					.then(() => resolve())
					.catch(tryNext);
			}
			tryNext();
		});
	}

	async function printZplBatch(zplPages) {
		// Connect (idempotent — no-op if already connected)
		if (!qz.websocket.isActive()) {
			await qz.websocket.connect();
		}
		const config = qz.configs.create(QZ_PRINTER_NAME);
		// Send each label as its own raw print job so QZ Tray flushes between them
		for (const zpl of zplPages) {
			await qz.print(config, [{ type: "raw", format: "plain", data: zpl }]);
		}
	}

	$(page.body).on("click", "#bstp-print-btn", async () => {
		if (queue.length === 0) return;

		// Expand queue into a flat list respecting per-item qty
		const item_codes = [];
		queue.forEach((row) => {
			const qty = parseInt(row.qty) || 1;
			for (let i = 0; i < qty; i++) {
				item_codes.push(row.item_code);
			}
		});

		const $btn = $("#bstp-print-btn");
		$btn.prop("disabled", true).text("GENERATING...");

		try {
			// 1. Render ZPL on the server
			const r = await new Promise((resolve, reject) => {
				frappe.call({
					method: "barries.barries_erpnext_management_tools.page.bulk_price_tag_print.bulk_price_tag_print.get_zpl_batch",
					args: { item_codes: JSON.stringify(item_codes) },
					callback: (res) => resolve(res),
					error: (err) => reject(err),
				});
			});

			const zplPages = r && r.message;
			if (!zplPages || !zplPages.length) {
				frappe.msgprint("No print data returned.");
				return;
			}

			// 2. Load qz-tray.js if not already (signing was set up globally on page load)
			$btn.text("CONNECTING TO QZ...");
			await loadQz();

			// 3. Print each label
			$btn.text(`PRINTING ${zplPages.length}...`);
			await printZplBatch(zplPages);

			frappe.show_alert({
				message: `Printed ${zplPages.length} label(s)`,
				indicator: "green",
			});

			// Clear the queue on success
			queue = [];
			renderQueue();
		} catch (err) {
			console.error("Bulk print failed:", err);
			frappe.msgprint({
				title: "Print Failed",
				message: (err && err.message) || "QZ Tray could not print the batch.",
				indicator: "red",
			});
		} finally {
			$btn.prop("disabled", queue.length === 0);
			renderQueue();
		}
	});

	// ── Preload queue from URL params (used by Item List / Purchase Receipt handoffs) ──
	function preloadFromUrl() {
		const params = new URLSearchParams(window.location.search);
		const raw = params.get("items");
		if (!raw) return;
		// Format: "ITEM-A:2,ITEM-B,ITEM-C:3" — qty optional, default 1
		const entries = raw.split(",").map((s) => s.trim()).filter(Boolean);
		const requests = entries.map((entry) => {
			const [code, qtyStr] = entry.split(":");
			return new Promise((resolve) => {
				frappe.call({
					method: "barries.barries_erpnext_management_tools.page.bulk_price_tag_print.bulk_price_tag_print.get_item_by_code",
					args: { item_code: code },
					callback: (r) => {
						if (r.message) {
							const qty = Math.max(1, parseInt(qtyStr) || 1);
							queue.push({ ...r.message, qty });
						}
						resolve();
					},
					error: () => resolve(),
				});
			});
		});
		Promise.all(requests).then(() => {
			renderQueue();
			frappe.show_alert({
				message: `Loaded ${queue.length} item(s) from handoff`,
				indicator: "blue",
			});
		});
	}

	// ── Init ───────────────────────────────────────────────────────────────────
	renderQueue();
	preloadFromUrl();
	setTimeout(() => $("#bstp-input").focus(), 300);
};
