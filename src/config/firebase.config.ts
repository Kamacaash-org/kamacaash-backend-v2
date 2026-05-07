import { registerAs } from '@nestjs/config';

export default registerAs('firebase', () => ({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    testDeviceTokens: process.env.FCM_TEST_DEVICE_TOKENS
        ?.split(',')
        .map((token) => token.trim())
        .filter(Boolean) ?? [],
}));
