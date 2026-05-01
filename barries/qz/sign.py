"""QZ Tray request signing - eliminates the Anonymous Request prompt."""
import base64
import frappe
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding


def _path(name):
    return frappe.conf.get(f"qz_{name}_path") or frappe.get_site_path(
        "private", "files", f"qz-{name.replace('_', '-')}"
    )


@frappe.whitelist()
def get_certificate():
    with open(_path("cert.crt"), "r") as f:
        return f.read().strip()


@frappe.whitelist()
def sign(request):
    if not request:
        frappe.throw("Empty QZ Tray request payload.")
    with open(_path("private-key.pem"), "rb") as f:
        key = serialization.load_pem_private_key(f.read(), password=None)
    sig = key.sign(request.encode("utf-8"), padding.PKCS1v15(), hashes.SHA256())
    return base64.b64encode(sig).decode("ascii")
