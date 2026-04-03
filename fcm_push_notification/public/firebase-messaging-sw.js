importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyA8BY-_r1X61aaDSquKZbYqRrVScp2_fRU",
    authDomain: "rec-sp-fcm-integration.firebaseapp.com",
    projectId: "rec-sp-fcm-integration",
    storageBucket: "rec-sp-fcm-integration.firebasestorage.app",
    messagingSenderId: "321895106947",
    appId: "1:321895106947:web:9b31bd4259927f81654eb6",
    measurementId: "G-2FW7RPGQEL"
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

// importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
// importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// // Replace with the same Firebase project config
// firebase.initializeApp({
//     apiKey: "AIzaSyA1V_9RjExlnBKppdeSSFo1YmsFhXx6wHk",
//     authDomain: "rec-push-notification-2026.firebaseapp.com",
//     projectId: "rec-push-notification-2026",
//     storageBucket: "rec-push-notification-2026.firebasestorage.app",
//     messagingSenderId: "401804588197",
//     appId: "1:401804588197:web:390b9198355639cb5c494c",
//     measurementId: "G-9H1RSD922Y"
// });

// const messaging = firebase.messaging();

// // Background notifications
// messaging.onBackgroundMessage(payload => {
//     console.log('[FCM SW] Background message received:', payload);

//     if (!payload.notification) return;

//     const title = payload.notification.title || "Notification";
//     const options = {
//         body: payload.notification.body || "",
//         icon: payload.notification.icon || "",
//         data: payload.data || {}
//     };

//     self.registration.showNotification(title, options);
// });

// self.addEventListener('notificationclick', event => {
//     event.notification.close();

//     const clickAction = event.notification.data.click_action || '/';
//     event.waitUntil(clients.openWindow(clickAction));
// });