# Subscription lifecycle

## States

```
        ┌─────────────────────┐
        │       TRIAL         │  starts when org is created
        └────────┬────────────┘
                 │ activate (paid or waived)
                 ▼
        ┌─────────────────────┐
        │       ACTIVE        │
        └────────┬────────────┘
                 │ next billing date reached, invoice generated
                 ▼
        ┌─────────────────────┐
        │    PAYMENT_DUE      │  invoice open, still within grace
        └────────┬────────────┘
                 │ dueDate + gracePeriodDays passed
                 ▼
        ┌─────────────────────┐
        │      PAST_DUE       │
        └────────┬────────────┘
                 │ restrictedAfterDays reached (auto or manual)
                 ▼
        ┌─────────────────────┐
        │     RESTRICTED      │  read-only allowlist enforced
        └────────┬────────────┘
                 │ suspendedAfterDays reached (auto or manual)
                 ▼
        ┌─────────────────────┐
        │     SUSPENDED       │  full block, tenant can only pay
        └─────────────────────┘

Terminal branches:  CANCELED (owner-initiated) | EXPIRED (trial ended, never activated)
Manual reactivate:  any → ACTIVE (requires reason, audited)
```

## Monotonic advance

The overdue transitioner in
[`overdue/service.ts`](../../src/server/services/billing/overdue/service.ts)
enforces a monotonic rank:

```
TRIAL(0) → ACTIVE(1) → PAYMENT_DUE(2) → PAST_DUE(3) → RESTRICTED(4) → SUSPENDED(5)
CANCELED(6) | EXPIRED(6)
```

A transition to a lower rank never happens automatically — only a
super-admin action moves the state backward, and every reactivation is
audited as `billing.subscription_reactivated`.

## Automatic extension

When an invoice is fully paid, `applyAllocations` records the payment;
the `billing.extend-subscriptions` job (or the payment service itself,
depending on flow) advances the subscription's period end by inserting a
`SubscriptionExtension` row keyed on
`(subscriptionId, servicePeriodEnd)`. The idempotency record means a
retried job never double-advances.

## Manual mutations

All available in the admin org tab
`/administracija/organizacije/{id}/naplata`:

| Action | Audit action | Notes |
| --- | --- | --- |
| Activate | `billing.subscription_activated` | Optional `customPrice`, `cycle`, `paymentMethod`. |
| Change plan | `billing.subscription_plan_changed` | Requires reason. |
| Change cycle | `billing.subscription_cycle_changed` | Requires reason. |
| Extend trial | `billing.subscription_trial_extended` | Days > 0, reason. |
| Restrict | `billing.subscription_restricted` | Skips overdue windows. |
| Suspend | `billing.subscription_suspended` | Skips overdue windows. |
| Cancel | `billing.subscription_canceled` | Optional `immediate` flag. |
| Reactivate | `billing.subscription_reactivated` | Reason. |
