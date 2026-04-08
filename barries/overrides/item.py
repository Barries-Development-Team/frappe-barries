import frappe


# ── Price list mapping ─────────────────────────────────────────────────────────
# Maps Item field name → Price List name
PRICE_LIST_MAP = {
    "standard_rate":    "Standard Selling",
    "valuation_rate":   "Standard Buying",
    "custom_swap_price": "Swap Price",
}


def validate(doc, method):
    """
    Fires after ERPNext's own Item.validate().

    - On new items: create or update Item Price records for all three
      price lists using the values currently on the Item form.
    - On existing items: do nothing — prices are managed via Item Price
      directly, and the Item fields are read-only in the UI.
    """
    if doc.is_new():
        _upsert_item_prices(doc)

    # Always keep custom_swap_price in sync with Swap Price Item Price
    # so the Swap Tag print format always has a fresh value.
    _refresh_swap_price(doc)


def _upsert_item_prices(doc):
    """
    For each price list in PRICE_LIST_MAP, create or update the
    corresponding Item Price record using the value on the Item doc.
    Only runs on new items — after creation prices are managed via
    the Item Price form.
    """
    for field, price_list in PRICE_LIST_MAP.items():
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
            # Update the existing record
            frappe.db.set_value("Item Price", existing, "price_list_rate", rate)
        else:
            # Create a new Item Price record
            item_price = frappe.get_doc({
                "doctype": "Item Price",
                "item_code": doc.item_code,
                "price_list": price_list,
                "price_list_rate": rate,
            })
            item_price.insert(ignore_permissions=True)


def _refresh_swap_price(doc):
    """
    Always pull the latest Swap Price Item Price value into
    custom_swap_price so the Swap Tag print format stays current,
    even when prices are edited directly in Item Price.
    Only runs on existing items — on new items _upsert_item_prices
    handles the initial value.
    """
    if doc.is_new():
        return

    rate = frappe.db.get_value(
        "Item Price",
        filters={
            "item_code": doc.item_code,
            "price_list": "Swap Price",
        },
        fieldname="price_list_rate",
    )
    doc.custom_swap_price = rate or 0


@frappe.whitelist()
def get_item_prices(item_code):
    """
    Returns the current price_list_rate for all three price lists
    for a given item. Called by the Item client script on form load
    to populate the read-only price fields with live values.
    """
    result = {}
    for field, price_list in PRICE_LIST_MAP.items():
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