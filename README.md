<div align="center">

<img src="assets/logo-mark.png" alt="Logo de Food AI" width="120" />

# Food AI — App móvil

**Escanea tu despensa, controla los vencimientos y cocina con ayuda de IA.**

![Expo](https://img.shields.io/badge/Expo-58-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.88-61DAFB?logo=react&logoColor=black)
![React](https://img.shields.io/badge/React-19.3-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![Expo Router](https://img.shields.io/badge/Expo_Router-58-000020?logo=expo&logoColor=white)
![Android](https://img.shields.io/badge/Android-APK-3DDC84?logo=android&logoColor=white)

[**Descargar APK para Android**](https://github.com/StehvenObandoUcc/App-mobile-front/releases/download/v1.0.0-apk/FoodAI-1.0.0.apk) · [Ver release](https://github.com/StehvenObandoUcc/App-mobile-front/releases/tag/v1.0.0-apk)

</div>

---

## Tabla de contenido

- [Acerca del proyecto](#acerca-del-proyecto)
- [Características principales](#características-principales)
- [Capturas de pantalla](#capturas-de-pantalla)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura y cómo funciona](#arquitectura-y-cómo-funciona)
- [Relación con el backend](#relación-con-el-backend)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Estructura de carpetas](#estructura-de-carpetas)
- [Cómo contribuir](#cómo-contribuir)
- [Licencia](#licencia)

## Acerca del proyecto

**Food AI** es una aplicación móvil que ayuda a las personas a llevar el control de lo que tienen en casa. Fotografías tu nevera o despensa, la IA reconoce los alimentos, y la app te avisa de los próximos vencimientos y te sugiere recetas con lo que ya tienes, reduciendo el desperdicio de comida y el tiempo de planificar qué cocinar.

Está dirigida a usuarios finales que quieren organizar su despensa, su lista de compras y sus recetas desde el teléfono. Funciona con el backend [backend-mobile](https://github.com/StehvenObandoUcc/backend-mobile).

## Características principales

**Despensa y escaneo**
- **Escaneo con cámara o galería**: detecta ingredientes (nombre, categoría, cantidad, unidad y confianza) y permite confirmarlos o corregirlos antes de guardarlos. Los de baja confianza llegan sin marcar.
- **Inventario de despensa**: alta, edición y borrado, con estado de salud de la despensa.
- **Fechas de vencimiento con origen**: se distingue si la fecha viene de la etiqueta, la escribiste tú o es una estimación («aprox.», «estimado»).
- **Avisos de vencimiento**: notificaciones locales programadas y la sección «Aprovecha primero» en Inicio.

**Recetas**
- **Recetas con IA («Chef IA»)**: generación según ingredientes, dificultad, enfoque, tiempo, porciones, preferencias dietarias e ingredientes a evitar; detalle con pasos y guardado de favoritas.
- **Estado frente a tu despensa, en palabras**: «Tienes todo», «Tienes lo esencial» (solo faltan opcionales) o «Te falta N». Se calcula en el teléfono con lo que hay hoy en tu despensa.
- **Lista de compras**: gestión de ítems, «Añadir faltantes a compras» desde una receta y paso de comprados al inventario.

**Cuenta y sincronización**
- **Modo offline con sincronización**: persistencia local y cola de mutaciones (outbox) con reintentos e idempotencia.
- **Cuenta de usuario**: registro con verificación de correo, inicio de sesión, perfil y foto; sesión guardada de forma segura en el dispositivo y **renovada automáticamente** sin pedir la contraseña de nuevo (`POST /auth/refresh`).

**Interfaz**
- **Español e inglés** y **tema claro u oscuro** (o como el teléfono), elegibles en Ajustes.
- **Sistema de diseño propio**: tokens de tema, tipografía Outfit y catálogo de componentes (`design-catalog`).
- **Textos legales** dentro de la app.

## Capturas de pantalla

Capturas reales de la app en **Expo Go (Android, Realme C55)**, en español e inglés y en tema claro y oscuro (540 px de ancho). Se tomaron con una cuenta de prueba y ingredientes inventados (tomate, cebolla, pollo, huevos, queso, arroz y leche); las recetas las generó el Chef IA.

> **Notas**
> - **Escáner:** la imagen es la vista en vivo de la cámara. El **resultado del escaneo** se simuló con ingredientes inventados, sin llamar a la IA de visión.
> - **Perfil y Ajustes** no se incluyen porque muestran el correo de la cuenta.
> - En la serie en inglés, las recetas generadas siguen en español porque se crearon antes de cambiar el idioma.

<details open>
<summary><b>Español</b> — tema claro y oscuro</summary>

| Pantalla | Claro | Oscuro |
|---|---|---|
| Inicio | <img src="docs/screenshots/es/claro/01-inicio.jpg" width="150"> | <img src="docs/screenshots/es/oscuro/01-inicio.jpg" width="150"> |
| Despensa | <img src="docs/screenshots/es/claro/02-despensa.jpg" width="150"> | <img src="docs/screenshots/es/oscuro/02-despensa.jpg" width="150"> |
| Agregar alimento | <img src="docs/screenshots/es/claro/03-agregar-alimento.jpg" width="150"> | <img src="docs/screenshots/es/oscuro/03-agregar-alimento.jpg" width="150"> |
| Recetas | <img src="docs/screenshots/es/claro/04-recetas.jpg" width="150"> | <img src="docs/screenshots/es/oscuro/04-recetas.jpg" width="150"> |
| Detalle de receta | <img src="docs/screenshots/es/claro/05-detalle-receta.jpg" width="150"> | <img src="docs/screenshots/es/oscuro/05-detalle-receta.jpg" width="150"> |
| Ingredientes de la receta | <img src="docs/screenshots/es/claro/06-detalle-ingredientes.jpg" width="150"> | <img src="docs/screenshots/es/oscuro/06-detalle-ingredientes.jpg" width="150"> |
| Lista de compras | <img src="docs/screenshots/es/claro/08-compras.jpg" width="150"> | <img src="docs/screenshots/es/oscuro/08-compras.jpg" width="150"> |
| Agregar a compras | <img src="docs/screenshots/es/claro/09-agregar-a-compras.jpg" width="150"> | <img src="docs/screenshots/es/oscuro/09-agregar-a-compras.jpg" width="150"> |
| Escáner | <img src="docs/screenshots/es/claro/10-escaner.jpg" width="150"> | <img src="docs/screenshots/es/oscuro/10-escaner.jpg" width="150"> |
| Resultado del escaneo | <img src="docs/screenshots/es/claro/11-resultado-escaneo.jpg" width="150"> | <img src="docs/screenshots/es/oscuro/11-resultado-escaneo.jpg" width="150"> |
| Legal | <img src="docs/screenshots/es/claro/14-legal.jpg" width="150"> | <img src="docs/screenshots/es/oscuro/14-legal.jpg" width="150"> |

</details>

<details>
<summary><b>English</b> — light and dark theme</summary>

| Screen | Light | Dark |
|---|---|---|
| Home | <img src="docs/screenshots/en/claro/01-inicio.jpg" width="150"> | <img src="docs/screenshots/en/oscuro/01-inicio.jpg" width="150"> |
| Pantry | <img src="docs/screenshots/en/claro/02-despensa.jpg" width="150"> | <img src="docs/screenshots/en/oscuro/02-despensa.jpg" width="150"> |
| Add food | <img src="docs/screenshots/en/claro/03-agregar-alimento.jpg" width="150"> | <img src="docs/screenshots/en/oscuro/03-agregar-alimento.jpg" width="150"> |
| Recipes | <img src="docs/screenshots/en/claro/04-recetas.jpg" width="150"> | <img src="docs/screenshots/en/oscuro/04-recetas.jpg" width="150"> |
| Recipe detail | <img src="docs/screenshots/en/claro/05-detalle-receta.jpg" width="150"> | <img src="docs/screenshots/en/oscuro/05-detalle-receta.jpg" width="150"> |
| Recipe ingredients | <img src="docs/screenshots/en/claro/06-detalle-ingredientes.jpg" width="150"> | <img src="docs/screenshots/en/oscuro/06-detalle-ingredientes.jpg" width="150"> |
| Shopping list | <img src="docs/screenshots/en/claro/08-compras.jpg" width="150"> | <img src="docs/screenshots/en/oscuro/08-compras.jpg" width="150"> |
| Add to shopping list | <img src="docs/screenshots/en/claro/09-agregar-a-compras.jpg" width="150"> | <img src="docs/screenshots/en/oscuro/09-agregar-a-compras.jpg" width="150"> |
| Scanner | <img src="docs/screenshots/en/claro/10-escaner.jpg" width="150"> | <img src="docs/screenshots/en/oscuro/10-escaner.jpg" width="150"> |
| Scan result | <img src="docs/screenshots/en/claro/11-resultado-escaneo.jpg" width="150"> | <img src="docs/screenshots/en/oscuro/11-resultado-escaneo.jpg" width="150"> |
| Legal | <img src="docs/screenshots/en/claro/14-legal.jpg" width="150"> | <img src="docs/screenshots/en/oscuro/14-legal.jpg" width="150"> |

</details>

<details>
<summary><b>Acceso y Chef IA</b> — español, tema oscuro</summary>

| Bienvenida 1 | Bienvenida 2 | Bienvenida 3 | Iniciar sesión | Crear cuenta | Verificar correo | Chef IA | Recetas listas |
|---|---|---|---|---|---|---|---|
| <img src="docs/screenshots/es/oscuro/acceso/00-bienvenida-1.jpg" width="150"> | <img src="docs/screenshots/es/oscuro/acceso/00-bienvenida-2.jpg" width="150"> | <img src="docs/screenshots/es/oscuro/acceso/00-bienvenida-3.jpg" width="150"> | <img src="docs/screenshots/es/oscuro/acceso/00-iniciar-sesion.jpg" width="150"> | <img src="docs/screenshots/es/oscuro/acceso/00-registro-lleno.jpg" width="150"> | <img src="docs/screenshots/es/oscuro/acceso/00-verifica-correo.jpg" width="150"> | <img src="docs/screenshots/es/oscuro/acceso/04-chef-ia.jpg" width="150"> | <img src="docs/screenshots/es/oscuro/acceso/07-recetas-listas.jpg" width="150"> |

</details>

## Stack tecnológico

| Componente | Tecnología | Versión |
|---|---|---|
| Framework | Expo | ~58.0.19 |
| Runtime | React Native | 0.88.0 |
| UI | React | 19.3.0 |
| Lenguaje | TypeScript | ~6.0.3 |
| Navegación | Expo Router | ~58.0.26 |
| Cámara / imágenes | expo-camera, expo-image-picker, expo-image-manipulator | ~58.0.x |
| Notificaciones | expo-notifications | ~58.1.6 |
| Almacenamiento local | @react-native-async-storage/async-storage | ^2.2.0 |
| Almacenamiento seguro | expo-secure-store | ~58.0.2 |
| Compilación | EAS Build (perfiles `development`, `preview`, `production`) | CLI ≥ 12.0.0 |
| Pruebas | Node test runner (`node --test`) | — |

## Arquitectura y cómo funciona

```mermaid
flowchart TD
    UI[Pantallas app/ - Expo Router] --> Hooks[Hooks: useAuth, useInventory, useRecipes, useScan, useShoppingList]
    Hooks --> Services[Servicios: api-client, auth-service, outbox-dispatcher]
    Hooks --> Storage[(AsyncStorage + SecureStore)]
    Services -->|REST + JWT| API[Backend FastAPI]
    Services --> Outbox[Cola outbox offline]
    Outbox --> API
    Services --> Notif[expiry-notifications]
```

- **`app/`**: pantallas y rutas (file-based routing). El layout raíz redirige a `/login` si no hay sesión.
- **`src/hooks/`**: estado y lógica de cada dominio.
- **`src/services/`**: comunicación con la API, autenticación, notificaciones y sincronización.
- **`src/storage/`**: persistencia local con claves versionadas.
- **`src/components/` y `src/theme/`**: sistema de diseño.

**Flujo de punta a punta: escanear y guardar ingredientes**

1. En `app/scan.tsx` el usuario toma o elige una foto.
2. `useScan` → `scan-service` → `scanImageWithApi` envía la imagen en base64 a `POST /api/v1/scan` con el token Bearer.
3. El backend analiza la imagen con IA y devuelve los ingredientes detectados.
4. `app/scan-result.tsx` muestra los resultados para confirmarlos o editarlos.
5. Al guardar, el inventario se actualiza localmente de inmediato y la mutación se envía a `POST /api/v1/inventory`; si no hay red, queda en la cola outbox y se reintenta después. El backend la persiste en su base de datos.

## Relación con el backend

Esta app consume **[backend-mobile](https://github.com/StehvenObandoUcc/backend-mobile)** (FastAPI).

- **Protocolo:** REST sobre HTTP(S), prefijo `/api/v1`; datos en JSON.
- **Autenticación:** `Authorization: Bearer <token>` (JWT obtenido en login/registro); el token se registra en el cliente mediante `registerAuthTokenProvider`.
- **Cliente:** `src/services/api-client.ts`.
- **Resolución de la URL base** (en orden de prioridad): variable pública `EXPO_PUBLIC_API_URL`; IP del host de desarrollo detectada por Expo; `10.0.2.2:8000` en emulador Android; `localhost:8000` en iOS Simulator/Web.

| Funcionalidad | Endpoints usados |
|---|---|
| Autenticación | `/auth/register`, `/auth/login`, `/auth/me`, `/auth/refresh` (renueva la sesión), verificación de correo y restablecer contraseña |
| Escaneo | `POST /scan` |
| Inventario | `/inventory` (GET, POST, PUT, DELETE) |
| Lista de compras | `/shopping` (GET, POST, PUT, DELETE) |
| Recetas | `/recipes`, `/recipes/steps`, `/recipes/saved`, `/recipes/save` |

## Instalación y ejecución

### Requisitos

- Node.js y npm (versión mínima: **Por confirmar**).
- Un archivo de entorno propio si necesitas apuntar a un backend concreto (no se incluye ni documenta en este repositorio).
- Backend en ejecución: consulta [backend-mobile](https://github.com/StehvenObandoUcc/backend-mobile).
- Para dispositivos físicos: Expo Go o un *development build*; para emulador: Android Studio.

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/StehvenObandoUcc/App-mobile-front.git
cd App-mobile-front

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo
npm start

# 4. (Opcional) Abrir directamente en Android
npm run android
```

### Pruebas

```bash
npm test
```

### Generar un APK

Si solo quieres probar la app, descarga la [APK ya compilada](https://github.com/StehvenObandoUcc/App-mobile-front/releases/download/v1.0.0-apk/FoodAI-1.0.0.apk) (52 MB, Android; hay que permitir la instalación de orígenes desconocidos). Usa el backend de producción.

Para compilarla tú, con [EAS CLI](https://docs.expo.dev/eas/) y sesión iniciada:

```bash
eas build --platform android --profile preview
```

Los perfiles `preview` y `production` generan un APK (`eas.json`).

## Estructura de carpetas

```
.
├── app/                   # Pantallas (Expo Router)
│   ├── _layout.tsx        # Layout raíz, splash, fuentes y guardia de sesión
│   ├── login.tsx          # Bienvenida / acceso
│   ├── index.tsx          # Inicio
│   ├── scan.tsx           # Captura de foto
│   ├── scan-result.tsx    # Resultados del escaneo
│   ├── inventory.tsx      # Despensa
│   ├── recipes.tsx        # Recetas
│   ├── recipe-detail.tsx  # Detalle de receta
│   ├── shopping-list.tsx  # Lista de compras
│   ├── profile.tsx        # Perfil
│   ├── settings.tsx       # Ajustes
│   ├── legal.tsx          # Textos legales
│   └── design-catalog.tsx # Catálogo del sistema de diseño
├── assets/                # Íconos, splash, logo, fuentes y fotos de la bienvenida
├── docs/
│   └── screenshots/       # Capturas del README (es/en × claro/oscuro)
├── src/
│   ├── components/        # Componentes reutilizables de UI
│   ├── content/           # Contenido estático (textos legales)
│   ├── hooks/             # Hooks de dominio
│   ├── services/          # API, autenticación, notificaciones y outbox
│   ├── storage/           # Persistencia local
│   ├── theme/             # Colores, tipografía, espaciado, radios y elevaciones
│   ├── types/             # Tipos de TypeScript
│   └── utils/             # Utilidades (fechas, unidades, vencimientos, validaciones)
├── tests/                 # Pruebas (consumo, disponibilidad de recetas, fechas, sesión, sincronización offline)
├── app.json               # Configuración de Expo
├── eas.json               # Perfiles de EAS Build
└── package.json
```

## Cómo contribuir

1. Haz un fork y crea una rama descriptiva: `git checkout -b feat/mi-cambio`.
2. Mantén el estilo existente (TypeScript, componentes y tokens del tema) y ejecuta `npm test`.
3. Usa mensajes de commit claros (por ejemplo, [Conventional Commits](https://www.conventionalcommits.org/es/)).
4. Abre un Pull Request describiendo qué cambia y por qué; si afecta la interfaz, adjunta capturas.
5. Nunca incluyas claves, tokens ni archivos `.env` en tus commits.

## Licencia

Por confirmar. El repositorio no incluye un archivo de licencia. La fuente Outfit incluida en `assets/fonts` se distribuye bajo SIL Open Font License (`OFL.txt`).
