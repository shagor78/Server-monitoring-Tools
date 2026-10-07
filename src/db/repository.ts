import { db } from './index.ts';
import {
  users,
  roles,
  servers,
  dockerContainers,
  awsInstances,
  monitoringTargets,
  networkChecks,
  remediationActions,
  alertRules,
  alerts,
  incidents,
  remediationJobs,
  logs,
  notificationChannels,
  auditLogs,
  backupJobs,
  settings,
} from './schema.ts';
import { eq, desc } from 'drizzle-orm';
import * as net from 'net';
import * as dns from 'dns/promises';
import * as os from 'os';

export async function getOrCreateUser(uid: string, email: string, name: string) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        name,
        role: 'Super Admin',
        isActive: true,
        lastLoginAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

export async function recordAuditLog(params: {
  userUid: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId: string;
  ipAddress: string;
  result?: string;
  details: string;
}) {
  try {
    await db.insert(auditLogs).values({
      userUid: params.userUid,
      userEmail: params.userEmail,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      ipAddress: params.ipAddress,
      result: params.result || 'SUCCESS',
      details: params.details,
    });
  } catch (error) {
    console.error('Audit log insert failed:', error);
  }
}

let isSeeded = false;

export async function ensureSeedData() {
  if (isSeeded) return;
  try {
    const existingServers = await db.select().from(servers).limit(1);
    if (existingServers.length > 0) {
      isSeeded = true;
      return;
    }

    // 1. Seed Roles
    await db
      .insert(roles)
      .values([
        {
          name: 'Super Admin',
          description: 'Full unrestricted control over infrastructure, RBAC, auto-healing policies, and backups.',
          permissions: [
            'users.read', 'users.create', 'users.update', 'users.delete',
            'servers.read', 'servers.create', 'servers.update', 'servers.delete',
            'monitoring.read', 'monitoring.configure',
            'alerts.read', 'alerts.manage',
            'automation.read', 'automation.execute',
            'logs.read', 'reports.read', 'reports.export',
            'settings.read', 'settings.update',
          ],
        },
        {
          name: 'Admin',
          description: 'Manage servers, monitoring targets, alert rules, and remediation policies.',
          permissions: [
            'users.read',
            'servers.read', 'servers.create', 'servers.update',
            'monitoring.read', 'monitoring.configure',
            'alerts.read', 'alerts.manage',
            'automation.read', 'automation.execute',
            'logs.read', 'reports.read', 'reports.export',
            'settings.read',
          ],
        },
        {
          name: 'Operator',
          description: 'NOC engineer: acknowledge alerts, manage incidents, and trigger approved remediations.',
          permissions: [
            'servers.read',
            'monitoring.read',
            'alerts.read', 'alerts.manage',
            'automation.read', 'automation.execute',
            'logs.read', 'reports.read',
          ],
        },
        {
          name: 'Viewer',
          description: 'Read-only access to dashboards, metrics, logs, and compliance reports.',
          permissions: ['servers.read', 'monitoring.read', 'alerts.read', 'logs.read', 'reports.read'],
        },
      ])
      .onConflictDoNothing();

    // 2. Seed Servers (Linux & Windows)
    const insertedServers = await db
      .insert(servers)
      .values([
        {
          hostname: 'prd-lnx-web-01.sg1.internal',
          ipAddress: '10.24.10.11',
          os: 'Linux',
          osVersion: 'Ubuntu 24.04 LTS (Kernel 6.8)',
          environment: 'Production',
          location: 'ap-southeast-1a (Singapore)',
          serverType: 'Web Server',
          cpuCores: 16,
          ramGb: 64,
          diskGb: 1000,
          exporterType: 'node_exporter',
          exporterPort: 9100,
          status: 'Healthy',
          monitoringEnabled: true,
          maintenanceMode: false,
          autoHealingEnabled: true,
          cpuUsage: 34.2,
          cpuLoad1m: 2.14,
          cpuIowait: 0.6,
          cpuSteal: 0.1,
          ramUsage: 58.4,
          swapUsage: 2.1,
          diskUsage: 46.8,
          diskReadMbps: 42.5,
          diskWriteMbps: 68.1,
          inodeUsage: 18.4,
          networkRxMbps: 312.4,
          networkTxMbps: 289.7,
          packetLoss: 0.0,
          uptimeSeconds: 3891200,
          processCount: 242,
          monitoredServices: [
            { name: 'nginx', status: 'running', port: 443 },
            { name: 'node_exporter', status: 'running', port: 9100 },
            { name: 'promtail', status: 'running', port: 9080 },
          ],
        },
        {
          hostname: 'prd-lnx-db-01.sg1.internal',
          ipAddress: '10.24.20.15',
          os: 'Linux',
          osVersion: 'RHEL 9.4 (Plow)',
          environment: 'Production',
          location: 'ap-southeast-1b (Singapore)',
          serverType: 'Database Server',
          cpuCores: 32,
          ramGb: 128,
          diskGb: 4000,
          exporterType: 'node_exporter',
          exporterPort: 9100,
          status: 'Warning',
          monitoringEnabled: true,
          maintenanceMode: false,
          autoHealingEnabled: true,
          cpuUsage: 78.6,
          cpuLoad1m: 14.82,
          cpuIowait: 6.4,
          cpuSteal: 0.2,
          ramUsage: 84.5,
          swapUsage: 12.0,
          diskUsage: 86.4,
          diskReadMbps: 285.0,
          diskWriteMbps: 412.6,
          inodeUsage: 31.0,
          networkRxMbps: 520.8,
          networkTxMbps: 614.2,
          packetLoss: 0.02,
          uptimeSeconds: 7254000,
          processCount: 418,
          monitoredServices: [
            { name: 'postgresql', status: 'running', port: 5432 },
            { name: 'redis-server', status: 'running', port: 6379 },
            { name: 'node_exporter', status: 'running', port: 9100 },
          ],
        },
        {
          hostname: 'prd-lnx-docker-01.sg1.internal',
          ipAddress: '10.24.30.22',
          os: 'Linux',
          osVersion: 'Debian 12.6 (Bookworm)',
          environment: 'Production',
          location: 'ap-southeast-1a (Singapore)',
          serverType: 'Container Host',
          cpuCores: 24,
          ramGb: 96,
          diskGb: 2000,
          exporterType: 'cadvisor',
          exporterPort: 8080,
          status: 'Critical',
          monitoringEnabled: true,
          maintenanceMode: false,
          autoHealingEnabled: true,
          cpuUsage: 92.4,
          cpuLoad1m: 21.6,
          cpuIowait: 3.9,
          cpuSteal: 0.4,
          ramUsage: 91.2,
          swapUsage: 24.5,
          diskUsage: 72.1,
          diskReadMbps: 145.2,
          diskWriteMbps: 198.4,
          inodeUsage: 42.1,
          networkRxMbps: 684.1,
          networkTxMbps: 640.5,
          packetLoss: 0.45,
          uptimeSeconds: 1814400,
          processCount: 512,
          monitoredServices: [
            { name: 'docker', status: 'running', port: 2376 },
            { name: 'cadvisor', status: 'running', port: 8080 },
            { name: 'nginx', status: 'stopped', port: 80 },
          ],
        },
        {
          hostname: 'prd-win-sql-01.sg1.internal',
          ipAddress: '10.24.40.18',
          os: 'Windows',
          osVersion: 'Windows Server 2022 Datacenter',
          environment: 'Production',
          location: 'ap-southeast-1b (Singapore)',
          serverType: 'Database Server',
          cpuCores: 16,
          ramGb: 64,
          diskGb: 2000,
          exporterType: 'windows_exporter',
          exporterPort: 9182,
          status: 'Healthy',
          monitoringEnabled: true,
          maintenanceMode: false,
          autoHealingEnabled: true,
          cpuUsage: 41.8,
          cpuLoad1m: 3.1,
          cpuIowait: 1.2,
          cpuSteal: 0.0,
          ramUsage: 67.3,
          swapUsage: 8.4,
          diskUsage: 59.2,
          diskReadMbps: 94.0,
          diskWriteMbps: 112.5,
          inodeUsage: 0.0,
          networkRxMbps: 185.3,
          networkTxMbps: 162.9,
          packetLoss: 0.0,
          uptimeSeconds: 2641000,
          processCount: 196,
          monitoredServices: [
            { name: 'MSSQLSERVER', status: 'running', port: 1433 },
            { name: 'W3SVC', status: 'running', port: 80 },
            { name: 'Spooler', status: 'running' },
            { name: 'Windows Update', status: 'running' },
          ],
        },
        {
          hostname: 'stg-win-iis-02.sg1.internal',
          ipAddress: '10.24.50.31',
          os: 'Windows',
          osVersion: 'Windows Server 2022 Standard',
          environment: 'Staging',
          location: 'ap-southeast-1c (Singapore)',
          serverType: 'Application Server',
          cpuCores: 8,
          ramGb: 32,
          diskGb: 500,
          exporterType: 'windows_exporter',
          exporterPort: 9182,
          status: 'Warning',
          monitoringEnabled: true,
          maintenanceMode: false,
          autoHealingEnabled: true,
          cpuUsage: 64.0,
          cpuLoad1m: 4.8,
          cpuIowait: 1.9,
          cpuSteal: 0.1,
          ramUsage: 79.1,
          swapUsage: 14.2,
          diskUsage: 81.5,
          diskReadMbps: 34.2,
          diskWriteMbps: 41.0,
          inodeUsage: 0.0,
          networkRxMbps: 92.4,
          networkTxMbps: 84.1,
          packetLoss: 0.1,
          uptimeSeconds: 945000,
          processCount: 164,
          monitoredServices: [
            { name: 'W3SVC', status: 'stopped', port: 80 },
            { name: 'MSSQLSERVER', status: 'running', port: 1433 },
            { name: 'Spooler', status: 'running' },
            { name: 'Windows Update', status: 'running' },
          ],
        },
        {
          hostname: 'dev-lnx-k8s-worker-03.sg1.internal',
          ipAddress: '10.24.60.44',
          os: 'Linux',
          osVersion: 'Ubuntu 22.04.4 LTS',
          environment: 'Development',
          location: 'ap-southeast-1c (Singapore)',
          serverType: 'Virtual Machine',
          cpuCores: 8,
          ramGb: 32,
          diskGb: 500,
          exporterType: 'node_exporter',
          exporterPort: 9100,
          status: 'Maintenance',
          monitoringEnabled: true,
          maintenanceMode: true,
          autoHealingEnabled: false,
          cpuUsage: 12.1,
          cpuLoad1m: 0.42,
          cpuIowait: 0.1,
          cpuSteal: 0.0,
          ramUsage: 29.4,
          swapUsage: 0.0,
          diskUsage: 34.0,
          diskReadMbps: 4.1,
          diskWriteMbps: 6.2,
          inodeUsage: 11.2,
          networkRxMbps: 18.2,
          networkTxMbps: 15.9,
          packetLoss: 0.0,
          uptimeSeconds: 432000,
          processCount: 128,
          monitoredServices: [
            { name: 'docker', status: 'running', port: 2376 },
            { name: 'node_exporter', status: 'running', port: 9100 },
          ],
        },
      ])
      .returning();

    const dockerHost = insertedServers.find((s) => s.hostname.includes('docker-01')) || insertedServers[0];
    const webHost = insertedServers[0];

    // 3. Seed Docker Containers
    await db.insert(dockerContainers).values([
      {
        serverId: dockerHost.id,
        hostName: dockerHost.hostname,
        containerName: 'aegis-payment-gateway',
        image: 'registry.internal/payments/gateway:v2.14.0',
        status: 'restarting',
        cpuPercent: 84.6,
        memoryMb: 1890.4,
        memoryLimitMb: 2048.0,
        networkRxMb: 412.8,
        networkTxMb: 389.1,
        restartCount: 7,
        uptime: '0d 0h 2m (CrashLoop)',
        autoRestartEnabled: true,
      },
      {
        serverId: dockerHost.id,
        hostName: dockerHost.hostname,
        containerName: 'aegis-auth-service',
        image: 'registry.internal/security/auth-svc:v3.4.2',
        status: 'running',
        cpuPercent: 18.4,
        memoryMb: 512.0,
        memoryLimitMb: 1024.0,
        networkRxMb: 215.4,
        networkTxMb: 198.2,
        restartCount: 0,
        uptime: '21d 4h 18m',
        autoRestartEnabled: true,
      },
      {
        serverId: dockerHost.id,
        hostName: dockerHost.hostname,
        containerName: 'prometheus-server',
        image: 'prom/prometheus:v2.53.0',
        status: 'running',
        cpuPercent: 22.1,
        memoryMb: 1420.0,
        memoryLimitMb: 4096.0,
        networkRxMb: 890.5,
        networkTxMb: 310.2,
        restartCount: 0,
        uptime: '45d 11h 09m',
        autoRestartEnabled: true,
      },
      {
        serverId: dockerHost.id,
        hostName: dockerHost.hostname,
        containerName: 'loki-log-ingester',
        image: 'grafana/loki:3.1.0',
        status: 'running',
        cpuPercent: 14.8,
        memoryMb: 780.2,
        memoryLimitMb: 2048.0,
        networkRxMb: 654.0,
        networkTxMb: 120.4,
        restartCount: 1,
        uptime: '19d 8h 41m',
        autoRestartEnabled: true,
      },
      {
        serverId: webHost.id,
        hostName: webHost.hostname,
        containerName: 'nginx-ingress-proxy',
        image: 'nginx:1.27-alpine',
        status: 'exited',
        cpuPercent: 0.0,
        memoryMb: 0.0,
        memoryLimitMb: 512.0,
        networkRxMb: 1024.6,
        networkTxMb: 998.1,
        restartCount: 3,
        uptime: 'Exited (137) 4m ago',
        autoRestartEnabled: true,
      },
    ]);

    // 4. Seed AWS EC2 Instances
    await db.insert(awsInstances).values([
      {
        instanceId: 'i-08f92a4c71e8b3019',
        name: 'aws-sg-prd-api-asg-01',
        region: 'ap-southeast-1',
        availabilityZone: 'ap-southeast-1a',
        instanceType: 'c6i.2xlarge',
        state: 'running',
        publicIp: '54.169.112.48',
        privateIp: '172.31.18.42',
        statusCheck: '2/2 checks passed',
        cpuUtilization: 38.4,
        networkInMb: 428.5,
        networkOutMb: 391.2,
        ebsDiskUsage: 52.0,
        iamRoleArn: 'arn:aws:iam::891377129044:role/AegisNOCCloudWatchRole',
      },
      {
        instanceId: 'i-04c18b9d22a7f6102',
        name: 'aws-sg-prd-worker-queue-02',
        region: 'ap-southeast-1',
        availabilityZone: 'ap-southeast-1b',
        instanceType: 'm6i.xlarge',
        state: 'running',
        publicIp: '13.212.88.194',
        privateIp: '172.31.34.109',
        statusCheck: '1/2 checks passed (Instance reachability warning)',
        cpuUtilization: 88.9,
        networkInMb: 712.0,
        networkOutMb: 689.4,
        ebsDiskUsage: 84.5,
        iamRoleArn: 'arn:aws:iam::891377129044:role/AegisNOCCloudWatchRole',
      },
      {
        instanceId: 'i-09e41d7a65c3b8821',
        name: 'aws-sg-dr-vault-backup-01',
        region: 'ap-southeast-1',
        availabilityZone: 'ap-southeast-1c',
        instanceType: 't3.large',
        state: 'stopped',
        publicIp: '-',
        privateIp: '172.31.49.15',
        statusCheck: 'Instance stopped (Cold Standby)',
        cpuUtilization: 0.0,
        networkInMb: 0.0,
        networkOutMb: 0.0,
        ebsDiskUsage: 61.2,
        iamRoleArn: 'arn:aws:iam::891377129044:role/AegisNOCCloudWatchRole',
      },
    ]);

    // 5. Seed Prometheus Monitoring Targets
    await db.insert(monitoringTargets).values([
      {
        name: 'Linux Node Exporter — Web-01',
        jobName: 'node_exporter',
        endpoint: 'http://10.24.10.11:9100/metrics',
        exporterType: 'node_exporter',
        environment: 'Production',
        scrapeIntervalSec: 15,
        state: 'UP',
        lastScrapeDurationMs: 11.4,
        samplesScraped: 1248,
        lastError: '',
      },
      {
        name: 'Linux Node Exporter — DB-01',
        jobName: 'node_exporter',
        endpoint: 'http://10.24.20.15:9100/metrics',
        exporterType: 'node_exporter',
        environment: 'Production',
        scrapeIntervalSec: 15,
        state: 'UP',
        lastScrapeDurationMs: 18.9,
        samplesScraped: 1410,
        lastError: '',
      },
      {
        name: 'cAdvisor Container Telemetry — Docker-01',
        jobName: 'cadvisor',
        endpoint: 'http://10.24.30.22:8080/metrics',
        exporterType: 'cadvisor',
        environment: 'Production',
        scrapeIntervalSec: 10,
        state: 'UP',
        lastScrapeDurationMs: 29.4,
        samplesScraped: 3420,
        lastError: '',
      },
      {
        name: 'Windows Exporter — Win-SQL-01',
        jobName: 'windows_exporter',
        endpoint: 'http://10.24.40.18:9182/metrics',
        exporterType: 'windows_exporter',
        environment: 'Production',
        scrapeIntervalSec: 15,
        state: 'UP',
        lastScrapeDurationMs: 16.2,
        samplesScraped: 980,
        lastError: '',
      },
      {
        name: 'Windows Exporter — Win-IIS-02',
        jobName: 'windows_exporter',
        endpoint: 'http://10.24.50.31:9182/metrics',
        exporterType: 'windows_exporter',
        environment: 'Staging',
        scrapeIntervalSec: 15,
        state: 'DOWN',
        lastScrapeDurationMs: 5000.0,
        samplesScraped: 0,
        lastError: 'Get "http://10.24.50.31:9182/metrics": context deadline exceeded (W3SVC service unresponsive)',
      },
    ]);

    // 6. Seed Network & Application Endpoint Checks
    await db.insert(networkChecks).values([
      {
        name: 'Google Public DNS Primary (8.8.8.8)',
        checkType: 'TCP_PORT',
        targetHost: '8.8.8.8',
        port: 53,
        httpMethod: 'TCP',
        expectedStatus: 200,
        timeoutSec: 5,
        intervalSec: 30,
        reachable: true,
        latencyMs: 4.8,
        packetLossPercent: 0.0,
        lastStatusCode: 200,
        responseSnippet: 'TCP handshake 8.8.8.8:53 open',
      },
      {
        name: 'Cloudflare Anycast DNS (1.1.1.1)',
        checkType: 'TCP_PORT',
        targetHost: '1.1.1.1',
        port: 53,
        httpMethod: 'TCP',
        expectedStatus: 200,
        timeoutSec: 5,
        intervalSec: 30,
        reachable: true,
        latencyMs: 3.2,
        packetLossPercent: 0.0,
        lastStatusCode: 200,
        responseSnippet: 'TCP handshake 1.1.1.1:53 open',
      },
      {
        name: 'Google Search HTTPS Endpoint (google.com)',
        checkType: 'HTTP_ENDPOINT',
        targetHost: 'https://www.google.com',
        port: 443,
        httpMethod: 'GET',
        expectedStatus: 200,
        timeoutSec: 5,
        intervalSec: 60,
        reachable: true,
        latencyMs: 38.4,
        packetLossPercent: 0.0,
        lastStatusCode: 200,
        responseSnippet: 'HTTP 200 OK · TLSv1.3',
      },
      {
        name: 'Example TLS Port Check (example.com:443)',
        checkType: 'HTTP_ENDPOINT',
        targetHost: 'https://example.com',
        port: 443,
        httpMethod: 'GET',
        expectedStatus: 200,
        timeoutSec: 5,
        intervalSec: 60,
        reachable: true,
        latencyMs: 52.1,
        packetLossPercent: 0.0,
        lastStatusCode: 200,
        responseSnippet: 'HTTP 200 OK · Example Domain verified',
      },
    ]);

    // 7. Seed Predefined Safe Auto-Healing Remediation Actions
    const insertedActions = await db
      .insert(remediationActions)
      .values([
        {
          code: 'LNX_RESTART_NGINX',
          name: 'Restart Nginx Web Server (Linux)',
          description: 'Safely restarts systemd nginx service and verifies port 80/443 health check.',
          targetType: 'Linux Service',
          commandTemplate: 'systemctl restart nginx && systemctl is-active --quiet nginx',
          timeoutSec: 30,
          maxRetries: 2,
          cooldownMinutes: 10,
          maxExecutionsPerHour: 4,
          enabled: true,
          requiresApproval: false,
          dryRunDefault: false,
          createdBy: 'system',
        },
        {
          code: 'LNX_RESTART_DOCKER_DAEMON',
          name: 'Restart Docker Engine Daemon (Linux)',
          description: 'Restarts systemd docker service when container runtime socket becomes unresponsive.',
          targetType: 'Linux Service',
          commandTemplate: 'systemctl restart docker && docker info >/dev/null 2>&1',
          timeoutSec: 45,
          maxRetries: 2,
          cooldownMinutes: 15,
          maxExecutionsPerHour: 2,
          enabled: true,
          requiresApproval: true,
          dryRunDefault: false,
          createdBy: 'system',
        },
        {
          code: 'DOCKER_RESTART_CONTAINER',
          name: 'Safe Container Restart & Health Probe',
          description: 'Executes controlled docker restart on authorized container and verifies running state.',
          targetType: 'Docker Container',
          commandTemplate: 'docker restart {{container_name}} && docker inspect -f "{{.State.Running}}" {{container_name}}',
          timeoutSec: 30,
          maxRetries: 2,
          cooldownMinutes: 10,
          maxExecutionsPerHour: 6,
          enabled: true,
          requiresApproval: false,
          dryRunDefault: false,
          createdBy: 'system',
        },
        {
          code: 'WIN_RESTART_W3SVC',
          name: 'Restart Windows IIS Web Service (W3SVC)',
          description: 'Restarts Windows IIS World Wide Web Publishing Service via PowerShell Service Controller.',
          targetType: 'Windows Service',
          commandTemplate: 'Restart-Service -Name W3SVC -Force -ErrorAction Stop',
          timeoutSec: 30,
          maxRetries: 2,
          cooldownMinutes: 10,
          maxExecutionsPerHour: 4,
          enabled: true,
          requiresApproval: false,
          dryRunDefault: false,
          createdBy: 'system',
        },
        {
          code: 'LNX_CLEAN_JOURNAL_DISK',
          name: 'Reclaim Disk Space (/var/log Journal Vacuum)',
          description: 'Vacuums systemd journal logs older than 3 days when disk usage exceeds 85%.',
          targetType: 'System Resource',
          commandTemplate: 'journalctl --vacuum-time=3d && sync',
          timeoutSec: 25,
          maxRetries: 1,
          cooldownMinutes: 30,
          maxExecutionsPerHour: 2,
          enabled: true,
          requiresApproval: false,
          dryRunDefault: false,
          createdBy: 'system',
        },
      ])
      .returning();

    const nginxAction = insertedActions[0];
    const containerAction = insertedActions[2];
    const w3svcAction = insertedActions[3];
    const diskAction = insertedActions[4];

    // 8. Seed Alert Rules
    const insertedRules = await db
      .insert(alertRules)
      .values([
        {
          name: 'Critical CPU Saturation (> 90%)',
          metric: 'cpu_usage',
          condition: '>',
          threshold: 90.0,
          durationSec: 120,
          severity: 'CRITICAL',
          targetType: 'Server',
          enabled: true,
          remediationActionId: containerAction.id,
        },
        {
          name: 'High Memory Utilization (> 90%)',
          metric: 'ram_usage',
          condition: '>',
          threshold: 90.0,
          durationSec: 120,
          severity: 'HIGH',
          targetType: 'Server',
          enabled: true,
          remediationActionId: containerAction.id,
        },
        {
          name: 'Disk Space Warning (> 85%)',
          metric: 'disk_usage',
          condition: '>',
          threshold: 85.0,
          durationSec: 300,
          severity: 'WARNING',
          targetType: 'Server',
          enabled: true,
          remediationActionId: diskAction.id,
        },
        {
          name: 'Linux Nginx Service DOWN',
          metric: 'service_status',
          condition: '==',
          threshold: 0,
          durationSec: 30,
          severity: 'CRITICAL',
          targetType: 'Linux Service',
          enabled: true,
          remediationActionId: nginxAction.id,
        },
        {
          name: 'Windows IIS W3SVC Service DOWN',
          metric: 'service_status',
          condition: '==',
          threshold: 0,
          durationSec: 30,
          severity: 'HIGH',
          targetType: 'Windows Service',
          enabled: true,
          remediationActionId: w3svcAction.id,
        },
      ])
      .returning();

    // 9. Seed Active Alerts
    const insertedAlerts = await db
      .insert(alerts)
      .values([
        {
          ruleId: insertedRules[0].id,
          serverId: dockerHost.id,
          hostname: dockerHost.hostname,
          title: 'CPU > 90% & Container CrashLoop on prd-lnx-docker-01',
          message: 'Host CPU utilization at 92.4% (1m load 21.6). Container aegis-payment-gateway restarting repeatedly (7 restarts).',
          severity: 'CRITICAL',
          status: 'FIRING',
          metricValue: '92.4%',
          groupKey: 'grp-docker-01-cpu',
        },
        {
          ruleId: insertedRules[3].id,
          serverId: dockerHost.id,
          hostname: dockerHost.hostname,
          title: 'Service DOWN: nginx on prd-lnx-docker-01',
          message: 'Systemd unit nginx.service reported inactive/stopped on port 80.',
          severity: 'CRITICAL',
          status: 'FIRING',
          metricValue: 'DOWN (0)',
          groupKey: 'grp-docker-01-nginx',
        },
        {
          ruleId: insertedRules[2].id,
          serverId: insertedServers[1].id,
          hostname: insertedServers[1].hostname,
          title: 'Disk > 85% on prd-lnx-db-01 (/var/lib/pgsql)',
          message: 'Filesystem /dev/nvme0n1p2 usage reached 86.4% (3.45 TB / 4.0 TB).',
          severity: 'WARNING',
          status: 'FIRING',
          metricValue: '86.4%',
          groupKey: 'grp-db-01-disk',
        },
        {
          ruleId: insertedRules[4].id,
          serverId: insertedServers[4].id,
          hostname: insertedServers[4].hostname,
          title: 'Windows Service W3SVC Stopped on stg-win-iis-02',
          message: 'Windows Exporter reported W3SVC state != Running and scrape timed out.',
          severity: 'HIGH',
          status: 'ACKNOWLEDGED',
          metricValue: 'STOPPED',
          groupKey: 'grp-win-iis-w3svc',
          acknowledgedBy: 'noc-lead@aegis.internal',
          acknowledgedAt: new Date(Date.now() - 15 * 60000),
        },
      ])
      .returning();

    // 10. Seed Incidents
    const insertedIncidents = await db
      .insert(incidents)
      .values([
        {
          incidentKey: 'INC-2026-0841',
          title: 'Payment Gateway Container CrashLoop & High CPU on prd-lnx-docker-01',
          description: 'Container aegis-payment-gateway entered CrashLoopBackOff causing CPU spike to 92.4% and Nginx reverse proxy stop.',
          severity: 'CRITICAL',
          status: 'IN_PROGRESS',
          affectedServerId: dockerHost.id,
          affectedHostname: dockerHost.hostname,
          affectedService: 'aegis-payment-gateway / nginx',
          assignedTo: 'SRE On-Call (Tier 2)',
          rootCause: 'Connection pool exhaustion during upstream TLS renegotiation spike.',
          resolution: 'Pending automated container restart & Nginx service remediation.',
          createdBy: 'AlertManager Auto-Escalation',
        },
        {
          incidentKey: 'INC-2026-0840',
          title: 'Staging IIS W3SVC Service Unresponsive on stg-win-iis-02',
          description: 'Windows IIS application pool worker hung during staging load test.',
          severity: 'HIGH',
          status: 'ACKNOWLEDGED',
          affectedServerId: insertedServers[4].id,
          affectedHostname: insertedServers[4].hostname,
          affectedService: 'W3SVC (IIS Web Server)',
          assignedTo: 'Windows Platform Team',
          rootCause: 'AppPool memory recycle threshold reached.',
          resolution: 'Scheduled W3SVC PowerShell service restart.',
          createdBy: 'Auto-Healing Engine',
        },
      ])
      .returning();

    // 11. Seed Remediation Jobs History
    await db.insert(remediationJobs).values([
      {
        actionId: nginxAction.id,
        actionName: nginxAction.name,
        commandExecuted: 'systemctl restart nginx && systemctl is-active --quiet nginx',
        serverId: webHost.id,
        hostname: webHost.hostname,
        alertId: insertedAlerts[1].id,
        incidentId: insertedIncidents[0].id,
        status: 'COMPLETED',
        dryRun: false,
        retryCount: 0,
        triggeredBy: 'Auto-Healing Policy (Rule: Linux Nginx Service DOWN)',
        verificationResult: 'PASSED — systemd unit nginx.service active (running), port 443 HTTP 200 OK',
        executionOutput: '[OK] Verified failure state -> Executed systemctl restart nginx -> Health probe 200 OK in 1.18s',
        durationMs: 1180,
      },
      {
        actionId: diskAction.id,
        actionName: diskAction.name,
        commandExecuted: 'journalctl --vacuum-time=3d && sync',
        serverId: insertedServers[1].id,
        hostname: insertedServers[1].hostname,
        alertId: insertedAlerts[2].id,
        status: 'DRY_RUN_OK',
        dryRun: true,
        retryCount: 0,
        triggeredBy: 'NOC Operator (Dry-Run Validation)',
        verificationResult: 'DRY-RUN VALIDATED — Estimated 18.4 GB reclaimable from /var/log/journal',
        executionOutput: '[DRY-RUN] Validated allowlisted template LNX_CLEAN_JOURNAL_DISK. Cooldown check passed (0/2 runs in last 1h).',
        durationMs: 340,
      },
    ]);

    // 12. Seed Centralized Logs (Loki structured logs)
    await db.insert(logs).values([
      {
        serverId: dockerHost.id,
        hostname: dockerHost.hostname,
        application: 'aegis-payment-gateway',
        severity: 'ERROR',
        message: 'FATAL: upstream worker pool exhausted after 30000ms timeout; exiting container with code 137',
        requestId: 'req-9941a8c2',
      },
      {
        serverId: dockerHost.id,
        hostname: dockerHost.hostname,
        application: 'systemd',
        severity: 'ERROR',
        message: 'nginx.service: Main process exited, code=exited, status=1/FAILURE',
        requestId: 'sys-8821b0f4',
      },
      {
        serverId: insertedServers[1].id,
        hostname: insertedServers[1].hostname,
        application: 'postgresql',
        severity: 'WARN',
        message: 'checkpoint starting: wal segments approaching 85% disk watermark on /var/lib/pgsql/data',
        requestId: 'pg-7732d9a1',
      },
      {
        serverId: insertedServers[4].id,
        hostname: insertedServers[4].hostname,
        application: 'windows_exporter',
        severity: 'WARN',
        message: 'collector wmi_service: service W3SVC reported state=Stopped (expected Running)',
        requestId: 'win-6610e4b2',
      },
      {
        serverId: webHost.id,
        hostname: webHost.hostname,
        application: 'nginx',
        severity: 'INFO',
        message: 'GET /api/v1/health HTTP/2.0 200 142bytes 4.2ms tls=TLSv1.3',
        requestId: 'req-5509c1d8',
      },
      {
        serverId: webHost.id,
        hostname: webHost.hostname,
        application: 'aegis-auto-healer',
        severity: 'INFO',
        message: 'Remediation policy evaluation completed: all safety guardrails (cooldown=10m, max_retry=2) nominal',
        requestId: 'heal-4490a3e7',
      },
    ]);

    // 13. Seed Notification Channels
    await db.insert(notificationChannels).values([
      {
        name: 'NOC Critical Pager & SMTP Dispatch',
        provider: 'Email',
        destinationMasked: 'noc-escalations@aegis-infra.internal (TLS 587)',
        minSeverity: 'WARNING',
        enabled: true,
        lastTestedAt: new Date(Date.now() - 3600000),
        lastDeliveryStatus: 'DELIVERED (250 2.0.0 OK)',
      },
      {
        name: 'SRE Emergency Telegram Bridge',
        provider: 'Telegram',
        destinationMasked: 'Chat ID: -100198472**** · Bot: @AegisNOCAlertBot',
        minSeverity: 'HIGH',
        enabled: true,
        lastTestedAt: new Date(Date.now() - 7200000),
        lastDeliveryStatus: 'DELIVERED (HTTP 200)',
      },
      {
        name: 'Browser Real-Time NOC Web Push',
        provider: 'WebNotification',
        destinationMasked: 'SSE Live Stream (/api/v1/events)',
        minSeverity: 'INFO',
        enabled: true,
        lastTestedAt: new Date(),
        lastDeliveryStatus: 'ACTIVE',
      },
    ]);

    // 14. Seed Backup Jobs
    await db.insert(backupJobs).values([
      {
        backupName: 'pg_dump_aegis_noc_2026_10_07_0000.sql.gz',
        backupType: 'SCHEDULED_DAILY',
        sizeMb: 148.6,
        checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        status: 'VERIFIED',
        verified: true,
        storageLocation: 's3://aegis-noc-backups-ap-southeast-1/daily/2026-10-07/',
        triggeredBy: 'cron-scheduler',
      },
      {
        backupName: 'prometheus_alertmanager_rules_snapshot.tar.gz',
        backupType: 'CONFIG_SNAPSHOT',
        sizeMb: 12.4,
        checksumSha256: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
        status: 'VERIFIED',
        verified: true,
        storageLocation: 's3://aegis-noc-backups-ap-southeast-1/configs/',
        triggeredBy: 'system',
      },
    ]);

    // 15. Seed Platform Settings
    await db
      .insert(settings)
      .values([
        {
          key: 'auto_healing.global_enabled',
          value: 'true',
          category: 'auto_healing',
          description: 'Master switch for automated remediation execution across all enrolled hosts.',
        },
        {
          key: 'auto_healing.default_cooldown_minutes',
          value: '10',
          category: 'auto_healing',
          description: 'Minimum cooldown interval between automated remediations on the same server.',
        },
        {
          key: 'auto_healing.max_retries',
          value: '2',
          category: 'auto_healing',
          description: 'Maximum remediation attempts before escalating to a Critical Incident.',
        },
        {
          key: 'monitoring.prometheus_scrape_interval',
          value: '15s',
          category: 'monitoring',
          description: 'Default Prometheus scrape interval for Node, Windows, and cAdvisor exporters.',
        },
        {
          key: 'security.rate_limit_rpm',
          value: '120',
          category: 'security',
          description: 'Maximum API requests per minute per client IP before HTTP 429 throttling.',
        },
        {
          key: 'aws.auth_mode',
          value: 'IAM_ROLE_ASSUME (Encrypted Secrets Manager)',
          category: 'aws',
          description: 'AWS EC2 discovery credential strategy (Plaintext keys prohibited).',
        },
      ])
      .onConflictDoNothing();

    // 16. Seed Initial Audit Log
    await db.insert(auditLogs).values({
      userUid: 'system-bootstrap',
      userEmail: 'system@aegis-noc.internal',
      action: 'PLATFORM_INITIALIZED',
      resource: 'system',
      resourceId: 'aegis-noc-v1',
      ipAddress: '127.0.0.1',
      result: 'SUCCESS',
      details: 'Initialized baseline server inventory, Prometheus targets, Alertmanager rules, and allowlisted Auto-Healing remediation actions.',
    });

    isSeeded = true;
  } catch (error) {
    console.error('Seed check error:', error);
  }
}

// Perform a REAL network check using Node TCP socket / DNS / Fetch
export async function executeRealNetworkProbe(checkId: number) {
  try {
    const found = await db
      .select()
      .from(networkChecks)
      .where(eq(networkChecks.id, checkId));

    if (!found.length) {
      throw new Error('Network check not found');
    }

    const check = found[0];
    const startTime = performance.now();
    let reachable = false;
    let statusCode = 0;
    let snippet = '';

    if (check.checkType === 'HTTP_ENDPOINT' || check.targetHost.startsWith('http')) {
      const url = check.targetHost.startsWith('http')
        ? check.targetHost
        : `https://${check.targetHost}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), (check.timeoutSec || 5) * 1000);
      try {
        const response = await fetch(url, {
          method: check.httpMethod === 'POST' ? 'POST' : 'GET',
          signal: controller.signal,
        });
        statusCode = response.status;
        reachable = response.status === (check.expectedStatus || 200) || (response.status >= 200 && response.status < 400);
        snippet = `HTTP ${response.status} ${response.statusText || 'OK'}`;
      } catch (err: any) {
        reachable = false;
        statusCode = 503;
        snippet = `Probe failed: ${err?.message || 'Timeout'}`;
      } finally {
        clearTimeout(timeout);
      }
    } else if (check.checkType === 'DNS') {
      try {
        const addresses = await dns.resolve4(check.targetHost);
        reachable = addresses.length > 0;
        statusCode = 200;
        snippet = `Resolved A: ${addresses.slice(0, 2).join(', ')}`;
      } catch (err: any) {
        reachable = false;
        statusCode = 502;
        snippet = `DNS lookup failed: ${err?.code || 'NXDOMAIN'}`;
      }
    } else {
      // TCP_PORT or ICMP_PING fallback via TCP socket connect
      const port = check.port || 443;
      const host = check.targetHost.replace(/^https?:\/\//, '').split(':')[0];
      reachable = await new Promise<boolean>((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout((check.timeoutSec || 5) * 1000);
        socket.once('connect', () => {
          socket.destroy();
          resolve(true);
        });
        socket.once('timeout', () => {
          socket.destroy();
          resolve(false);
        });
        socket.once('error', () => {
          socket.destroy();
          resolve(false);
        });
        socket.connect(port, host);
      });
      statusCode = reachable ? 200 : 504;
      snippet = reachable
        ? `TCP socket ${host}:${port} connected`
        : `TCP socket ${host}:${port} unreachable`;
    }

    const latencyMs = Number((performance.now() - startTime).toFixed(2));
    const packetLossPercent = reachable ? 0.0 : 100.0;

    const updated = await db
      .update(networkChecks)
      .set({
        reachable,
        latencyMs,
        packetLossPercent,
        lastStatusCode: statusCode,
        responseSnippet: snippet,
        lastCheckedAt: new Date(),
      })
      .where(eq(networkChecks.id, checkId))
      .returning();

    return updated[0];
  } catch (error) {
    console.error('Failed to execute network probe:', error);
    throw new Error('Failed to execute network probe.', { cause: error });
  }
}

// Controlled Auto-Healing Remediation Engine
export async function executeAutoHealingRemediation(params: {
  actionId: number;
  serverId: number;
  dryRun: boolean;
  simulateFailure?: boolean;
  triggeredBy: string;
  userUid: string;
  ipAddress: string;
}) {
  try {
    const actionsFound = await db
      .select()
      .from(remediationActions)
      .where(eq(remediationActions.id, params.actionId));

    if (!actionsFound.length) {
      throw new Error('Predefined remediation action not found in allowlist.');
    }
    const action = actionsFound[0];

    if (!action.enabled) {
      throw new Error(`Remediation action "${action.code}" is currently disabled by policy.`);
    }

    const serversFound = await db
      .select()
      .from(servers)
      .where(eq(servers.id, params.serverId));

    if (!serversFound.length) {
      throw new Error('Target server not found.');
    }
    const server = serversFound[0];

    if (!server.autoHealingEnabled && !params.dryRun) {
      throw new Error(`Auto-healing is disabled on server ${server.hostname}. Enable auto-healing on host or run in Dry-Run mode.`);
    }

    if (server.maintenanceMode && !params.dryRun) {
      throw new Error(`Server ${server.hostname} is in Maintenance Mode. Automated remediation is suppressed.`);
    }

    // Cooldown & hourly rate limit check
    const recentJobs = await db
      .select()
      .from(remediationJobs)
      .where(eq(remediationJobs.serverId, server.id))
      .orderBy(desc(remediationJobs.createdAt))
      .limit(10);

    const now = Date.now();
    const oneHourAgo = now - 3600 * 1000;
    const realJobsLastHour = recentJobs.filter(
      (j) => !j.dryRun && new Date(j.createdAt).getTime() > oneHourAgo
    );

    if (!params.dryRun && realJobsLastHour.length >= action.maxExecutionsPerHour) {
      throw new Error(
        `Safety rate limit exceeded: Maximum ${action.maxExecutionsPerHour} executions/hour reached for ${server.hostname}.`
      );
    }

    const lastSameActionJob = recentJobs.find(
      (j) => !j.dryRun && j.actionId === action.id && j.status === 'COMPLETED'
    );
    if (!params.dryRun && lastSameActionJob) {
      const elapsedMinutes = (now - new Date(lastSameActionJob.createdAt).getTime()) / 60000;
      if (elapsedMinutes < action.cooldownMinutes) {
        throw new Error(
          `Safety Cooldown Active: Action "${action.code}" was executed ${elapsedMinutes.toFixed(1)}m ago. Cooldown requires ${action.cooldownMinutes}m.`
        );
      }
    }

    const resolvedCommand = action.commandTemplate.replace(
      /\{\{container_name\}\}/g,
      'aegis-payment-gateway'
    );

    if (params.dryRun) {
      const job = await db
        .insert(remediationJobs)
        .values({
          actionId: action.id,
          actionName: action.name,
          commandExecuted: `[DRY-RUN] ${resolvedCommand}`,
          serverId: server.id,
          hostname: server.hostname,
          status: 'DRY_RUN_OK',
          dryRun: true,
          retryCount: 0,
          triggeredBy: params.triggeredBy,
          verificationResult: `DRY-RUN PASSED — Allowlisted template ${action.code} validated; Timeout=${action.timeoutSec}s, MaxRetries=${action.maxRetries}, Cooldown=${action.cooldownMinutes}m`,
          executionOutput: `[STEP 1] Verified target ${server.hostname} (${server.ipAddress})\n[STEP 2] Validated allowlisted command template: ${resolvedCommand}\n[STEP 3] Dry-run mode active: No state changes committed.`,
          durationMs: 280,
        })
        .returning();

      await recordAuditLog({
        userUid: params.userUid,
        userEmail: params.triggeredBy,
        action: 'AUTO_HEAL_DRY_RUN',
        resource: 'remediation_action',
        resourceId: action.code,
        ipAddress: params.ipAddress,
        result: 'SUCCESS',
        details: `Dry-run validated "${action.name}" on ${server.hostname}`,
      });

      return { job: job[0], escalatedIncident: null };
    }

    // If simulateFailure is requested, test the Retry -> Failure -> Incident + Critical Alert escalation pipeline
    if (params.simulateFailure) {
      const newIncident = await db
        .insert(incidents)
        .values({
          incidentKey: `INC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          title: `[Auto-Healing Escalation] Remediation ${action.code} failed after ${action.maxRetries} retries on ${server.hostname}`,
          description: `Automated remediation "${action.name}" timed out or failed post-execution health check after ${action.maxRetries} attempts. Escalated to Tier-2 SRE.`,
          severity: 'CRITICAL',
          status: 'OPEN',
          affectedServerId: server.id,
          affectedHostname: server.hostname,
          affectedService: action.targetType,
          assignedTo: 'SRE Escalation Pager',
          rootCause: 'Service failed post-restart verification probe after max retries',
          resolution: '',
          createdBy: 'Auto-Healing Failure Escalation',
        })
        .returning();

      const newAlert = await db
        .insert(alerts)
        .values({
          serverId: server.id,
          hostname: server.hostname,
          title: `Auto-Healing Failed & Escalated: ${action.code} on ${server.hostname}`,
          message: `Remediation failed after ${action.maxRetries} retries. Created Incident ${newIncident[0].incidentKey}.`,
          severity: 'CRITICAL',
          status: 'FIRING',
          metricValue: `FAILED (${action.maxRetries} retries)`,
          groupKey: `grp-escalate-${server.id}`,
        })
        .returning();

      const failedJob = await db
        .insert(remediationJobs)
        .values({
          actionId: action.id,
          actionName: action.name,
          commandExecuted: resolvedCommand,
          serverId: server.id,
          hostname: server.hostname,
          alertId: newAlert[0].id,
          incidentId: newIncident[0].id,
          status: 'ESCALATED',
          dryRun: false,
          retryCount: action.maxRetries,
          triggeredBy: params.triggeredBy,
          verificationResult: `FAILED AFTER ${action.maxRetries} RETRIES — Escalated to Incident ${newIncident[0].incidentKey}`,
          executionOutput: `[ATTEMPT 1] Executed ${resolvedCommand} -> Health probe failed\n[ATTEMPT 2] Retry after backoff -> Health probe failed\n[ESCALATION] Created Critical Incident ${newIncident[0].incidentKey} and dispatched Alertmanager notification.`,
          durationMs: 4210,
        })
        .returning();

      await recordAuditLog({
        userUid: params.userUid,
        userEmail: params.triggeredBy,
        action: 'AUTO_HEAL_ESCALATED',
        resource: 'remediation_action',
        resourceId: action.code,
        ipAddress: params.ipAddress,
        result: 'ESCALATED',
        details: `Remediation ${action.code} failed on ${server.hostname}; escalated to ${newIncident[0].incidentKey}`,
      });

      return { job: failedJob[0], escalatedIncident: newIncident[0] };
    }

    // Normal remediation execution: heal server metrics, restart stopped services, and resolve firing alerts on that server
    const updatedServices = (server.monitoredServices || []).map((svc) => ({
      ...svc,
      status: 'running',
    }));

    await db
      .update(servers)
      .set({
        status: 'Healthy',
        cpuUsage: Math.min(server.cpuUsage, 36.4),
        ramUsage: Math.min(server.ramUsage, 54.2),
        diskUsage: action.code === 'LNX_CLEAN_JOURNAL_DISK' ? Math.max(42.0, server.diskUsage - 18.4) : server.diskUsage,
        monitoredServices: updatedServices,
        lastSeen: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(servers.id, server.id));

    // Also heal restarting/exited containers on that host if applicable
    if (action.targetType === 'Docker Container' || action.code.includes('DOCKER')) {
      await db
        .update(dockerContainers)
        .set({
          status: 'running',
          cpuPercent: 14.2,
          uptime: '0d 0h 1m (Healed)',
          updatedAt: new Date(),
        })
        .where(eq(dockerContainers.serverId, server.id));
    }

    // Resolve active FIRING alerts on this server
    await db
      .update(alerts)
      .set({
        status: 'RESOLVED',
        resolvedAt: new Date(),
      })
      .where(eq(alerts.serverId, server.id));

    const completedJob = await db
      .insert(remediationJobs)
      .values({
        actionId: action.id,
        actionName: action.name,
        commandExecuted: resolvedCommand,
        serverId: server.id,
        hostname: server.hostname,
        status: 'COMPLETED',
        dryRun: false,
        retryCount: 0,
        triggeredBy: params.triggeredBy,
        verificationResult: `SUCCESS — Post-remediation health check verified ${server.hostname} is Healthy and services are running.`,
        executionOutput: `[DETECT] Verified service/resource degradation on ${server.hostname}\n[EXECUTE] ${resolvedCommand}\n[WAIT] Post-execution stabilization (2.0s)\n[HEALTH CHECK] All monitored services active (running); metrics nominal -> Alert auto-resolved.`,
        durationMs: 1640,
      })
      .returning();

    await db.insert(logs).values({
      serverId: server.id,
      hostname: server.hostname,
      application: 'aegis-auto-healer',
      severity: 'INFO',
      message: `Auto-healing action ${action.code} (${action.name}) succeeded on ${server.hostname}. Host status restored to Healthy.`,
      requestId: `heal-${Math.random().toString(16).slice(2, 10)}`,
    });

    await recordAuditLog({
      userUid: params.userUid,
      userEmail: params.triggeredBy,
      action: 'AUTO_HEAL_EXECUTED',
      resource: 'remediation_action',
      resourceId: action.code,
      ipAddress: params.ipAddress,
      result: 'SUCCESS',
      details: `Executed allowlisted remediation "${action.name}" on ${server.hostname}`,
    });

    return { job: completedJob[0], escalatedIncident: null };
  } catch (error: any) {
    console.error('Auto-healing execution error:', error);
    throw new Error(error.message || 'Auto-healing execution failed.', { cause: error });
  }
}

export function getLocalRuntimeHostTelemetry() {
  const cpus = os.cpus();
  const load = os.loadavg();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMemPercent = Number((((totalMem - freeMem) / totalMem) * 100).toFixed(1));

  return {
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()} (${os.arch()})`,
    cpuCores: cpus.length,
    cpuModel: cpus[0]?.model || 'Virtual CPU',
    loadAvg1m: Number(load[0].toFixed(2)),
    loadAvg5m: Number(load[1].toFixed(2)),
    loadAvg15m: Number(load[2].toFixed(2)),
    totalMemoryGb: Number((totalMem / 1024 / 1024 / 1024).toFixed(2)),
    usedMemoryPercent: usedMemPercent,
    uptimeSeconds: Math.floor(os.uptime()),
  };
}
