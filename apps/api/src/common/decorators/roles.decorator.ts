import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Placeholder — no role system implemented yet. Attach required roles once one exists. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
