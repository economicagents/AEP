# PostgreSQL + pgvector for AEP indexer

Optional search backend for `AEP_INDEX_DATABASE_URL`. Use on a developer machine or an EC2 host; **do not** expose port 5432 to the public internet.

## Start

```bash
cd packages/indexer/docker
cp env.example .env   # create .env with POSTGRES_PASSWORD
docker compose up -d
```

Connection URL (example):

`postgresql://aep:YOUR_PASSWORD@127.0.0.1:5432/aep_index`

Set `AEP_INDEX_DATABASE_URL` to this value for the indexer, API, and CLI processes that run resolution.

## Backups

- **Logical:** `pg_dump -h 127.0.0.1 -U aep -d aep_index -Fc -f aep_index.dump` (cron + retention).
- **Restore:** `pg_restore -h 127.0.0.1 -U aep -d aep_index --clean aep_index.dump`
- **Volume:** the named volume `aep_index_pgdata` persists across `docker compose down`; snapshot the EBS volume for host-level DR if needed.

## EC2 notes

- Install Docker Engine + Compose plugin per your AMI.
- Ensure the instance has enough disk before large indexes; grow the volume if `df` is tight.
- Keep the bind address `127.0.0.1:5432` unless you add TLS and a private network path (VPN, Tailscale, SSM tunnel).
