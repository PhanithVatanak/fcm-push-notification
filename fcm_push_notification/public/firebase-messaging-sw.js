importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

let messaging = null;

async function initFirebaseSW() {
    try {
        // ✅ use SAME method via REST API
        const res = await fetch('/api/method/fcm_push_notification.utils.fcm_notification.get_firebase_config');
        const data = await res.json();

        const config = data.message;

        if (!config) {
            console.error("SW: Firebase config missing");
            return;
        }

        const { vapidKey, ...firebaseConfig } = config;

        firebase.initializeApp(firebaseConfig);

        messaging = firebase.messaging();

        console.log("SW: Firebase initialized");

        messaging.onBackgroundMessage((payload) => {
            console.log("SW: Background message:", payload);

            const { title, body, icon } = payload.notification || {};

            self.registration.showNotification(title, {
                body: body,
                icon: icon || "/assets/frappe/images/frappe-framework-logo.png",
                data: payload.data
            });
        });

    } catch (err) {
        console.error("SW: Failed to init Firebase", err);
    }
}

initFirebaseSW();

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