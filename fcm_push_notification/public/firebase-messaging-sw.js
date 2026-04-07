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
        messaging.onBackgroundMessage(function(payload) {
            console.log("Background message received:", payload);

            const data = payload.data || {};

            const notificationTitle = data.title || "Notification";
            const notificationOptions = {
                body: data.body || "",
                icon: data.icon || "/assets/frappe/images/frappe-framework-logo.png",
                data: data
            };

            self.registration.showNotification(notificationTitle, notificationOptions);
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
    let url = "/app";

    // Build Frappe URL: /app/doctype/docname
    if (data.doctype && data.docname) {
        const doctype_slug = data.doctype.toLowerCase().replace(/ /g, '-');
        url = `${self.location.origin}/app/${doctype_slug}/${data.docname}`;
    } 
    else if (data.click_action) {
        url = data.click_action;
    }
    
    console.log("---------- url : ", url)
    
    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true })
            .then(windowClients => {
                // If a tab is already open with this URL, focus it
                for (let client of windowClients) {
                    if (client.url === url && "focus" in client) {
                        return client.focus();
                    }
                }
                // Otherwise, open a new window
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});