SELECT migration_name,
       started_at,
       finished_at,
       rolled_back_at,
       CASE WHEN logs IS NULL THEN '' ELSE substr(logs, 1, 60) END AS logs_preview
FROM _prisma_migrations
ORDER BY started_at;
