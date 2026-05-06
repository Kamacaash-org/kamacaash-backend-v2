import { Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    @ApiOperation({ summary: 'List user notifications' })
    findAll(@Request() req) {
        return this.notificationsService.findAll(req.user.id);
    }

    @Patch(':id/read')
    @ApiOperation({ summary: 'Mark notification as read' })
    markAsRead(@Param('id') id: string) {
        return this.notificationsService.markAsRead(id);
    }

    @Post('test')
    @ApiOperation({ summary: 'Send a static test push notification through FCM' })
    async sendTestNotification() {
        const deviceTokens = this.notificationsService.getTestDeviceTokens();

        const result = await this.notificationsService.sendToDevices(deviceTokens, {
            // TODO: Replace with request-driven values once push notification testing is complete.
            title: 'Kamacaash test notification',
            // TODO: Replace with request-driven values once push notification testing is complete.
            body: 'Firebase Cloud Messaging is connected and this is a static test notification.',
            data: {
                source: 'notifications-test-endpoint',
                environment: 'static-test',
            },
        });

        return ApiResponseDto.success('Test notification processed successfully', {
            success: result.failureCount === 0,
            ...result,
        });
    }
}
