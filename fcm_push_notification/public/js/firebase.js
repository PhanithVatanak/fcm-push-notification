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

        // Replace with your Firebase project config
        const firebaseConfig = {
            apiKey: "AIzaSyA8BY-_r1X61aaDSquKZbYqRrVScp2_fRU",
            authDomain: "rec-sp-fcm-integration.firebaseapp.com",
            projectId: "rec-sp-fcm-integration",
            storageBucket: "rec-sp-fcm-integration.firebasestorage.app",
            messagingSenderId: "321895106947",
            appId: "1:321895106947:web:9b31bd4259927f81654eb6",
            measurementId: "G-2FW7RPGQEL"
        };

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        const messaging = firebase.messaging();
        console.log("------------------- messaging : ", messaging)
        if ('serviceWorker' in navigator) {
            // 1. Point to the specific path without forcing the root '/' scope
            const swPath = '/assets/fcm_push_notification/firebase-messaging-sw.js';

            navigator.serviceWorker.getRegistration(swPath)
                .then(reg => {
                    // 2. If registered already, reuse it; otherwise register new
                    return reg || navigator.serviceWorker.register(swPath);
                })
                .then(async registration => {
                    console.log("Service Worker ready:", registration);

                    // Request notification permission
                    const permission = await Notification.requestPermission();
                    if (permission === "granted") {
                        console.log("Notification permission granted.");

                        // Get FCM token
                        // Crucial: Pass the registration object here
                        const token = await messaging.getToken({
                            vapidKey: "BAsAqy2MZ0wEPPFeoKMrShEox_5kOfhKdxmPjErAnebkFyMpfrwkVNlmuS3VspvH06i1T_YbjN5NUJ_ixi_Kmgs",
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

        // Foreground messages
        messaging.onMessage(payload => {
            console.log("Foreground message received:", payload);
            
            if (Notification.permission === "granted") {
                navigator.serviceWorker.getRegistration().then(reg => {
                    const { title, body, icon } = payload.notification;
                    const options = {
                        body: body,
                        icon: icon || "/assets/frappe/images/frappe-framework-logo.png",
                        data: payload.data
                    };
                    reg.showNotification(title, options);
                });
            }
        });
    }
})();


// (function() {
//     console.log("Initializing Firebase for FCM...");

//     function loadScript(src, callback) {
//         const s = document.createElement('script');
//         s.src = src;
//         s.onload = callback;
//         document.head.appendChild(s);
//     }

//     loadScript("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js", function() {
//         loadScript("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js", initFirebase);
//     });

//     async function initFirebase() {
//         console.log("Firebase SDK loaded.");

//         const firebaseConfig = {
//             apiKey: "AIzaSyA1V_9RjExlnBKppdeSSFo1YmsFhXx6wHk",
//             authDomain: "rec-push-notification-2026.firebaseapp.com",
//             projectId: "rec-push-notification-2026",
//             storageBucket: "rec-push-notification-2026.firebasestorage.app",
//             messagingSenderId: "401804588197",
//             appId: "1:401804588197:web:390b9198355639cb5c494c",
//             measurementId: "G-9H1RSD922Y"
//         };

//         if (!firebase.apps.length) {
//             firebase.initializeApp(firebaseConfig);
//         }

//         const messaging = firebase.messaging();

//         if ('serviceWorker' in navigator) {
//             try {
//                 await navigator.serviceWorker.register(
//                     "/firebase-messaging-sw.js",
//                     { scope: "/" }
//                 );

//                 // IMPORTANT: wait here
//                 const registration = await navigator.serviceWorker.ready;

//                 console.log("Service Worker READY:", registration);

//                 const permission = await Notification.requestPermission();
//                 if (permission !== "granted") {
//                     console.warn("Notification permission denied.");
//                     return;
//                 }

//                 const token = await messaging.getToken({
//                     vapidKey: "BGvQzMuY5YEP6ksQIFws9O1mMY6DMNZOT_LdOokLEOcX63QuaoyJAEGBA-8_JSBAh4CsmapjGm8rpn-od2Q7E3E",
//                     serviceWorkerRegistration: registration
//                 });

//                 console.log("FCM Device Token:", token);

//             } catch (err) {
//                 console.error("Service Worker error:", err);
//             }
//         }

//         // Foreground messages
//         messaging.onMessage(payload => {
//             console.log("Foreground message received:", payload);
//             if (Notification.permission === "granted" && payload.notification) {
//                 const notif = new Notification(payload.notification.title || "Notification", {
//                     body: payload.notification.body || "",
//                     icon: payload.notification.icon || ""
//                 });

//                 notif.onclick = () => {
//                     window.focus();
//                     if (payload.data && payload.data.click_action) {
//                         window.location.href = payload.data.click_action;
//                     }
//                     notif.close();
//                 };
//             }
//         });
//     }
// })();