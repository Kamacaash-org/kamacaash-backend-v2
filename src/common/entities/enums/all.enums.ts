export enum UserRole {
    SUPER_ADMIN = 'SUPER_ADMIN',
    ADMIN = 'ADMIN',
    BUSINESS_OWNER = 'BUSINESS_OWNER',
    STAFF = 'STAFF',
    CUSTOMER = 'CUSTOMER',
    MODERATOR = 'MODERATOR',
}

export enum UserStatus {
    PENDING = 'PENDING',
    ACTIVE = 'ACTIVE',
    SUSPENDED = 'SUSPENDED',
    BANNED = 'BANNED',
    DELETED = 'DELETED',
}

export enum BusinessVerificationStatus {
    UNVERIFIED = 'UNVERIFIED',
    PENDING = 'PENDING',
    VERIFIED = 'VERIFIED',
    REJECTED = 'REJECTED',
}

export enum BusinessStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    SUSPENDED = 'SUSPENDED',
    CLOSED = 'CLOSED',
}

export enum PayoutSchedule {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    BIWEEKLY = 'BIWEEKLY',
    MONTHLY = 'MONTHLY',
    QUARTERLY = 'QUARTERLY',
}

export enum PayoutMethod {
    BANK_TRANSFER = 'BANK_TRANSFER',
    MOBILE_MONEY = 'MOBILE_MONEY',
    EVC = 'EVC',
    JEEB = 'JEEB',
    E_DAHAB = 'E_DAHAB',
    CASH = 'CASH',
}

export enum OfferStatus {
    DRAFT = 'DRAFT',
    PUBLISHED = 'PUBLISHED',
    PAUSED = 'PAUSED',
    EXPIRED = 'EXPIRED',
    CANCELLED = 'CANCELLED',
}

export enum OrderStatus {
    HOLD = 'HOLD',
    PENDING_PAYMENT = 'PENDING_PAYMENT',
    CONFIRMED = 'CONFIRMED',
    PAID = 'PAID',
    READY_FOR_PICKUP = 'READY_FOR_PICKUP',
    COLLECTED = 'COLLECTED',
    EXPIRED = 'EXPIRED',
    CANCELLED = 'CANCELLED',
    NO_SHOW = 'NO_SHOW',
}

export enum PaymentStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    CONFIRMED = 'CONFIRMED',
    FAILED = 'FAILED',
    REFUNDED = 'REFUNDED',
    PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum PaymentProvider {
    EVC = 'EVC',
    JEEB = 'JEEB',
    E_DAHAB = 'E_DAHAB',
    ZAAD = 'ZAAD',
    SAHAL = 'SAHAL',
    WAVE = 'WAVE',
    BANK = 'BANK',
    CARD = 'CARD',
}

export enum ReviewStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    FLAGGED = 'FLAGGED',
}

export enum NotificationType {
    EMAIL = 'EMAIL',
    SMS = 'SMS',
    PUSH = 'PUSH',
    IN_APP = 'IN_APP',
}

export enum FavoriteSource {
    MANUAL = 'MANUAL',
    RECOMMENDATION = 'RECOMMENDATION',
    PROMOTION = 'PROMOTION',
    RECENT = 'RECENT',
}

export enum PayoutStatus {
    DRAFT = 'DRAFT',
    SCHEDULED = 'SCHEDULED',
    PROCESSED = 'PROCESSED',
    PAID = 'PAID',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED'
}
