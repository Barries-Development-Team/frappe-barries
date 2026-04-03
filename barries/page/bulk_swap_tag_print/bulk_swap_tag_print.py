# barries/barries/page/bulk_swap_tag_print/bulk_swap_tag_print.py

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
def get_print_html(item_codes):
	"""
	Accepts a JSON list of item_codes and returns a single HTML string
	with each item's 'Swap Tag' print format separated by page breaks.
	"""
	import json

	if isinstance(item_codes, str):
		item_codes = json.loads(item_codes)

	pages = []
	for item_code in item_codes:
		html = frappe.get_print(
			doctype="Item",
			name=item_code,
			print_format="Swap Tag",
			no_letterhead=1,
		)
		pages.append(html)

	# Wrap each label in a page-break div so wkhtmltopdf splits them correctly
	combined = "\n".join(f'<div style="page-break-after: always;">{page}</div>' for page in pages)
	return combined
