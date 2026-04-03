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
        console.log("Firebase SDK loaded.");

        const firebaseConfig = {
            apiKey: "AIzaSyA1V_9RjExlnBKppdeSSFo1YmsFhXx6wHk",
            authDomain: "rec-push-notification-2026.firebaseapp.com",
            projectId: "rec-push-notification-2026",
            storageBucket: "rec-push-notification-2026.firebasestorage.app",
            messagingSenderId: "401804588197",
            appId: "1:401804588197:web:390b9198355639cb5c494c",
            measurementId: "G-9H1RSD922Y"
        };

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        const messaging = firebase.messaging();

        if ('serviceWorker' in navigator) {
            const swPath = '/assets/fcm_push_notification/firebase-messaging-sw.js';

            navigator.serviceWorker.getRegistration(swPath)
                .then(reg => {
                    return reg || navigator.serviceWorker.register(swPath);
                })
                .then(async registration => {
                    console.log("Service Worker ready:", registration);

                    const permission = await Notification.requestPermission();

                    if (permission === "granted") {
                        console.log("Notification permission granted.");

                        const token = await messaging.getToken({
                            vapidKey: "BLwyNH0yeGci6H6lBQ9gDFnRr0VMOEU_-twUYnBvwvNuer43e_3Um4wyAQWQ4YT1VGjbmEJl2_zAHbe6L5nHYGg",
                            serviceWorkerRegistration: registration
                        });

                        if (token) {
                            console.log("Device Token:", token);

                            const ua = navigator.userAgent;
                            let deviceType = "Web";
                            if (/Android/i.test(ua)) deviceType = "Android";
                            else if (/iPhone|iPad|iPod/i.test(ua)) deviceType = "IOS";

                            frappe.call({
                                method: "fcm_push_notification.fcm_push_notification.doctype.user_device.user_device.save_web_token",
                                args: { token, device_type: deviceType }
                            });
                        }
                    } else {
                        console.warn("Notification permission denied.");
                    }
                })
                .catch(err => {
                    console.error("Service Worker registration failed:", err);
                });
        }

        // ✅ Foreground messages (FIXED)
        messaging.onMessage(payload => {
            console.log("Foreground message received:", payload);

            const { title, body, icon } = payload.notification || {};

            if (Notification.permission === "granted") {
                new Notification(title, {
                    body: body,
                    icon: icon || "",
                    data: payload.data
                });
            }
        });
    }
})();