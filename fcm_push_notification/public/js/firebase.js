(function () {
    function loadScript(src, callback) {
        const s = document.createElement("script");
        s.src = src;
        s.onload = callback;
        document.head.appendChild(s);
    }

    // Load Firebase SDKs
    loadScript("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js", function () {
        loadScript("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js", initFirebase);
    });

    async function initFirebase() {
        let res;
        try {
            res = await frappe.call({
                method: "fcm_push_notification.utils.fcm_notification.get_firebase_config"
            });
        } catch (err) {
            return;
        }

        const config = res.message;
        if (!config) {
            return;
        }

        const { vapidKey, ...firebaseConfig } = config;

        // ✅ Initialize Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        const messaging = firebase.messaging();

        if ("serviceWorker" in navigator) {
            const swPath = "/assets/fcm_push_notification/firebase-messaging-sw.js";

            try {
                let registration = await navigator.serviceWorker.getRegistration(swPath);

                if (!registration) {
                    registration = await navigator.serviceWorker.register(swPath);
                }

                // ✅ SEND CONFIG TO SERVICE WORKER
                if (registration.active) {
                    registration.active.postMessage({
                        type: "INIT_FIREBASE",
                        config: config
                    });
                } else {
                    navigator.serviceWorker.addEventListener("controllerchange", () => {
                        navigator.serviceWorker.controller.postMessage({
                            type: "INIT_FIREBASE",
                            config: config
                        });
                    });
                }

                // ✅ Request permission
                const permission = await Notification.requestPermission();

                if (permission !== "granted") {
                    return;
                }

                // ✅ Get token
                const token = await messaging.getToken({
                    vapidKey: vapidKey,
                    serviceWorkerRegistration: registration
                });

                if (token) {
                    const ua = navigator.userAgent;
                    let deviceType = "Web";

                    if (/Android/i.test(ua)) deviceType = "Android";
                    else if (/iPhone|iPad|iPod/i.test(ua)) deviceType = "IOS";

                    await frappe.call({
                        method: "fcm_push_notification.fcm_push_notification.doctype.user_device.user_device.save_web_token",
                        args: {
                            token,
                            device_type: deviceType
                        }
                    });
                }

            } catch (err) {
                return
            }
        }

        // ✅ Foreground messages
        messaging.onMessage((payload) => {
            if (Notification.permission !== "granted") return;

            const notification = new Notification(
                payload.data?.title || payload.notification?.title || "Notification",
                {
                    body: payload.data?.body || payload.notification?.body || "",
                    icon: payload.data?.icon || payload.notification?.icon || "",
                    data: payload.data || {}
                }
            );

            notification.onclick = () => {
                window.focus();

                if (notification.data?.doctype && notification.data?.docname) {
                    const doctype = notification.data.doctype.toLowerCase().replace(/ /g, "-");
                    window.location.href = `/app/${doctype}/${notification.data.docname}`;
                } else if (notification.data?.click_action) {
                    window.location.href = notification.data.click_action;
                }

                notification.close();
            };
        });
    }
})();