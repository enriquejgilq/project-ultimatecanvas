export const TOKEN_GENERATOR = Symbol('TOKEN_GENERATOR');

export interface GeneratedToken {
  /** Sent to the user (cookie / email link). Never stored. */
  raw: string;
  /** What gets stored and looked up. */
  hash: string;
}

export interface TokenGeneratorPort {
  generate(): GeneratedToken;
  hash(raw: string): string;
}
