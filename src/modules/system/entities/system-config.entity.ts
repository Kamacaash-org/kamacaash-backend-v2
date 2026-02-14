import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('system_config')
export class SystemConfig {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 100, unique: true })
    key: string;

    @Column({ type: 'jsonb' })
    value: any;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ length: 50, nullable: true })
    data_type: string;

    @Column({ default: false })
    is_public: boolean;

    @Column({ default: true })
    is_editable: boolean;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;
}
