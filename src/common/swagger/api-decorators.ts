import { applyDecorators, HttpStatus } from '@nestjs/common';
import { Type } from '@nestjs/common/interfaces';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';

// --- Generic Standard Responses ---

/**
 * Applies standard 401 and 403 responses, and adds the JWT bearer authentication requirement.
 */
export function ApiAuth() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Unauthorized: Missing or invalid credentials (JWT)',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'Forbidden: Insufficient permissions',
    }),
  );
}

/**
 * Applies the standard Not Found (404) response.
 */
export function ApiNotFoundResponse(description: string = 'Resource not found') {
  return ApiResponse({ status: HttpStatus.NOT_FOUND, description });
}

/**
 * Applies the standard Internal Server Error (500) response.
 */
export function ApiInternalErrorResponse(description: string = 'Internal server error') {
  return ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description });
}

// --- Pagination Utility ---

/**
 * Applies the two common API Query parameters for pagination (page and limit).
 */
export function ApiPaginationQueries() {
  return applyDecorators(
    ApiQuery({
      name: 'page',
      required: false,
      description: 'Page number (starts from 1)',
      type: 'integer',
      example: 1,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      description: 'Number of items per page (default 10)',
      type: 'integer',
      example: 10,
    }),
  );
}

/**
 * A combined decorator for a Find All operation that returns a paginated list.
 * @param entity The entity class (e.g., Order, User) to document the array response.
 * @param summary The summary of the operation.
 * @param description The detailed description of the operation.
 */
export function ApiPaginatedResponse<T extends Type<any>>(
  entity: T,
  summary: string,
  description: string,
) {
  return applyDecorators(
    ApiOperation({ summary, description }),
    ApiPaginationQueries(),
    ApiOkResponse({
      description: 'The resource list retrieved successfully',
      schema: {
        properties: {
          items: {
            type: 'array',
            items: { $ref: getSchemaPath(entity) },
          },
          meta: {
            type: 'object',
            description: 'Pagination metadata',
          },
        },
      },
    }),
    ApiAuth(),
    ApiInternalErrorResponse(),
  );
}

// --- Specific Utilities ---

/**
 * A combined decorator for a Find By ID operation.
 * @param entity The entity class to document the successful response.
 * @param name The name of the ID parameter (e.g., 'id', 'userId').
 * @param description The detailed description of the operation.
 */
export function ApiFindOneDecorator<T extends Type<any>>(
  entity: T,
  name: string = 'id',
  description: string = 'Retrieves a specific resource by ID',
) {
  return applyDecorators(
    ApiOperation({ summary: `Get resource by ${name}`, description }),
    ApiParam({
      name,
      required: true,
      description: `${entity.name} ID to retrieve`,
      type: 'integer',
    }),
    ApiOkResponse({
      description: `${entity.name} retrieved successfully`,
      type: entity,
    }),
    ApiNotFoundResponse(`${entity.name} not found`),
    ApiAuth(),
    ApiInternalErrorResponse(),
  );
}

/**
 * A utility for webhook endpoints that expect a simple 200 response (with success/fail status)
 * and don't require JWT authentication.
 */
export function ApiWebhookDecorator(summary: string) {
  return applyDecorators(
    ApiOperation({ summary, description: 'Handles an incoming webhook and acknowledges receipt.' }),
    ApiResponse({
      status: 200,
      description:
        'Webhook received and processing started (always returns 200 to prevent retries)',
      schema: {
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Webhook received' },
        },
      },
    }),
  );
}
