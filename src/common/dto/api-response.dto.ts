export class ApiResponseDto<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: Record<string, unknown>;

  constructor(message: string, data: T, meta?: Record<string, unknown>) {
    this.success = true;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }

  static success<T>(message: string, data: T, meta?: Record<string, unknown>): ApiResponseDto<T> {
    return new ApiResponseDto(message, data, meta);
  }
}
