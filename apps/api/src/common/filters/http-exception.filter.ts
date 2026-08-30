import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Response } from 'express';

/**
 * Duck-typed so this filter never has to import a specific module's domain
 * errors — every module's `DomainError` base class exposes `httpStatus`.
 */
interface DomainErrorLike extends Error {
  httpStatus: number;
}

function isDomainError(exception: unknown): exception is DomainErrorLike {
  return (
    exception instanceof Error && typeof (exception as DomainErrorLike).httpStatus === 'number'
  );
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (isDomainError(exception)) {
      res
        .status(exception.httpStatus)
        .json({ success: false, data: null, error: exception.message });
      return;
    }

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : 500;

    const message = isHttp
      ? exception.getResponse()
      : process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : String(exception);

    if (!isHttp) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    res.status(status).json({ success: false, data: null, error: message });
  }
}
