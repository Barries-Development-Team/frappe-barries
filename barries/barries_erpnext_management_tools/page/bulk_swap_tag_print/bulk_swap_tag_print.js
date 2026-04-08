// barries/barries/page/bulk_swap_tag_print/bulk_swap_tag_print.js

frappe.pages["bulk-swap-tag-print"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Bulk Swap Tag Print",
		single_column: true,
	});

	// ── State ──────────────────────────────────────────────────────────────────
	let queue = []; // [{ item_code, item_name, brand, custom_swap_price, qty }]

	// ── Styles ─────────────────────────────────────────────────────────────────
	frappe.dom.set_style(`
		.bstp-wrap {
			max-width: 780px;
			margin: 24px auto;
			font-family: 'Courier New', monospace;
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
			font-family: 'Courier New', monospace;
			border: 2px solid #1a1a1a;
			border-radius: 0;
			background: #fff;
			outline: none;
			transition: border-color 0.15s;
		}
		.bstp-input-row input:focus {
			border-color: #e74c3c;
		}
		.bstp-input-row input::placeholder {
			color: #aaa;
			font-style: italic;
		}
		.bstp-add-btn {
			padding: 10px 20px;
			background: #1a1a1a;
			color: #fff;
			font-family: 'Courier New', monospace;
			font-size: 15px;
			font-weight: bold;
			border: 2px solid #1a1a1a;
			cursor: pointer;
			transition: background 0.15s, color 0.15s;
			letter-spacing: 1px;
		}
		.bstp-add-btn:hover {
			background: #e74c3c;
			border-color: #e74c3c;
		}

		/* ── Queue table ── */
		.bstp-table-wrap {
			border: 2px solid #1a1a1a;
			margin-bottom: 16px;
		}
		.bstp-table {
			width: 100%;
			border-collapse: collapse;
		}
		.bstp-table thead tr {
			background: #1a1a1a;
			color: #fff;
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
			border-bottom: 1px solid #e0e0e0;
			transition: background 0.1s;
		}
		.bstp-table tbody tr:last-child {
			border-bottom: none;
		}
		.bstp-table tbody tr:hover {
			background: #f9f9f9;
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
			color: #555;
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
			font-family: 'Courier New', monospace;
			border: 1px solid #ccc;
			text-align: center;
			border-radius: 0;
		}
		.bstp-qty-input:focus {
			outline: none;
			border-color: #e74c3c;
		}
		.bstp-remove-btn {
			background: none;
			border: none;
			color: #ccc;
			font-size: 18px;
			cursor: pointer;
			padding: 0 4px;
			line-height: 1;
			transition: color 0.15s;
		}
		.bstp-remove-btn:hover {
			color: #e74c3c;
		}

		/* ── Empty state ── */
		.bstp-empty {
			padding: 40px;
			text-align: center;
			color: #aaa;
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
			background: #fff;
			color: #1a1a1a;
			font-family: 'Courier New', monospace;
			font-size: 13px;
			border: 2px solid #1a1a1a;
			cursor: pointer;
			letter-spacing: 1px;
			transition: background 0.15s, color 0.15s;
		}
		.bstp-clear-btn:hover {
			background: #1a1a1a;
			color: #fff;
		}
		.bstp-print-btn {
			padding: 10px 28px;
			background: #e74c3c;
			color: #fff;
			font-family: 'Courier New', monospace;
			font-size: 14px;
			font-weight: bold;
			border: 2px solid #e74c3c;
			cursor: pointer;
			letter-spacing: 1px;
			transition: background 0.15s;
		}
		.bstp-print-btn:hover {
			background: #c0392b;
			border-color: #c0392b;
		}
		.bstp-print-btn:disabled {
			background: #ccc;
			border-color: #ccc;
			cursor: not-allowed;
		}
		.bstp-total-label {
			color: #555;
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
			method: "barries.barries_erpnext_management_tools.page.bulk_swap_tag_print.bulk_swap_tag_print.get_item_by_barcode",
			args: { barcode: val },
			callback: (r) => {
				if (r.message) addItemToQueue(r.message);
				$("#bstp-input").val("").focus();
			},
			error: () => {
				// Barcode not found — try as Item Code
				frappe.call({
					method: "barries.barries_erpnext_management_tools.page.bulk_swap_tag_print.bulk_swap_tag_print.get_item_by_code",
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

	$(page.body).on("click", "#bstp-print-btn", () => {
		if (queue.length === 0) return;

		// Expand queue into a flat list respecting per-item qty
		const item_codes = [];
		queue.forEach((row) => {
			const qty = parseInt(row.qty) || 1;
			for (let i = 0; i < qty; i++) {
				item_codes.push(row.item_code);
			}
		});

		$("#bstp-print-btn").prop("disabled", true).text("GENERATING...");

		frappe.call({
			method: "barries.barries_erpnext_management_tools.page.bulk_swap_tag_print.bulk_swap_tag_print.get_print_html",
			args: { item_codes: JSON.stringify(item_codes) },
			callback: (r) => {
				if (!r.message) {
					frappe.msgprint("No print data returned.");
					$("#bstp-print-btn").prop("disabled", false);
					renderQueue();
					return;
				}

				// Open in a new window and trigger print
				const win = window.open("", "_blank");
				win.document.write(`
					<!DOCTYPE html>
					<html>
					<head>
						<meta charset="UTF-8">
						<title>Swap Tags</title>
						<style>
							@page {
								size: 2in 4in;
								margin: 0;
							}
							body {
								margin: 0;
								padding: 0;
							}
							div[style*="page-break-after"] {
								page-break-after: always;
							}
						</style>
					</head>
					<body>${r.message}</body>
					</html>
				`);
				win.document.close();
				win.focus();
				win.onload = () => {
					win.print();
					$("#bstp-print-btn").prop("disabled", false);
					renderQueue();
				};
			},
			error: () => {
				$("#bstp-print-btn").prop("disabled", false);
				renderQueue();
			},
		});
	});

	// ── Init ───────────────────────────────────────────────────────────────────
	renderQueue();
	setTimeout(() => $("#bstp-input").focus(), 300);
};
