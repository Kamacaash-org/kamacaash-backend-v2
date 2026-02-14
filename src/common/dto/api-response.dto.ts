export class ApiResponseDto<T> {
  message: string;
  data: T;
  meta?: Record<string, unknown>;

  constructor(message: string, data: T, meta?: Record<string, unknown>) {
    this.message = message;
    this.data = data;
    this.meta = meta;
  }

  static success<T>(message: string, data: T, meta?: Record<string, unknown>): ApiResponseDto<T> {
    return new ApiResponseDto(message, data, meta);
  }
}
