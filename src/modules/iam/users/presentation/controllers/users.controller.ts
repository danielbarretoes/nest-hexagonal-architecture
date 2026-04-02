/**
 * Users controller.
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
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';
import { CreateUserInOrganizationUseCase } from '../../application/use-cases/create-user-in-organization.use-case';
import { GetUserByIdUseCase } from '../../application/use-cases/get-user-by-id.use-case';
import { GetPaginatedUsersUseCase } from '../../application/use-cases/get-paginated-users.use-case';
import { DeleteUserUseCase } from '../../application/use-cases/delete-user.use-case';
import { RestoreUserUseCase } from '../../application/use-cases/restore-user.use-case';
import { UpdateUserProfileInOrganizationUseCase } from '../../application/use-cases/update-user-profile-in-organization.use-case';
import { RegisterUserDto } from '../dto/register-user.dto';
import { PaginationQueryDto } from '../../../../../shared/contracts/http/pagination-query.dto';
import { AccessAuthGuard } from '../../../auth/presentation/guards/access-auth.guard';
import { UserNotFoundException } from '../../../shared/domain/exceptions';
import { UserResponseDto } from '../dto/user-response.dto';
import { PaginatedUsersResponseDto } from '../dto/paginated-users-response.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { CurrentUser } from '../../../../../common/http/decorators/current-user.decorator';
import { CurrentOrganizationId } from '../../../../../common/http/decorators/current-organization-id.decorator';
import { Idempotent } from '../../../../../common/http/decorators/idempotent.decorator';
import type { AuthenticatedUserPayload } from '../../../../../common/http/authenticated-request';
import { RequirePermissions } from '../../../../../common/http/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../../../../common/http/guards/permission.guard';
import { PERMISSION_CODES } from '../../../../../shared/domain/authorization/permission-codes';

@ApiTags('Users')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly createUserInOrganizationUseCase: CreateUserInOrganizationUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly getPaginatedUsersUseCase: GetPaginatedUsersUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly restoreUserUseCase: RestoreUserUseCase,
    private readonly updateUserProfileInOrganizationUseCase: UpdateUserProfileInOrganizationUseCase,
  ) {}

  private toResponse(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Post('self-register')
  @Idempotent()
  @ApiOperation({ summary: 'Register a standalone user identity' })
  @ApiBody({ type: RegisterUserDto })
  @ApiCreatedResponse({ type: UserResponseDto })
  async register(@Body() body: RegisterUserDto) {
    const user = await this.registerUserUseCase.execute(body);
    return this.toResponse(user);
  }

  @Post()
  @Idempotent()
  @UseGuards(AccessAuthGuard, PermissionGuard)
  @RequirePermissions(PERMISSION_CODES.IAM_USERS_WRITE)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Create a user inside the current organization' })
  @ApiBody({ type: RegisterUserDto })
  @ApiCreatedResponse({ type: UserResponseDto })
  async createForOrganization(
    @Body() body: RegisterUserDto,
    @CurrentOrganizationId() organizationId: string,
  ) {
    const user = await this.createUserInOrganizationUseCase.execute({
      organizationId,
      ...body,
    });

    return this.toResponse(user);
  }

  @Get()
  @UseGuards(AccessAuthGuard, PermissionGuard)
  @RequirePermissions(PERMISSION_CODES.IAM_USERS_READ)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List users for the current organization' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ type: PaginatedUsersResponseDto })
  async getPaginated(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.getPaginatedUsersUseCase.execute(organizationId, query.page, query.limit);
  }

  @Get(':id')
  @UseGuards(AccessAuthGuard, PermissionGuard)
  @RequirePermissions(PERMISSION_CODES.IAM_USERS_READ)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get a user by id within the current organization' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: UserResponseDto })
  async getById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrganizationId() organizationId: string,
  ) {
    const user = await this.getUserByIdUseCase.execute(id, organizationId);

    if (!user) {
      throw new UserNotFoundException(id);
    }

    return this.toResponse(user);
  }

  @Patch(':id')
  @UseGuards(AccessAuthGuard, PermissionGuard)
  @RequirePermissions(PERMISSION_CODES.IAM_USERS_WRITE)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update a user profile within the current organization' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({ type: UserResponseDto })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateUserDto,
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUserPayload,
  ) {
    const updatedUser = await this.updateUserProfileInOrganizationUseCase.execute({
      actorUserId: user.userId,
      organizationId,
      targetUserId: id,
      firstName: body.firstName,
      lastName: body.lastName,
    });

    return this.toResponse(updatedUser);
  }

  @Delete(':id')
  @UseGuards(AccessAuthGuard, PermissionGuard)
  @RequirePermissions(PERMISSION_CODES.IAM_USERS_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Soft delete a user within the current organization' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse()
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUserPayload,
  ): Promise<void> {
    await this.deleteUserUseCase.execute(user.userId, organizationId, id);
  }

  @Patch(':id/restore')
  @UseGuards(AccessAuthGuard, PermissionGuard)
  @RequirePermissions(PERMISSION_CODES.IAM_USERS_WRITE)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Restore a soft deleted user within the current organization' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: UserResponseDto })
  async restore(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUserPayload,
  ) {
    const restoredUser = await this.restoreUserUseCase.execute(user.userId, organizationId, id);
    return this.toResponse(restoredUser);
  }
}
