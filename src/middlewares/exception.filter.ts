import {
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Catch,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { isDevelopmentEnviroment } from 'src/utils/environment';

@Catch()
class AllExceptionsFilter implements ExceptionFilter {
  private logger = new Logger('ExceptionFilter');

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  extractChildrenMessages(errors: any[]): string[] {
    let messages: string[] = [];

    errors.map(error => {
      error.children.map(children => {
        if (children.children) {
          messages = [
            ...messages,
            ...this.extractChildrenMessages(children.children),
          ];
        }

        if (children.constraints) {
          Object.values(children.constraints).map((error: string) => {
            messages.push(error);
            return;
          });
        }

        messages.push(children as any as string);
      });
    });

    return messages;
  }

  extractMessage(exception: any): string[] {
    let messages: string[] = [];

    const exceptionMessages: Record<string, any>[] =
      (exception?.response?.message?.length > 0 &&
        exception.response.message) ||
      exception.messages ||
      (exception.message && [exception.message]) || [exception.message] ||
      [];

    if (Array.isArray(exceptionMessages) && exceptionMessages.length > 0) {
      exceptionMessages.map((message: Record<string, any>) => {
        if (message.constraints) {
          Object.values(message.constraints).map((error: string) => {
            messages.push(error);
          });
        } else {
          if (message?.children) {
            messages = [
              ...messages,
              ...this.extractChildrenMessages(message.children),
            ];
          } else if (message?.message) {
            messages.push(message.message as any as string);
          } else {
            messages.push(message as any as string);
          }
        }
      });
    } else if (typeof exceptionMessages === 'string') {
      messages.push(exceptionMessages);
    }

    return (messages?.length > 0 && messages) || ['Unknown server error'];
  }

  translateExceptionMessages = (
    exceptionMessage: string | string[],
    language: 'pt-BR' | 'en-US',
  ): string[] => {
    const messages = Array.isArray(exceptionMessage)
      ? exceptionMessage
      : [exceptionMessage];

    if (language === 'en-US') {
      return messages;
    }

    const translatedMessages = messages.map(message => {
      switch (message) {
        case 'Unauthorized':
          return 'Não autorizado';
        case 'Forbidden':
          return 'Proibido';
        case 'Not Found':
          return 'Não encontrado';
        case 'Internal Server Error':
          return 'Erro interno do servidor';
        case 'Bad Request Exception':
          return 'Requisição inválida';
        case 'Conflict':
          return 'Conflito de dados';
        case 'Not Acceptable':
          return 'Não aceitável';
        case 'Request Timeout':
          return 'Tempo de requisição esgotado';
        case 'Service Unavailable':
          return 'Serviço indisponível';
        case 'Gateway Timeout':
          return 'Tempo esgotado';
        case 'Payload Too Large':
          return 'Payload muito grande';
        case 'Unsupported Media Type':
          return 'Tipo de mídia não suportado';
        case 'Unprocessable Entity':
          return 'Entidade não processável';
        case 'Not Implemented':
          return 'Não implementado';
        case 'Expectation Failed':
          return 'Falha na expectativa';
        case 'Precondition Failed':
          return 'Pré-condição falhou';
        case 'Validation failed (numeric string is expected)':
          return 'A validação falhou (é esperada uma string numérica)';
        case 'Unknown server error':
          return 'Erro desconhecido do servidor';
        default:
          return message;
      }
    });

    return translatedMessages;
  };

  catch(exception: Error, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;

    if (isDevelopmentEnviroment()) {
      if (exception.stack) {
        this.logger.error(exception.stack);
      }
    }

    const ctx = host.switchToHttp();

    const language = ctx.getRequest().headers['accept-language'];

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const messagesException = this.translateExceptionMessages(
      this.extractMessage(exception),
      language,
    );

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
      messages: messagesException,
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}

export { AllExceptionsFilter };
