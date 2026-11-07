# Backup and restore

## Backups

- Supabase backs up the database daily on paid plans and keeps them for the plan's retention period. The Free plan has no downloadable backups. Move to a paid plan before launch.
- Point-in-time recovery is an add-on. It is worth turning on before live payments, because orders, fees and invoices change often.
- Storage files (product images and order documents) are not in database backups. Keep that in mind when restoring.

## Restore drill (owner, once before launch, then every quarter)

1. In Supabase, go to Database → Backups and restore the latest backup into a new project, not the live one.
2. In that project, run:
   ```sql
   select count(*) from organisations;
   select count(*) from orders;
   select count(*) from fee_charges where status = 'paid';
   select max(created_at) from audit_log;
   ```
   The counts should match the live project as of the backup time.
3. Point a Vercel preview deployment at the restored project and open the health endpoint and a few pages.
4. Write down how long it took and anything that failed. Delete the restored project afterwards.

## Extra copy (optional)

With the database password, `pg_dump` gives a copy outside Supabase. Store it encrypted, never in the repository, because it holds personal and business data.
