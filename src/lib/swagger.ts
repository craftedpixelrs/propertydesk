import { createSwaggerSpec } from "next-swagger-doc";

/**
 * OpenAPI 3.1 spec for the PropertyDesk REST API.
 *
 * Route documentation lives inline next to every handler in
 * `src/app/api/**\/route.ts` as JSDoc `@swagger` blocks. This keeps
 * documentation versioned together with the code and lets us diff spec
 * changes in the same PR review that ships the behaviour.
 *
 * The resulting spec is served at `/api/docs` and rendered by Swagger UI
 * at `/api-docs`.
 */
export const getApiDocs = () =>
  createSwaggerSpec({
    apiFolder: "src/app/api",
    definition: {
      openapi: "3.1.0",
      info: {
        title: "PropertyDesk REST API",
        version: process.env.npm_package_version ?? "0.1.0",
        description: [
          "REST API PropertyDesk SaaS platforme za prodaju novogradnje.",
          "",
          "Svi endpointi vraćaju standardni envelope:",
          "```json",
          "{ \"data\": ..., \"meta\": { \"requestId\": \"...\", \"pagination?\": {...} } }",
          "```",
          "",
          "Sve greške idu kroz:",
          "```json",
          "{ \"error\": { \"code\": \"...\", \"message\": \"...\", \"requestId\": \"...\", \"fieldErrors?\": { \"field\": [\"poruka\"] } } }",
          "```",
        ].join("\n"),
        contact: {
          name: "PropertyDesk Engineering",
          url: "https://propertydesk.app",
          email: "dev@propertydesk.app",
        },
        license: { name: "Proprietary" },
      },
      servers: [
        {
          url: "http://localhost:3000",
          description: "Local development",
        },
        {
          url: "https://my.propertydesk.app",
          description: "Production",
        },
        {
          url: "https://staging.propertydesk.app",
          description: "Staging",
        },
      ],
      tags: [
        { name: "auth", description: "Autentifikacija (Better Auth)" },
        { name: "health", description: "Health / readiness" },
        { name: "projects", description: "Projekti" },
        { name: "buildings", description: "Objekti" },
        { name: "entrances", description: "Ulazi" },
        { name: "floors", description: "Spratovi" },
        { name: "units", description: "Jedinice" },
        { name: "buyers", description: "Kupci" },
        { name: "comments", description: "Komentari i @mentions" },
        { name: "tasks", description: "Zadaci" },
        { name: "activities", description: "Aktivnosti" },
        { name: "reservations", description: "Interne rezervacije" },
        { name: "reservation-requests", description: "Online rezervacije (Faza 8)" },
        { name: "sales", description: "Prodaje" },
        { name: "payment-plan-templates", description: "Šabloni planova otplate" },
        { name: "payments", description: "Uplate" },
        { name: "documents", description: "Dokumenti" },
        { name: "agencies", description: "Agencije (investitor view)" },
        { name: "agency", description: "Agencijski portal" },
        { name: "agency-registrations", description: "Registracije agencija" },
        { name: "commission-rules", description: "Pravila provizije" },
        { name: "commissions", description: "Provizije" },
        { name: "organization", description: "Organizacija" },
        { name: "organizations", description: "Više organizacija" },
        { name: "onboarding", description: "Onboarding wizard" },
        { name: "notifications", description: "Notifikacije" },
        { name: "search", description: "Globalna pretraga" },
        { name: "reports", description: "Izveštaji i exporti" },
        { name: "share-links", description: "Public share linkovi" },
        { name: "pdf", description: "PDF generisanje" },
        { name: "billing", description: "Naplata, fakture, SEF, izvodi" },
        { name: "platform", description: "Platform admin" },
        { name: "public", description: "Javne rute (bez auth)" },
        { name: "cron", description: "Ručno okidanje scheduled jobova" },
        { name: "sale-contract-templates", description: "Šabloni ugovora (Faza 8)" },
      ],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: "__Secure-better-auth.session_token",
            description:
              "Better Auth session cookie. Dobija se kroz `/api/auth/sign-in/*` ili login formu. Svi `/api/v1/*` endpointi (izuzev `public/*` i `health`) zahtevaju ovaj cookie.",
          },
        },
        schemas: {
          Error: {
            type: "object",
            required: ["error"],
            properties: {
              error: {
                type: "object",
                required: ["code", "message", "requestId"],
                properties: {
                  code: {
                    type: "string",
                    enum: [
                      "UNAUTHENTICATED",
                      "FORBIDDEN",
                      "NO_ACTIVE_ORGANIZATION",
                      "ORGANIZATION_ACCESS_DENIED",
                      "ORGANIZATION_SUSPENDED",
                      "ORGANIZATION_RESTRICTED",
                      "PLATFORM_ADMIN_REQUIRED",
                      "VALIDATION_ERROR",
                      "NOT_FOUND",
                      "CONFLICT",
                      "RATE_LIMITED",
                      "METHOD_NOT_ALLOWED",
                      "INTERNAL_ERROR",
                      "BAD_REQUEST",
                      "NOT_IMPLEMENTED",
                    ],
                    description:
                      "Stabilan mašinski kod. Mobilni klijenti treba da ga koriste za logiku, ne `message`.",
                  },
                  message: {
                    type: "string",
                    description:
                      "Ljudska poruka na srpskom, prikladna za prikaz krajnjem korisniku.",
                  },
                  requestId: {
                    type: "string",
                    format: "uuid",
                    description:
                      "Korelacioni ID za logove (istovetan `x-request-id` header-u).",
                  },
                  fieldErrors: {
                    type: "object",
                    additionalProperties: {
                      type: "array",
                      items: { type: "string" },
                    },
                    description:
                      "Po polju — mapirane Zod greške. Samo za 422 VALIDATION_ERROR.",
                  },
                },
              },
            },
          },
          PaginationMeta: {
            type: "object",
            required: ["page", "pageSize", "total", "totalPages"],
            properties: {
              page: { type: "integer", minimum: 1, example: 1 },
              pageSize: { type: "integer", minimum: 1, maximum: 100, example: 20 },
              total: { type: "integer", minimum: 0, example: 132 },
              totalPages: { type: "integer", minimum: 0, example: 7 },
            },
          },
          ListQuery: {
            type: "object",
            properties: {
              page: {
                type: "integer",
                minimum: 1,
                default: 1,
                description: "1-based broj stranice.",
              },
              pageSize: {
                type: "integer",
                minimum: 1,
                maximum: 100,
                default: 20,
              },
              q: {
                type: "string",
                maxLength: 200,
                description: "Slobodan tekst.",
              },
              sort: {
                type: "string",
                maxLength: 100,
                description:
                  "Ime kolone; prefiks `-` obrće smer. Primeri: `createdAt`, `-basePrice`.",
              },
            },
          },
          RequestIdHeader: {
            type: "string",
            format: "uuid",
            description:
              "Client-supplied `x-request-id`. Ako nedostaje, server generiše UUID.",
          },
        },
        parameters: {
          pageParam: {
            in: "query",
            name: "page",
            schema: { type: "integer", minimum: 1, default: 1 },
            description: "1-based broj stranice.",
          },
          pageSizeParam: {
            in: "query",
            name: "pageSize",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
          qParam: {
            in: "query",
            name: "q",
            schema: { type: "string", maxLength: 200 },
            description: "Slobodan tekst pretrage.",
          },
          sortParam: {
            in: "query",
            name: "sort",
            schema: { type: "string", maxLength: 100 },
            description: "Ime kolone; `-field` za opadajući red.",
          },
          idPathParam: {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string", minLength: 1 },
            description: "Primarni ključ resursa.",
          },
        },
        responses: {
          Unauthenticated: {
            description: "401 — sesija ne postoji ili je istekla.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
                example: {
                  error: {
                    code: "UNAUTHENTICATED",
                    message: "Morate biti prijavljeni.",
                    requestId: "f1d2a5f2-0e4a-4b13-8a51-96ecffec5d51",
                  },
                },
              },
            },
          },
          Forbidden: {
            description: "403 — nemaš dozvolu za ovu akciju.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
                example: {
                  error: {
                    code: "FORBIDDEN",
                    message: "Nemate dozvolu za ovu akciju.",
                    requestId: "f1d2a5f2-0e4a-4b13-8a51-96ecffec5d51",
                  },
                },
              },
            },
          },
          NotFound: {
            description: "404 — resurs ne postoji u ovoj organizaciji.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          Conflict: {
            description:
              "409 — konflikt sa postojećim stanjem (duplikat, optimistic lock, kvota, poslovna pravila).",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          ValidationFailed: {
            description: "422 — ulazni podaci nisu validni.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
                example: {
                  error: {
                    code: "VALIDATION_ERROR",
                    message: "Podaci nisu ispravni.",
                    fieldErrors: {
                      basePrice: ["Mora biti pozitivan broj."],
                    },
                    requestId: "f1d2a5f2-0e4a-4b13-8a51-96ecffec5d51",
                  },
                },
              },
            },
          },
          RateLimited: {
            description:
              "429 — previše zahteva. Pogledaj `Retry-After` header (u sekundama).",
            headers: {
              "Retry-After": {
                schema: { type: "integer" },
                description: "Koliko sekundi do sledećeg pokušaja.",
              },
            },
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      security: [{ cookieAuth: [] }],
    },
  });
