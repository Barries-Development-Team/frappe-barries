app_name = "barries"
app_title = "Barries ERPNext Management Tools"
app_publisher = "Barrie's Ski and Sports"
app_description = "Container app for all scripts, overrides, utilities, etc."
app_email = "barriesskiandsports@gmail.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "barries",
# 		"logo": "/assets/barries/logo.png",
# 		"title": "Barries ERPNext Management Tools",
# 		"route": "/barries",
# 		"has_permission": "barries.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/barries/css/barries.css"
app_include_js = "/assets/barries/js/qz_signing.js"

# include js, css files in header of web template
# web_include_css = "/assets/barries/css/barries.css"
# web_include_js = "/assets/barries/js/barries.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "barries/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}
page_js = {}

# include js in doctype views
doctype_js = {"Purchase Receipt": "public/js/purchase_receipt.js"}
doctype_list_js = {"Item": "public/js/item_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "barries/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "barries.utils.jinja_methods",
# 	"filters": "barries.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "barries.install.before_install"
# after_install = "barries.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "barries.uninstall.before_uninstall"
# after_uninstall = "barries.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

after_migrate = ["barries.setup.set_property_setters"]

# before_app_install = "barries.utils.before_app_install"
# after_app_install = "barries.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "barries.utils.before_app_uninstall"
# after_app_uninstall = "barries.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "barries.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events


doc_events = {
	"Item": {
		"validate": [
			"barries.overrides.item.validate",
			"barries.overrides.item_barcode_sync.validate",
		],
		"after_insert": [
			"barries.overrides.item.after_insert",
			"barries.overrides.item_barcode_sync.after_insert",
		],
	}
}


# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"barries.tasks.all"
# 	],
# 	"daily": [
# 		"barries.tasks.daily"
# 	],
# 	"hourly": [
# 		"barries.tasks.hourly"
# 	],
# 	"weekly": [
# 		"barries.tasks.weekly"
# 	],
# 	"monthly": [
# 		"barries.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "barries.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "barries.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "barries.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["barries.utils.before_request"]
# after_request = ["barries.utils.after_request"]

# Job Events
# ----------
# before_job = ["barries.utils.before_job"]
# after_job = ["barries.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"barries.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []
