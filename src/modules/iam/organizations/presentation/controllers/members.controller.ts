import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AccessAuthGuard } from '../../../auth/presentation/guards/access-auth.guard';
import { PermissionGuard } from '../../../../../common/http/guards/permission.guard';
import { RequirePermissions } from '../../../../../common/http/decorators/require-permissions.decorator';
import { Idempotent } from '../../../../../common/http/decorators/idempotent.decorator';
import { PERMISSION_CODES } from '../../../../../shared/domain/authorization/permission-codes';
import { CurrentOrganizationId } from '../../../../../common/http/decorators/current-organization-id.decorator';
import { CurrentUser } from '../../../../../common/http/decorators/current-user.decorator';
import type { AuthenticatedUserPayload } from '../../../../../common/http/authenticated-request';
import { AddMemberUseCase } from '../../application/use-cases/add-member.use-case';
import { GetOrganizationMembersUseCase } from '../../application/use-cases/get-organization-members.use-case';
import { ChangeMemberRoleUseCase } from '../../application/use-cases/change-member-role.use-case';
import { RemoveMemberUseCase } from '../../application/use-cases/remove-member.use-case';
import { AddMemberDto } from '../dto/add-member.dto';
import { MemberResponseDto } from '../dto/member-response.dto';
import { UpdateMemberRoleDto } from '../dto/update-member-role.dto';

@ApiTags('Members')
@Controller({ path: 'members', version: '1' })
export class MembersController {
  constructor(
    private readonly addMemberUseCase: AddMemberUseCase,
    private readonly getOrganizationMembersUseCase: GetOrganizationMembersUseCase,
    private readonly changeMemberRoleUseCase: ChangeMemberRoleUseCase,
    private readonly removeMemberUseCase: RemoveMemberUseCase,
  ) {}

  private toResponse(member: {
    id: string;
    userId: string;
    organizationId: string;
    role: { name: string; permissions: readonly string[] };
    joinedAt: Date;
  }) {
    return {
      id: member.id,
      userId: member.userId,
      organizationId: member.organizationId,
      role: member.role.name,
      permissions: [...member.role.permissions],
      joinedAt: member.joinedAt,
    };
  }

  @Get()
  @UseGuards(AccessAuthGuard, PermissionGuard)
  @RequirePermissions(PERMISSION_CODES.IAM_MEMBERS_READ)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List members for the current organization' })
  @ApiOkResponse({ type: [MemberResponseDto] })
  async list(@CurrentOrganizationId() organizationId: string) {
    const members = await this.getOrganizationMembersUseCase.execute(organizationId);
    return members.map((member) => this.toResponse(member));
  }

  @Post()
  @Idempotent()
  @UseGuards(AccessAuthGuard, PermissionGuard)
  @RequirePermissions(PERMISSION_CODES.IAM_MEMBERS_WRITE)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Add an existing user to the current organization' })
  @ApiCreatedResponse({ type: MemberResponseDto })
  async add(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUserPayload,
    @Body() body: AddMemberDto,
  ) {
    const member = await this.addMemberUseCase.execute({
      actorUserId: user.userId,
      organizationId,
      userId: body.userId,
      roleCode: body.roleCode,
    });

    return this.toResponse(member);
  }

  @Patch(':id/role')
  @UseGuards(AccessAuthGuard, PermissionGuard)
  @RequirePermissions(PERMISSION_CODES.IAM_MEMBERS_WRITE)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Change a member role inside the current organization' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: MemberResponseDto })
  async changeRole(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUserPayload,
    @Body() body: UpdateMemberRoleDto,
  ) {
    const member = await this.changeMemberRoleUseCase.execute({
      actorUserId: user.userId,
      memberId: id,
      organizationId,
      roleCode: body.roleCode,
    });

    return this.toResponse(member);
  }

  @Delete(':id')
  @UseGuards(AccessAuthGuard, PermissionGuard)
  @RequirePermissions(PERMISSION_CODES.IAM_MEMBERS_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove a member from the current organization' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse()
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUserPayload,
  ): Promise<void> {
    await this.removeMemberUseCase.execute({
      actorUserId: user.userId,
      memberId: id,
      organizationId,
    });
  }
}
