import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  doublePrecision,
  jsonb,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull().default('NOC Operator'),
  role: text('role').notNull().default('Super Admin'), // Super Admin, Admin, Operator, Viewer
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description').notNull(),
  permissions: jsonb('permissions').$type<string[]>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const servers = pgTable('servers', {
  id: serial('id').primaryKey(),
  hostname: text('hostname').notNull().unique(),
  ipAddress: text('ip_address').notNull(),
  os: text('os').notNull(), // Linux, Windows
  osVersion: text('os_version').notNull(),
  environment: text('environment').notNull(), // Production, Staging, Development, Testing
  location: text('location').notNull(),
  serverType: text('server_type').notNull(), // Physical, Virtual Machine, Cloud, Container Host, Database Server, Web Server, Application Server, Network Server
  cpuCores: integer('cpu_cores').notNull().default(8),
  ramGb: integer('ram_gb').notNull().default(32),
  diskGb: integer('disk_gb').notNull().default(500),
  exporterType: text('exporter_type').notNull().default('node_exporter'), // node_exporter, windows_exporter, cadvisor, custom_exporter
  exporterPort: integer('exporter_port').notNull().default(9100),
  status: text('status').notNull().default('Healthy'), // Healthy, Warning, Critical, Offline, Unknown, Maintenance
  monitoringEnabled: boolean('monitoring_enabled').notNull().default(true),
  maintenanceMode: boolean('maintenance_mode').notNull().default(false),
  autoHealingEnabled: boolean('auto_healing_enabled').notNull().default(true),
  cpuUsage: doublePrecision('cpu_usage').notNull().default(24.5),
  cpuLoad1m: doublePrecision('cpu_load_1m').notNull().default(1.15),
  cpuIowait: doublePrecision('cpu_iowait').notNull().default(0.8),
  cpuSteal: doublePrecision('cpu_steal').notNull().default(0.1),
  ramUsage: doublePrecision('ram_usage').notNull().default(48.2),
  swapUsage: doublePrecision('swap_usage').notNull().default(4.0),
  diskUsage: doublePrecision('disk_usage').notNull().default(41.0),
  diskReadMbps: doublePrecision('disk_read_mbps').notNull().default(18.4),
  diskWriteMbps: doublePrecision('disk_write_mbps').notNull().default(32.1),
  inodeUsage: doublePrecision('inode_usage').notNull().default(14.2),
  networkRxMbps: doublePrecision('network_rx_mbps').notNull().default(124.5),
  networkTxMbps: doublePrecision('network_tx_mbps').notNull().default(98.2),
  packetLoss: doublePrecision('packet_loss').notNull().default(0.0),
  uptimeSeconds: integer('uptime_seconds').notNull().default(1245600),
  processCount: integer('process_count').notNull().default(184),
  monitoredServices: jsonb('monitored_services')
    .$type<Array<{ name: string; status: string; port?: number }>>()
    .notNull()
    .default([]),
  lastSeen: timestamp('last_seen').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const dockerContainers = pgTable('docker_containers', {
  id: serial('id').primaryKey(),
  serverId: integer('server_id').references(() => servers.id, { onDelete: 'cascade' }),
  hostName: text('host_name').notNull(),
  containerName: text('container_name').notNull(),
  image: text('image').notNull(),
  status: text('status').notNull().default('running'), // running, exited, restarting, paused
  cpuPercent: doublePrecision('cpu_percent').notNull().default(4.2),
  memoryMb: doublePrecision('memory_mb').notNull().default(312.0),
  memoryLimitMb: doublePrecision('memory_limit_mb').notNull().default(2048.0),
  networkRxMb: doublePrecision('network_rx_mb').notNull().default(45.2),
  networkTxMb: doublePrecision('network_tx_mb').notNull().default(38.9),
  restartCount: integer('restart_count').notNull().default(0),
  uptime: text('uptime').notNull().default('14d 6h 12m'),
  autoRestartEnabled: boolean('auto_restart_enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const awsInstances = pgTable('aws_instances', {
  id: serial('id').primaryKey(),
  instanceId: text('instance_id').notNull().unique(),
  name: text('name').notNull(),
  region: text('region').notNull(),
  availabilityZone: text('availability_zone').notNull(),
  instanceType: text('instance_type').notNull(),
  state: text('state').notNull().default('running'), // running, stopped, pending, impaired
  publicIp: text('public_ip').notNull(),
  privateIp: text('private_ip').notNull(),
  statusCheck: text('status_check').notNull().default('2/2 checks passed'),
  cpuUtilization: doublePrecision('cpu_utilization').notNull().default(31.4),
  networkInMb: doublePrecision('network_in_mb').notNull().default(210.5),
  networkOutMb: doublePrecision('network_out_mb').notNull().default(184.2),
  ebsDiskUsage: doublePrecision('ebs_disk_usage').notNull().default(54.0),
  iamRoleArn: text('iam_role_arn').notNull(),
  lastSyncedAt: timestamp('last_synced_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const monitoringTargets = pgTable('monitoring_targets', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  jobName: text('job_name').notNull(),
  endpoint: text('endpoint').notNull(),
  exporterType: text('exporter_type').notNull(), // node_exporter, windows_exporter, cadvisor, blackbox, custom
  environment: text('environment').notNull().default('Production'),
  scrapeIntervalSec: integer('scrape_interval_sec').notNull().default(15),
  state: text('state').notNull().default('UP'), // UP, DOWN, UNKNOWN
  lastScrapeDurationMs: doublePrecision('last_scrape_duration_ms').notNull().default(14.2),
  samplesScraped: integer('samples_scraped').notNull().default(842),
  lastError: text('last_error').default(''),
  lastScrapedAt: timestamp('last_scraped_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const networkChecks = pgTable('network_checks', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  checkType: text('check_type').notNull(), // ICMP_PING, TCP_PORT, DNS, HTTP_ENDPOINT
  targetHost: text('target_host').notNull(),
  port: integer('port').default(443),
  httpMethod: text('http_method').default('GET'),
  expectedStatus: integer('expected_status').default(200),
  timeoutSec: integer('timeout_sec').notNull().default(5),
  intervalSec: integer('interval_sec').notNull().default(30),
  reachable: boolean('reachable').notNull().default(true),
  latencyMs: doublePrecision('latency_ms').notNull().default(12.4),
  packetLossPercent: doublePrecision('packet_loss_percent').notNull().default(0.0),
  lastStatusCode: integer('last_status_code').default(200),
  responseSnippet: text('response_snippet').default('OK'),
  lastCheckedAt: timestamp('last_checked_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const remediationActions = pgTable('remediation_actions', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  targetType: text('target_type').notNull(), // Linux Service, Docker Container, Windows Service, System Resource
  commandTemplate: text('command_template').notNull(),
  timeoutSec: integer('timeout_sec').notNull().default(30),
  maxRetries: integer('max_retries').notNull().default(2),
  cooldownMinutes: integer('cooldown_minutes').notNull().default(10),
  maxExecutionsPerHour: integer('max_executions_per_hour').notNull().default(4),
  enabled: boolean('enabled').notNull().default(true),
  requiresApproval: boolean('requires_approval').notNull().default(false),
  dryRunDefault: boolean('dry_run_default').notNull().default(false),
  createdBy: text('created_by').notNull().default('system'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const alertRules = pgTable('alert_rules', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  metric: text('metric').notNull(), // cpu_usage, ram_usage, disk_usage, host_up, service_status, container_status, packet_loss
  condition: text('condition').notNull(), // >, >=, ==, !=
  threshold: doublePrecision('threshold').notNull(),
  durationSec: integer('duration_sec').notNull().default(60),
  severity: text('severity').notNull(), // INFO, WARNING, HIGH, CRITICAL
  targetType: text('target_type').notNull().default('Server'),
  enabled: boolean('enabled').notNull().default(true),
  remediationActionId: integer('remediation_action_id').references(() => remediationActions.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const alerts = pgTable('alerts', {
  id: serial('id').primaryKey(),
  ruleId: integer('rule_id').references(() => alertRules.id),
  serverId: integer('server_id').references(() => servers.id, { onDelete: 'cascade' }),
  hostname: text('hostname').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  severity: text('severity').notNull(), // INFO, WARNING, HIGH, CRITICAL
  status: text('status').notNull().default('FIRING'), // FIRING, ACKNOWLEDGED, SILENCED, RESOLVED
  metricValue: text('metric_value').notNull(),
  groupKey: text('group_key').notNull(),
  silencedUntil: timestamp('silenced_until'),
  acknowledgedBy: text('acknowledged_by'),
  acknowledgedAt: timestamp('acknowledged_at'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const incidents = pgTable('incidents', {
  id: serial('id').primaryKey(),
  incidentKey: text('incident_key').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  severity: text('severity').notNull(), // INFO, WARNING, HIGH, CRITICAL
  status: text('status').notNull().default('OPEN'), // OPEN, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, CLOSED
  affectedServerId: integer('affected_server_id').references(() => servers.id),
  affectedHostname: text('affected_hostname').notNull(),
  affectedService: text('affected_service').notNull(),
  assignedTo: text('assigned_to').notNull().default('NOC On-Call'),
  rootCause: text('root_cause').default('Under investigation'),
  resolution: text('resolution').default(''),
  createdBy: text('created_by').notNull().default('AlertManager Auto-Escalation'),
  detectedAt: timestamp('detected_at').defaultNow().notNull(),
  acknowledgedAt: timestamp('acknowledged_at'),
  resolvedAt: timestamp('resolved_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const remediationJobs = pgTable('remediation_jobs', {
  id: serial('id').primaryKey(),
  actionId: integer('action_id').references(() => remediationActions.id).notNull(),
  actionName: text('action_name').notNull(),
  commandExecuted: text('command_executed').notNull(),
  serverId: integer('server_id').references(() => servers.id),
  hostname: text('hostname').notNull(),
  alertId: integer('alert_id').references(() => alerts.id),
  incidentId: integer('incident_id').references(() => incidents.id),
  status: text('status').notNull().default('COMPLETED'), // PENDING_APPROVAL, RUNNING, COMPLETED, FAILED, ESCALATED, DRY_RUN_OK
  dryRun: boolean('dry_run').notNull().default(false),
  retryCount: integer('retry_count').notNull().default(0),
  triggeredBy: text('triggered_by').notNull(),
  verificationResult: text('verification_result').notNull(),
  executionOutput: text('execution_output').notNull(),
  durationMs: integer('duration_ms').notNull().default(1420),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const logs = pgTable('logs', {
  id: serial('id').primaryKey(),
  serverId: integer('server_id').references(() => servers.id, { onDelete: 'cascade' }),
  hostname: text('hostname').notNull(),
  application: text('application').notNull(),
  severity: text('severity').notNull(), // ERROR, WARN, INFO, DEBUG
  message: text('message').notNull(),
  requestId: text('request_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notificationChannels = pgTable('notification_channels', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  provider: text('provider').notNull(), // Email, Telegram, Webhook, WebNotification
  destinationMasked: text('destination_masked').notNull(),
  minSeverity: text('min_severity').notNull().default('WARNING'),
  enabled: boolean('enabled').notNull().default(true),
  lastTestedAt: timestamp('last_tested_at'),
  lastDeliveryStatus: text('last_delivery_status').default('DELIVERED'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  userEmail: text('user_email').notNull(),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id').notNull(),
  ipAddress: text('ip_address').notNull(),
  result: text('result').notNull().default('SUCCESS'),
  details: text('details').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const backupJobs = pgTable('backup_jobs', {
  id: serial('id').primaryKey(),
  backupName: text('backup_name').notNull(),
  backupType: text('backup_type').notNull(), // MANUAL, SCHEDULED_DAILY, CONFIG_SNAPSHOT
  sizeMb: doublePrecision('size_mb').notNull().default(142.8),
  checksumSha256: text('checksum_sha256').notNull(),
  status: text('status').notNull().default('VERIFIED'), // COMPLETED, VERIFIED, FAILED
  verified: boolean('verified').notNull().default(true),
  storageLocation: text('storage_location').notNull(),
  triggeredBy: text('triggered_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  category: text('category').notNull(), // monitoring, auto_healing, security, aws, notifications
  description: text('description').notNull(),
  updatedBy: text('updated_by').notNull().default('system'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
