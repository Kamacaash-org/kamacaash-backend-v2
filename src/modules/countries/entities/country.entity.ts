import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('countries')
export class Country extends BaseEntity {
    @Column({ type: 'char', length: 2, unique: true })
    iso_code_3166: string;

    @Column({ type: 'char', length: 3, unique: true })
    iso_code_3166_3: string;

    @Column({ length: 100 })
    name: string;

    @Column({ length: 100, nullable: true })
    native_name: string;

    @Column({ length: 10, unique: true })
    phone_code: string;

    @Column({ type: 'int', nullable: true })
    phone_number_length: number;

    @Column({ type: 'char', length: 3 })
    currency_code: string;

    @Column({ length: 10 })
    currency_symbol: string;

    @Column({ length: 50 })
    currency_name: string;

    @Column({ length: 50 })
    default_timezone: string;

    @Column({ type: 'jsonb', default: [] })
    supported_timezones: string[];

    @Column({ length: 10, default: 'en' })
    default_language: string;

    @Column({ type: 'jsonb', default: ['en'] })
    supported_languages: string[];

    @Column({ length: 50, nullable: true })
    postal_code_format: string;

    @Column({ default: true })
    is_active: boolean;

    @Column({ default: false })
    is_archived: boolean;
}
