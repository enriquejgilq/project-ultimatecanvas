import {
  clientPasswordRuleViolations,
  PASSWORD_RULE_CODES,
  PASSWORD_RULE_MESSAGES,
  type PasswordRuleCode,
} from '@ucanvas/shared';

const SHOWN_RULES: PasswordRuleCode[] = [
  PASSWORD_RULE_CODES.PASSWORD_TOO_SHORT,
  PASSWORD_RULE_CODES.PASSWORD_NEEDS_LETTER,
  PASSWORD_RULE_CODES.PASSWORD_NEEDS_NUMBER,
  PASSWORD_RULE_CODES.PASSWORD_TOO_COMMON,
];

/** Live checklist of the password rules. "Common password" can only be confirmed by the server. */
export function PasswordRulesHint({ password }: { password: string }) {
  const broken = new Set(clientPasswordRuleViolations(password));
  return (
    <ul className="auth-rules" aria-label="Requisitos de la contraseña">
      {SHOWN_RULES.map((rule) => {
        const checkable = rule !== PASSWORD_RULE_CODES.PASSWORD_TOO_COMMON;
        const ok = checkable && password.length > 0 && !broken.has(rule);
        return (
          <li
            key={rule}
            className={ok ? 'auth-rules__item auth-rules__item--ok' : 'auth-rules__item'}
          >
            <span aria-hidden="true">{ok ? '✓' : '•'}</span> {PASSWORD_RULE_MESSAGES[rule]}
            {ok && <span className="sr-only"> (cumplido)</span>}
          </li>
        );
      })}
    </ul>
  );
}
