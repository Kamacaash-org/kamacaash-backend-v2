import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WAAFI_PROVIDER_ENDPOINT } from './constants/waafi.constants';

type WaafiPushPaymentParams = {
    requestId: string;
    accountNo: string;
    amount: number;
    currency: string;
    referenceId: string;
    invoiceId: string;
    description: string;
};

type WaafiResponse = {
    statusCode: number;
    body: Record<string, any>;
};

@Injectable()
export class WaafiPaymentClientService {
    private readonly logger = new Logger(WaafiPaymentClientService.name);

    constructor(private readonly configService: ConfigService) { }

    buildPayload(params: WaafiPushPaymentParams): Record<string, any> {
        const waafiConfig = this.configService.get('payments.waafi');

        if (!waafiConfig?.enabled) {
            throw new ServiceUnavailableException('WAAFI payments are not enabled.');
        }

        if (!waafiConfig.merchantUid || !waafiConfig.apiUserId || !waafiConfig.apiKey) {
            throw new ServiceUnavailableException('WAAFI payment credentials are not configured.');
        }

        return {
            schemaVersion: '1.0',
            requestId: params.requestId,
            timestamp: this.formatWaafiTimestamp(new Date()),
            channelName: waafiConfig.channelName,
            serviceName: waafiConfig.serviceName,
            serviceParams: {
                merchantUid: waafiConfig.merchantUid,
                apiUserId: waafiConfig.apiUserId,
                apiKey: waafiConfig.apiKey,
                paymentMethod: waafiConfig.paymentMethod,
                payerInfo: {
                    accountNo: params.accountNo,
                },
                transactionInfo: {
                    referenceId: params.referenceId,
                    invoiceId: params.invoiceId,
                    amount: process.env.NODE_ENV == "development" ? 0.01 : params.amount,
                    currency: params.currency,
                    description: params.description,
                },
            },
        };
    }

    async pushPayment(payload: Record<string, any>): Promise<WaafiResponse> {
        const waafiConfig = this.configService.get('payments.waafi');
        const endpoint = waafiConfig.baseUrl?.endsWith(WAAFI_PROVIDER_ENDPOINT)
            ? waafiConfig.baseUrl
            : `${waafiConfig.baseUrl}${WAAFI_PROVIDER_ENDPOINT}`;
        this.logger.log(`Submitting WAAFI push payment request ${payload.requestId} to ${endpoint}`);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(waafiConfig.requestTimeoutMs),
        });

        const rawText = await response.text();
        let body: Record<string, any> = {};

        if (rawText) {
            try {
                body = JSON.parse(rawText) as Record<string, any>;
            } catch {
                body = { raw: rawText };
            }
        }

        return {
            statusCode: response.status,
            body,
        };
    }

    private formatWaafiTimestamp(date: Date): string {
        const year = date.getFullYear();
        const month = `${date.getMonth() + 1}`.padStart(2, '0');
        const day = `${date.getDate()}`.padStart(2, '0');
        const hours = `${date.getHours()}`.padStart(2, '0');
        const minutes = `${date.getMinutes()}`.padStart(2, '0');
        const seconds = `${date.getSeconds()}`.padStart(2, '0');
        const milliseconds = `${date.getMilliseconds()}`.padStart(3, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
    }
}
