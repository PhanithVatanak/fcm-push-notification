importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// 🔥 Handle ALL push here (single source of truth)
self.addEventListener("push", function (event) {
    console.log("🔥 Push event received");

    if (!event.data) return;

    let payload = {};

    try {
        payload = event.data.json();
    } catch (e) {
        try {
            payload = JSON.parse(event.data.text());
        } catch (err) {
            console.error("❌ Invalid payload");
            return;
        }
    }

    const data = payload.data || {};
    const notification = payload.notification || {};

    const title = data.title || notification.title || "Notification";

    const options = {
        body: data.body || notification.body || "",
        icon: data.icon || notification.icon || "/assets/frappe/images/frappe-framework-logo.png",
        data: data,
        tag: data.docname || "frappe-notification",

        requireInteraction: true,
        renotify: true,
        silent: false,
        vibrate: [200, 100, 200]
    };

    self.registration.showNotification(title, options);
});

// 🔥 Handle click
self.addEventListener("notificationclick", function (event) {
    event.notification.close();

    const data = event.notification.data || {};
    let url = "/app";

    if (data.doctype && data.docname) {
        const doctype = data.doctype.toLowerCase().replace(/ /g, "-");
        url = `/app/${doctype}/${data.docname}`;
    } else if (data.click_action) {
        url = data.click_action;
    }

    const fullUrl = self.location.origin + url;

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true })
            .then((clientsArr) => {
                for (const client of clientsArr) {
                    if (client.url.includes(url) && "focus" in client) {
                        return client.focus();
                    }
                }
                return clients.openWindow(fullUrl);
            })
    );
});

// 🔴 Optional (for debugging lifecycle)
self.addEventListener("install", () => {
    console.log("✅ Service Worker installed");
});

self.addEventListener("activate", () => {
    console.log("✅ Service Worker activated");
});


// importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
// importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// let messaging = null;
// let firebaseInitialized = false;

// // 🔴 REQUIRED: register early for browser lifecycle
// self.addEventListener("push", function (event) {
//     console.log("🔥 Push event received");
// });

// // 🔴 REQUIRED: click handler must be top-level
// self.addEventListener("notificationclick", function (event) {
//     event.notification.close();

//     const data = event.notification.data || {};
//     let url = "/app";

//     if (data.doctype && data.docname) {
//         const doctype = data.doctype.toLowerCase().replace(/ /g, "-");
//         url = `/app/${doctype}/${data.docname}`;
//     } else if (data.click_action) {
//         url = data.click_action;
//     }

//     const fullUrl = self.location.origin + url;

//     event.waitUntil(
//         clients.matchAll({ type: "window", includeUncontrolled: true })
//             .then((clientsArr) => {
//                 for (const client of clientsArr) {
//                     if (client.url.includes(url) && "focus" in client) {
//                         return client.focus();
//                     }
//                 }
//                 return clients.openWindow(fullUrl);
//             })
//     );
// });

// // ✅ Dynamic Firebase init via frontend message
// self.addEventListener("message", function (event) {
//     if (!event.data || event.data.type !== "INIT_FIREBASE") return;

//     if (firebaseInitialized) {
//         return;
//     }

//     const { vapidKey, ...firebaseConfig } = event.data.config;

//     firebase.initializeApp(firebaseConfig);
//     messaging = firebase.messaging();

//     firebaseInitialized = true;

//     messaging.onBackgroundMessage((payload) => {
//         const title =
//             payload.data?.title ||
//             payload.notification?.title ||
//             "Notification";

//         const options = {
//             body: payload.data?.body || payload.notification?.body || "",
//             icon:
//                 payload.data?.icon ||
//                 payload.notification?.icon ||
//                 "/assets/frappe/images/frappe-framework-logo.png",
//             data: payload.data || {},
//             tag: payload.data?.docname || "frappe-notification"
//         };

//         // ✅ ALWAYS show (avoid missing notification)
//         self.registration.showNotification(title, options);
//     });
// });