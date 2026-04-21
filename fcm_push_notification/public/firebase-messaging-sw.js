importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// 🔥 Handle ALL push here
self.addEventListener("push", function (event) {
    if (!event.data) return;

    let payload = {};

    try {
        payload = event.data.json();
    } catch (e) {
        try {
            payload = JSON.parse(event.data.text());
        } catch (err) {
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