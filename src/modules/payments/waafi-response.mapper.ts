import { PaymentEventType, PaymentStatus } from '../../common/entities/enums/all.enums';
import { NormalizedPaymentOutcome } from './constants/waafi.constants';

const stringifyObjectValues = (value: unknown): string[] => {
    if (value === null || value === undefined) return [];
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return [String(value)];
    }
    if (Array.isArray(value)) {
        return value.flatMap((entry) => stringifyObjectValues(entry));
    }
    if (typeof value === 'object') {
        return Object.values(value as Record<string, unknown>).flatMap((entry) => stringifyObjectValues(entry));
    }
    return [];
};

const extractString = (response: Record<string, any>, paths: string[]): string | undefined => {
    for (const path of paths) {
        const segments = path.split('.');
        let current: any = response;
        for (const segment of segments) {
            current = current?.[segment];
        }
        if (typeof current === 'string' && current.trim()) {
            return current.trim();
        }
    }
    return undefined;
};

export const mapWaafiResponse = (
    responseBody: Record<string, any>,
    statusCode: number,
): NormalizedPaymentOutcome => {
    const responseCode =
        extractString(responseBody, [
            'responseCode',
            'response_code',
            'data.responseCode',
            'response.responseCode',
            'params.responseCode',
        ]) ?? '';
    const providerErrorCode =
        extractString(responseBody, [
            'errorCode',
            'error_code',
            'data.errorCode',
            'response.errorCode',
        ]) ?? '';
    const responseMessage =
        extractString(responseBody, [
            'responseMsg',
            'responseMessage',
            'message',
            'data.responseMsg',
            'data.message',
            'response.responseMsg',
        ]) ?? '';
    const providerDescription =
        extractString(responseBody, [
            'params.description',
            'description',
            'data.params.description',
            'response.params.description',
        ]) ?? '';
    const providerTransactionId =
        extractString(responseBody, [
            'params.transactionId',
            'transactionId',
            'data.params.transactionId',
            'response.params.transactionId',
        ]) ?? '';
    const issuerTransactionId =
        extractString(responseBody, [
            'params.issuerTransactionId',
            'issuerTransactionId',
            'data.params.issuerTransactionId',
            'response.params.issuerTransactionId',
        ]) ?? '';
    const referenceId =
        extractString(responseBody, [
            'params.referenceId',
            'referenceId',
            'data.params.referenceId',
            'response.params.referenceId',
        ]) ?? '';
    const accountNoMasked =
        extractString(responseBody, [
            'params.accountNo',
            'accountNo',
            'data.params.accountNo',
            'response.params.accountNo',
        ]) ?? '';
    const providerStatus =
        extractString(responseBody, [
            'params.state',
            'status',
            'description',
            'params.description',
            'data.params.state',
            'response.params.state',
        ]) ?? responseMessage;

    const searchableText = [
        responseCode,
        responseMessage,
        providerDescription,
        providerStatus,
        providerErrorCode,
        ...stringifyObjectValues(responseBody),
    ]
        .join(' ')
        .toUpperCase();

    if (
        responseCode === '2001' ||
        searchableText.includes('RCS_SUCCESS') ||
        searchableText.includes('APPROVED') ||
        (statusCode >= 200 && statusCode < 300 && searchableText.includes('SUCCESS'))
    ) {
        return {
            status: PaymentStatus.CONFIRMED,
            eventType: PaymentEventType.APPROVED,
            providerStatus: providerStatus || 'APPROVED',
            providerResponseCode: responseCode || '2001',
            providerErrorCode,
            providerTransactionId,
            issuerTransactionId,
            referenceId,
            accountNoMasked,
            providerDescription: providerDescription || responseMessage,
            message: 'Payment approved successfully.',
            note: 'WAAFI push payment approved.',
            canRetry: false,
        };
    }

    if (responseCode === '5310' || searchableText.includes('RCS_USER_REJECTED') || searchableText.includes('USER REJECTED')) {
        return {
            status: PaymentStatus.REJECTED,
            eventType: PaymentEventType.REJECTED,
            providerStatus: providerStatus || 'RCS_USER_REJECTED',
            providerResponseCode: responseCode || '5310',
            providerErrorCode,
            providerTransactionId,
            issuerTransactionId,
            referenceId,
            accountNoMasked,
            providerDescription: providerDescription || responseMessage,
            message: 'Payment was rejected by the user.',
            note: 'Customer rejected the WAAFI payment prompt.',
            canRetry: true,
        };
    }

    if (
        searchableText.includes('PIN ERROR') ||
        searchableText.includes('NAMBARKA SIRTA') ||
        searchableText.includes('PIN-KA')
    ) {
        return {
            status: PaymentStatus.FAILED,
            eventType: PaymentEventType.FAILED,
            providerStatus: providerStatus || responseMessage || 'PIN_ERROR',
            providerResponseCode: responseCode,
            providerErrorCode: providerErrorCode || 'PIN_ERROR',
            providerTransactionId,
            issuerTransactionId,
            referenceId,
            accountNoMasked,
            providerDescription: providerDescription || responseMessage,
            message: 'Payment failed because the PIN was invalid.',
            note: 'WAAFI reported an invalid PIN.',
            canRetry: true,
        };
    }

    if (searchableText.includes('INSUFFICIENT BALANCE') || searchableText.includes('HARAAGA')) {
        return {
            status: PaymentStatus.FAILED,
            eventType: PaymentEventType.FAILED,
            providerStatus: providerStatus || responseMessage || 'INSUFFICIENT_BALANCE',
            providerResponseCode: responseCode,
            providerErrorCode: providerErrorCode || 'INSUFFICIENT_BALANCE',
            providerTransactionId,
            issuerTransactionId,
            referenceId,
            accountNoMasked,
            providerDescription: providerDescription || responseMessage,
            message: 'Payment failed because the wallet balance is insufficient.',
            note: 'WAAFI reported insufficient balance.',
            canRetry: true,
        };
    }

    if (searchableText.includes('PENDING') || searchableText.includes('PROCESSING')) {
        return {
            status: PaymentStatus.PROCESSING,
            eventType: PaymentEventType.PENDING,
            providerStatus: providerStatus || 'PENDING',
            providerResponseCode: responseCode,
            providerErrorCode,
            providerTransactionId,
            issuerTransactionId,
            referenceId,
            accountNoMasked,
            providerDescription: providerDescription || responseMessage,
            message: 'Payment request sent and is pending confirmation.',
            note: 'WAAFI payment is still processing.',
            canRetry: false,
        };
    }

    return {
        status: PaymentStatus.FAILED,
        eventType: PaymentEventType.FAILED,
        providerStatus: providerStatus || responseMessage || 'FAILED',
        providerResponseCode: responseCode,
        providerErrorCode,
        providerTransactionId,
        issuerTransactionId,
        referenceId,
        accountNoMasked,
        providerDescription: providerDescription || responseMessage,
        message: 'Payment could not be completed.',
        note: 'WAAFI returned an unrecognized or failed response.',
        canRetry: true,
    };
};
