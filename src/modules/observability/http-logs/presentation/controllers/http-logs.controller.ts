import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AccessAuthGuard } from '../../../../iam/auth/presentation/guards/access-auth.guard';
import { GetHttpLogByIdUseCase } from '../../application/use-cases/get-http-log-by-id.use-case';
import { GetHttpLogsByTraceIdUseCase } from '../../application/use-cases/get-http-logs-by-trace-id.use-case';
import { GetPaginatedHttpLogsUseCase } from '../../application/use-cases/get-paginated-http-logs.use-case';
import { HttpLogNotFoundException } from '../../domain/exceptions/http-log-not-found.exception';
import { HttpLogResponseDto } from '../dto/http-log-response.dto';
import { ListHttpLogsQueryDto } from '../dto/list-http-logs-query.dto';
import { PaginatedHttpLogsResponseDto } from '../dto/paginated-http-logs-response.dto';
import { RequirePermissions } from '../../../../../common/http/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../../../../common/http/guards/permission.guard';
import { PERMISSION_CODES } from '../../../../../shared/domain/authorization/permission-codes';

@ApiTags('HTTP Logs')
@ApiBearerAuth('bearer')
@UseGuards(AccessAuthGuard, PermissionGuard)
@RequirePermissions(PERMISSION_CODES.OBSERVABILITY_HTTP_LOGS_READ)
@Controller({ path: 'http-logs', version: '1' })
export class HttpLogsController {
  constructor(
    private readonly getHttpLogByIdUseCase: GetHttpLogByIdUseCase,
    private readonly getHttpLogsByTraceIdUseCase: GetHttpLogsByTraceIdUseCase,
    private readonly getPaginatedHttpLogsUseCase: GetPaginatedHttpLogsUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List HTTP logs with pagination and operational filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'createdFrom', required: false, type: String })
  @ApiQuery({ name: 'createdTo', required: false, type: String })
  @ApiQuery({
    name: 'statusFamily',
    required: false,
    enum: ['2xx', '3xx', '4xx', '5xx'],
  })
  @ApiOkResponse({ type: PaginatedHttpLogsResponseDto })
  async getPaginated(@Query() query: ListHttpLogsQueryDto) {
    return this.getPaginatedHttpLogsUseCase.execute(query.page, query.limit, {
      createdFrom: query.createdFrom ? new Date(query.createdFrom) : undefined,
      createdTo: query.createdTo ? new Date(query.createdTo) : undefined,
      statusFamily: query.statusFamily,
    });
  }

  @Get('trace/:traceId')
  @ApiOperation({ summary: 'List all HTTP logs for a trace id' })
  @ApiParam({
    name: 'traceId',
    example: '995745f6-5803-489c-ad5f-b4ff790ce7c0',
  })
  @ApiOkResponse({ type: [HttpLogResponseDto] })
  async getByTraceId(@Param('traceId') traceId: string) {
    return this.getHttpLogsByTraceIdUseCase.execute(traceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an HTTP log by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: HttpLogResponseDto })
  async getById(@Param('id', new ParseUUIDPipe()) id: string) {
    const httpLog = await this.getHttpLogByIdUseCase.execute(id);

    if (!httpLog) {
      throw new HttpLogNotFoundException(id);
    }

    return httpLog;
  }
}
