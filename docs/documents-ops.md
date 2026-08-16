# SQL ops — aplikacija + S3

HTML vodič (isti stil kao Help Center / Dev Portal):
[`docs/documents-ops.html`](./documents-ops.html)

Copy-paste `SELECT` upiti za tenante, inventar, CRM, rezervacije, prodaje,
agencije, SaaS billing, leadove, audit — i dokumente / S3.

`"user"` mora pod navodnicima. Samo `SELECT` dok nisi siguran.
Zameni `'ORG_ID_OVDE'` i `%…%` filtere pre pokretanja.

S3: soft-delete ostavlja objekat **45 dana**; cron `purge-deleted-documents`
ga onda briše. Bucket ne zna uploadera ni originalno ime — to je u
`document` + `audit_log`.

---

## Tenanti i članovi

```sql
SELECT
  o.id, o.name, o.slug,
  p.type, p.status AS profile_status, p.city,
  s.status AS sub_status, pl.code AS plan,
  s."trialEndsAt", s."nextBillingDate",
  o."createdAt"
FROM organization o
LEFT JOIN organization_profile p ON p."organizationId" = o.id
LEFT JOIN organization_subscription s ON s."organizationId" = o.id
LEFT JOIN saas_plan pl ON pl.id = s."planId"
ORDER BY o."createdAt" DESC;
```

```sql
SELECT u.name, u.email, m.role, u.role AS platform_role,
       u."deactivatedAt", u.banned, m."createdAt"
FROM member m
JOIN "user" u ON u.id = m."userId"
WHERE m."organizationId" = 'ORG_ID_OVDE'
ORDER BY m.role, u.name;
```

```sql
SELECT u.email, o.name AS org, m.role, p.type
FROM "user" u
JOIN member m ON m."userId" = u.id
JOIN organization o ON o.id = m."organizationId"
LEFT JOIN organization_profile p ON p."organizationId" = o.id
WHERE u.email ILIKE '%marko%';
```

Trial ističe u 14 dana:

```sql
SELECT o.name, s.status, s."trialEndsAt", pl.code AS plan
FROM organization_subscription s
JOIN organization o ON o.id = s."organizationId"
JOIN saas_plan pl ON pl.id = s."planId"
WHERE s.status = 'TRIAL'
  AND s."trialEndsAt" BETWEEN NOW() AND NOW() + INTERVAL '14 days'
ORDER BY s."trialEndsAt";
```

---

## Inventar

```sql
SELECT p.name AS project, u.status, COUNT(*) AS n,
       ROUND(SUM(u."basePrice"), 2) AS base_sum,
       ROUND(SUM(COALESCE(u."finalPrice", u."basePrice")), 2) AS final_sum
FROM unit u
JOIN project p ON p.id = u."projectId"
WHERE u."organizationId" = 'ORG_ID_OVDE'
  AND u."archivedAt" IS NULL
GROUP BY p.name, u.status
ORDER BY p.name, u.status;
```

SOLD bez aktivne prodaje (anomalia):

```sql
SELECT u.id, p.name, u.code, u.status
FROM unit u
JOIN project p ON p.id = u."projectId"
WHERE u.status = 'SOLD'
  AND u."archivedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM sale s
    WHERE s."unitId" = u.id
      AND s.status NOT IN ('CANCELED', 'DRAFT')
  );
```

---

## CRM

```sql
SELECT b.id, o.name AS org, b."firstName", b."lastName",
       b.phone, b.email, b.status, b.source,
       u.name AS assigned_to, b."createdAt"
FROM buyer b
JOIN organization o ON o.id = b."organizationId"
LEFT JOIN "user" u ON u.id = b."assignedUserId"
WHERE b."archivedAt" IS NULL
  AND (
    b."normalizedPhone" LIKE '%3816%'
    OR b.email ILIKE '%@gmail%'
    OR b."lastName" ILIKE '%Petrović%'
  )
ORDER BY b."createdAt" DESC;
```

Zadaci koji kasne / ističu danas:

```sql
SELECT t.title, t.status, t.priority, t."dueAt",
       a.name AS assigned, b."lastName" AS buyer, p.name AS project
FROM task t
JOIN "user" a ON a.id = t."assignedUserId"
LEFT JOIN buyer b ON b.id = t."buyerId"
LEFT JOIN project p ON p.id = t."projectId"
WHERE t."organizationId" = 'ORG_ID_OVDE'
  AND t.status IN ('OPEN', 'IN_PROGRESS')
  AND t."dueAt" < NOW() + INTERVAL '1 day'
ORDER BY t."dueAt";
```

---

## Rezervacije i prodaje

```sql
SELECT r.id, r.status, r."expiresAt",
       p.name AS project, un.code AS unit,
       b."firstName", b."lastName", r."referralCode"
FROM reservation r
JOIN project p ON p.id = r."projectId"
JOIN unit un ON un.id = r."unitId"
JOIN buyer b ON b.id = r."buyerId"
WHERE r."organizationId" = 'ORG_ID_OVDE'
  AND r.status IN ('REQUESTED', 'APPROVED')
ORDER BY r."expiresAt" NULLS LAST;
```

Rate koje kasne:

```sql
SELECT i.name AS rata, i.status, i."dueDate",
       i.amount, i."paidAmount",
       (i.amount - i."paidAmount") AS outstanding,
       un.code AS unit, b."lastName" AS buyer
FROM payment_installment i
JOIN payment_plan pp ON pp.id = i."paymentPlanId"
JOIN sale s ON s.id = pp."saleId"
JOIN unit un ON un.id = s."unitId"
JOIN buyer b ON b.id = s."buyerId"
WHERE s."organizationId" = 'ORG_ID_OVDE'
  AND i.status IN ('OVERDUE', 'DUE', 'PARTIALLY_PAID')
  AND i.amount > i."paidAmount"
ORDER BY i."dueDate";
```

Prodaja vs naplaćeno:

```sql
SELECT s.id, un.code, s."finalPrice", s.currency,
       COALESCE(SUM(pay.amount) FILTER (WHERE pay."reversedAt" IS NULL), 0) AS paid,
       s."finalPrice" - COALESCE(SUM(pay.amount) FILTER (WHERE pay."reversedAt" IS NULL), 0) AS leftover
FROM sale s
JOIN unit un ON un.id = s."unitId"
LEFT JOIN payment pay ON pay."saleId" = s.id
WHERE s."organizationId" = 'ORG_ID_OVDE'
  AND s.status NOT IN ('CANCELED')
GROUP BY s.id, un.code, s."finalPrice", s.currency
ORDER BY leftover DESC;
```

---

## Agencije i SaaS billing

```sql
SELECT inv.name AS investor, ag.name AS agency,
       c.status, c."referralCode", c."acceptedAt"
FROM agency_connection c
JOIN organization inv ON inv.id = c."investorOrganizationId"
JOIN organization ag ON ag.id = c."agencyOrganizationId"
ORDER BY c."createdAt" DESC;
```

```sql
SELECT i."invoiceNumber", i.status, o.name AS org,
       i."totalAmount", i."amountDue", i.currency,
       i."issueDate", i."dueDate", i."paidAt"
FROM invoice i
JOIN organization o ON o.id = i."organizationId"
WHERE i.status IN ('ISSUED', 'SENT', 'OVERDUE', 'PARTIALLY_PAID')
  AND i."amountDue" > 0
ORDER BY i."dueDate" NULLS LAST;
```

---

## Audit / health / volumen

```sql
SELECT a."createdAt", a.action, a."entityType", a."entityId",
       o.name AS org, u.name AS actor
FROM audit_log a
LEFT JOIN organization o ON o.id = a."organizationId"
LEFT JOIN "user" u ON u.id = a."actorUserId"
ORDER BY a."createdAt" DESC
LIMIT 80;
```

```sql
SELECT
  o.name,
  (SELECT COUNT(*) FROM project p WHERE p."organizationId" = o.id) AS projects,
  (SELECT COUNT(*) FROM unit u WHERE u."organizationId" = o.id AND u."archivedAt" IS NULL) AS units,
  (SELECT COUNT(*) FROM buyer b WHERE b."organizationId" = o.id AND b."archivedAt" IS NULL) AS buyers,
  (SELECT COUNT(*) FROM sale s WHERE s."organizationId" = o.id) AS sales,
  (SELECT COUNT(*) FROM document d WHERE d."organizationId" = o.id AND d."deletedAt" IS NULL) AS docs
FROM organization o
ORDER BY o.name;
```

---

## Dokumenti / S3 — korpa (još u bucketu)

```sql
SELECT
  d.id,
  o.name AS org,
  d."originalFileName",
  up.name AS uploaded_by,
  d."deletedAt",
  (d."deletedAt" + INTERVAL '45 days') AS purge_at,
  GREATEST(
    0,
    CEIL(EXTRACT(EPOCH FROM (d."deletedAt" + INTERVAL '45 days') - NOW()) / 86400)
  )::int AS days_left,
  d."storageKey"
FROM document d
JOIN organization o ON o.id = d."organizationId"
JOIN "user" up ON up.id = d."uploadedByUserId"
WHERE d."deletedAt" IS NOT NULL
  AND d."storagePurgedAt" IS NULL
ORDER BY d."deletedAt" DESC;
```

`storageKey` lepiš u S3 Search ili:

```bash
aws s3 cp s3://propertydesk-prod-docs/<storageKey> ./recovered.bin --region eu-central-1
```

### Po imenu fajla

```sql
SELECT d.id, o.name AS org, d."originalFileName", u.name AS uploaded_by,
       d."deletedAt", d."storagePurgedAt", d."storageKey"
FROM document d
JOIN organization o ON o.id = d."organizationId"
JOIN "user" u ON u.id = d."uploadedByUserId"
WHERE d."originalFileName" ILIKE '%extended%';
```

### Ko je obrisao

```sql
SELECT a."createdAt" AS deleted_at, actor.name AS deleted_by, d."originalFileName",
       d."storageKey", d."storagePurgedAt"
FROM audit_log a
JOIN document d ON d.id = a."entityId"
LEFT JOIN "user" actor ON actor.id = a."actorUserId"
WHERE a.action = 'document.deleted'
ORDER BY a."createdAt" DESC;
```

Ostali upiti (KYC fajlovi, GB po tenantu, restore, sesije, leadovi, zgrade):
otvori HTML stranicu.
