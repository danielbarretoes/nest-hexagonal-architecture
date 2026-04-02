import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentOrganizationId } from '../../../../common/http/decorators/current-organization-id.decorator';
import { RequirePermissions } from '../../../../common/http/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../../../common/http/guards/permission.guard';
import { PERMISSION_CODES } from '../../../../shared/domain/authorization/permission-codes';
import { JwtAuthGuard } from '../../../iam/auth/presentation/guards/jwt-auth.guard';
import { GetApiKeyUsageSummaryUseCase } from '../../application/use-cases/get-api-key-usage-summary.use-case';
import {
  ApiKeyUsageSummaryResponseDto,
  GetApiKeyUsageSummaryQueryDto,
} from '../dto/get-api-key-usage-summary.dto';

@ApiTags('Usage Metrics')
@Controller({ path: 'usage-metrics', version: '1' })
export class UsageMetricsController {
  constructor(private readonly getApiKeyUsageSummaryUseCase: GetApiKeyUsageSummaryUseCase) {}

  @Get('api-keys')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(PERMISSION_CODES.OBSERVABILITY_USAGE_METRICS_READ)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List aggregated API key request usage for the current organization' })
  @ApiOkResponse({ type: ApiKeyUsageSummaryResponseDto })
  async getApiKeySummary(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: GetApiKeyUsageSummaryQueryDto,
  ): Promise<ApiKeyUsageSummaryResponseDto> {
    const items = await this.getApiKeyUsageSummaryUseCase.execute(
      organizationId,
      query.windowHours,
      query.limit,
    );

    return {
      windowHours: query.windowHours,
      items: [...items],
    };
  }
}
