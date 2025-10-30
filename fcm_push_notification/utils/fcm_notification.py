import json
import requests
import frappe
from frappe import enqueue
from google.oauth2 import service_account
from google.auth.transport import requests as google_requests
from frappe.utils import now, add_to_date
import re

def cleanhtml(raw_html):
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, '', raw_html)
    return cleantext

def user_id(doc):
    user_email = doc.for_user
    user_device_list = frappe.get_all(
        "User Device", filters={"user": user_email}, fields=["device_token"]
    )
    return user_device_list

@frappe.whitelist()
def notification_queue(doc, method):
    device_list = user_id(doc)
    if device_list:
        for device in device_list:
            send_fcm_notification(notification=doc, device_token=device)

@frappe.whitelist()
def get_fcm_credentials():
    """
    Retrieves FCM credentials from FCM Notification Settings DocType.
    """
    credentials_doc = frappe.get_single("FCM Notification Settings")
    return {
        "type": "service_account",
        "project_id": credentials_doc.get("project_id"),
        "private_key_id": credentials_doc.get("private_key_id"),
        "private_key": credentials_doc.get_password("private_key").replace("\\n", "\n").strip(),
        "client_email": credentials_doc.get("client_email"),
        "client_id": credentials_doc.get("client_id"),
        "auth_uri": credentials_doc.get("auth_uri"),
        "token_uri": credentials_doc.get("token_uri"),
        "auth_provider_x509_cert_url": credentials_doc.get("auth_provider_x509_cert_url"),
        "client_x509_cert_url": credentials_doc.get("client_x509_cert_url")
    }

@frappe.whitelist()
def get_cached_access_token():
    """
    Retrieves the cached access token if valid, otherwise generates a new one.
    """
    try:
        credentials_doc = frappe.get_single("FCM Notification Settings")

        if credentials_doc.access_token and credentials_doc.expiration_time > now():
            return {"access_token": credentials_doc.get("access_token")}

        service_account_info = get_fcm_credentials()
        credentials = service_account.Credentials.from_service_account_info(
            service_account_info,
            scopes=["https://www.googleapis.com/auth/firebase.messaging"]
        )

        request = google_requests.Request()
        credentials.refresh(request)

        access_token = credentials.token
        expiration_time = add_to_date(now(), minutes=55)

        credentials_doc.access_token = access_token
        credentials_doc.expiration_time = expiration_time
        credentials_doc.save()
        frappe.db.commit()

        return {"access_token": access_token}

    except Exception as e:
        frappe.log_error(f"Error in get_cached_access_token: {str(e)}", "FCM Notification Error")
        return {"error": str(e)}

@frappe.whitelist()
def send_fcm_notification(notification, device_token):
    """
    Sends a push notification immediately using FCM.
    """
    # Ensure device_token is string
    if isinstance(device_token, dict):
        device_token = device_token.get('device_token')
    if not device_token:
        frappe.log_error("Device token is empty", "FCM Notification Error")
        return {"status": "failed", "error": "Empty device token"}

    # Get access token
    access_token = get_cached_access_token()
    if "error" in access_token:
        frappe.log_error(f"Cannot send FCM: {access_token['error']}", "FCM Notification Error")
        return {"status": "failed", "error": access_token["error"]}

    headers = {
        'Authorization': f'Bearer {access_token["access_token"]}',
        'Content-Type': 'application/json; UTF-8',
    }

    body = cleanhtml(notification.email_content)
    title = cleanhtml(notification.subject)

    payload = {
        "message": {
            "token": device_token,  # Target device
            "notification": {
                "title": title,
                "body": body
            },
            "webpush": {
                "headers": {
                    "Urgency": "high"  # Show notification immediately even if tab inactive
                },
                "notification": {
                    "title": title,
                    "body": body,
                    "icon": f"{frappe.utils.get_url()}/files/hrinc_rms.png",  # Browser notification icon
                    "click_action": frappe.utils.get_url() + "/" + notification.document_type.lower() + "/" + notification.document_name
                },
            },
            "data": {
                "doctype": notification.document_type.lower(),
                "docname": str(notification.document_name),
                "click_action": frappe.utils.get_url() + "/" + notification.document_type.lower() + "/" + notification.document_name
            }
        }
    }

    fcm_endpoint = f'https://fcm.googleapis.com/v1/projects/{get_fcm_credentials()["project_id"]}/messages:send'

    try:
        response = requests.post(fcm_endpoint, headers=headers, json=payload)
        if response.status_code == 200:
            # Success, do not log as error
            print("Notification sent successfully:", response.json())
            return {"status": "success", "response": response.json()}
        else:
            error_message = f"Failed to send notification ({response.status_code}): {response.text}"
            frappe.log_error(error_message, "FCM Notification Error")
            return {"status": "failed", "error": error_message}
    except Exception as e:
        frappe.log_error(f"Exception while sending FCM: {str(e)}", "FCM Notification Error")
        return {"status": "failed", "error": str(e)}

def create_notification_log(user, subject, message, doc_type=None, doc_name=None, log_type="Alert"):
    """Insert a record into Notification Log safely and easily."""
    try:
        log = frappe.get_doc({
            "doctype": "Notification Log",
            "for_user": user,
            "subject": subject,
            "email_content": message,
            "type": log_type,
            "document_type": doc_type,
            "document_name": doc_name,
        })
        log.insert(ignore_permissions=True)

        # Only commit in background jobs or manual scripts
        if frappe.flags.in_test or frappe.flags.in_migrate:
            pass
        elif frappe.local.flags.in_test:
            pass
        elif not frappe.flags.in_transaction:
            frappe.db.commit()

        return log.name

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), f"Notification Log insert failed: {e}")
        return None