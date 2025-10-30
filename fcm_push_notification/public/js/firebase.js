(function() {
    function loadScript(src, callback) {
        const s = document.createElement('script');
        s.src = src;
        s.onload = callback;
        document.head.appendChild(s);
    }

    // Load Firebase SDKs
    loadScript("https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js", function() {
        loadScript("https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js", initFirebase);
    });

    function initFirebase() {
        const firebaseConfig = {
            apiKey: "AIzaSyDI-A-Xd_sPKKAOPSM2meTQAnj9r8slpfM",
            authDomain: "rec-sp-fcm-integration.firebaseapp.com",
            projectId: "rec-sp-fcm-integration",
            storageBucket: "rec-sp-fcm-integration.firebasestorage.app",
            messagingSenderId: "321895106947",
            appId: "1:321895106947:web:8eade34915426177654eb6",
            measurementId: "G-G1H7JSWGWM"
        };

        firebase.initializeApp(firebaseConfig);
        const messaging = firebase.messaging();

        if ('serviceWorker' in navigator) {
            // Reuse existing SW if present
            navigator.serviceWorker.getRegistration('/assets/fcm_push_notification/firebase-messaging-sw.js')
                .then(reg => {
                    if (reg) return reg; // reuse existing SW
                    return navigator.serviceWorker.register('/assets/fcm_push_notification/firebase-messaging-sw.js');
                })
                .then(async registration => {
                    // Request notification permission
                    const permission = await Notification.requestPermission();
                    if (permission === "granted") {
                        // Get FCM token
                        const token = await messaging.getToken({
                            vapidKey: "BIiEgUFGgXBl_L6FQje-fLJvkxKCTfwv0WfShrh2jEp8hRxClmWdfaV-smfkt3BzLx3WMlZkgKWy3145jLR_wnQ",
                            serviceWorkerRegistration: registration
                        });

                        if (token) {
                            // Detect device type
                            const ua = navigator.userAgent;
                            let deviceType = "Web";
                            if (/Android/i.test(ua)) deviceType = "Android";
                            else if (/iPhone|iPad|iPod/i.test(ua)) deviceType = "IOS";

                            // Save token to Frappe
                            frappe.call({
                                method: "fcm_push_notification.fcm_push_notification.doctype.user_device.user_device.save_web_token",
                                args: { token, device_type: deviceType }
                            });
                        }
                    } else {
                        console.warn("Notification permission denied.");
                    }
                })
                .catch(err => console.error("Service Worker error:", err));
        }

        // Foreground messages
        messaging.onMessage(payload => {
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
