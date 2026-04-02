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
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentOrganizationId } from '../../../../../common/http/decorators/current-organization-id.decorator';
import { CurrentUser } from '../../../../../common/http/decorators/current-user.decorator';
import { Idempotent } from '../../../../../common/http/decorators/idempotent.decorator';
import { RequirePermissions } from '../../../../../common/http/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../../../../common/http/guards/permission.guard';
import type { AuthenticatedUserPayload } from '../../../../../common/http/authenticated-request';
import { PaginationQueryDto } from '../../../../../shared/contracts/http/pagination-query.dto';
import { PERMISSION_CODES } from '../../../../../shared/domain/authorization/permission-codes';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { CreateApiKeyUseCase } from '../../application/use-cases/create-api-key.use-case';
import { GetPaginatedApiKeysUseCase } from '../../application/use-cases/get-paginated-api-keys.use-case';
import { RevokeApiKeyUseCase } from '../../application/use-cases/revoke-api-key.use-case';
import { ApiKeyCreatedResponseDto } from '../dto/api-key-created-response.dto';
import { PaginatedApiKeysResponseDto } from '../dto/paginated-api-keys-response.dto';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';

@ApiTags('API Keys')
@Controller({ path: 'api-keys', version: '1' })
export class ApiKeysController {
  constructor(
    private readonly createApiKeyUseCase: CreateApiKeyUseCase,
    private readonly getPaginatedApiKeysUseCase: GetPaginatedApiKeysUseCase,
    private readonly revokeApiKeyUseCase: RevokeApiKeyUseCase,
  ) {}

  @Post()
  @Idempotent()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(PERMISSION_CODES.IAM_API_KEYS_WRITE)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Create a tenant-scoped API key for the authenticated user' })
  @ApiBody({ type: CreateApiKeyDto })
  @ApiCreatedResponse({ type: ApiKeyCreatedResponseDto })
  async create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUserPayload,
    @Body() body: CreateApiKeyDto,
  ) {
    return this.createApiKeyUseCase.execute({
      organizationId,
      ownerUserId: user.userId,
      name: body.name,
      scopes: body.scopes,
      expiresInDays: body.expiresInDays,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(PERMISSION_CODES.IAM_API_KEYS_READ)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'List API keys for the authenticated user within the current organization',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ type: PaginatedApiKeysResponseDto })
  async getPaginated(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUserPayload,
    @Query() query: PaginationQueryDto,
  ) {
    return this.getPaginatedApiKeysUseCase.execute(
      organizationId,
      user.userId,
      query.page,
      query.limit,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(PERMISSION_CODES.IAM_API_KEYS_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Revoke an API key owned by the authenticated user' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse()
  async revoke(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUserPayload,
  ): Promise<void> {
    await this.revokeApiKeyUseCase.execute({
      apiKeyId: id,
      organizationId,
      ownerUserId: user.userId,
    });
  }
}
