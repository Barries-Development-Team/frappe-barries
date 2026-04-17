import frappe


# Override standard barcode types for Item Barcode doctype.
def set_property_setters():
	frappe.db.delete(
		"Property Setter",
		{
			"doc_type": "Item Barcode",
			"field_name": "barcode_type",
			"property": "options",
		},
	)
	doc = frappe.get_doc(
		{
			"doctype": "Property Setter",
			"doctype_or_field": "DocField",
			"doc_type": "Item Barcode",
			"field_name": "barcode_type",
			"property": "options",
			"property_type": "Text",
			"value": "\nUPC\nEAN\nAscend SKU\nSerial Number\nOption",
		}
	)
	doc.insert(ignore_permissions=True)
	frappe.db.commit()
