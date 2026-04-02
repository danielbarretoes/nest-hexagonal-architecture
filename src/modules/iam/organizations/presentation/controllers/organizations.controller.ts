/**
 * Organizations controller.
 */

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
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateOrganizationUseCase } from '../../application/use-cases/create-organization.use-case';
import { GetOrganizationByIdUseCase } from '../../application/use-cases/get-organization-by-id.use-case';
import { GetPaginatedOrganizationsUseCase } from '../../application/use-cases/get-paginated-organizations.use-case';
import { DeleteOrganizationUseCase } from '../../application/use-cases/delete-organization.use-case';
import { RestoreOrganizationUseCase } from '../../application/use-cases/restore-organization.use-case';
import { RenameOrganizationUseCase } from '../../application/use-cases/rename-organization.use-case';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { PaginationQueryDto } from '../../../../../shared/contracts/http/pagination-query.dto';
import { AccessAuthGuard } from '../../../auth/presentation/guards/access-auth.guard';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { OrganizationNotFoundException } from '../../../shared/domain/exceptions';
import { OrganizationResponseDto } from '../dto/organization-response.dto';
import { PaginatedOrganizationsResponseDto } from '../dto/paginated-organizations-response.dto';
import { CurrentUser } from '../../../../../common/http/decorators/current-user.decorator';
import { Idempotent } from '../../../../../common/http/decorators/idempotent.decorator';
import type { AuthenticatedUserPayload } from '../../../../../common/http/authenticated-request';
import { CurrentOrganizationId } from '../../../../../common/http/decorators/current-organization-id.decorator';
import { RequirePermissions } from '../../../../../common/http/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../../../../common/http/guards/permission.guard';
import { PERMISSION_CODES } from '../../../../../shared/domain/authorization/permission-codes';

@ApiTags('Organizations')
@Controller({ path: 'organizations', version: '1' })
export class OrganizationsController {
  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly getOrganizationByIdUseCase: GetOrganizationByIdUseCase,
    private readonly getPaginatedOrganizationsUseCase: GetPaginatedOrganizationsUseCase,
    private readonly deleteOrganizationUseCase: DeleteOrganizationUseCase,
    private readonly restoreOrganizationUseCase: RestoreOrganizationUseCase,
    private readonly renameOrganizationUseCase: RenameOrganizationUseCase,
  ) {}

  private toResponse(organization: { id: string; name: string; createdAt: Date; updatedAt: Date }) {
    return {
      id: organization.id,
      name: organization.name,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }

  @Post()
  @Idempotent()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Create a new organization and assign the caller as owner' })
  @ApiBody({ type: CreateOrganizationDto })
  @ApiCreatedResponse({ type: OrganizationResponseDto })
  async create(@Body() body: CreateOrganizationDto, @CurrentUser() user: AuthenticatedUserPayload) {
    const organization = await this.createOrganizationUseCase.execute({
      ...body,
      ownerUserId: user.userId,
    });

    return this.toResponse(organization);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List organizations accessible to the authenticated user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ type: PaginatedOrganizationsResponseDto })
  async getPaginated(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Query() query: PaginationQueryDto,
  ) {
    return this.getPaginatedOrganizationsUseCase.execute(user.userId, query.page, query.limit);
  }

  @Get(':id')
  @UseGuards(AccessAuthGuard, PermissionGuard)
  @RequirePermissions(PERMISSION_CODES.IAM_ORGANIZATIONS_READ)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get the current organization by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  async getById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrganizationId() scopedOrganizationId: string,
  ) {
    const organization = await this.getOrganizationByIdUseCase.execute(id, scopedOrganizationId);

    if (!organization) {
      throw new OrganizationNotFoundException(id);
    }

    return this.toResponse(organization);
  }

  @Patch(':id')
  @UseGuards(AccessAuthGuard, PermissionGuard)
  @RequirePermissions(PERMISSION_CODES.IAM_ORGANIZATIONS_WRITE)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Rename the current organization' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: CreateOrganizationDto })
  @ApiOkResponse({ type: OrganizationResponseDto })
  async rename(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: CreateOrganizationDto,
    @CurrentOrganizationId() scopedOrganizationId: string,
  ) {
    const organization = await this.renameOrganizationUseCase.execute({
      organizationId: id,
      scopedOrganizationId,
      name: body.name,
    });

    return this.toResponse(organization);
  }

  @Delete(':id')
  @UseGuards(AccessAuthGuard, PermissionGuard)
  @RequirePermissions(PERMISSION_CODES.IAM_ORGANIZATIONS_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Soft delete the current organization' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse()
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrganizationId() scopedOrganizationId: string,
  ): Promise<void> {
    await this.deleteOrganizationUseCase.execute(id, scopedOrganizationId);
  }

  @Patch(':id/restore')
  @UseGuards(AccessAuthGuard, PermissionGuard)
  @RequirePermissions(PERMISSION_CODES.IAM_ORGANIZATIONS_WRITE)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Restore the current organization' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  async restore(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrganizationId() scopedOrganizationId: string,
  ) {
    const organization = await this.restoreOrganizationUseCase.execute(id, scopedOrganizationId);
    return this.toResponse(organization);
  }
}
