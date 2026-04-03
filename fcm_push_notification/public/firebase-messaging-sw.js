importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyA1V_9RjExlnBKppdeSSFo1YmsFhXx6wHk",
    authDomain: "rec-push-notification-2026.firebaseapp.com",
    projectId: "rec-push-notification-2026",
    storageBucket: "rec-push-notification-2026.firebasestorage.app",
    messagingSenderId: "401804588197",
    appId: "1:401804588197:web:390b9198355639cb5c494c",
    measurementId: "G-9H1RSD922Y"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// ✅ Background message
messaging.onBackgroundMessage((payload) => {
    console.log("Background message:", payload);

    const { title, body, icon } = payload.notification || {};

    self.registration.showNotification(title, {
        body: body,
        icon: icon || "",
        data: payload.data
    });
});

// ✅ Click handler (IMPORTANT)
self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    const url = event.notification.data?.click_action || "/";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true })
            .then(clientList => {
                for (const client of clientList) {
                    if (client.url === url && 'focus' in client) {
                        return client.focus();
                    }
                }
                return clients.openWindow(url);
            })
    );
});