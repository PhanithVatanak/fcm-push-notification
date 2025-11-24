function initFirebase() {
    frappe.call({
        method: "fcm_push_notification.utils.fcm_notification.get_firebase_web_config",
        callback: function(r) {
            if (!r.message) return;

            const cfg = r.message;
            firebase.initializeApp(cfg);

            const messaging = firebase.messaging();
            const key = "fcm_permission_choice";
            const saved = localStorage.getItem(key);

            if (!saved) {
                askChoice(messaging, cfg.vapidKey, cfg, key);
                return;
            }

            if (saved === "allow") {
                requestBrowserPermission(messaging, cfg.vapidKey, cfg, key);
            }
        }
    });
}

function askChoice(messaging, vapidKey, cfg, key) {
    const d = new frappe.ui.Dialog({
        title: "Allow notifications",
        fields: [
            {
                fieldname: "i",
                fieldtype: "HTML",
                options: "<p>Do you want notifications on this device</p>"
            }
        ],
        primary_action_label: "Allow",
        primary_action() {
            d.hide();
            localStorage.setItem(key, "allow");
            requestBrowserPermission(messaging, vapidKey, cfg, key);
        },
        secondary_action_label: "No",
        secondary_action() {
            d.hide();
            localStorage.setItem(key, "deny");
        }
    });

    d.show();
}

function requestBrowserPermission(messaging, vapidKey, cfg, key) {
    Notification.requestPermission().then(status => {
        if (status !== "granted") {
            localStorage.setItem(key, "deny");
            return;
        }

        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/assets/fcm_push_notification/firebase-messaging-sw.js")
                .then(reg => {
                    if (reg.active) {
                        reg.active.postMessage({
                            type: "INIT_FIREBASE",
                            config: cfg
                        });
                    }

                    return messaging.getToken({ vapidKey: vapidKey });
                })
                .then(token => {
                    frappe.call({
                        method: "fcm_push_notification.fcm_push_notification.doctype.user_device.user_device.save_web_token",
                        args: { token }
                    });
                    console.log("------------------------- token : ", token)
                })
                .catch(err => console.log("Token error", err));
        }
    });
}

window.initFirebase = initFirebase;




// (function() {
//     function loadScript(src, callback) {
//         const s = document.createElement('script');
//         s.src = src;
//         s.onload = callback;
//         document.head.appendChild(s);
//     }

//     // Load Firebase SDKs
//     loadScript("https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js", function() {
//         loadScript("https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js", initFirebase);
//     });

//     function initFirebase() {
//         const firebaseConfig = {
//             apiKey: "AIzaSyDI-A-Xd_sPKKAOPSM2meTQAnj9r8slpfM",
//             authDomain: "rec-sp-fcm-integration.firebaseapp.com",
//             projectId: "rec-sp-fcm-integration",
//             storageBucket: "rec-sp-fcm-integration.firebasestorage.app",
//             messagingSenderId: "321895106947",
//             appId: "1:321895106947:web:8eade34915426177654eb6",
//             measurementId: "G-G1H7JSWGWM"
//         };

//         firebase.initializeApp(firebaseConfig);
//         const messaging = firebase.messaging();

//         if ('serviceWorker' in navigator) {
//             // Reuse existing SW if present
//             navigator.serviceWorker.getRegistration('/assets/fcm_push_notification/firebase-messaging-sw.js')
//                 .then(reg => {
//                     if (reg) return reg; // reuse existing SW
//                     return navigator.serviceWorker.register('/assets/fcm_push_notification/firebase-messaging-sw.js');
//                 })
//                 .then(async registration => {
//                     // Request notification permission
//                     const permission = await Notification.requestPermission();
//                     if (permission === "granted") {
//                         // Get FCM token
//                         const token = await messaging.getToken({
//                             vapidKey: "BIiEgUFGgXBl_L6FQje-fLJvkxKCTfwv0WfShrh2jEp8hRxClmWdfaV-smfkt3BzLx3WMlZkgKWy3145jLR_wnQ",
//                             serviceWorkerRegistration: registration
//                         });

//                         if (token) {
//                             // Detect device type
//                             const ua = navigator.userAgent;
//                             let deviceType = "Web";
//                             if (/Android/i.test(ua)) deviceType = "Android";
//                             else if (/iPhone|iPad|iPod/i.test(ua)) deviceType = "IOS";

//                             // Save token to Frappe
//                             frappe.call({
//                                 method: "fcm_push_notification.fcm_push_notification.doctype.user_device.user_device.save_web_token",
//                                 args: { token, device_type: deviceType }
//                             });
//                         }
//                     } else {
//                         console.warn("Notification permission denied.");
//                     }
//                 })
//                 .catch(err => console.error("Service Worker error:", err));
//         }

//         // Foreground messages
//         messaging.onMessage(payload => {
//             if (Notification.permission === "granted" && payload.notification) {
//                 new Notification(payload.notification.title || "Notification", {
//                     body: payload.notification.body || "",
//                     icon: payload.notification.icon || ""
//                 });

//                 notification.onclick = () => {
//                     window.focus();
//                     if (notification.data && notification.data.url) {
//                         window.location.href = notification.data.url;
//                     }
//                     notification.close();
//                 };
//             }
//         });
//     }
// })();
