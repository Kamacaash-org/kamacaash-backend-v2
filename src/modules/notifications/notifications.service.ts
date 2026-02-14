import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationType } from '../../common/entities/enums/all.enums';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectRepository(Notification)
        private notificationsRepository: Repository<Notification>,
    ) { }

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
}
