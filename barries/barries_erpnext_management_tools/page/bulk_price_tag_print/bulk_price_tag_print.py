# barries/barries/page/bulk_price_tag_print/bulk_price_tag_print.py

import json

import frappe


@frappe.whitelist()
def get_item_by_barcode(barcode):
	"""Look up an Item by scanning a barcode from the Item's barcodes child table."""
	result = frappe.db.get_value(
		"Item Barcode",
		filters={"barcode": barcode},
		fieldname="parent",
	)
	if not result:
		frappe.throw(f"No item found for barcode: {barcode}")
	return get_item_details(result)


@frappe.whitelist()
def get_item_by_code(item_code):
	"""Look up an Item directly by Item Code."""
	if not frappe.db.exists("Item", item_code):
		frappe.throw(f"Item not found: {item_code}")
	return get_item_details(item_code)


def get_item_details(item_code):
	"""Return the fields needed to populate the print queue row."""
	doc = frappe.get_doc("Item", item_code)
	return {
		"item_code": doc.item_code,
		"item_name": doc.item_name,
		"brand": doc.brand or "",
		"custom_swap_price": doc.custom_swap_price or 0,
	}


@frappe.whitelist()
def get_zpl_batch(item_codes):
	"""
	Render the Barries Price Tag print format for each item and return a list of ZPL
	strings. The browser sends each string to QZ Tray in sequence.

	Accepts a JSON-encoded list of item codes. Each entry is rendered against
	the print format's Jinja-rendered raw_commands; duplicates in the list
	produce duplicate ZPL strings (that's how the queue's qty count expands).
	"""
	if isinstance(item_codes, str):
		item_codes = json.loads(item_codes)

	if not item_codes:
		return []

	# Pull the print format's raw_commands template once.
	pf = frappe.get_doc("Print Format", "Barries Price Tag")
	template = pf.raw_commands or pf.html
	if not template:
		frappe.throw("Barries Price Tag print format has no raw_commands or html template.")

	zpl_pages = []
	for item_code in item_codes:
		doc = frappe.get_doc("Item", item_code)
		zpl = frappe.render_template(template, {"doc": doc})
		zpl_pages.append(zpl)

	return zpl_pages
