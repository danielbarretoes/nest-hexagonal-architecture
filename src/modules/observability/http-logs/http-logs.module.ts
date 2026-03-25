import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthSupportModule } from '../../iam/auth/auth-support.module';
import { HTTP_LOG_REPOSITORY_TOKEN } from './application/ports/http-log.repository.token';
import { GetHttpLogByIdUseCase } from './application/use-cases/get-http-log-by-id.use-case';
import { GetHttpLogsByTraceIdUseCase } from './application/use-cases/get-http-logs-by-trace-id.use-case';
import { GetPaginatedHttpLogsUseCase } from './application/use-cases/get-paginated-http-logs.use-case';
import { RecordHttpLogUseCase } from './application/use-cases/record-http-log.use-case';
import { HttpLogTypeOrmEntity } from './infrastructure/persistence/typeorm/entities/http-log.entity';
import { HttpLogTypeOrmRepository } from './infrastructure/persistence/typeorm/repositories/http-log.typeorm-repository';
import { HttpLogsController } from './presentation/controllers/http-logs.controller';
import { HttpLogsAccessGuard } from './presentation/guards/http-logs-access.guard';
import { HttpLogsMiddleware } from './presentation/middlewares/http-logs.middleware';
import { OrganizationsModule } from '../../iam/organizations/organizations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HttpLogTypeOrmEntity]),
    AuthSupportModule,
    OrganizationsModule,
  ],
  controllers: [HttpLogsController],
  providers: [
    { provide: HTTP_LOG_REPOSITORY_TOKEN, useClass: HttpLogTypeOrmRepository },
    HttpLogTypeOrmRepository,
    RecordHttpLogUseCase,
    GetHttpLogByIdUseCase,
    GetHttpLogsByTraceIdUseCase,
    GetPaginatedHttpLogsUseCase,
    HttpLogsAccessGuard,
    HttpLogsMiddleware,
  ],
  exports: [
    RecordHttpLogUseCase,
    GetHttpLogByIdUseCase,
    GetHttpLogsByTraceIdUseCase,
    GetPaginatedHttpLogsUseCase,
  ],
})
export class HttpLogsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HttpLogsMiddleware).forRoutes('*');
  }
}
