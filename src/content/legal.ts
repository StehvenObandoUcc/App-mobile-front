/**
 * Textos legales (Legal.dc.html). Responsable: Stehven Alexander Obando Cordoba, Pasto (Nariño).
 * Ajustes frente al mockup: el proveedor de IA real es DeepSeek (no Gemini) y las fotos no se guardan
 * en el servidor (solo se envían para el análisis). Revisar antes de publicar.
 */
export type LegalSection = { title: string; body: string };

export const LEGAL_UPDATED_AT = '29 de septiembre de 2026';
export const LEGAL_CONTACT = 'mindforgeandes@gmail.com';

export const TERMS: LegalSection[] = [
  { title: '1. Aceptación', body: 'Al crear una cuenta o usar Food AI Assistant («la app») aceptas estos Términos y condiciones. Si no estás de acuerdo, no uses la app.' },
  { title: '2. Qué hace la app', body: 'Food AI te ayuda a organizar tu despensa, reconocer alimentos a partir de fotos, sugerir recetas con los ingredientes que tienes y armar tu lista de compras. Algunas funciones usan inteligencia artificial.' },
  { title: '3. Tu cuenta', body: `Debes dar información verdadera y mantener tu contraseña en secreto. Eres responsable de la actividad de tu cuenta. Avísanos en ${LEGAL_CONTACT} si crees que alguien más la está usando.` },
  { title: '4. Resultados de la IA', body: 'La identificación de alimentos, cantidades, fechas de vencimiento y recetas generadas son orientativas y pueden contener errores. Revísalas siempre antes de guardarlas o cocinar. La app no sustituye el consejo de un profesional de la salud o la nutrición; si tienes alergias o restricciones, verifica cada ingrediente.' },
  { title: '5. Fechas de vencimiento', body: 'Las fechas estimadas son aproximadas. Antes de consumir un alimento revisa su etiqueta, su olor y su aspecto. No somos responsables por el consumo de alimentos en mal estado.' },
  { title: '6. Uso permitido', body: 'No uses la app para fines ilegales, no subas imágenes de personas ni contenido ofensivo, y no intentes acceder sin permiso a sistemas o datos de otros usuarios.' },
  { title: '7. Fase de pruebas', body: 'Durante la fase de pruebas algunas funciones tienen límites (por ejemplo, 5 fotos de escaneo) y pueden cambiar o dejar de estar disponibles sin previo aviso.' },
  { title: '8. Propiedad intelectual', body: 'El diseño, la marca y el software de Food AI pertenecen a Stehven Alexander Obando Cordoba. Tus datos y las fotos que tomes siguen siendo tuyos.' },
  { title: '9. Limitación de responsabilidad', body: 'La app se ofrece «tal como está». En la medida que permita la ley, no respondemos por daños derivados de un uso indebido de la app o de decisiones tomadas solo con base en sus sugerencias.' },
  { title: '10. Cierre de cuenta', body: `Puedes cerrar sesión o solicitar la eliminación de tu cuenta en cualquier momento desde Configuración o escribiendo a ${LEGAL_CONTACT}. Podemos suspender cuentas que incumplan estos términos.` },
  { title: '11. Cambios', body: 'Podemos actualizar estos términos. Te avisaremos dentro de la app cuando haya cambios importantes.' },
  { title: '12. Ley aplicable y contacto', body: `Estos términos se rigen por las leyes de la República de Colombia. Contacto: ${LEGAL_CONTACT}.` },
];

export const PRIVACY: LegalSection[] = [
  { title: '1. Responsable', body: `Stehven Alexander Obando Cordoba, con domicilio en Pasto (Nariño), Colombia. Correo: ${LEGAL_CONTACT}. Tratamos tus datos de acuerdo con la Ley 1581 de 2012 y sus decretos reglamentarios.` },
  {
    title: '2. Datos que recolectamos',
    body:
      '• Cuenta: nombre, correo y contraseña (se guarda cifrada).\n' +
      '• Tu cocina: alimentos de tu despensa, recetas guardadas y lista de compras.\n' +
      '• Fotos que escaneas: se envían a nuestro servidor solo para identificar los alimentos y no se guardan después del análisis.\n' +
      '• Foto de perfil: opcional; se guarda únicamente en tu teléfono.',
  },
  { title: '3. Para qué los usamos', body: 'Para crear y proteger tu cuenta, sincronizar tu información entre dispositivos, reconocer alimentos en tus fotos, sugerirte recetas y mejorar la app. No vendemos tus datos.' },
  { title: '4. Con quién los compartimos', body: 'Con proveedores que nos ayudan a operar la app: el servicio de alojamiento de nuestro servidor y el proveedor de inteligencia artificial que analiza fotos y genera recetas (actualmente DeepSeek). Solo reciben lo necesario para prestar el servicio.' },
  { title: '5. Datos en tu dispositivo', body: 'Para que la app funcione sin conexión, guardamos una copia de tu información en tu teléfono. Tu sesión se guarda en el almacenamiento seguro y cifrado del sistema.' },
  { title: '6. Permisos', body: 'Cámara: para escanear alimentos. Fotos: para elegir una imagen de tu galería o tu foto de perfil. Notificaciones: para avisarte antes de que algo venza. Puedes cambiarlos cuando quieras en los ajustes de tu teléfono.' },
  { title: '7. Tus derechos', body: `Puedes conocer, actualizar, rectificar y pedir la eliminación de tus datos, y revocar tu autorización, escribiendo a ${LEGAL_CONTACT}. Respondemos en los plazos que fija la ley.` },
  { title: '8. Conservación y seguridad', body: 'Guardamos tus datos mientras tengas una cuenta activa. Usamos conexiones cifradas y medidas razonables para protegerlos.' },
  { title: '9. Menores de edad', body: 'La app no está dirigida a menores de 14 años sin la autorización de sus padres o representantes.' },
  { title: '10. Cambios', body: 'Si cambiamos esta política te lo avisaremos dentro de la app.' },
];
