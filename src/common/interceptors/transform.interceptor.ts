import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
    success: boolean;
    statusCode: number;
    message?: string;
    data: T;
    meta?: any;
}

@Injectable()
export class TransformInterceptor<T>
    implements NestInterceptor<T, Response<T>> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<Response<T>> {
        return next.handle().pipe(
            map((payload) => {
                const isApiResponseShape =
                    payload &&
                    typeof payload === 'object' &&
                    'message' in payload &&
                    'data' in payload;

                return {
                    success: true,
                    statusCode: context.switchToHttp().getResponse().statusCode,
                    message: isApiResponseShape
                        ? (payload as any).message
                        : 'Operation successful',
                    data: isApiResponseShape ? (payload as any).data : payload,
                    meta: isApiResponseShape ? (payload as any).meta : undefined,
                };
            }),
        );
    }
}
