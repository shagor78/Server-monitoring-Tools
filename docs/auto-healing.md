# Auto-Healing Engine & Safety Guardrails

## Workflow

`Service DOWN / Metric Breach` → `Detection` → `Verify Failure` → `Check Allowlist, Maintenance Mode, Cooldown & Hourly Rate Limit` → `Execute Predefined Action` → `Post-Execution Health Check` → `Resolve Alert` OR `Escalate to Critical Incident`.

## Security Rules

- **No Arbitrary Shell Commands**: Any request containing `customCommand`, `command`, or `shell` parameters is immediately rejected (`403 ARBITRARY_COMMAND_PROHIBITED`) and recorded in the security audit trail.
- **Allowlisted Templates Only**:
  - `LNX_RESTART_NGINX`: `systemctl restart nginx && systemctl is-active --quiet nginx`
  - `LNX_RESTART_DOCKER_DAEMON`: `systemctl restart docker && docker info >/dev/null 2>&1`
  - `DOCKER_RESTART_CONTAINER`: `docker restart {{container_name}} && docker inspect -f "{{.State.Running}}" {{container_name}}`
  - `WIN_RESTART_W3SVC`: `Restart-Service -Name W3SVC -Force -ErrorAction Stop`
  - `LNX_CLEAN_JOURNAL_DISK`: `journalctl --vacuum-time=3d && sync`
