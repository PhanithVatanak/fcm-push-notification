importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

let messaging = null;

async function initFirebaseSW() {
    try {
        const res = await fetch('/api/method/fcm_push_notification.utils.fcm_notification.get_firebase_config');
        const data = await res.json();
        const config = data.message;

        if (!config) {
            return;
        }

        const { vapidKey, ...firebaseConfig } = config;

        firebase.initializeApp(firebaseConfig);
        messaging = firebase.messaging();

        // Handle Background Messages
        messaging.onBackgroundMessage((payload) => {
            // We prioritize payload.data to avoid the 'Double Notification' 
            // caused by the automatic SDK display of payload.notification
            const title = payload.data?.title || payload.notification?.title || "New Notification";
            const body = payload.data?.body || payload.notification?.body || "";
            const icon = payload.data?.icon || payload.notification?.icon || "/assets/frappe/images/frappe-framework-logo.png";
            
            const notificationOptions = {
                body: body,
                icon: icon,
                data: payload.data, // Important for the click handler
                tag: payload.data?.docname || 'frappe-notification' // Merges notifications for the same doc
            };
            
            if (!payload.notification) {
                self.registration.showNotification(title, notificationOptions);
            }
        });

    } catch (err) {
        return;
    }
}

initFirebaseSW();

// Notification Click Logic
self.addEventListener("notificationclick", function(event) {
    event.notification.close();

    const data = event.notification.data || {};
    let url = data.click_action || "/";

    if (data.doctype && data.docname) {
        const doctype_lower = data.doctype.toLowerCase();
        url = self.location.origin + "/app/" + doctype_lower + "/" + data.docname;
    }
    else if (data.click_action) {
        url = data.click_action;
    }

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true })
            .then(windowClients => {
                for (let client of windowClients) {
                    if (client.url.startsWith(self.location.origin + url) && "focus" in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});