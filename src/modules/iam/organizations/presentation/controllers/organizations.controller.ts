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
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { PaginationQueryDto } from '../../../../../shared/contracts/http/pagination-query.dto';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { OrganizationNotFoundException } from '../../../shared/domain/exceptions';
import { OrganizationResponseDto } from '../dto/organization-response.dto';
import { PaginatedOrganizationsResponseDto } from '../dto/paginated-organizations-response.dto';

@ApiTags('Organizations')
@Controller({ path: 'organizations', version: '1' })
export class OrganizationsController {
  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly getOrganizationByIdUseCase: GetOrganizationByIdUseCase,
    private readonly getPaginatedOrganizationsUseCase: GetPaginatedOrganizationsUseCase,
    private readonly deleteOrganizationUseCase: DeleteOrganizationUseCase,
    private readonly restoreOrganizationUseCase: RestoreOrganizationUseCase,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiBody({ type: CreateOrganizationDto })
  @ApiCreatedResponse({ type: OrganizationResponseDto })
  async create(@Body() body: CreateOrganizationDto) {
    const organization = await this.createOrganizationUseCase.execute(body);

    return {
      id: organization.id,
      name: organization.name,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List organizations with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ type: PaginatedOrganizationsResponseDto })
  async getPaginated(@Query() query: PaginationQueryDto) {
    return this.getPaginatedOrganizationsUseCase.execute(query.page, query.limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get an organization by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  async getById(@Param('id', new ParseUUIDPipe()) id: string) {
    const organization = await this.getOrganizationByIdUseCase.execute(id);

    if (!organization) {
      throw new OrganizationNotFoundException(id);
    }

    return {
      id: organization.id,
      name: organization.name,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Soft delete an organization' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse()
  async delete(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.deleteOrganizationUseCase.execute(id);
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Restore a soft deleted organization' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  async restore(@Param('id', new ParseUUIDPipe()) id: string) {
    const organization = await this.restoreOrganizationUseCase.execute(id);

    return {
      id: organization.id,
      name: organization.name,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }
}
