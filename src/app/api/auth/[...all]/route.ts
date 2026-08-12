import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth/auth";

export const { GET, POST } = toNextJsHandler(auth);

/**
 * @swagger
 * /api/auth/{path}:
 *   get:
 *     tags: [auth]
 *     summary: Better Auth — catch-all
 *     description: |
 *       Sve autentifikacione rute idu kroz Better Auth (`better-auth/next-js`).
 *       Ovaj catch-all obrađuje **sve** auth endpointe.
 *
 *       Značajne podrute (sve počinju sa `/api/auth/`):
 *       - `POST /api/auth/sign-in/email` — email + lozinka. Telo: `{ email, password }`.
 *       - `POST /api/auth/sign-up/email` — registracija. Telo: `{ email, password, name }`.
 *       - `POST /api/auth/sign-out` — odjava.
 *       - `POST /api/auth/forget-password` — zahtev za reset link.
 *       - `POST /api/auth/reset-password` — postavljanje nove lozinke sa tokenom.
 *       - `POST /api/auth/verify-email` — potvrda email adrese tokenom.
 *       - `GET  /api/auth/session` — vraća trenutnu sesiju + korisnika.
 *       - `POST /api/auth/organization/create` — kreira novu organizaciju (tenant).
 *       - `POST /api/auth/organization/set-active` — menja aktivnu organizaciju.
 *       - `POST /api/auth/organization/invite-member` — pozivnica članu.
 *       - `POST /api/auth/organization/accept-invitation` — prihvatanje poziva.
 *       - `POST /api/auth/admin/impersonate-user` — super-admin impersonacija.
 *       - `POST /api/auth/admin/stop-impersonating` — prekid impersonacije.
 *     security: []
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema: { type: string }
 *         description: Bilo koja podruta, npr. `sign-in/email`, `session`, `organization/create`.
 *     responses:
 *       "200":
 *         description: Zavisi od konkretne rute — vidi Better Auth docs za tačan shape.
 *       "302":
 *         description: Neki endpointi (verify-email, reset-password potvrda) rade redirect.
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *   post:
 *     tags: [auth]
 *     summary: Better Auth — catch-all (POST)
 *     description: Isto kao GET — Better Auth koristi POST za mutacije.
 *     security: []
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       "200":
 *         description: Zavisi od konkretne rute.
 *       "302":
 *         description: Redirect za neke flow-ove.
 *       "400":
 *         description: Neispravan unos (Better Auth default error).
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 * /api/auth/sign-in/email:
 *   post:
 *     tags: [auth]
 *     summary: Prijava email + lozinka
 *     description: |
 *       Vraća session cookie (`__Secure-propertydesk.session_token` u
 *       produkciji; `propertydesk.session_token` lokalno — HttpOnly,
 *       SameSite=Lax) i user objekat. `requireEmailVerification: true`
 *       znači da se ne može ući dok email nije potvrđen.
 *
 *       **Swagger Try it out:** Authorize ne može da setuje HttpOnly cookie.
 *       Pozovi ovaj endpoint iz Swaggera na istom originu — browser će sam
 *       sačuvati Set-Cookie i koristiti ga za sledeće pozive.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 10, maxLength: 128 }
 *           example:
 *             email: admin@propertydesk.test
 *             password: "PropertyDesk!2026"
 *     responses:
 *       "200":
 *         description: Uspešna prijava. Session cookie je set-ovan.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     email: { type: string }
 *                     name: { type: string }
 *                     emailVerified: { type: boolean }
 *                 session:
 *                   type: object
 *                   properties:
 *                     token: { type: string }
 *                     expiresAt: { type: string, format: date-time }
 *       "400":
 *         description: Pogrešan email ili lozinka (namerno generično).
 *       "401":
 *         description: Nalog nije pronađen ili lozinka ne odgovara (Better Auth).
 *       "422":
 *         description: Ulaz nije validan (npr. prekratka lozinka, loš email format).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *             example:
 *               error:
 *                 code: VALIDATION_ERROR
 *                 message: Podaci nisu ispravni.
 *                 fieldErrors:
 *                   email: ["Neispravan format e-mail adrese."]
 *                   password: ["Mora imati najmanje 10 karaktera."]
 *                 requestId: f1d2a5f2-0e4a-4b13-8a51-96ecffec5d51
 * /api/auth/sign-up/email:
 *   post:
 *     tags: [auth]
 *     summary: Registracija email + lozinka
 *     description: |
 *       Šalje verification email (24h expiry). Ne može se prijaviti dok
 *       email nije potvrđen.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 10, maxLength: 128 }
 *               name: { type: string, minLength: 1 }
 *     responses:
 *       "200":
 *         description: Nalog kreiran, verification email poslat.
 *       "422":
 *         description: Ulaz nije validan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *             example:
 *               error:
 *                 code: VALIDATION_ERROR
 *                 message: Podaci nisu ispravni.
 *                 fieldErrors:
 *                   email: ["Neispravan format e-mail adrese."]
 *                   password: ["Mora imati najmanje 10 karaktera."]
 *                 requestId: f1d2a5f2-0e4a-4b13-8a51-96ecffec5d51
 * /api/auth/sign-out:
 *   post:
 *     tags: [auth]
 *     summary: Odjava
 *     description: Briše session cookie i invalidira sesiju u bazi.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       "200":
 *         description: Uspešna odjava.
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 * /api/auth/session:
 *   get:
 *     tags: [auth]
 *     summary: Trenutna sesija
 *     description: |
 *       Vraća user + session objekat, uključujući `impersonatedBy` ako
 *       super-admin trenutno impersonira korisnika. Za kompletniji payload
 *       (aktivna organizacija, platform role) koristi `/api/v1/me`.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       "200":
 *         description: Sesija postoji.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     email: { type: string }
 *                     name: { type: string }
 *                     emailVerified: { type: boolean }
 *                 session:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     expiresAt: { type: string, format: date-time }
 *                     impersonatedBy: { type: string, nullable: true }
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 */
