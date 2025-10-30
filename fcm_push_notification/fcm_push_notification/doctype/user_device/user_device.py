# Copyright (c) 2025, HAMILTON SUY and contributors
# For license information, please see license.txt

import frappe
import requests
import json
from frappe.model.document import Document
from recruitment_management_system.utils.fcm_notification import get_cached_access_token

class UserDevice(Document):
	def after_insert(self):
	
		if self.device_type == "ios":
			self.device_token = get_ios_device_token(self.device_token)
			frappe.log_error(f"Device Token:","Device Token")
			self.save()

@frappe.whitelist(allow_guest=True)
def get_ios_device_token(device_token):
	print("inside get_ios_device_token")
	print(device_token)
	access_token = get_cached_access_token()

	url = "https://iid.googleapis.com/iid/v1:batchImport"

	payload = json.dumps({
		"application": "com.upscape.crm",
		"sandbox":False,
		"apns_tokens":[device_token]
	})

	headers = {
		'access_token_auth': 'true',
		'Content-Type': 'application/json',
		'Authorization': f'Bearer {access_token["access_token"]}'
	}

	response = requests.post(url, headers=headers, data=payload)
	response_data = response.json()

	if response.status_code == 200:
		for result in response_data.get("results", []):
			if result.get("status") == "OK":
				return result.get("registration_token")
			else:
				frappe.log_error(f"Error processing token:", "Token Error")
	else:
		frappe.log_error(f"FCM API Error: {response.text}", "FCM Error")

@frappe.whitelist()
def save_web_token(token, device_type):
	user = frappe.session.user
	if user and token:
		user_device = frappe.get_value("User Device", {"user": user, "device_type": device_type}, ["name", "device_token"], as_dict=1)
		if user_device:
			if user_device.device_token != token:
				frappe.db.set_value("User Device", user_device.name, "device_token", token)
		else:
			doc = frappe.get_doc({
				"doctype": "User Device",
				"user": user,
				"device_token": token,
				"device_name": "Chrome",
				"device_type": device_type,
				"is_active": 1
			})
			doc.insert(ignore_permissions=True)

		frappe.db.commit()
		return {"status": "success"}

