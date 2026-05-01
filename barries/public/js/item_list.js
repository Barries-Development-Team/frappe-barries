/* Item List → Print Swap Tags + Print Price Tags bulk actions.
   Multi-select items, choose either action, get redirected to the matching
   bulk print page with the selected items pre-loaded. */
frappe.listview_settings = frappe.listview_settings || {};
frappe.listview_settings["Item"] = frappe.listview_settings["Item"] || {};

(function () {
	const existing = frappe.listview_settings["Item"].onload;
	frappe.listview_settings["Item"].onload = function (listview) {
		if (typeof existing === "function") {
			try { existing.call(this, listview); } catch (e) { console.warn(e); }
		}
		function handoff(targetPage) {
			const selected = listview.get_checked_items();
			if (!selected || !selected.length) {
				frappe.msgprint(__("Select at least one item first."));
				return;
			}
			const codes = selected.map((d) => encodeURIComponent(d.name)).join(",");
			window.open("/app/" + targetPage + "?items=" + codes, "_blank");
		}
		listview.page.add_action_item(__("Print Swap Tags"), function () {
			handoff("bulk-swap-tag-print");
		});
		listview.page.add_action_item(__("Print Price Tags"), function () {
			handoff("bulk-price-tag-print");
		});
	};
})();
