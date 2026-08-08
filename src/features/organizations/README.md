# organizations

Feature module: tenant profiles, subscriptions, members, invitations.

Owned in this foundation slice:

- Data models: `OrganizationProfile`, `SaaSPlan`, `OrganizationSubscription`
- Service layer: `server/services/organizations.service.ts`
- API: `GET /api/v1/organizations` (list orgs visible to the caller)
- UI: `OrganizationSwitcher` in the dashboard shell

Not yet implemented:

- CRUD screens for org profile
- Member management and role editing UI
- Subscription plan management screens
