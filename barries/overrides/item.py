import frappe

# ── Price list mapping ─────────────────────────────────────────────────────────
# Maps Item field name → Price List name.
#
# NOTE: Standard Selling is intentionally excluded here.
# ERPNext's own Item.after_insert() already handles creating the Standard
# Selling Item Price from standard_rate. If we also create it in our hook
# we risk a duplicate record or a race condition. We let ERPNext own that
# one and only handle the two price lists it does NOT cover natively.
CUSTOM_PRICE_LIST_MAP = {
	"valuation_rate": "Standard Buying",
	"custom_swap_price": "Swap Price",
}

# Full map used only for read-back (get_item_prices).
# Standard Selling is included here because we still want to display it.
FULL_PRICE_LIST_MAP = {
	"standard_rate": "Standard Selling",
	"valuation_rate": "Standard Buying",
	"custom_swap_price": "Swap Price",
}


def validate(doc, method):
	"""
	Fires after ERPNext's own Item.validate().

	The Item form's custom_swap_price field is the source of truth.
	On every save of an existing item, we push the current field value
	down into its matching Item Price record in the "Swap Price" Price
	List. This keeps the Price List in sync as a passive audit record
	while letting the user edit directly on the Item form.

	On new items: we skip here because the doc has not been inserted
	yet — Item Price requires a saved item_code as a foreign key.
	Creation is handled in after_insert() instead.
	"""
	if not doc.is_new():
		_upsert_item_prices(doc)


def after_insert(doc, method):
	"""
	Fires after ERPNext's own Item.after_insert().

	ERPNext's after_insert already creates the Standard Selling Item Price
	from standard_rate. We handle Standard Buying and Swap Price here,
	which ERPNext does not cover natively.

	At this point the item is saved to the database so Item Price foreign
	key constraints are satisfied.
	"""
	_upsert_item_prices(doc)


def _upsert_item_prices(doc):
	"""
	Creates Item Price records for Standard Buying and Swap Price
	if the corresponding fields have non-zero values on the Item doc.

	Uses upsert logic (check existing before insert) as a safety net
	in case a record somehow already exists.
	"""
	for field, price_list in CUSTOM_PRICE_LIST_MAP.items():
		rate = doc.get(field) or 0
		if not rate:
			# Don't create a zero-value Item Price record — skip it
			continue

		existing = frappe.db.get_value(
			"Item Price",
			filters={
				"item_code": doc.item_code,
				"price_list": price_list,
			},
			fieldname="name",
		)

		if existing:
			# Already exists — update it rather than creating a duplicate
			frappe.db.set_value("Item Price", existing, "price_list_rate", rate)
		else:
			# Create a fresh Item Price record
			item_price = frappe.get_doc(
				{
					"doctype": "Item Price",
					"item_code": doc.item_code,
					"price_list": price_list,
					"price_list_rate": rate,
				}
			)
			item_price.insert(ignore_permissions=True)


@frappe.whitelist()
def get_item_prices(item_code):
	"""
	Returns the current price_list_rate for all three price lists
	for a given item. Called by the Item client script on form load
	to populate the read-only price fields with live values.
	"""
	result = {}
	for field, price_list in FULL_PRICE_LIST_MAP.items():
		rate = frappe.db.get_value(
			"Item Price",
			filters={
				"item_code": item_code,
				"price_list": price_list,
			},
			fieldname="price_list_rate",
		)
		result[field] = rate or 0
	return result
