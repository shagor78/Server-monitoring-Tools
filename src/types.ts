export interface MonitoredService {
  name: string;
  status: string;
  port?: number;
}

export interface ServerItem {
  id: number;
  hostname: string;
  ipAddress: string;
  os: string;
  osVersion: string;
  environment: string;
  location: string;
  serverType: string;
  cpuCores: number;
  ramGb: number;
  diskGb: number;
  exporterType: string;
  exporterPort: number;
  status: 'Healthy' | 'Warning' | 'Critical' | 'Offline' | 'Unknown' | 'Maintenance' | string;
  monitoringEnabled: boolean;
  maintenanceMode: boolean;
  autoHealingEnabled: boolean;
  cpuUsage: number;
  cpuLoad1m: number;
  cpuIowait: number;
  cpuSteal: number;
  ramUsage: number;
  swapUsage: number;
  diskUsage: number;
  diskReadMbps: number;
  diskWriteMbps: number;
  inodeUsage: number;
  networkRxMbps: number;
  networkTxMbps: number;
  packetLoss: number;
  uptimeSeconds: number;
  processCount: number;
  monitoredServices: MonitoredService[];
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
}

export interface DockerContainerItem {
  id: number;
  serverId: number | null;
  hostName: string;
  containerName: string;
  image: string;
  status: string;
  cpuPercent: number;
  memoryMb: number;
  memoryLimitMb: number;
  networkRxMb: number;
  networkTxMb: number;
  restartCount: number;
  uptime: string;
  autoRestartEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AwsInstanceItem {
  id: number;
  instanceId: string;
  name: string;
  region: string;
  availabilityZone: string;
  instanceType: string;
  state: string;
  publicIp: string;
  privateIp: string;
  statusCheck: string;
  cpuUtilization: number;
  networkInMb: number;
  networkOutMb: number;
  ebsDiskUsage: number;
  iamRoleArn: string;
  lastSyncedAt: string;
  createdAt: string;
}

export interface MonitoringTargetItem {
  id: number;
  name: string;
  jobName: string;
  endpoint: string;
  exporterType: string;
  environment: string;
  scrapeIntervalSec: number;
  state: 'UP' | 'DOWN' | 'UNKNOWN' | string;
  lastScrapeDurationMs: number;
  samplesScraped: number;
  lastError: string;
  lastScrapedAt: string;
}

export interface NetworkCheckItem {
  id: number;
  name: string;
  checkType: string;
  targetHost: string;
  port: number;
  httpMethod: string;
  expectedStatus: number;
  timeoutSec: number;
  intervalSec: number;
  reachable: boolean;
  latencyMs: number;
  packetLossPercent: number;
  lastStatusCode: number;
  responseSnippet: string;
  lastCheckedAt: string;
}

export interface RemediationActionItem {
  id: number;
  code: string;
  name: string;
  description: string;
  targetType: string;
  commandTemplate: string;
  timeoutSec: number;
  maxRetries: number;
  cooldownMinutes: number;
  maxExecutionsPerHour: number;
  enabled: boolean;
  requiresApproval: boolean;
  dryRunDefault: boolean;
  createdBy: string;
  createdAt: string;
}

export interface AlertRuleItem {
  id: number;
  name: string;
  metric: string;
  condition: string;
  threshold: number;
  durationSec: number;
  severity: string;
  targetType: string;
  enabled: boolean;
  remediationActionId: number | null;
  createdAt: string;
}

export interface AlertItem {
  id: number;
  ruleId: number | null;
  serverId: number | null;
  hostname: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL' | string;
  status: 'FIRING' | 'ACKNOWLEDGED' | 'SILENCED' | 'RESOLVED' | string;
  metricValue: string;
  groupKey: string;
  silencedUntil: string | null;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface IncidentItem {
  id: number;
  incidentKey: string;
  title: string;
  description: string;
  severity: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | string;
  affectedServerId: number | null;
  affectedHostname: string;
  affectedService: string;
  assignedTo: string;
  rootCause: string;
  resolution: string;
  createdBy: string;
  detectedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  updatedAt: string;
}

export interface RemediationJobItem {
  id: number;
  actionId: number;
  actionName: string;
  commandExecuted: string;
  serverId: number | null;
  hostname: string;
  alertId: number | null;
  incidentId: number | null;
  status: string;
  dryRun: boolean;
  retryCount: number;
  triggeredBy: string;
  verificationResult: string;
  executionOutput: string;
  durationMs: number;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

export interface LogItem {
  id: number;
  serverId: number | null;
  hostname: string;
  application: string;
  severity: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | string;
  message: string;
  requestId: string;
  createdAt: string;
}

export interface NotificationChannelItem {
  id: number;
  name: string;
  provider: string;
  destinationMasked: string;
  minSeverity: string;
  enabled: boolean;
  lastTestedAt: string | null;
  lastDeliveryStatus: string;
}

export interface UserItem {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string;
  createdAt: string;
}

export interface RoleItem {
  id: number;
  name: string;
  description: string;
  permissions: string[];
}

export interface BackupJobItem {
  id: number;
  backupName: string;
  backupType: string;
  sizeMb: number;
  checksumSha256: string;
  status: string;
  verified: boolean;
  storageLocation: string;
  triggeredBy: string;
  createdAt: string;
}

export interface SettingItem {
  id: number;
  key: string;
  value: string;
  category: string;
  description: string;
  updatedBy: string;
  updatedAt: string;
}

export interface AuditLogItem {
  id: number;
  userUid: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId: string;
  ipAddress: string;
  result: string;
  details: string;
  createdAt: string;
}

export interface BootstrapResponse {
  success: boolean;
  currentUser: UserItem;
  localRuntime: {
    hostname: string;
    platform: string;
    cpuCores: number;
    cpuModel: string;
    loadAvg1m: number;
    loadAvg5m: number;
    loadAvg15m: number;
    totalMemoryGb: number;
    usedMemoryPercent: number;
    uptimeSeconds: number;
  };
  data: {
    servers: ServerItem[];
    dockerContainers: DockerContainerItem[];
    awsInstances: AwsInstanceItem[];
    monitoringTargets: MonitoringTargetItem[];
    networkChecks: NetworkCheckItem[];
    remediationActions: RemediationActionItem[];
    alertRules: AlertRuleItem[];
    alerts: AlertItem[];
    incidents: IncidentItem[];
    remediationJobs: RemediationJobItem[];
    logs: LogItem[];
    notificationChannels: NotificationChannelItem[];
    users: UserItem[];
    roles: RoleItem[];
    backupJobs: BackupJobItem[];
    settings: SettingItem[];
    auditLogs: AuditLogItem[];
  };
}
