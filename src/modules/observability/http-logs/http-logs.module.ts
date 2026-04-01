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
import { HttpLogsShutdownHook } from './infrastructure/http-logs-shutdown.hook';
import { HttpLogsController } from './presentation/controllers/http-logs.controller';
import { HttpLogsMiddleware } from './presentation/middlewares/http-logs.middleware';
import { IamAuthorizationAccessModule } from '../../iam/iam-authorization-access.module';
import { PermissionGuard } from '../../../common/http/guards/permission.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([HttpLogTypeOrmEntity]),
    AuthSupportModule,
    IamAuthorizationAccessModule,
  ],
  controllers: [HttpLogsController],
  providers: [
    { provide: HTTP_LOG_REPOSITORY_TOKEN, useClass: HttpLogTypeOrmRepository },
    HttpLogTypeOrmRepository,
    RecordHttpLogUseCase,
    GetHttpLogByIdUseCase,
    GetHttpLogsByTraceIdUseCase,
    GetPaginatedHttpLogsUseCase,
    PermissionGuard,
    HttpLogsMiddleware,
    HttpLogsShutdownHook,
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
