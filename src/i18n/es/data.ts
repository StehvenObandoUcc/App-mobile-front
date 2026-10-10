/** Textos en español · zona «data». El inglés está en ../en/data.ts con la misma forma. */
export const data = {
  auth: {
    noSession: 'No hay una sesión activa.',
    deleteAccountError: 'No pudimos eliminar tu cuenta. Intenta de nuevo.',
    saveError: 'No se pudo almacenar la sesión de forma segura en el dispositivo.',
    secureReadError: 'Error al acceder al almacenamiento seguro de credenciales.',
    hydrationError: 'Error inesperado al acceder al almacenamiento seguro.',
    invalidCredentials: 'Credenciales incorrectas',
    registerError: 'Error al registrar usuario',
    loginError: 'Error al iniciar sesión',
    createAccountError: 'Error al crear cuenta',
  },
  network: {
    connectionError: 'No se pudo conectar con el servidor. Revisa tu conexión a internet o verifica que el backend esté iniciado.',
    requestError: 'Error en la solicitud al servidor',
  },
  notifications: {
    channelName: 'Avisos de vencimiento',
    channelDescription: 'Te avisa antes de que un alimento de tu despensa venza.',
    testTitle: 'Prueba · Espinaca vence en 2 días',
    testBody: 'Así se verán tus avisos de vencimiento. Tócalo para abrir la Despensa.',
  },
  recipes: {
    loadError: 'Error al cargar las recetas',
    favoriteError: 'Error al actualizar favorita',
    prepareError: 'Error al procesar la preparación',
    discardError: 'Error al descartar la receta',
    deleteSelectedError: 'Error al eliminar recetas seleccionadas',
    generateAiError: 'Error generando recetas con IA',
  },
  scan: {
    noImage: 'No se ha proporcionado una imagen válida para analizar',
    notFood: 'Esto no parece comida. Intenta con una foto de tu nevera o despensa.',
    noClearFood: 'No detectamos alimentos claros en esta foto. Prueba con mejor luz o más de cerca.',
    noFood: 'No se detectaron alimentos en la imagen.',
    analyzeError: 'No se pudo analizar la fotografía.',
  },
  inventory: {
    loadError: 'Error al cargar el inventario',
    addError: 'Error al agregar el alimento',
    updateError: 'Error al actualizar el alimento',
    deleteError: 'Error al eliminar el alimento',
    deleteManyError: 'Error al eliminar los alimentos',
  },
};
