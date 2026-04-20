import frappe

# ── Barcode type → Item field mapping ─────────────────────────────────────────
# Maps the barcode_type stored in the Item Barcode child row
# to the corresponding custom helper field on the Item doctype.
#
# Adjust these barcode_type strings to match exactly what is stored
# in your Item Barcode rows (case-sensitive).
BARCODE_FIELD_MAP = {
	"UPC": "custom_upc_helper",
	"EAN": "custom_ean_helper",
	"Ascend SKU": "custom_ascend_sku_helper",
	"Option": "custom_option_helper",  # note: doc has "helpder" typo — match whichever is in the DB
}


def validate(doc, method):
	"""
	Fires after ERPNext's own Item.validate().

	On existing items: refreshes the four helper fields from the live
	Item Barcode child rows so they always reflect the current state.

	On new items: we do NOT write to child rows here because the parent
	has not been inserted yet. Writing is handled in after_insert().
	"""
	if not doc.is_new():
		_refresh_barcode_helpers(doc)


def after_insert(doc, method):
	"""
	Fires after ERPNext's own Item.after_insert().

	At this point the item is committed to the database, so child table
	inserts with item_code as the parent link are safe.
	"""
	_upsert_barcode_rows(doc)


def _upsert_barcode_rows(doc):
	"""
	For each helper field that has a non-empty value, find the matching
	Item Barcode child row (by barcode_type) and update its barcode value,
	or insert a new row if none exists.
	"""
	for barcode_type, field in BARCODE_FIELD_MAP.items():
		value = doc.get(field) or ""
		if not value:
			continue  # don't create empty barcode rows

		existing = frappe.db.get_value(
			"Item Barcode",
			filters={
				"parent": doc.item_code,
				"parenttype": "Item",
				"barcode_type": barcode_type,
			},
			fieldname="name",
		)

		if existing:
			frappe.db.set_value("Item Barcode", existing, "barcode", value)
		else:
			row = frappe.get_doc(
				{
					"doctype": "Item Barcode",
					"parent": doc.item_code,
					"parenttype": "Item",
					"parentfield": "barcodes",
					"barcode": value,
					"barcode_type": barcode_type,
				}
			)
			row.insert(ignore_permissions=True)


def _refresh_barcode_helpers(doc):
	"""
	Pulls the current barcode value for each type from the Item Barcode
	child table back into the helper fields on the Item doc.

	This keeps the helper fields in sync on every save, matching the same
	pattern as _refresh_swap_price() in the price sync module.
	"""
	for barcode_type, field in BARCODE_FIELD_MAP.items():
		value = frappe.db.get_value(
			"Item Barcode",
			filters={
				"parent": doc.item_code,
				"parenttype": "Item",
				"barcode_type": barcode_type,
			},
			fieldname="barcode",
		)
		doc.set(field, value or "")


@frappe.whitelist()
def get_item_barcodes(item_code):
	"""
	Returns a dict of { item_field: barcode_value } for all four helper
	fields. Called by the Item client script on form load to populate
	the read-only helper fields with live values from Item Barcode.
	"""
	result = {}
	for barcode_type, field in BARCODE_FIELD_MAP.items():
		value = frappe.db.get_value(
			"Item Barcode",
			filters={
				"parent": item_code,
				"parenttype": "Item",
				"barcode_type": barcode_type,
			},
			fieldname="barcode",
		)
		result[field] = value or ""
	return result
