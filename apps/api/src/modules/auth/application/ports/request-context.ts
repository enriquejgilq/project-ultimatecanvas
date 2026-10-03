/** Who/where a request came from — recorded in security events, never used for decisions. */
export interface RequestContext {
  ip?: string;
  userAgent?: string;
}
