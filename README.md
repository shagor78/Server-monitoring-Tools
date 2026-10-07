# AegisNOC — Enterprise Infrastructure Monitoring & Auto-Healing Platform

AegisNOC is a production-grade **Network Operations Center (NOC) Infrastructure Monitoring & Controlled Auto-Healing Platform** designed to monitor Linux servers (`node_exporter`), Windows servers (`windows_exporter`), Docker hosts (`cAdvisor`), AWS EC2 instances (CloudWatch IAM Role integration), and network/application endpoints from a centralized web dashboard.

---

## Architecture & Core Capabilities

1. **Multi-Platform Infrastructure Inventory**:
   - Full lifecycle management for **Linux** (Ubuntu, RHEL, Debian) and **Windows Server** (2022 Datacenter/Standard) hosts across `Production`, `Staging`, `Development`, and `Testing` environments.
   - Real-time CPU utilization, 1m load average, CPU iowait/steal, Memory & Swap, Disk I/O read/write throughput, inode usage, network RX/TX, and systemd/Windows service monitoring (`nginx`, `postgresql`, `docker`, `MSSQLSERVER`, `W3SVC`, `Spooler`, `Windows Update`).
2. **Prometheus, Grafana & Loki Observability**:
   - Prometheus scrape target monitoring (`UP`, `DOWN`, `UNKNOWN`), scrape duration, and sample counts.
   - Integrated Grafana telemetry explorer with host, environment, and time-range (`15m`, `1h`, `6h`, `24h`) variables.
   - Centralized Loki structured log viewer with severity (`ERROR`, `WARN`, `INFO`, `DEBUG`), hostname, and keyword filtering.
3. **Controlled Auto-Healing & Remediation Engine**:
   - **Zero Arbitrary Command Execution**: Users cannot submit arbitrary shell commands (`rm -rf`, `curl | bash`, etc.). Only predefined, allowlisted remediation templates (`LNX_RESTART_NGINX`, `LNX_RESTART_DOCKER_DAEMON`, `DOCKER_RESTART_CONTAINER`, `WIN_RESTART_W3SVC`, `LNX_CLEAN_JOURNAL_DISK`) can be executed.
   - **Safety Guardrails**: Per-server enable/disable toggle, per-action enable/disable toggle, maintenance mode suppression, **Dry-Run validation mode**, command timeout, retry limits, cooldown period enforcement, hourly execution limits, and automatic **Failure Escalation** (creates a Critical Incident and Alert if post-remediation health verification fails).
4. **Alertmanager, Incident Management & Notifications**:
   - Alert grouping, deduplication, acknowledgement, 1-hour silencing, resolution, and one-click auto-healing.
   - Full incident lifecycle (`OPEN` → `ACKNOWLEDGED` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`) with root-cause documentation.
   - Multi-channel notifications (`Email`, `Telegram`, `WebNotification`) with live test dispatch.
5. **Security, RBAC, Backups & Audit Trail**:
   - Authenticated via Firebase Google OAuth 2.0 with server-side Bearer ID token verification and granular Role-Based Access Control (`Super Admin`, `Admin`, `Operator`, `Viewer`).
   - Immutable audit logging for every sensitive action.
   - Daily/Weekly/Monthly SLA reports with CSV and JSON export, plus SHA-256 verified database backup snapshots.

---

## Running & Deploying the Platform

### Local / Cloud Development

```bash
npm install
npm run dev
```

### Production Build & Full Docker Stack

```bash
# Build frontend & verify TypeScript compilation
npm run lint
npm run build

# Start full monitoring stack (App, Prometheus, Alertmanager, Grafana, Loki, Nginx)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```
