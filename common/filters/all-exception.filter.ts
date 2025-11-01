import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ErrorLogger');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Server error';

    // ⚙️ Xatoni faylga yozamiz
    this.logger.error({
      status,
      message,
      path: (request as any)?.url,
      method: (request as any)?.method,
      timestamp: new Date().toISOString(),
    });

    // Foydalanuvchiga javob
    response.status(status).json({
      statusCode: status,
      message,
    });
  }
}
