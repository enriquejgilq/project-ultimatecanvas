import { MailMessage } from './ports/mailer.port';

type Content = Omit<MailMessage, 'to'>;

const PRODUCT = 'UltimateCanvas';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(date: Date): string {
  return (
    new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(date) + ' (UTC)'
  );
}

/** Plain HTML (no external assets) built from paragraphs; links become anchors. */
function html(paragraphs: (string | { href: string; label: string })[]): string {
  const body = paragraphs
    .map((p) =>
      typeof p === 'string'
        ? `<p>${escapeHtml(p)}</p>`
        : `<p><a href="${escapeHtml(p.href)}">${escapeHtml(p.label)}</a></p>`,
    )
    .join('\n');
  return `<!doctype html><html lang="es"><body>${body}<p>— El equipo de ${PRODUCT}</p></body></html>`;
}

function text(paragraphs: (string | { href: string; label: string })[]): string {
  return [
    ...paragraphs.map((p) => (typeof p === 'string' ? p : `${p.label}: ${p.href}`)),
    `— El equipo de ${PRODUCT}`,
  ].join('\n\n');
}

function build(subject: string, paragraphs: (string | { href: string; label: string })[]): Content {
  return { subject, text: text(paragraphs), html: html(paragraphs) };
}

export const mailTemplates = {
  emailVerification(link: string): Content {
    return build(`Confirma tu correo en ${PRODUCT}`, [
      'Hola:',
      `Para activar tu cuenta en ${PRODUCT}, confirma tu correo con este enlace:`,
      { href: link, label: 'Confirmar mi correo' },
      'El enlace caduca en 24 horas y solo se puede usar una vez. Si no has creado esta cuenta, ignora este mensaje.',
    ]);
  },

  registrationAttempt(loginUrl: string, forgotUrl: string): Content {
    return build('Alguien intentó registrarse con tu correo', [
      'Hola:',
      `Alguien ha intentado crear una cuenta en ${PRODUCT} con tu dirección de correo, pero ya tienes una cuenta.`,
      { href: loginUrl, label: 'Iniciar sesión' },
      { href: forgotUrl, label: '¿Has olvidado tu contraseña? Recupérala aquí' },
      'Si no has sido tú, no tienes que hacer nada: tu cuenta sigue igual.',
    ]);
  },

  passwordReset(link: string): Content {
    return build('Restablece tu contraseña', [
      'Hola:',
      `Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en ${PRODUCT}.`,
      { href: link, label: 'Elegir una contraseña nueva' },
      'El enlace caduca en 60 minutos y solo se puede usar una vez. Al cambiar la contraseña se cerrarán todas tus sesiones abiertas.',
      'Si no lo has pedido tú, ignora este mensaje: tu contraseña no cambiará.',
    ]);
  },

  lockoutAlert(at: Date, forgotUrl: string): Content {
    return build('Hemos bloqueado temporalmente el acceso a tu cuenta', [
      'Hola:',
      `El ${formatDate(at)} se produjeron 5 intentos fallidos seguidos de acceso a tu cuenta, así que la hemos bloqueado durante 15 minutos.`,
      'Si no has sido tú, te recomendamos cambiar tu contraseña:',
      { href: forgotUrl, label: 'Restablecer mi contraseña' },
    ]);
  },

  passwordChanged(at: Date, forgotUrl: string): Content {
    return build('Tu contraseña ha cambiado', [
      'Hola:',
      `La contraseña de tu cuenta en ${PRODUCT} se cambió el ${formatDate(at)}.`,
      'Si no has sido tú, recupera tu cuenta ahora mismo:',
      { href: forgotUrl, label: 'Restablecer mi contraseña' },
    ]);
  },
};
