import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, TENANT_MODELS } from '@sms/database';
import { Role } from '@sms/shared';
import { ClsService } from 'nestjs-cls';
import { CLS_ROLE, CLS_SCHOOL_ID } from '../common/cls-keys';

const TENANT_SET = new Set<string>(TENANT_MODELS);

/**
 * Injects the current school's id into a tenant-scoped query. Only
 * filter/data based operations are supported — single-row operations that
 * require a unique `where` (findUnique/update/delete/upsert) are rejected so
 * scoping can never be silently bypassed. Use findFirst / updateMany /
 * deleteMany for tenant models instead.
 */
function scopeArgs(operation: string, rawArgs: unknown, schoolId: string): unknown {
  const args = (rawArgs ?? {}) as Record<string, any>;
  switch (operation) {
    case 'findFirst':
    case 'findFirstOrThrow':
    case 'findMany':
    case 'count':
    case 'aggregate':
    case 'groupBy':
    case 'updateMany':
    case 'deleteMany':
      return { ...args, where: { ...(args.where ?? {}), schoolId } };
    case 'create':
      return { ...args, data: { ...(args.data ?? {}), schoolId } };
    case 'createMany': {
      const data = args.data;
      return {
        ...args,
        data: Array.isArray(data)
          ? data.map((row: Record<string, unknown>) => ({ ...row, schoolId }))
          : { ...data, schoolId },
      };
    }
    default:
      throw new Error(
        `Prisma operation "${operation}" is not tenant-safe on a scoped model; ` +
          `use findFirst / findMany / updateMany / deleteMany / create instead.`,
      );
  }
}

/**
 * Prisma client with automatic multi-tenant scoping.
 *
 * A `$extends` query extension injects `schoolId` into every operation
 * against a tenant model (see TENANT_MODELS), derived from the authenticated
 * user in the CLS store. A developer physically cannot read or write another
 * school's rows.
 *
 * Bypass rules (no scoping applied):
 *  - SUPER_ADMIN (platform role) — sees across all schools.
 *  - No schoolId in context (e.g. login, system tasks) — unscoped.
 */
@Injectable()
export class PrismaService extends PrismaClient {
  private static readonly logger = new Logger(PrismaService.name);

  constructor(cls: ClsService) {
    super({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });

    const extended = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (!model || !TENANT_SET.has(model)) {
              return query(args);
            }
            const role = cls.get<Role | undefined>(CLS_ROLE);
            const schoolId = cls.get<string | undefined>(CLS_SCHOOL_ID);

            // Platform users and system/unauthenticated context are unscoped.
            if (role === Role.SUPER_ADMIN || !schoolId) {
              return query(args);
            }
            return query(scopeArgs(operation, args, schoolId) as Parameters<typeof query>[0]);
          },
        },
      },
    });

    // Prisma connects lazily on first query; the extended client proxies all
    // top-level methods ($queryRaw, $transaction, etc.) to the base client.
    return extended as unknown as PrismaService;
  }
}
