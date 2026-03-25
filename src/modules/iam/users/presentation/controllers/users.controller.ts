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
  HttpCode,
  HttpStatus,
  Patch,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';
import { GetUserByIdUseCase } from '../../application/use-cases/get-user-by-id.use-case';
import { GetPaginatedUsersUseCase } from '../../application/use-cases/get-paginated-users.use-case';
import { DeleteUserUseCase } from '../../application/use-cases/delete-user.use-case';
import { RestoreUserUseCase } from '../../application/use-cases/restore-user.use-case';
import { RegisterUserDto } from '../dto/register-user.dto';
import { PaginationQueryDto } from '../../../../../shared/contracts/http/pagination-query.dto';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { UserNotFoundException } from '../../../shared/domain/exceptions';
import { UserResponseDto } from '../dto/user-response.dto';
import { PaginatedUsersResponseDto } from '../dto/paginated-users-response.dto';

@ApiTags('Users')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly getPaginatedUsersUseCase: GetPaginatedUsersUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly restoreUserUseCase: RestoreUserUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterUserDto })
  @ApiCreatedResponse({ type: UserResponseDto })
  async register(@Body() body: RegisterUserDto) {
    const user = await this.registerUserUseCase.execute(body);

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

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List users with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ type: PaginatedUsersResponseDto })
  async getPaginated(@Query() query: PaginationQueryDto) {
    return this.getPaginatedUsersUseCase.execute(query.page, query.limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: UserResponseDto })
  async getById(@Param('id', new ParseUUIDPipe()) id: string) {
    const user = await this.getUserByIdUseCase.execute(id);

    if (!user) {
      throw new UserNotFoundException(id);
    }

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

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Soft delete a user' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse()
  async delete(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.deleteUserUseCase.execute(id);
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Restore a soft deleted user' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: UserResponseDto })
  async restore(@Param('id', new ParseUUIDPipe()) id: string) {
    const user = await this.restoreUserUseCase.execute(id);

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
}
