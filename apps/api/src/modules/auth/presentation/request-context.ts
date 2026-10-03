import type { Request } from 'express';
import { RequestContext } from '../application/ports/request-context';

export function requestContext(req: Request): RequestContext {
  const userAgent = req.headers['user-agent'];
  return {
    ip: req.ip,
    userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 512) : undefined,
  };
}
