importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyDI-A-Xd_sPKKAOPSM2meTQAnj9r8slpfM",
    authDomain: "rec-sp-fcm-integration.firebaseapp.com",
    projectId: "rec-sp-fcm-integration",
    storageBucket: "rec-sp-fcm-integration.firebasestorage.app",
    messagingSenderId: "321895106947",
    appId: "1:321895106947:web:8eade34915426177654eb6",
    measurementId: "G-G1H7JSWGWM"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
    console.log("Background message received:", payload);

    const notificationTitle = payload.notification?.title || "Notification";
    const notificationOptions = {
        body: payload.notification?.body || "",
        icon: payload.notification?.icon || "",
        data: payload.data || {}
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

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