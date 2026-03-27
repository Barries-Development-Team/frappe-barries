# Populates the custom_swap_price field based on the "Swap Price" entry in the custom_pricing child table
# This allows the custom_swap_price field to be used in pricing rules and other calculations without needing to reference the child table directly.
# Fancy way to say we use it for the Swap Tag.
def validate(doc, method):
    swap_row = next(
        (row for row in doc.custom_pricing if row.price_list == "Swap Price"),
        None
    )
    doc.custom_swap_price = swap_row.price_list_rate if swap_row else 0