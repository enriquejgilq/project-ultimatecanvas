# Feature Specification: Autenticación y protección de cuentas

**Feature Branch**: `001-user-auth`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "Hace que la plataforma sepa quién es cada usuario y proteja sus cuentas. Registro con verificación de correo; el enlace dura 24 horas y sirve una sola vez. Contraseñas de al menos 10 caracteres, con letras y números, rechazando las más comunes. Siempre se guardan como hash. Sesión de corta duración que se renueva sola mientras el usuario está activo, y opción de \"mantener sesión iniciada\" por 30 días. Recuperación de contraseña con un enlace que dura 60 minutos; al usarlo se cierran todas las sesiones abiertas. Bloqueo de 15 minutos tras 5 intentos fallidos de inicio de sesión, con aviso por correo al dueño de la cuenta. Los mensajes de error nunca revelan si un correo está registrado. Quien abre una página privada sin sesión va al inicio de sesión y, al entrar, vuelve a la página que quería ver."

## Clarifications

### Session 2026-10-02

- Q: ¿El bloqueo tras 5 intentos fallidos afecta a la cuenta entera o solo al dispositivo/red de origen? → A: A la cuenta entera: 5 fallos consecutivos desde cualquier origen bloquean la cuenta para todos durante 15 minutos.
- Q: ¿Cuántos correos de verificación o recuperación se pueden pedir para un mismo correo antes de dejar de enviarlos? → A: Máximo 3 correos de cada tipo por dirección y hora, con al menos 60 segundos entre envíos; por encima se muestra el mismo mensaje y no se envía nada.
- Q: Sin "mantener sesión iniciada", ¿tras cuánto tiempo de inactividad se cierra la sesión? → A: Tras 2 horas sin actividad, o al cerrar el navegador.
- Q: Si alguien vuelve a registrarse con un correo cuya cuenta está sin verificar, ¿qué pasa con la cuenta pendiente? → A: El nuevo registro la sustituye: se guarda la nueva contraseña, se invalidan los enlaces anteriores y se envía un enlace nuevo.
- Q: ¿Se incluye cambiar la contraseña con la sesión iniciada? → A: Sí: se pide la actual y la nueva; al cambiarla se cierran las sesiones de los demás dispositivos (no la actual) y se avisa por correo al dueño.
- Q: ¿El aviso "alguien intentó registrarse con tu correo" está sujeto al límite de envíos? → A: Sí, 3 por hora y 60 s entre envíos, como verificación y recuperación.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Registro con verificación de correo (Priority: P1)

Una persona nueva crea su cuenta con su correo y una contraseña. La plataforma le envía un enlace de verificación; al abrirlo, la cuenta queda activada y puede iniciar sesión.

**Why this priority**: Sin cuentas no existe identidad: todo lo demás (sesión, recuperación, bloqueo) depende de que haya usuarios con un correo comprobado.

**Independent Test**: Registrar un correo nuevo, abrir el enlace recibido y comprobar que la cuenta pasa a estar verificada y permite iniciar sesión.

**Acceptance Scenarios**:

1. **Given** un correo que no tiene cuenta, **When** la persona se registra con una contraseña válida, **Then** ve un mensaje indicando que revise su correo y recibe un enlace de verificación.
2. **Given** un enlace de verificación emitido hace menos de 24 horas y no usado, **When** la persona lo abre, **Then** la cuenta queda verificada y se le invita a iniciar sesión.
3. **Given** un enlace de verificación ya usado, **When** se abre de nuevo, **Then** no tiene efecto y se informa de que el enlace no es válido, ofreciendo pedir uno nuevo.
4. **Given** un enlace de verificación emitido hace más de 24 horas, **When** se abre, **Then** se rechaza como caducado y se ofrece pedir uno nuevo.
5. **Given** una contraseña de menos de 10 caracteres, sin letras, sin números o incluida en la lista de contraseñas comunes, **When** la persona intenta registrarse, **Then** el registro se rechaza indicando qué regla no se cumple.
6. **Given** un correo que ya tiene cuenta verificada, **When** alguien intenta registrarse con él, **Then** ve exactamente el mismo mensaje que en un registro exitoso ("revisa tu correo") y el dueño real recibe un aviso de que alguien intentó registrarse con su dirección.
7. **Given** un correo con una cuenta pendiente de verificar, **When** alguien se registra de nuevo con él, **Then** la contraseña pendiente se sustituye por la nueva, los enlaces de verificación anteriores dejan de funcionar y se envía un enlace nuevo; solo quien abra ese último enlace activa la cuenta.

---

### User Story 2 - Inicio de sesión, sesión renovable y cierre de sesión (Priority: P1)

Un usuario verificado inicia sesión con su correo y contraseña. Mientras usa la plataforma, su sesión se mantiene sin pedirle credenciales de nuevo. Si marca "mantener sesión iniciada", sigue dentro hasta 30 días aunque cierre el navegador. Puede cerrar sesión cuando quiera.

**Why this priority**: Es el uso diario de la identidad; junto con el registro forma el MVP.

**Independent Test**: Con una cuenta verificada, iniciar sesión con y sin "mantener sesión iniciada" y comprobar la duración y la renovación de la sesión, y que el cierre de sesión la invalida.

**Acceptance Scenarios**:

1. **Given** una cuenta verificada, **When** el usuario introduce correo y contraseña correctos, **Then** entra a la plataforma.
2. **Given** una sesión activa sin "mantener sesión iniciada", **When** el usuario sigue interactuando con la plataforma, **Then** la sesión se renueva sola y no se le piden credenciales.
3. **Given** una sesión sin "mantener sesión iniciada", **When** el usuario pasa 2 horas sin actividad o cierra el navegador, **Then** la sesión termina y debe iniciar sesión de nuevo.
4. **Given** el usuario marcó "mantener sesión iniciada", **When** vuelve en un plazo de 30 días, aunque haya cerrado el navegador, **Then** sigue con la sesión iniciada.
5. **Given** "mantener sesión iniciada" lleva 30 días desde el inicio de sesión, **When** el usuario vuelve, **Then** debe iniciar sesión de nuevo.
6. **Given** una cuenta registrada pero no verificada, **When** el usuario introduce credenciales correctas, **Then** no accede y se le indica que verifique su correo, con opción de reenviar el enlace.
7. **Given** una sesión activa, **When** el usuario cierra sesión, **Then** la sesión queda invalidada en ese dispositivo y las páginas privadas dejan de ser accesibles.

---

### User Story 3 - Acceso a páginas privadas y retorno tras iniciar sesión (Priority: P2)

Quien abre una página privada sin sesión es llevado al inicio de sesión y, al entrar, vuelve automáticamente a la página que quería ver.

**Why this priority**: Protege el contenido privado y evita que el usuario pierda el contexto (por ejemplo, al abrir un enlace compartido).

**Independent Test**: Sin sesión, abrir la dirección de una página privada, iniciar sesión y comprobar que se aterriza en esa misma página.

**Acceptance Scenarios**:

1. **Given** no hay sesión, **When** alguien abre una página privada, **Then** no ve su contenido y es llevado al inicio de sesión.
2. **Given** el usuario fue llevado al inicio de sesión desde una página privada, **When** inicia sesión correctamente, **Then** vuelve a esa página, incluidos sus parámetros.
3. **Given** el usuario abrió directamente el inicio de sesión, **When** inicia sesión, **Then** va a la página principal de la plataforma.
4. **Given** la página de destino apunta fuera de la plataforma, **When** el usuario inicia sesión, **Then** se ignora ese destino y va a la página principal.

---

### User Story 4 - Recuperación de contraseña (Priority: P2)

Un usuario que olvidó su contraseña pide un enlace de recuperación, elige una contraseña nueva y todas sus sesiones abiertas se cierran.

**Why this priority**: Sin recuperación, olvidar la contraseña significa perder la cuenta; además, cerrar todas las sesiones ayuda a recuperar una cuenta comprometida.

**Independent Test**: Con una cuenta que tenga sesiones abiertas en dos dispositivos, pedir la recuperación, fijar una contraseña nueva y comprobar que ambas sesiones quedan cerradas.

**Acceptance Scenarios**:

1. **Given** cualquier correo, registrado o no, **When** se pide recuperar la contraseña, **Then** se muestra siempre el mismo mensaje ("si existe una cuenta, recibirás un correo") y solo se envía el enlace si la cuenta existe.
2. **Given** un enlace de recuperación emitido hace menos de 60 minutos y no usado, **When** el usuario lo abre y fija una contraseña nueva válida, **Then** la contraseña cambia, se cierran todas sus sesiones abiertas en todos los dispositivos y debe iniciar sesión con la nueva contraseña.
3. **Given** un enlace de recuperación usado o con más de 60 minutos, **When** se abre, **Then** se rechaza y se ofrece pedir uno nuevo.
4. **Given** el usuario pidió varios enlaces de recuperación, **When** usa el más reciente, **Then** todos los enlaces anteriores quedan invalidados.
5. **Given** la contraseña nueva no cumple las reglas, **When** se envía, **Then** se rechaza indicando qué regla no cumple y el enlace sigue siendo válido mientras no caduque.

---

### User Story 5 - Bloqueo por intentos fallidos (Priority: P3)

Tras 5 intentos fallidos seguidos de inicio de sesión, la cuenta se bloquea durante 15 minutos y el dueño recibe un aviso por correo.

**Why this priority**: Frena los ataques de adivinación de contraseñas y alerta al dueño. Es una capa de protección sobre el inicio de sesión, que ya funciona sin ella.

**Independent Test**: Introducir 5 veces una contraseña incorrecta para una cuenta, comprobar que el sexto intento con la contraseña correcta se rechaza, que llega el aviso por correo y que pasados 15 minutos se puede entrar.

**Acceptance Scenarios**:

1. **Given** una cuenta con 4 intentos fallidos seguidos, **When** se produce el 5.º intento fallido, **Then** la cuenta queda bloqueada 15 minutos y el dueño recibe un único correo de aviso.
2. **Given** una cuenta bloqueada, **When** alguien introduce la contraseña correcta, **Then** no accede y ve el mismo mensaje genérico de credenciales no válidas.
3. **Given** el bloqueo de 15 minutos ha terminado, **When** el dueño introduce la contraseña correcta, **Then** accede con normalidad y el contador de fallos vuelve a cero.
4. **Given** una cuenta con fallos acumulados por debajo del límite, **When** el usuario inicia sesión correctamente, **Then** el contador de fallos vuelve a cero.
5. **Given** una cuenta bloqueada, **When** el dueño completa la recuperación de contraseña, **Then** el bloqueo se levanta y puede entrar con la contraseña nueva.

---

### User Story 6 - Cambio de contraseña con sesión iniciada (Priority: P3)

Un usuario con la sesión iniciada cambia su contraseña desde su perfil indicando la actual y la nueva. Sus sesiones en otros dispositivos se cierran y recibe un aviso por correo.

**Why this priority**: Permite cambiar una contraseña conocida sin pasar por el correo y expulsar a quien pudiera estar usando la cuenta en otro dispositivo, pero el usuario ya dispone de la recuperación como alternativa.

**Independent Test**: Con sesiones abiertas en dos dispositivos, cambiar la contraseña desde uno de ellos y comprobar que ese sigue dentro, que el otro queda fuera, que llega el aviso por correo y que solo la nueva contraseña sirve para entrar.

**Acceptance Scenarios**:

1. **Given** una sesión activa, **When** el usuario introduce su contraseña actual correcta y una nueva válida, **Then** la contraseña cambia, su sesión actual continúa y todas sus sesiones en otros dispositivos, incluidas las de "mantener sesión iniciada", se cierran.
2. **Given** el cambio de contraseña se completó, **When** termina, **Then** el dueño recibe un correo avisando del cambio, con la hora y una indicación de qué hacer si no fue él.
3. **Given** una sesión activa, **When** el usuario introduce una contraseña actual incorrecta, **Then** el cambio se rechaza, la contraseña no cambia y el intento cuenta como fallido para el bloqueo de la cuenta.
4. **Given** la nueva contraseña no cumple las reglas, **When** se envía, **Then** se rechaza indicando qué regla no cumple.

---

### Edge Cases

- **Correo con mayúsculas o espacios**: "Ana@Mail.com " y "ana@mail.com" se tratan como la misma cuenta.
- **Reenvío de verificación**: pedir un nuevo enlace invalida los anteriores; la respuesta es la misma tanto si el correo existe como si no, o si ya estaba verificado.
- **Intentos con un correo no registrado**: reciben el mismo mensaje y tardan un tiempo de respuesta comparable al de un correo registrado, para que la diferencia no delate la existencia de la cuenta.
- **Peticiones repetidas de correos**: si se piden más de 3 enlaces de verificación o de recuperación (o se generan más de 3 avisos de intento de registro) en una hora para el mismo correo, o dos en menos de 60 segundos, los que superan el límite no se envían, aunque la pantalla muestre el mensaje habitual (FR-030, FR-031).
- **Aviso de bloqueo**: se envía una vez por bloqueo, no un correo por cada intento posterior.
- **Bloqueo y enumeración**: el bloqueo no se anuncia en pantalla con un mensaje distinto que permita deducir que la cuenta existe; solo el dueño se entera, por correo.
- **Cuenta no verificada**: los registros que nunca se verifican no impiden que el dueño real del correo complete el registro más adelante, porque un nuevo registro sustituye al pendiente (FR-032).
- **Sesión que caduca a mitad de una acción**: el usuario es llevado al inicio de sesión y, al entrar, vuelve a la página en la que estaba.
- **Varios dispositivos**: cerrar sesión en uno no afecta a los demás; la recuperación de contraseña sí los cierra todos.
- **Enlace abierto en otro dispositivo o navegador**: los enlaces de verificación y recuperación funcionan en cualquier dispositivo, no solo en el que los pidió.
- **Contraseña actual errónea al cambiarla**: cuenta como intento fallido; al llegar a 5 fallos consecutivos la cuenta se bloquea 15 minutos, igual que en el inicio de sesión, y durante el bloqueo no se puede cambiar la contraseña.
- **Contraseña igual a la anterior**: se permite, siempre que cumpla las reglas.

## Requirements _(mandatory)_

### Functional Requirements

**Registro y verificación**

- **FR-001**: El sistema MUST permitir crear una cuenta con correo electrónico y contraseña.
- **FR-002**: El sistema MUST tratar los correos sin distinguir mayúsculas ni espacios al inicio o al final, de modo que cada correo corresponda como máximo a una cuenta.
- **FR-003**: El sistema MUST enviar un enlace de verificación al registrarse. El enlace caduca a las 24 horas y solo puede usarse una vez.
- **FR-004**: El sistema MUST impedir el acceso a páginas privadas a las cuentas no verificadas.
- **FR-005**: El usuario MUST poder pedir un nuevo enlace de verificación; al emitirlo, los anteriores quedan invalidados.

- **FR-032**: Si alguien se registra con un correo cuya cuenta está pendiente de verificar, el sistema MUST sustituir la contraseña pendiente por la nueva, invalidar los enlaces de verificación anteriores y enviar uno nuevo. La respuesta en pantalla es la misma que en cualquier registro.

**Contraseñas**

- **FR-006**: El sistema MUST exigir contraseñas de al menos 10 y como máximo 128 caracteres, con al menos una letra y al menos un número.
- **FR-007**: El sistema MUST rechazar las contraseñas que figuren en una lista de contraseñas comunes o filtradas, de al menos 10 000 entradas, sin distinguir mayúsculas.
- **FR-008**: El sistema MUST guardar las contraseñas solo en forma de hash irreversible, con una sal distinta por usuario. Nunca las guarda, registra, muestra ni envía en texto legible.
- **FR-009**: El sistema MUST indicar, al crear o cambiar una contraseña, qué regla concreta no se cumple.

**Sesión**

- **FR-010**: El sistema MUST mantener una sesión de corta duración que se renueva automáticamente mientras el usuario está activo.
- **FR-011**: Sin "mantener sesión iniciada", la sesión MUST terminar tras 2 horas sin actividad o al cerrar el navegador.
- **FR-012**: Con "mantener sesión iniciada", la sesión MUST sobrevivir al cierre del navegador y durar hasta 30 días desde el inicio de sesión. Pasado ese plazo, se piden credenciales de nuevo.
- **FR-013**: El usuario MUST poder cerrar sesión, lo que invalida de inmediato la sesión de ese dispositivo.

**Recuperación de contraseña**

- **FR-014**: El usuario MUST poder pedir un enlace de recuperación indicando su correo. El enlace caduca a los 60 minutos y solo puede usarse una vez.
- **FR-015**: Emitir un enlace de recuperación nuevo MUST invalidar los anteriores de esa cuenta.
- **FR-016**: Al fijar una contraseña nueva mediante el enlace, el sistema MUST cerrar todas las sesiones abiertas de la cuenta en todos los dispositivos, incluidas las de "mantener sesión iniciada".
- **FR-017**: Completar la recuperación MUST levantar un bloqueo por intentos fallidos que esté vigente.

**Cambio de contraseña con sesión iniciada**

- **FR-033**: Un usuario con sesión iniciada MUST poder cambiar su contraseña indicando la actual y la nueva; la nueva debe cumplir FR-006 y FR-007.
- **FR-034**: Al cambiar la contraseña, el sistema MUST cerrar todas las sesiones de la cuenta en otros dispositivos, incluidas las de "mantener sesión iniciada", y mantener la sesión desde la que se hizo el cambio.
- **FR-035**: El sistema MUST avisar por correo al dueño de la cuenta cada vez que su contraseña cambia, ya sea por cambio con sesión iniciada o por recuperación.
- **FR-036**: Una contraseña actual incorrecta en el cambio de contraseña MUST contar como intento fallido para el bloqueo de FR-018.

**Bloqueo por intentos fallidos**

- **FR-018**: El sistema MUST bloquear el inicio de sesión de una cuenta, desde cualquier dispositivo o red, durante 15 minutos tras 5 intentos fallidos consecutivos, sin importar desde dónde se produjeron.
- **FR-019**: El contador de intentos fallidos MUST volver a cero tras un inicio de sesión correcto o al terminar un bloqueo.
- **FR-020**: Durante el bloqueo, el sistema MUST rechazar incluso la contraseña correcta.
- **FR-021**: Al producirse un bloqueo, el sistema MUST enviar un único correo de aviso al dueño de la cuenta. El aviso indica la hora del bloqueo y recomienda cambiar la contraseña si no fue él.

**No revelar cuentas registradas**

- **FR-022**: Los mensajes de inicio de sesión, registro, reenvío de verificación y recuperación MUST ser idénticos tanto si el correo está registrado como si no.
- **FR-023**: El inicio de sesión fallido MUST mostrar un único mensaje genérico ("correo o contraseña incorrectos") en cualquier caso: correo inexistente, contraseña errónea o cuenta bloqueada.
- **FR-024**: El tiempo de respuesta de esas operaciones MUST ser comparable con correos registrados y no registrados, de modo que no permita distinguirlos.
- **FR-025**: Si alguien intenta registrarse con un correo que ya tiene una cuenta verificada, el sistema MUST mostrar el mismo mensaje que en un registro nuevo y avisar por correo al dueño de esa cuenta, respetando el límite de FR-030.

**Páginas privadas y retorno**

- **FR-026**: El sistema MUST llevar al inicio de sesión a quien abra una página privada sin sesión válida, sin mostrar nada de su contenido.
- **FR-027**: Tras iniciar sesión, el sistema MUST devolver al usuario a la página privada que intentaba ver, con sus parámetros. Si no la había, lo lleva a la página principal.
- **FR-028**: El sistema MUST aceptar como destino de retorno solo páginas de la propia plataforma; cualquier otro destino se sustituye por la página principal.

**Límite de envío de correos**

- **FR-030**: El sistema MUST enviar como máximo 3 correos de cada uno de estos tipos —verificación, recuperación y aviso de intento de registro (FR-025)— por dirección de correo en cada hora, con al menos 60 segundos entre dos envíos del mismo tipo.
- **FR-031**: Al superar ese límite, el sistema MUST mostrar el mismo mensaje que en una petición normal y no enviar ningún correo, para no revelar ni el límite ni si la cuenta existe.

**Registro de eventos**

- **FR-029**: El sistema MUST registrar los eventos de seguridad (registro, verificación, inicio de sesión correcto o fallido, bloqueo, recuperación, cambio de contraseña, cierre de sesión) con fecha, cuenta afectada y origen aproximado, sin incluir contraseñas ni enlaces.

### Key Entities

- **Usuario (cuenta)**: persona identificada por un correo único. Tiene una contraseña guardada como hash, un estado de verificación (pendiente o verificada), un contador de intentos fallidos y, si aplica, la hora hasta la que está bloqueada.
- **Sesión**: acceso activo de un usuario en un dispositivo. Indica si es "mantener sesión iniciada", cuándo empezó, su última actividad y cuándo caduca. Un usuario puede tener varias, y pueden invalidarse una a una o todas a la vez.
- **Enlace de verificación**: pertenece a un usuario. Caduca a las 24 horas, es de un solo uso y queda invalidado al emitirse uno nuevo.
- **Enlace de recuperación**: pertenece a un usuario. Caduca a los 60 minutos, es de un solo uso y queda invalidado al emitirse uno nuevo.
- **Evento de seguridad**: registro de una acción de autenticación con su tipo, fecha, cuenta y origen.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Una persona nueva completa el registro y la verificación del correo en menos de 3 minutos, sin contar la espera del correo.
- **SC-002**: El 95 % de los correos de verificación, recuperación y aviso de bloqueo llegan en menos de 1 minuto.
- **SC-003**: El 0 % de los enlaces de verificación o recuperación funcionan tras su caducidad o tras su primer uso, comprobado en pruebas sobre el 100 % de los casos.
- **SC-004**: Un usuario activo no tiene que volver a introducir credenciales durante una jornada de uso continuado. Con "mantener sesión iniciada", no se le piden durante 30 días.
- **SC-005**: Tras una recuperación de contraseña, el 100 % de las sesiones previas de esa cuenta dejan de dar acceso en menos de 1 minuto.
- **SC-006**: Un atacante no puede probar más de 5 contraseñas por cuenta cada 15 minutos.
- **SC-007**: En una prueba con correos registrados y no registrados, un observador externo no distingue cuáles existen mejor que al azar, ni por los mensajes ni por los tiempos de respuesta.
- **SC-008**: El 100 % de los accesos sin sesión a páginas privadas acaban en el inicio de sesión, y el 100 % de los que inician sesión desde ahí vuelven a la página original.
- **SC-009**: Ninguna contraseña aparece en texto legible en lo guardado, en los registros de eventos ni en los correos.
- **SC-010**: Al menos el 90 % de los usuarios completan la recuperación de contraseña al primer intento.
- **SC-011**: Tras un cambio de contraseña con sesión iniciada, el 100 % de las sesiones de otros dispositivos dejan de dar acceso en menos de 1 minuto, y la sesión desde la que se hizo el cambio sigue activa.

## Assumptions

- **Duración de la sesión**: "corta duración" se interpreta como unos 15 minutos por renovación. Sin "mantener sesión iniciada", la sesión termina tras 2 horas de inactividad o al cerrar el navegador.
- **Plazo de "mantener sesión iniciada"**: los 30 días cuentan desde el inicio de sesión. La actividad no los alarga indefinidamente.
- **Bloqueo**: es por cuenta (5 fallos consecutivos) y no por dispositivo o red, según la aclaración del 2026-10-02. Puede usarse para bloquear temporalmente a un usuario legítimo; se acepta ese riesgo porque el bloqueo dura poco y la recuperación de contraseña lo levanta.
- **Lista de contraseñas comunes**: se usa una lista pública reconocida de contraseñas filtradas o frecuentes, de al menos 10 000 entradas, y la comprobación se hace sin depender de servicios externos en tiempo real.
- **Método de identificación**: solo correo y contraseña. El inicio de sesión con proveedores externos, la verificación en dos pasos y las cuentas sin contraseña quedan fuera de alcance.
- **Gestión de cuenta**: el cambio de contraseña con sesión iniciada sí está incluido, según la aclaración del 2026-10-02. Cambiar el correo, eliminar la cuenta y ver o cerrar sesiones de otros dispositivos de forma selectiva quedan fuera de alcance; serán funcionalidades posteriores.
- **Roles y permisos**: esta funcionalidad solo establece quién es el usuario. Qué puede hacer cada uno se definirá aparte.
- **Correo**: la plataforma dispone de un servicio de envío de correo fiable. Los correos se redactan en español.
- **Cuentas sin verificar**: se conservan hasta que se verifican o hasta que un nuevo registro las sustituye. La limpieza de cuentas abandonadas queda para una funcionalidad posterior.
- **Retención de eventos de seguridad**: los eventos guardan la IP y el navegador de origen, que son datos personales. Esta funcionalidad no los borra automáticamente. Se propone conservarlos 12 meses y purgarlos después; la purga queda para una funcionalidad posterior y debe estar lista antes de abrir la plataforma al público.
- **Usuarios existentes**: los usuarios de ejemplo actuales de la plataforma no tienen contraseña. Se considera aceptable que deban registrarse de nuevo o que se descarten.
