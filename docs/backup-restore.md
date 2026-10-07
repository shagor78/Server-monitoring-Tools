# Backup & Disaster Recovery Procedure

## Automated & Manual Backups

Backups are recorded in `backup_jobs` with SHA-256 verification checksums.

## PostgreSQL Restore Procedure

```bash
# 1. Verify SHA-256 integrity of backup archive
sha256sum -c pg_dump_aegis_noc.sql.gz.sha256

# 2. Place platform in maintenance window and restore
gunzip -c pg_dump_aegis_noc.sql.gz | psql -h "$SQL_HOST" -U "$SQL_ADMIN_USER" -d "$SQL_DB_NAME"
```
