# agencies

Partner agency management on the investor side, plus the agency portal.

Agencies are **free partner accounts** (`saas_plan.code = partner`).
They are not sold Starter / Growth / Scale. There is no trial, no SaaS
invoice, and no expiry lock. Access to inventory comes from an
**investor invite**. The investor plan still limits
`maxAgencyConnections`. There is no public self-registration.

## Investor: invite by email

Route: `/agencije` — [`invite-agency-form.tsx`](./invite-agency-form.tsx).

The investor enters an **email** (name optional). They do not need to
know whether the agency already has an account.

| Email | What happens |
|-------|----------------|
| New | Platform creates a partner `AGENCY` org and sends `agencyPartnerInvitationEmail`. The owner registers (name + password) **and** fills the agency profile. Completing first setup activates pending connections. |
| Existing agency | `agencyConnectionInvitationEmail` → `/agencija/konekcije` → **Prihvati poziv** only. Later invites stay `INVITED` until Accept. |

Service: `inviteAgency` in
[`src/server/services/agencies/agencies.service.ts`](../../server/services/agencies/agencies.service.ts).
Lookup is by profile email or `AGENCY_OWNER` / `AGENCY_ADMIN`
membership. `agencyOrganizationId` still works on the API.

Profile gate: `isAgencyProfileComplete` / `isAgencyOrgSetupComplete`.
Every field is required except website (displayName, legalName,
taxNumber, registrationNumber, address, city, postalCode, phone,
email). Registration and sign-in collect those fields; layout and
`requirePermission` lock the portal until the profile is complete.

Helpers: [`src/lib/agencies/name.ts`](../../lib/agencies/name.ts)
(`slugifyAgencyName`, `agencyNameFromEmail`).

Partner plan defaults:
[`src/lib/billing/agency-partner.ts`](../../lib/billing/agency-partner.ts).

## Agency portal

After accept + (first-time) profile: `/ponuda`, `/moji-kupci`,
`/moje-rezervacije`, `/moje-provizije`, `/agencija/konekcije`.

The agency sees only projects granted via `AgencyProjectAccess`.
Settings → Pretplata / Fakture are hidden. Platform Naplata shows a
partner note only.

## Admin

Platform admin may create an agency (always `partner`, `ACTIVE`, no
trial) or set `SUSPENDED` / `CLOSED`. Do not use `RESTRICTED` or trial
expiry to lock an agency.
