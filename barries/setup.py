import frappe

from barries.overrides.item_barcode import override_barcode_type


# Override standard barcode types for Item Barcode doctype.
def set_property_setters():
	override_barcode_type()
	ensure_price_lists()


def ensure_price_lists():
	"""
	Ensures the Price List records our app depends on exist in the DB.

	overrides/item.py writes custom_swap_price values into an Item Price
	record that links to a Price List named exactly "Swap Price". If that
	Price List record doesn't exist, Item Price inserts fail with a foreign
	key error. This hook creates it on migrate so setup is one-shot.

	"Standard Buying" is usually created automatically by ERPNext install,
	but we check-and-create as a safety net in case a site was provisioned
	without it.
	"""
	required_lists = [
		{"price_list_name": "Swap Price", "selling": 1, "buying": 0},
		{"price_list_name": "Standard Buying", "selling": 0, "buying": 1},
	]

	default_currency = frappe.db.get_default("currency") or "USD"

	for spec in required_lists:
		name = spec["price_list_name"]
		if frappe.db.exists("Price List", name):
			continue
		pl = frappe.get_doc({
			"doctype": "Price List",
			"price_list_name": name,
			"currency": default_currency,
			"enabled": 1,
			"selling": spec["selling"],
			"buying": spec["buying"],
		})
		pl.insert(ignore_permissions=True)
		frappe.db.commit()
