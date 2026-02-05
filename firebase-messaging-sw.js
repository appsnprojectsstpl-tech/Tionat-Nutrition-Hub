/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

const firebaseConfig = {
    projectId: "studio-4862173023-78909",
    appId: "1:730068458941:web:85f1267fc8c37acd2e46d4",
    apiKey: "AIzaSyCcHLVogi12ZhUwExDFu574WNfdozvUk00",
    authDomain: "studio-4862173023-78909.firebaseapp.com",
    storageBucket: "studio-4862173023-78909.firebasestorage.app",
    messagingSenderId: "730068458941"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/android-chrome-192x192.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
