# Security & RBAC Specification

- **Authentication**: Google OAuth 2.0 via Firebase Authentication (`signInWithPopup`), with ID tokens stored strictly in memory and verified server-side via `firebase-admin`.
- **Role-Based Access Control (RBAC)**:
  - `Super Admin`: Full control including user role assignment.
  - `Admin`: Server enrollment, alert rule creation, remediation policy configuration, and backups.
  - `Operator`: Alert acknowledgement/silencing, incident updates, and executing approved remediations.
  - `Viewer`: Read-only access to dashboards, metrics, logs, and reports.
- **Command Injection Prevention**: Predefined database-backed `remediation_actions` allowlist with zero user-supplied shell interpolation.
- **Secrets Protection**: AWS EC2 integration uses IAM Role assumption (`arn:aws:iam::...:role/AegisNOCCloudWatchRole`); notification channels mask destination credentials.
