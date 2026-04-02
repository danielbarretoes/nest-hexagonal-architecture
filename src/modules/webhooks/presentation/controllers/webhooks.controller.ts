import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentOrganizationId } from '../../../../common/http/decorators/current-organization-id.decorator';
import { CurrentUser } from '../../../../common/http/decorators/current-user.decorator';
import { Idempotent } from '../../../../common/http/decorators/idempotent.decorator';
import { RequirePermissions } from '../../../../common/http/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../../../common/http/guards/permission.guard';
import type { AuthenticatedUserPayload } from '../../../../common/http/authenticated-request';
import { PaginationQueryDto } from '../../../../shared/contracts/http/pagination-query.dto';
import { PERMISSION_CODES } from '../../../../shared/domain/authorization/permission-codes';
import { JwtAuthGuard } from '../../../iam/auth/presentation/guards/jwt-auth.guard';
import { CreateWebhookEndpointUseCase } from '../../application/use-cases/create-webhook-endpoint.use-case';
import { DeleteWebhookEndpointUseCase } from '../../application/use-cases/delete-webhook-endpoint.use-case';
import { GetPaginatedWebhookEndpointsUseCase } from '../../application/use-cases/get-paginated-webhook-endpoints.use-case';
import { CreateWebhookEndpointDto } from '../dto/create-webhook-endpoint.dto';
import { PaginatedWebhookEndpointsResponseDto } from '../dto/paginated-webhook-endpoints-response.dto';
import { WebhookEndpointCreatedResponseDto } from '../dto/webhook-endpoint-response.dto';

@ApiTags('Webhooks')
@Controller({ path: 'webhooks', version: '1' })
export class WebhooksController {
  constructor(
    private readonly createWebhookEndpointUseCase: CreateWebhookEndpointUseCase,
    private readonly getPaginatedWebhookEndpointsUseCase: GetPaginatedWebhookEndpointsUseCase,
    private readonly deleteWebhookEndpointUseCase: DeleteWebhookEndpointUseCase,
  ) {}

  @Post()
  @Idempotent()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(PERMISSION_CODES.WEBHOOKS_ENDPOINTS_WRITE)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Create a tenant webhook endpoint and reveal its secret once' })
  @ApiBody({ type: CreateWebhookEndpointDto })
  @ApiCreatedResponse({ type: WebhookEndpointCreatedResponseDto })
  async create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUserPayload,
    @Body() body: CreateWebhookEndpointDto,
  ) {
    const response = await this.createWebhookEndpointUseCase.execute({
      organizationId,
      actorUserId: user.userId,
      name: body.name,
      url: body.url,
      events: body.events,
    });

    return {
      ...response,
      lastDeliveryAt: null,
      lastFailureAt: null,
      lastFailureStatusCode: null,
      lastFailureMessage: null,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(PERMISSION_CODES.WEBHOOKS_ENDPOINTS_READ)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List webhook endpoints configured for the current organization' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ type: PaginatedWebhookEndpointsResponseDto })
  async getPaginated(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.getPaginatedWebhookEndpointsUseCase.execute(
      organizationId,
      query.page,
      query.limit,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(PERMISSION_CODES.WEBHOOKS_ENDPOINTS_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Delete a webhook endpoint from the current organization' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse()
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUserPayload,
  ): Promise<void> {
    await this.deleteWebhookEndpointUseCase.execute({
      id,
      organizationId,
      actorUserId: user.userId,
    });
  }
}
