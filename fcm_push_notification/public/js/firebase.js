(function() {
    console.log("Initializing Firebase for FCM...");

    function loadScript(src, callback) {
        const s = document.createElement('script');
        s.src = src;
        s.onload = callback;
        document.head.appendChild(s);
    }

    // Load Firebase SDKs
    loadScript("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js", function() {
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
            console.error("Firebase config missing");
            return;
        }

        const {
            vapidKey,
            ...firebaseConfig
        } = config;

        // ✅ Initialize Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        const messaging = firebase.messaging();

        if ('serviceWorker' in navigator) {
            const swPath = '/assets/fcm_push_notification/firebase-messaging-sw.js';

            navigator.serviceWorker.getRegistration(swPath)
                .then(reg => reg || navigator.serviceWorker.register(swPath))
                .then(async registration => {
                    const permission = await Notification.requestPermission();
                    if (permission === "granted") {
                        const token = await messaging.getToken({
                            vapidKey: vapidKey,
                            serviceWorkerRegistration: registration
                        });

                        if (token) {
                            const ua = navigator.userAgent;
                            let deviceType = "Web";
                            if (/Android/i.test(ua)) deviceType = "Android";
                            else if (/iPhone|iPad|iPod/i.test(ua)) deviceType = "IOS";

                            frappe.call({
                                method: "fcm_push_notification.fcm_push_notification.doctype.user_device.user_device.save_web_token",
                                args: { token, device_type: deviceType }
                            });
                        }
                    }
                })
                .catch(err => {
                    return;
                });
        }
        
        messaging.onMessage(payload => {
            console.log("Foreground message received:", payload);
            if (Notification.permission === "granted" && payload.notification) {
                new Notification(payload.notification.title || "Notification", {
                    body: payload.notification.body || "",
                    icon: payload.notification.icon || ""
                });

                notification.onclick = () => {
                    window.focus();
                    if (notification.data && notification.data.url) {
                        window.location.href = notification.data.url;
                    }
                    notification.close();
                };
            }
        });
    }
})();