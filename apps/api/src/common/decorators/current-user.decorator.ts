import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** What JwtStrategy attaches to `request.user` for authenticated requests. */
export interface AuthenticatedUser {
  userId: string;
  sessionId: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
