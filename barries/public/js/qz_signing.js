/* QZ Tray request signing - eliminates the Anonymous Request prompt. */
frappe.provide("barries.qz");
(function () {
	function patch() {
		if (typeof window.qz === "undefined" || !window.qz.security) return false;
		const sec = window.qz.security;
		if (sec._barriesPatched) return true;
		let cert = null;
		sec.setCertificatePromise(function (resolve, reject) {
			if (cert) return resolve(cert);
			frappe.call({
				method: "barries.qz.sign.get_certificate",
				callback: function (r) {
					if (r && r.message) { cert = r.message; resolve(cert); }
					else reject(new Error("No QZ cert"));
				},
				error: function () { reject(new Error("QZ cert endpoint failed")); },
			});
		});
		sec.setSignatureAlgorithm("SHA256");
		sec.setSignaturePromise(function (toSign) {
			return function (resolve, reject) {
				frappe.call({
					method: "barries.qz.sign.sign",
					args: { request: toSign },
					callback: function (r) {
						if (r && r.message) resolve(r.message);
						else reject(new Error("No QZ signature"));
					},
					error: function () { reject(new Error("QZ sign endpoint failed")); },
				});
			};
		});
		sec.setCertificatePromise = function () {};
		sec.setSignaturePromise = function () {};
		sec.setSignatureAlgorithm = function () {};
		sec._barriesPatched = true;
		return true;
	}
	if (typeof window.qz !== "undefined") {
		patch();
	} else {
		let _qz;
		try {
			Object.defineProperty(window, "qz", {
				configurable: true,
				get: function () { return _qz; },
				set: function (v) {
					_qz = v;
					if (v && v.security && !v.security._barriesPatched) {
						try { patch(); } catch (e) { console.warn("barries qz patch error", e); }
					}
				},
			});
		} catch (e) {
			const iv = setInterval(function () { if (patch()) clearInterval(iv); }, 50);
			setTimeout(function () { clearInterval(iv); }, 60000);
		}
	}
	barries.qz.ensureSigned = patch;
})();
