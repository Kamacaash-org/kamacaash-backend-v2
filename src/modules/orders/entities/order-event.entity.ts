import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn, BaseEntity } from 'typeorm';
import { Order } from './order.entity';
import { OrderStatus, PaymentStatus } from '../../../common/entities/enums/all.enums';

@Entity('order_events')
export class OrderEvent extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    order_id: string;

    @ManyToOne(() => Order, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @Column({ type: 'enum', enum: OrderStatus, nullable: true })
    from_status: OrderStatus;

    @Column({ type: 'enum', enum: OrderStatus })
    to_status: OrderStatus;

    @Column({ type: 'enum', enum: PaymentStatus, nullable: true })
    from_payment_status: PaymentStatus;

    @Column({ type: 'enum', enum: PaymentStatus, nullable: true })
    to_payment_status: PaymentStatus;

    @Column({ length: 20 })
    actor_type: string; // 'USER', 'STAFF', 'SYSTEM'

    @Column({ type: 'uuid', nullable: true })
    actor_id: string;

    @Column({ length: 255, nullable: true })
    actor_name: string;

    @Column({ type: 'text', nullable: true })
    note: string;
}
