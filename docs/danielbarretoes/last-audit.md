# Auditoría del Proyecto - Patrón Hexagonal

He realizado una auditoría completa del proyecto. Aquí están mis hallazgos:

---

## Cumplimiento del Patrón Hexagonal

### Fortalezas Estructurales

| Aspecto                | Estado | Descripción                                                                        |
| ---------------------- | ------ | ---------------------------------------------------------------------------------- |
| Separación de capas    | ✅     | domain → application → infrastructure → presentation claramente definidos          |
| Puertos (Ports)        | ✅     | Interfaces como `UserRepositoryPort`, `PasswordHasherPort` son abstracciones清洁   |
| Adaptadores            | ✅     | `UserTypeOrmRepository`, `BcryptPasswordHasherAdapter` implementan los puertos     |
| Entidades de dominio   | ✅     | `User`, `Organization` son clases TypeScript puras, sin dependencias de frameworks |
| Casos de uso           | ✅     | Orquestación en `application/use-cases`, sin lógica de infraestructura             |
| Excepciones de dominio | ✅     | Extienden `DomainException`, no `NestHttpException`                                |
| Shared Kernel          | ✅     | `src/shared` global y `modules/iam/shared` para el bounded context                 |
| Test de arquitectura   | ✅     | `hexagonal-architecture.spec.ts` valida las dependencias entre capas               |

### Estructura de capas observada

```plain
presentation (controllers, guards, DTOs)
         ↓ llama
application (use-cases, port tokens)
         ↓ usa
  domain (entities, ports, exceptions)
         ↓ implementado por
infrastructure (TypeORM adapters, repositories)
```

---

## Buenas Prácticas Implementadas

- **Tokens de DI centralizados** — `USER_REPOSITORY_TOKEN`, `ORGANIZATION_REPOSITORY_TOKEN`
- **Soft delete + restore** — `User.softDelete()`, `Organization.restore()`
- **Multi-tenancy con RLS** — PostgreSQL Row Level Security en members
- **AsyncLocalStorage** para contexto de tenant
- **RFC 7807 Problem Details** — Respuestas de error estandarizadas
- **API versionada** — `/api/v1/...`
- **Swagger/OpenAPI** — Documentación en `/docs`
- **Value Objects** — `MembershipRole`
- **Migraciones de base de datos** — Baseline migration
- **Pagination primitiva** — `Paginated<T>` en shared kernel

---

## Puntos de Fallo Identificados

### 1. ALTA — Acoplamiento circular potencial

**Archivo:** `auth.module.ts` (líneas 10-13 y 20-21)

```typescript
import { UsersModule } from '../users/users.module';
import { AuthModule } from './auth.module';

@Module({
  imports: [UsersModule, AuthSupportModule],
```

**Problema:** `AuthModule` importa `UsersModule` para acceder al token `USER_REPOSITORY_TOKEN`. Si `UsersModule` cambia, podría afectar `AuthModule`.

**Recomendación:** Considerar si `UserRepositoryPort` debería estar en `iam/shared` para evitar esta dependencia directa.

---

### 2. ALTA — JWT secret en archivo de configuración, no en env

**Archivo:** `jwt.config.ts` (líneas 1-7)

```typescript
const __dirname = dirname(fileURLToPath(import.meta.url));
const jwtConfigPath = resolve(__dirname, '../../../.env');
const envFile = parseEnvFile(jwtConfigPath);
export const JWT_CONFIG = {
  secret: envFile.JWT_SECRET,
```

**Problema:** El secret se lee de `.env` en tiempo de build/compilación. Si el archivo `.env` no se carga correctamente o el secret cambia en producción, puede haber inconsistencias.

**Recomendación:** Usar `@nestjs/config` con `ConfigService` para cargar el secret en runtime.

---

### 3. MEDIA — RLS usa variable de entorno sin validación

**Archivo:** `member.typeorm-repository.ts` (líneas 20-21)

```typescript
const RLS_RUNTIME_ROLE = process.env.DB_RLS_RUNTIME_ROLE || 'hexagonal_app_runtime';
```

**Problema:** Si `DB_RLS_RUNTIME_ROLE` no está definido y el fallback no coincide con el role real de la base de datos, las queries fallarán silenciosamente con errores de permisos.

**Recomendación:** Validar en el bootstrap de la aplicación que el role existe.

---

### 4. MEDIA — Entidades exponen passwordHash públicamente

**Archivo:** `user.entity.ts` (líneas 16-17)

```typescript
export class User {
  public readonly id: string;
  public readonly email: string;
  public readonly passwordHash: string; // Expuesto!
```

**Problema:** El `passwordHash` es parte de la interfaz pública de `User`. Si un desarrollador inadvertidamente lo incluye en un DTO de respuesta, se filtraría el hash de la contraseña.

**Recomendación:** Considerar si `passwordHash` debería ser `#private` o movido a un método `verifyPassword()`.

---

### 5. MEDIA — HTTP logs guarda bodies completos sin sanitización

**Archivo:** `1742934000000-baseline-schema.ts` (líneas 58-61)

```typescript
"request_body" jsonb,
"query_params" jsonb,
"route_params" jsonb,
"response_body" jsonb,
```

**Problema:** El sistema guarda request/response bodies completos. Datos sensibles (passwords, tokens, PII) podrían ser capturados.

**Recomendación:** Implementar sanitización o blacklist de campos sensibles antes de guardar.

---

### 6. MEDIA — Posible inconsistencia en rehydrate()

**Archivo:** `user.entity.ts` (líneas 69-77)

```typescript
static rehydrate(props: {
  id: string;
  email: string;
  // ...
}): User {
  return new User({
    id: props.id,
    email: props.email.toLowerCase().trim(), // Aplica trim() y toLowerCase()
```

**Problema:** `rehydrate()` aplica `toLowerCase().trim()` pero la data ya viene de la base de datos. Si hubo datos guardados sin trimming (o con inconsistencias), el comportamiento podría diferir de `create()`.

**Recomendación:** Asegurar consistencia en cómo se normalizan los datos.

---

### 7. MEDIA — No hay manejo de transacciones a nivel de aplicación

**Archivo:** `member.typeorm-repository.ts` (líneas 54-62)

```typescript
return this.dataSource.transaction(async (manager) => {
  await manager.query(`SET LOCAL ROLE ${RLS_RUNTIME_ROLE}`);
  await manager.query(`SELECT set_config('app.current_organization_id', $1, true)`, [
    organizationId,
  ]);
```

**Problema:** Las transacciones están acopladas a TypeORM en el repository. Si el dominio necesita atomicidad across multiple aggregates, no hay una abstracción de unit of work.

---

### 8. MEDIA — No hay Domain Events

**Problema:** Las entidades generan nuevos objetos (ej: `user.softDelete()`) pero no hay un evento de dominio asociado. Patrones como Saga/CQRS no son posibles actualmente.

---

### 9. BAJA — El test de arquitectura no cubre common/

**Archivo:** `hexagonal-architecture.spec.ts` (líneas 54-123)

```typescript
const moduleFiles = collectTypeScriptFiles(path.join(process.cwd(), 'src/modules'));
```

**Problema:** El test hexagonal solo valida `src/modules`, pero `common/` también tiene código técnico que debería seguir las mismas reglas de dependencia (ej: no depender de capas superiores).

---

### 10. BAJA — MembershipRole como string enum

**Archivo:** `membership-role.value-object.ts` (líneas 1-3)

```typescript
export type MembershipRoleName = 'owner' | 'admin' | 'manager' | 'member' | 'guest';
export class MembershipRole {
  readonly name: MembershipRoleName;
```

**Problema:** Funciona bien, pero no hay validación runtime exhaustiva de los valores. Podría ampliarse con un registro de roles válidos.

---

## Resumen Ejecutivo

| Categoría                    | Puntuación | Notas                                                |
| ---------------------------- | ---------- | ---------------------------------------------------- |
| Cumplimiento hexagonal       | 9/10       | Excelente separación de capas                        |
| Inyección de dependencias    | 8/10       | Tokens centralizados, pequeña cohesión circular      |
| Seguridad                    | 7/10       | RLS implementado, pero JWT secret y logs son riesgos |
| Manejo de errores            | 9/10       | Domain exceptions + RFC 7807                         |
| Testing                      | 8/10       | Test de arquitectura, pero coverage podría mejorar   |
| Operaciones de base de datos | 7/10       | Migraciones + RLS, falta abstracción transaccional   |
| Mantenibilidad               | 8/10       | Código limpio, buena documentación README            |

---

## Recomendaciones Prioritarias

### Alta Prioridad

- Mover `UserRepositoryPort` a `iam/shared` para eliminar acoplamiento `AuthModule` → `UsersModule`
- Migrar JWT secret a `ConfigService` con validación en bootstrap

### Media Prioridad

- Implementar sanitización de datos sensibles en http-logs
- Validar que `DB_RLS_RUNTIME_ROLE` exista al iniciar la aplicación
- Considerar Domain Events para futuras necesidades de event-sourcing/CQRS
