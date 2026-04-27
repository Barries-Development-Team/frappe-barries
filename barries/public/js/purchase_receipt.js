/* Purchase Receipt → Print Swap Tags + Print Price Tags buttons.
   On submitted PRs, adds two buttons under "Print" that hand off all line
   items to the matching bulk print page (one queue entry per unique item,
   qty matching received quantity). */
frappe.ui.form.on("Purchase Receipt", {
	refresh: function (frm) {
		if (frm.doc.docstatus !== 1) return; // only on submitted docs
		if (!frm.doc.items || !frm.doc.items.length) return;

		function handoff(targetPage) {
			// Collapse to one entry per unique item_code, summing qty
			const totals = {};
			frm.doc.items.forEach(function (row) {
				if (!row.item_code) return;
				const q = parseInt(row.qty) || 1;
				totals[row.item_code] = (totals[row.item_code] || 0) + q;
			});
			const codes = Object.keys(totals);
			if (!codes.length) {
				frappe.msgprint(__("No item lines on this receipt."));
				return;
			}
			const param = codes
				.map((c) => `${encodeURIComponent(c)}:${totals[c]}`)
				.join(",");
			window.open("/app/" + targetPage + "?items=" + param, "_blank");
		}

		frm.add_custom_button(
			__("Print Swap Tags"),
			function () { handoff("bulk-swap-tag-print"); },
			__("Print")
		);
		frm.add_custom_button(
			__("Print Price Tags"),
			function () { handoff("bulk-price-tag-print"); },
			__("Print")
		);
	},
});
