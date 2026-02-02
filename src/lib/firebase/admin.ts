import * as admin from 'firebase-admin';

function initAdmin() {
    if (!admin.apps.length) {
        if (!process.env.FIREBASE_PRIVATE_KEY) {
            console.warn('FIREBASE_PRIVATE_KEY is not defined. Admin functionality will fail.');
        }

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
    }
    return admin;
}

// Lazy getters
export const getAdminDb = () => {
    initAdmin();
    return admin.firestore();
};

export const getAdminAuth = () => {
    initAdmin();
    return admin.auth();
};
