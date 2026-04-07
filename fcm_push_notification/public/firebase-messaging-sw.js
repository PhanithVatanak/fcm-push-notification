importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Initialize Firebase with empty config first
firebase.initializeApp({});
const messaging = firebase.messaging();

// ===========================
// Background Push Handler
// ===========================
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let payload = event.data.json();

    const title = payload.data?.title || payload.notification?.title || "New Notification";
    const body = payload.data?.body || payload.notification?.body || "";
    const icon = payload.data?.icon || payload.notification?.icon || "/assets/frappe/images/frappe-framework-logo.png";

    const notificationOptions = {
        body: body,
        icon: icon,
        data: payload.data, // Include all data for click handler
        tag: payload.data?.docname || 'frappe-notification'
    };

    // Show notification only if background message
    if (!payload.notification) {
        event.waitUntil(self.registration.showNotification(title, notificationOptions));
    }
});

// ===========================
// Notification Click Handler
// ===========================
self.addEventListener("notificationclick", function(event) {
    event.notification.close();

    const data = event.notification.data || {};
    // Always use backend-provided click_action
    let url = data.click_action || "/app";

    if (data.doctype && data.docname) {
        const doctype_lower = data.doctype.toLowerCase().replace(/ /g, '-');
        url = self.location.origin + "/app/" + doctype_lower + "/" + data.docname;
    }

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true })
            .then(windowClients => {
                for (let client of windowClients) {
                    if (client.url.startsWith(url) && "focus" in client) return client.focus();
                }
                if (clients.openWindow) return clients.openWindow(url);
            })
    );
});

// ===========================
// Fetch Firebase Config and Initialize Messaging
// ===========================
async function initFirebaseSW() {
    try {
        const res = await fetch('/api/method/fcm_push_notification.utils.fcm_notification.get_firebase_config');
        const data = await res.json();
        const config = data.message;

        if (!config) return;

        const { vapidKey, ...firebaseConfig } = config;
        firebase.initializeApp(firebaseConfig);
    } catch (err) {
        console.error("FCM SW init error:", err);
    }
}

initFirebaseSW();