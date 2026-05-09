import { PaymentEventType, PaymentStatus, PayoutMethod } from '../../../common/entities/enums/all.enums';

export const WAAFI_PROVIDER_ENDPOINT = '/asm';
export const WAAFI_IDEMPOTENCY_WINDOW_MS = 2 * 60 * 1000;

export type NormalizedPaymentOutcome = {
    status: PaymentStatus;
    eventType: PaymentEventType;
    providerStatus: string;
    providerResponseCode?: string;
    providerErrorCode?: string;
    providerTransactionId?: string;
    issuerTransactionId?: string;
    referenceId?: string;
    accountNoMasked?: string;
    providerDescription?: string;
    message: string;
    note: string;
    canRetry: boolean;
};

export const WAAFI_DEFAULT_PAYMENT_METHOD = PayoutMethod.MWALLET_ACCOUNT;
