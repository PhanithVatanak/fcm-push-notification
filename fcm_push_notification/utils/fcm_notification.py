import json
import requests
import frappe
from google.oauth2 import service_account
from google.auth.transport import requests as google_requests
from frappe.utils import now, add_to_date
import re


# ==============================
# HELPERS
# ==============================
def cleanhtml(raw_html):
    cleanr = re.compile('<.*?>')
    return re.sub(cleanr, '', raw_html or "")


def get_user_tokens(user):
    """Get all device tokens for user"""
    return frappe.get_all(
        "User Device",
        filters={"user": user},
        pluck="device_token"
    )


# ==============================
# MAIN ENTRY (TRIGGER)
# ==============================
@frappe.whitelist()
def notification_queue(doc, method):
    tokens = get_user_tokens(doc.for_user)

    if not tokens:
        return

    access_token = get_cached_access_token()
    if "error" in access_token:
        frappe.log_error(access_token["error"], "FCM Token Error")
        return

    for token in tokens:
        try:
            send_fcm_notification(
                notification=doc,
                device_token=token,
                access_token=access_token["access_token"]
            )
        except Exception:
            frappe.log_error(frappe.get_traceback(), "FCM Send Loop Error")


# ==============================
# CREDENTIALS
# ==============================
def get_fcm_credentials():
    doc = frappe.get_single("FCM Notification Settings")

    return {
        "type": "service_account",
        "project_id": doc.project_id,
        "private_key_id": doc.private_key_id,
        "private_key": doc.get_password("private_key").replace("\\n", "\n").strip(),
        "client_email": doc.client_email,
        "client_id": doc.client_id,
        "auth_uri": doc.auth_uri,
        "token_uri": doc.token_uri,
        "auth_provider_x509_cert_url": doc.auth_provider_x509_cert_url,
        "client_x509_cert_url": doc.client_x509_cert_url
    }

@frappe.whitelist()
def get_firebase_config():
    try:
        doc = frappe.get_single("FCM Notification Settings")

        return {
            "apiKey": doc.fwc_apikey,
            "authDomain": doc.fwc_auth_domain,
            "projectId": doc.fwc_projectid,
            "storageBucket": doc.fwc_storage_bucket,
            "messagingSenderId": doc.fwc_messaging_senderid,
            "appId": doc.fwc_appid,
            "measurementId": doc.fwc_measurementid,
            "vapidKey": doc.fwc_vapidkey
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "FCM Config Error")
        return None

# ==============================
# ACCESS TOKEN (CACHED)
# ==============================
def get_cached_access_token():
    try:
        doc = frappe.get_single("FCM Notification Settings")

        if doc.access_token and doc.expiration_time and doc.expiration_time > now():
            return {"access_token": doc.access_token}

        credentials = service_account.Credentials.from_service_account_info(
            get_fcm_credentials(),
            scopes=["https://www.googleapis.com/auth/firebase.messaging"]
        )

        request = google_requests.Request()
        credentials.refresh(request)

        access_token = credentials.token
        expiration_time = add_to_date(now(), minutes=55)

        doc.access_token = access_token
        doc.expiration_time = expiration_time
        doc.save(ignore_permissions=True)
        frappe.db.commit()

        return {"access_token": access_token}

    except Exception as e:
        frappe.log_error(str(e), "FCM Access Token Error")
        return {"error": str(e)}


# ==============================
# BUILD PAYLOAD
# ==============================
def build_payload(notification, device_token):
    title = cleanhtml(notification.subject)
    body = cleanhtml(notification.email_content)

    base_url = frappe.utils.get_url()
    click_url = f"{base_url}/app/{notification.document_type.lower()}/{notification.document_name}"

    settings = frappe.get_single("FCM Notification Settings")
    icon_url = settings.fcm_icon or "https://frappe.io/files/frappe.png"

    # if file is stored in File doctype, convert to full URL
    if icon_url.startswith("/"):
        icon_url = base_url + icon_url

    return {
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
                    "icon": icon_url,  # Browser notification icon
                    "click_action": click_url
                },
            },
            "data": {
                "doctype": notification.document_type.lower(),
                "docname": str(notification.document_name),
                "click_action": click_url
            }
        }
    }

# ==============================
# SEND FUNCTION
# ==============================
def send_fcm_notification(notification, device_token, access_token=None):
    if not device_token:
        return

    if not access_token:
        token_data = get_cached_access_token()
        if "error" in token_data:
            return
        access_token = token_data["access_token"]

    project_id = get_fcm_credentials()["project_id"]

    url = f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    payload = build_payload(notification, device_token)

    response = requests.post(url, headers=headers, json=payload)

    if response.status_code != 200:
        frappe.log_error(
            f"{response.status_code} | {response.text}",
            "FCM Send Error"
        )

        # Handle unregistered token
        if "UNREGISTERED" in response.text:
            delete_device_token(device_token)

    return response.json()

# ==============================
# DELETE Device Token
# ==============================
def delete_device_token(device_token):
    frappe.db.delete("User Device", {
        "device_token": device_token
    })
    frappe.db.commit()

# ==============================
# LOG (UNCHANGED, CLEANED)
# ==============================
def create_notification_log(user, subject, message, doc_type=None, doc_name=None, log_type="Alert"):
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

        if not frappe.flags.in_test and not frappe.flags.in_migrate:
            frappe.db.commit()

        return log.name

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Notification Log Error")
        return None