# Architecture & Data Flow

AegisNOC follows a layered enterprise NOC architecture:

1. **Presentation Layer**: React 19 + TypeScript + Tailwind CSS NOC console with dark/light mode, high-density tabular telemetry (`IBM Plex Mono`), and real-time refresh.
2. **API & Security Gateway**: Express REST API (`/api/v1/*`) secured by Firebase Admin Bearer ID token verification, IP rate limiting, and granular Role-Based Access Control (`Super Admin`, `Admin`, `Operator`, `Viewer`).
3. **Persistence Layer**: Cloud SQL PostgreSQL managed via Drizzle ORM (`src/db/schema.ts`, `src/db/index.ts`) using connection pooling (`pg.Pool`).
4. **Monitoring & Logging Stack**: Prometheus (`node_exporter`, `windows_exporter`, `cAdvisor`), Alertmanager, Grafana, and Loki.
5. **Controlled Auto-Healing Engine**: Predefined allowlisted remediation templates with cooldown, retry, dry-run, and automatic incident escalation.
