# Próximo Metro

> Consulta rápida del próximo tren de Metro de Madrid.

**v1.0.0 — MVP sin conexión a datos reales y sin geolocalización**

Demo en producción: [https://proximo-tren.vercel.app](https://proximo-tren.vercel.app)

---

## ¿Qué hace?

Muestra los próximos trenes de una estación de Metro de Madrid seleccionada por el usuario. El usuario elige estación, línea y dirección; la app muestra el tiempo de espera del próximo tren y los siguientes.

## Estado de esta versión (v1.0.0)

| Funcionalidad | Estado |
|---|---|
| Catálogo completo de estaciones, líneas y direcciones | ✅ |
| Selección de estación, línea y dirección | ✅ |
| Tiempos de tren (datos sintéticos mediante MockAdapter) | ✅ |
| Caché in-memory con TTL de 30 segundos | ✅ |
| FallbackChain: live → caché → empty | ✅ |
| Diseño fiel al mockup (Satoshi, dark mode, cards) | ✅ |
| PWA / modo offline | ✅ |
| Seguridad: CSP, HSTS, headers de protección | ✅ |
| Audit logger GDPR (sin IP, sin User-Agent) | ✅ |
| **Conexión a datos reales de CRTM** | ❌ pendiente acuerdo con CRTM |
| **Geolocalización** | ❌ fuera de scope en esta versión |

## Stack técnico

- **Next.js 15** (App Router) · **React 19** · **TypeScript 5 strict**
- **Zod 4** — validación de schemas en runtime
- **Vitest 2** + **Testing Library** — 232 tests unitarios
- **Playwright** — tests E2E (Chromium + WebKit)
- **Vercel Pro** — región `fra1` (Frankfurt, EU)

## Arquitectura

```
Browser → Next.js BFF (/api/times) → FallbackChain → MockAdapter / CRTMAdapter
                                   ↓
                              CacheStore (in-memory, 30s TTL)
```

La arquitectura es hexagonal: `CRTMAdapter` y `MockAdapter` implementan la misma interfaz `TransportAdapter`. Para activar datos reales basta cambiar `TRANSPORT_ADAPTER=live` en las variables de entorno y proporcionar `CRTM_API_KEY`.

## Requisitos

- Node.js 18+
- npm 9+

## Instalación y desarrollo local

```bash
git clone https://github.com/Altamarit/ProximoTren.git
cd ProximoTren
npm ci
cp .env.example .env.local   # ajusta si es necesario
npm run dev
```

La app estará disponible en `http://localhost:3000`.

Por defecto usa el **MockAdapter** (datos sintéticos, sin necesidad de red ni credenciales).

## Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `TRANSPORT_ADAPTER` | `mock` | `mock` = datos sintéticos · `live` = API real de CRTM |
| `CRTM_API_BASE_URL` | `https://api.crtm.es/v1` | URL base de la API de CRTM |
| `CRTM_API_KEY` | — | Clave de API de CRTM (solo necesaria con `live`) |
| `CRTM_API_TIMEOUT_MS` | `5000` | Timeout de peticiones al CRTM en ms |
| `CACHE_TTL_SECONDS` | `30` | Ventana de caché in-memory en segundos |
| `RATE_LIMIT_MAX_RPM` | `60` | Máximo de peticiones por IP por minuto |

## Tests

```bash
npm test              # Vitest — todos los tests unitarios
npm run type-check    # TypeScript sin emit
npm run lint          # ESLint
```

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo en `localhost:3000` |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción local |
| `npm test` | Tests unitarios (Vitest) |
| `npm run type-check` | Comprobación de tipos TypeScript |
| `npm run lint` | Linter ESLint |

## Despliegue

El proyecto está configurado para Vercel (Frankfurt). Cada commit en `main` puede desplegarse con:

```bash
npx vercel deploy --prod
```

## Hoja de ruta

- **v1.1** — Integración con API real de CRTM (pendiente acuerdo)
- **v1.2** — Geolocalización: sugerencia automática de estación más cercana
- **v2.0** — Redis EU para caché compartida entre instancias · Logtail EU log drain

## Privacidad y seguridad

- Cumplimiento GDPR Art. 25 (Privacy by Design): las IPs se anonimizan antes de cualquier log
- No se registra User-Agent ni ningún identificador de dispositivo
- Todos los datos procesados en la UE (región `fra1`)
- Audit trail estructurado (JSON Lines) con retención de 12 meses

## Licencia

Proyecto privado — todos los derechos reservados.
