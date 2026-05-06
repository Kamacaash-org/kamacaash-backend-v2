export class PushNotificationResultDto {
    successCount: number;
    failureCount: number;
    responses: Array<{
        success: boolean;
        messageId?: string;
        error?: string;
        token: string;
    }>;
}
