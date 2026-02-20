import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        let message = this.extractMessage(exception);

        if (exception instanceof QueryFailedError) {
            const code = (exception as any)?.driverError?.code;
            if (code === '23505') {
                status = HttpStatus.CONFLICT;
                message = 'A record with this value already exists';
            }
        }

        this.logger.error(
            `${request.method} ${request.url}`,
            exception instanceof Error ? exception.stack : String(exception),
        );

        response.status(status).json({
            success: false,
            statusCode: status,
            message,
        });
    }

    private extractMessage(exception: unknown): string {
        if (!(exception instanceof HttpException)) {
            return 'Something went wrong. Please try again later.';
        }

        const response = exception.getResponse();
        const rawMessage =
            typeof response === 'string'
                ? response
                : (response as any)?.message;

        const message = Array.isArray(rawMessage)
            ? rawMessage[0]
            : rawMessage;

        if (typeof message !== 'string' || !message.trim()) {
            return 'Request failed';
        }

        // Hide identifiers from user-facing messages like "Not found: <id>".
        const idSuffixPattern = /^(.+?):\s*[a-zA-Z0-9-_.]{2,}$/;
        const matched = message.match(idSuffixPattern);
        return matched ? matched[1] : message;
    }
}
