importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBv3ceO639CdxeA-3Fd0F-mucpRkL7sPdw",
  authDomain: "spring-cleaning-fc2a9.firebaseapp.com",
  projectId: "spring-cleaning-fc2a9",
  storageBucket: "spring-cleaning-fc2a9.firebasestorage.app",
  messagingSenderId: "953473355514",
  appId: "1:953473355514:web:997f02633afcb7b6664343"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/spring-cleaning/icon-192.png"
  });
});
