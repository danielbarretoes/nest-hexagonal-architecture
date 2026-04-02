/**
 * Global HTTP Exception Filter
 * Implements RFC 7807 Problem Details for HTTP APIs.
 * Transforms domain exceptions and validation errors into standardized error responses.
 */

import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import { DomainException } from '../../../shared/domain/exceptions';
import type { HttpLogRequest } from '../http-log-context';
import {
  ProblemDetail,
  ValidationProblemDetail,
  ValidationErrorDetail,
  createErrorType,
  ERROR_TYPE_BASE_URL,
} from './rfc-7807.types';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<HttpLogRequest>();

    const traceId = (request.headers['x-trace-id'] as string) || randomUUID();
    const instance = request.url;

    let status: number;
    let problemDetail: ProblemDetail | ValidationProblemDetail;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (this.isValidationError(exceptionResponse)) {
        problemDetail = this.buildValidationProblem(exception, traceId, instance);
      } else {
        problemDetail = this.buildHttpExceptionProblem(exception, status, traceId, instance);
      }
    } else if (exception instanceof DomainException) {
      status = this.getStatusFromDomainException(exception);
      problemDetail = this.buildDomainExceptionProblem(exception, status, traceId, instance);
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      problemDetail = this.buildUnexpectedErrorProblem(exception, traceId, instance);
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      problemDetail = this.buildGenericErrorProblem(
        'Internal server error',
        'An unexpected error occurred',
        traceId,
        instance,
      );
    }

    request.httpLogError = this.extractHttpLogError(exception);

    response.status(status).json(problemDetail);
  }

  /**
   * Checks if the exception response is a validation error.
   */
  private isValidationError(response: unknown): response is Record<string, unknown> {
    if (typeof response !== 'object' || response === null) {
      return false;
    }
    const obj = response as Record<string, unknown>;
    return (
      Array.isArray(obj.message) ||
      (typeof obj.message === 'string' && obj.message.includes('validation'))
    );
  }

  /**
   * Builds a validation problem detail (RFC 7807 with invalid-params).
   */
  private buildValidationProblem(
    exception: HttpException,
    traceId: string,
    instance: string,
  ): ValidationProblemDetail {
    const exceptionResponse = exception.getResponse() as Record<string, unknown>;
    const messages = this.extractValidationMessages(exceptionResponse);

    const invalidParams: ValidationErrorDetail[] = messages.map((msg) => {
      const fieldMatch = msg.match(/^(\w+)\s/);
      return {
        name: fieldMatch ? fieldMatch[1] : 'unknown',
        reason: msg.replace(/^\w+\s/, ''),
      };
    });

    return {
      'type': createErrorType(ERROR_TYPE_BASE_URL, 'validation-failed'),
      'title': 'Your request parameters did not validate.',
      'status': HttpStatus.BAD_REQUEST,
      'detail': 'One or more fields in your request failed validation.',
      instance,
      'timestamp': new Date().toISOString(),
      traceId,
      'invalid-params': invalidParams,
    };
  }

  /**
   * Builds a problem detail for HTTP exceptions.
   */
  private buildHttpExceptionProblem(
    exception: HttpException,
    status: number,
    traceId: string,
    instance: string,
  ): ProblemDetail {
    const exceptionResponse = exception.getResponse();
    let title = exception.name;
    let detail = exception.message;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const obj = exceptionResponse as Record<string, unknown>;
      title = (obj.title as string) || title;
      detail = (obj.message as string) || detail;
    }

    const errorCode = this.getErrorCodeFromStatus(status);

    return {
      type: createErrorType(ERROR_TYPE_BASE_URL, errorCode),
      title,
      status,
      detail,
      instance,
      timestamp: new Date().toISOString(),
      traceId,
    };
  }

  /**
   * Builds a problem detail for domain exceptions.
   */
  private buildDomainExceptionProblem(
    exception: DomainException,
    status: number,
    traceId: string,
    instance: string,
  ): ProblemDetail {
    return {
      type: createErrorType(ERROR_TYPE_BASE_URL, exception.code.toLowerCase().replaceAll('_', '-')),
      title: exception.name,
      status,
      detail: exception.message,
      instance,
      timestamp: new Date().toISOString(),
      traceId,
    };
  }

  /**
   * Builds a problem detail for unexpected errors.
   */
  private buildUnexpectedErrorProblem(
    exception: Error,
    traceId: string,
    instance: string,
  ): ProblemDetail {
    const domainException = exception as Error & { code?: string };

    return {
      type: createErrorType(ERROR_TYPE_BASE_URL, domainException.code || 'internal-server-error'),
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Please try again later.'
          : exception.message,
      instance,
      timestamp: new Date().toISOString(),
      traceId,
    };
  }

  /**
   * Builds a generic error problem.
   */
  private buildGenericErrorProblem(
    title: string,
    detail: string,
    traceId: string,
    instance: string,
  ): ProblemDetail {
    return {
      type: createErrorType(ERROR_TYPE_BASE_URL, 'internal-server-error'),
      title,
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail,
      instance,
      timestamp: new Date().toISOString(),
      traceId,
    };
  }

  /**
   * Extracts validation messages from exception response.
   */
  private extractValidationMessages(response: Record<string, unknown>): string[] {
    const messages = response.message;

    if (Array.isArray(messages)) {
      return messages.filter((m) => typeof m === 'string');
    }

    if (typeof messages === 'string') {
      return [messages];
    }

    return ['Validation failed'];
  }

  /**
   * Maps HTTP status code to error code.
   */
  private getErrorCodeFromStatus(status: number): string {
    const statusMap: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'bad-request',
      [HttpStatus.UNAUTHORIZED]: 'unauthorized',
      [HttpStatus.FORBIDDEN]: 'forbidden',
      [HttpStatus.NOT_FOUND]: 'not-found',
      [HttpStatus.CONFLICT]: 'conflict',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'unprocessable-entity',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'internal-server-error',
    };

    return statusMap[status] || 'error';
  }

  /**
   * Maps domain exceptions to the correct HTTP status for API clients.
   */
  private getStatusFromDomainException(exception: DomainException): number {
    const codeMap: Record<string, HttpStatus> = {
      USER_ALREADY_EXISTS: HttpStatus.CONFLICT,
      ORGANIZATION_ALREADY_EXISTS: HttpStatus.CONFLICT,
      MEMBER_ALREADY_EXISTS: HttpStatus.CONFLICT,
      ORGANIZATION_INVITATION_ALREADY_EXISTS: HttpStatus.CONFLICT,
      INVALID_ORGANIZATION_NAME: HttpStatus.UNPROCESSABLE_ENTITY,
      INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
      SESSION_NOT_FOUND: HttpStatus.UNAUTHORIZED,
      ACTION_TOKEN_NOT_FOUND: HttpStatus.UNAUTHORIZED,
      INVALID_MEMBERSHIP_ROLE: HttpStatus.UNPROCESSABLE_ENTITY,
      USER_NOT_FOUND: HttpStatus.NOT_FOUND,
      ORGANIZATION_NOT_FOUND: HttpStatus.NOT_FOUND,
      MEMBER_NOT_FOUND: HttpStatus.NOT_FOUND,
      ROLE_NOT_FOUND: HttpStatus.NOT_FOUND,
      ORGANIZATION_INVITATION_NOT_FOUND: HttpStatus.NOT_FOUND,
      API_KEY_NOT_FOUND: HttpStatus.NOT_FOUND,
      HTTP_LOG_NOT_FOUND: HttpStatus.NOT_FOUND,
      USER_MANAGEMENT_TARGET_NOT_ALLOWED: HttpStatus.NOT_FOUND,
      CANNOT_MANAGE_OWN_USER: HttpStatus.FORBIDDEN,
      ORGANIZATION_SCOPE_MISMATCH: HttpStatus.FORBIDDEN,
      LAST_OWNER_REMOVAL_NOT_ALLOWED: HttpStatus.FORBIDDEN,
      LAST_OWNER_ROLE_CHANGE_NOT_ALLOWED: HttpStatus.FORBIDDEN,
      TENANT_CONTEXT_REQUIRED: HttpStatus.FORBIDDEN,
      INVITATION_EMAIL_MISMATCH: HttpStatus.FORBIDDEN,
      EMAIL_VERIFICATION_ALREADY_COMPLETED: HttpStatus.CONFLICT,
      INVALID_API_KEY_SCOPES: HttpStatus.UNPROCESSABLE_ENTITY,
    };

    return codeMap[exception.code] ?? HttpStatus.UNPROCESSABLE_ENTITY;
  }

  private extractHttpLogError(exception: unknown): { message: string; stack: string | null } {
    if (exception instanceof Error) {
      return {
        message: exception.message,
        stack: exception.stack ?? null,
      };
    }

    return {
      message: 'Unknown error',
      stack: null,
    };
  }
}
