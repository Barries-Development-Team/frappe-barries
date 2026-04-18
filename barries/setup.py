import frappe

from barries.overrides.item_barcode import override_barcode_type


# Override standard barcode types for Item Barcode doctype.
def set_property_setters():
	override_barcode_type()
