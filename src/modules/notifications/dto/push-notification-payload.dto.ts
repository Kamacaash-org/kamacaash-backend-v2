export class PushNotificationPayloadDto {
    title: string;
    body: string;
    data?: Record<string, unknown>;
}
