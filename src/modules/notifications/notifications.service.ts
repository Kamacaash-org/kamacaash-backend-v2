import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    Logger,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { App, cert, getApps, initializeApp, ServiceAccount } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { Notification } from './entities/notification.entity';
import { NotificationType } from '../../common/entities/enums/all.enums';
import { PushNotificationPayloadDto } from './dto/push-notification-payload.dto';
import { PushNotificationResultDto } from './dto/push-notification-result.dto';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);
    private firebaseApp: App | null = null;

    constructor(
        @InjectRepository(Notification)
        private notificationsRepository: Repository<Notification>,
        private configService: ConfigService,
    ) { }

    async sendToDevice(
        deviceToken: string,
        payload: PushNotificationPayloadDto,
    ): Promise<PushNotificationResultDto> {
        return this.sendToDevices([deviceToken], payload);
    }

    async sendToDevices(
        deviceTokens: string[],
        payload: PushNotificationPayloadDto,
    ): Promise<PushNotificationResultDto> {
        const tokens = this.validateTokens(deviceTokens);
        this.validatePayload(payload);

        try {
            const responses: PushNotificationResultDto['responses'] = [];

            for (const tokenBatch of this.chunkTokens(tokens, 500)) {
                const result = await getMessaging(this.getFirebaseApp()).sendEachForMulticast({
                    tokens: tokenBatch,
                    notification: {
                        title: payload.title,
                        body: payload.body,
                    },
                    data: this.normalizeData(payload.data),
                });

                result.responses.forEach((response, index) => {
                    responses.push({
                        success: response.success,
                        messageId: response.messageId,
                        error: response.error?.message,
                        token: tokenBatch[index],
                    });
                });
            }

            const summary: PushNotificationResultDto = {
                successCount: responses.filter((response) => response.success).length,
                failureCount: responses.filter((response) => !response.success).length,
                responses,
            };

            this.logger.log(
                `FCM send completed. Success: ${summary.successCount}, Failure: ${summary.failureCount}`,
            );

            return summary;
        } catch (error) {
            this.logger.error(
                'Failed to send push notification through Firebase Cloud Messaging',
                error instanceof Error ? error.stack : String(error),
            );
            throw new InternalServerErrorException('Failed to send push notification');
        }
    }

    async send(
        userId: string,
        type: NotificationType,
        title: string,
        body: string,
        data?: any,
        channel: string = 'PUSH'
    ) {
        const notification = this.notificationsRepository.create({
            user_id: userId,
            type,
            title,
            body,
            data,
            channel,
            status: 'PENDING'
        });

        await this.notificationsRepository.save(notification);

        // Mock sending push/email
        // await this.pushService.send(...)

        notification.status = 'SENT';
        notification.sent_at = new Date();
        await this.notificationsRepository.save(notification);

        return notification;
    }

    async findAll(userId: string) {
        return this.notificationsRepository.find({
            where: { user_id: userId },
            order: { created_at: 'DESC' },
            take: 50
        });
    }

    async markAsRead(id: string) {
        await this.notificationsRepository.update(id, { read_at: new Date() });
    }

    getTestDeviceTokens(): string[] {
        const tokens = this.configService.get<string[]>('firebase.testDeviceTokens') ?? [];

        if (!tokens.length) {
            throw new ServiceUnavailableException(
                'FCM test device tokens are not configured. Set FCM_TEST_DEVICE_TOKENS first.',
            );
        }

        return tokens;
    }

    private getFirebaseApp(): App {
        if (this.firebaseApp) {
            return this.firebaseApp;
        }

        const appName = 'kamacaash-fcm';
        const existingApp = getApps().find((app) => app.name === appName);
        if (existingApp) {
            this.firebaseApp = existingApp;
            return existingApp;
        }

        const serviceAccount = this.getServiceAccount();
        if (!serviceAccount) {
            throw new ServiceUnavailableException(
                'Firebase Cloud Messaging is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.',
            );
        }

        this.firebaseApp = initializeApp(
            {
                credential: cert(serviceAccount),
                databaseURL: this.configService.get<string>('firebase.databaseUrl'),
            },
            appName,
        );

        this.logger.log('Firebase Cloud Messaging initialized successfully');
        return this.firebaseApp;
    }

    private getServiceAccount(): ServiceAccount | null {
        const serviceAccountJson = this.configService.get<string>('firebase.serviceAccountJson');

        if (serviceAccountJson) {
            try {
                return JSON.parse(serviceAccountJson) as ServiceAccount;
            } catch {
                throw new ServiceUnavailableException(
                    'FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.',
                );
            }
        }

        const projectId = this.configService.get<string>('firebase.projectId');
        const clientEmail = this.configService.get<string>('firebase.clientEmail');
        const privateKey = this.configService.get<string>('firebase.privateKey')?.replace(/\\n/g, '\n');

        if (!projectId || !clientEmail || !privateKey) {
            return null;
        }

        return {
            projectId,
            clientEmail,
            privateKey,
        };
    }

    private validateTokens(deviceTokens: string[]): string[] {
        const tokens = deviceTokens.map((token) => token?.trim()).filter(Boolean);

        if (!tokens.length) {
            throw new BadRequestException('At least one device token is required');
        }

        return Array.from(new Set(tokens));
    }

    private validatePayload(payload: PushNotificationPayloadDto): void {
        if (!payload?.title?.trim()) {
            throw new BadRequestException('Push notification title is required');
        }

        if (!payload?.body?.trim()) {
            throw new BadRequestException('Push notification body is required');
        }

        if (payload.data !== undefined && (typeof payload.data !== 'object' || Array.isArray(payload.data))) {
            throw new BadRequestException('Push notification data must be an object');
        }
    }

    private normalizeData(data?: Record<string, unknown>): Record<string, string> | undefined {
        if (!data) {
            return undefined;
        }

        return Object.entries(data).reduce<Record<string, string>>((accumulator, [key, value]) => {
            if (value === undefined || value === null) {
                return accumulator;
            }

            accumulator[key] = typeof value === 'string' ? value : JSON.stringify(value);
            return accumulator;
        }, {});
    }

    private chunkTokens(tokens: string[], batchSize: number): string[][] {
        const chunks: string[][] = [];

        for (let index = 0; index < tokens.length; index += batchSize) {
            chunks.push(tokens.slice(index, index + batchSize));
        }

        return chunks;
    }
}
