import React, { useState } from 'react';
import {
  Activity,
  Play,
  RefreshCw,
  ShieldCheck,
  Terminal,
  Download,
  FileText,
  Database,
  Bell,
  Users,
  Settings,
  Lock,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Globe,
  Cloud,
  Box,
} from 'lucide-react';
import {
  ServerItem,
  MonitoringTargetItem,
  RemediationActionItem,
  RemediationJobItem,
  DockerContainerItem,
  AwsInstanceItem,
  NetworkCheckItem,
  LogItem,
  BackupJobItem,
  UserItem,
  RoleItem,
  NotificationChannelItem,
  SettingItem,
  AuditLogItem,
  AlertItem,
  IncidentItem,
} from '../types.ts';

interface ApiCaller {
  (path: string, options?: RequestInit): Promise<any>;
}

// 1. Monitoring (Prometheus Targets + Grafana Dashboards)
export const MonitoringView: React.FC<{
  servers: ServerItem[];
  targets: MonitoringTargetItem[];
  onTestServer: (serverId: number) => Promise<void>;
}> = ({ servers, targets, onTestServer }) => {
  const [selectedEnv, setSelectedEnv] = useState<string>('All');
  const [selectedServerId, setSelectedServerId] = useState<number>(servers[0]?.id || 0);
  const [timeRange, setTimeRange] = useState<string>('1h');
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'cpu' | 'memory' | 'disk' | 'network'>('overview');

  const filteredServers = servers.filter(
    (s) => selectedEnv === 'All' || s.environment === selectedEnv
  );
  const activeServer =
    filteredServers.find((s) => s.id === selectedServerId) ||
    filteredServers[0] ||
    servers[0];

  const filteredTargets = targets.filter(
    (t) => selectedEnv === 'All' || t.environment === selectedEnv
  );

  // Deterministic time-series points anchored on activeServer's real metrics
  const generateSeries = (baseValue: number, variance: number, points = 12) => {
    return Array.from({ length: points }, (_, idx) => {
      const wave = Math.sin(idx * 0.65 + (activeServer?.id || 1)) * variance;
      return Math.max(0, Math.min(100, Number((baseValue + wave).toFixed(1))));
    });
  };

  const cpuSeries = activeServer ? generateSeries(activeServer.cpuUsage, 6.5) : [];
  const ramSeries = activeServer ? generateSeries(activeServer.ramUsage, 3.2) : [];
  const diskSeries = activeServer ? generateSeries(activeServer.diskUsage, 1.1) : [];
  const netRxSeries = activeServer ? generateSeries(Math.min(95, activeServer.networkRxMbps / 8), 8.0) : [];

  return (
    <div className="space-y-8">
      {/* Prometheus Target Health Section */}
      <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Prometheus Scrape Targets & Exporter Health
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Live scrape telemetry across Node Exporter, Windows Exporter, and cAdvisor endpoints
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-md">
            {['All', 'Production', 'Staging', 'Development'].map((env) => (
              <button
                key={env}
                onClick={() => setSelectedEnv(env)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  selectedEnv === env
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {env}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                <th className="py-3 pr-4">Target Name</th>
                <th className="py-3 px-4">Endpoint</th>
                <th className="py-3 px-4">Exporter · Env</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4 text-right">Interval</th>
                <th className="py-3 px-4 text-right">Scrape Duration</th>
                <th className="py-3 pl-4 text-right">Samples</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {filteredTargets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{t.name}</div>
                    {t.lastError && (
                      <div className="text-xs text-red-600 dark:text-red-400 font-mono mt-0.5">
                        Error: {t.lastError}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                    {t.endpoint}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                    {t.exporterType} · {t.environment}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-mono font-medium ${
                        t.state === 'UP'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {t.state === 'UP' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      {t.state}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300">
                    {t.scrapeIntervalSec}s
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300">
                    {t.lastScrapeDurationMs.toFixed(1)} ms
                  </td>
                  <td className="py-3 pl-4 text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300">
                    {t.samplesScraped.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Grafana Integrated Telemetry Explorer */}
      {activeServer && (
        <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Grafana Telemetry Explorer — {activeServer.hostname}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {activeServer.ipAddress} · {activeServer.os} ({activeServer.osVersion}) · Exporter: {activeServer.exporterType}:{activeServer.exporterPort}
              </p>
            </div>

            {/* Dashboard Variables */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={activeServer.id}
                onChange={(e) => setSelectedServerId(Number(e.target.value))}
                className="px-3 py-1.5 text-xs font-mono border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded"
              >
                {servers.map((srv) => (
                  <option key={srv.id} value={srv.id}>
                    Host: {srv.hostname} ({srv.os})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded">
                {['15m', '1h', '6h', '24h'].map((rng) => (
                  <button
                    key={rng}
                    onClick={() => setTimeRange(rng)}
                    className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                      timeRange === rng
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {rng}
                  </button>
                ))}
              </div>

              <button
                onClick={() => onTestServer(activeServer.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Probe Exporter
              </button>
            </div>
          </div>

          {/* Panel Selector */}
          <div className="flex items-center gap-2 mt-4 pb-4 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
            {[
              { id: 'overview', label: 'Server Overview' },
              { id: 'cpu', label: 'CPU & Load Average' },
              { id: 'memory', label: 'Memory & Swap' },
              { id: 'disk', label: 'Disk I/O & Inodes' },
              { id: 'network', label: 'Network RX/TX & Packet Loss' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDashboardTab(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  dashboardTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Telemetry Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
            <div className="border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                CPU Utilization ({activeServer.cpuCores} Cores)
              </div>
              <div className="text-2xl font-mono font-semibold tabular-nums text-slate-900 dark:text-white mt-1">
                {activeServer.cpuUsage.toFixed(1)}%
              </div>
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
                Load 1m: {activeServer.cpuLoad1m} · iowait: {activeServer.cpuIowait}% · steal: {activeServer.cpuSteal}%
              </div>
              <div className="mt-3 flex items-end gap-1 h-14">
                {cpuSeries.map((val, i) => (
                  <div
                    key={i}
                    style={{ height: `${Math.max(12, val)}%` }}
                    className={`flex-1 ${
                      val > 85 ? 'bg-red-500' : val > 70 ? 'bg-amber-500' : 'bg-blue-600'
                    }`}
                    title={`T-${12 - i}: ${val}%`}
                  />
                ))}
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Memory Usage ({activeServer.ramGb} GB Total)
              </div>
              <div className="text-2xl font-mono font-semibold tabular-nums text-slate-900 dark:text-white mt-1">
                {activeServer.ramUsage.toFixed(1)}%
              </div>
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
                Used: {((activeServer.ramGb * activeServer.ramUsage) / 100).toFixed(1)} GB · Swap: {activeServer.swapUsage}%
              </div>
              <div className="mt-3 flex items-end gap-1 h-14">
                {ramSeries.map((val, i) => (
                  <div
                    key={i}
                    style={{ height: `${Math.max(12, val)}%` }}
                    className={`flex-1 ${
                      val > 85 ? 'bg-red-500' : val > 75 ? 'bg-amber-500' : 'bg-emerald-600'
                    }`}
                    title={`T-${12 - i}: ${val}%`}
                  />
                ))}
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Disk & I/O ({activeServer.diskGb} GB Volume)
              </div>
              <div className="text-2xl font-mono font-semibold tabular-nums text-slate-900 dark:text-white mt-1">
                {activeServer.diskUsage.toFixed(1)}%
              </div>
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
                R: {activeServer.diskReadMbps} MB/s · W: {activeServer.diskWriteMbps} MB/s · Inodes: {activeServer.inodeUsage}%
              </div>
              <div className="mt-3 flex items-end gap-1 h-14">
                {diskSeries.map((val, i) => (
                  <div
                    key={i}
                    style={{ height: `${Math.max(12, val)}%` }}
                    className={`flex-1 ${val > 85 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                    title={`T-${12 - i}: ${val}%`}
                  />
                ))}
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Network Throughput (eth0)
              </div>
              <div className="text-2xl font-mono font-semibold tabular-nums text-slate-900 dark:text-white mt-1">
                {activeServer.networkRxMbps.toFixed(1)} Mbps
              </div>
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
                TX: {activeServer.networkTxMbps} Mbps · Loss: {activeServer.packetLoss}%
              </div>
              <div className="mt-3 flex items-end gap-1 h-14">
                {netRxSeries.map((val, i) => (
                  <div
                    key={i}
                    style={{ height: `${Math.max(12, val)}%` }}
                    className="flex-1 bg-cyan-600"
                    title={`T-${12 - i}: ${val}%`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Monitored Linux/Windows Services on Selected Host */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Monitored {activeServer.os} Services & Daemons ({activeServer.monitoredServices.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeServer.monitoredServices.map((svc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800"
                >
                  <div>
                    <div className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {svc.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {svc.port ? `Port ${svc.port}` : 'System Service'}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-mono font-medium ${
                      svc.status === 'running'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {svc.status === 'running' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    {svc.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

// 2. Auto-Healing & Controlled Remediation Engine View
export const AutomationView: React.FC<{
  servers: ServerItem[];
  actions: RemediationActionItem[];
  jobs: RemediationJobItem[];
  apiCall: ApiCaller;
  onRefresh: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}> = ({ servers, actions, jobs, apiCall, onRefresh, showToast }) => {
  const [selectedActionId, setSelectedActionId] = useState<number>(actions[0]?.id || 1);
  const [selectedServerId, setSelectedServerId] = useState<number>(
    servers.find((s) => s.status === 'Critical' || s.status === 'Warning')?.id || servers[0]?.id || 1
  );
  const [dryRun, setDryRun] = useState<boolean>(false);
  const [simulateFailure, setSimulateFailure] = useState<boolean>(false);
  const [executing, setExecuting] = useState<boolean>(false);

  const handleExecuteRemediation = async (e: React.FormEvent) => {
    e.preventDefault();
    setExecuting(true);
    try {
      const res = await apiCall('/api/v1/remediation/execute', {
        method: 'POST',
        body: JSON.stringify({
          actionId: selectedActionId,
          serverId: selectedServerId,
          dryRun,
          simulateFailure,
        }),
      });
      if (res.escalatedIncident) {
        showToast(
          `Remediation failed after retries -> Auto-escalated to Incident ${res.escalatedIncident.incidentKey}`,
          'error'
        );
      } else {
        showToast(
          dryRun
            ? `Dry-Run validated for ${res.job.actionName}`
            : `Auto-Healing succeeded: ${res.job.actionName} on ${res.job.hostname}`,
          'success'
        );
      }
      await onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Auto-healing blocked by safety guardrail', 'error');
    } finally {
      setExecuting(false);
    }
  };

  const handleToggleActionPolicy = async (action: RemediationActionItem, field: 'enabled' | 'requiresApproval') => {
    try {
      await apiCall(`/api/v1/remediation/actions/${action.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: !action[field] }),
      });
      showToast(`Updated safety policy for ${action.code}`, 'success');
      await onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to update policy', 'error');
    }
  };

  return (
    <div className="space-y-8">
      {/* Controlled Auto-Healing Execution Console */}
      <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Controlled Auto-Healing & Remediation Engine
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Executes strictly allowlisted, timeout-protected remediation templates with cooldown, retry, and failure escalation
            </p>
          </div>
          <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Arbitrary Shell Execution Blocked · Allowlist Enforced
          </div>
        </div>

        <form onSubmit={handleExecuteRemediation} className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          <div className="lg:col-span-4">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              1. Predefined Remediation Action (Allowlist Only)
            </label>
            <select
              value={selectedActionId}
              onChange={(e) => setSelectedActionId(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded"
            >
              {actions.map((act) => (
                <option key={act.id} value={act.id}>
                  [{act.code}] {act.name}
                </option>
              ))}
            </select>
            {actions.find((a) => a.id === selectedActionId) && (
              <div className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-600 dark:text-slate-300">
                Template: {actions.find((a) => a.id === selectedActionId)?.commandTemplate}
              </div>
            )}
          </div>

          <div className="lg:col-span-4">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              2. Target Infrastructure Host
            </label>
            <select
              value={selectedServerId}
              onChange={(e) => setSelectedServerId(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded"
            >
              {servers.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  {srv.hostname} ({srv.ipAddress}) — Status: {srv.status}
                </option>
              ))}
            </select>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Workflow: Detection → Verify Failure → Execute Allowlisted Action → Wait → Health Check → Resolve or Escalate
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col justify-between">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => {
                    setDryRun(e.target.checked);
                    if (e.target.checked) setSimulateFailure(false);
                  }}
                  className="rounded border-slate-300"
                />
                Dry-Run Mode (Validate policy & cooldown without restarting service)
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simulateFailure}
                  onChange={(e) => {
                    setSimulateFailure(e.target.checked);
                    if (e.target.checked) setDryRun(false);
                  }}
                  className="rounded border-slate-300"
                />
                Simulate Post-Execution Health Check Failure (Tests Retry → Incident Escalation)
              </label>
            </div>

            <button
              type="submit"
              disabled={executing}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <Play className="w-4 h-4" />
              {executing
                ? 'Executing Controlled Workflow...'
                : dryRun
                ? 'Run Dry-Run Policy Validation'
                : 'Execute Approved Remediation'}
            </button>
          </div>
        </form>
      </section>

      {/* Predefined Remediation Actions & Safety Controls Table */}
      <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Allowlisted Remediation Catalog & Safety Guardrails
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                <th className="py-3 pr-4">Code · Action Name</th>
                <th className="py-3 px-4">Target Type</th>
                <th className="py-3 px-4">Command Template</th>
                <th className="py-3 px-4 text-right">Timeout · Retries · Cooldown</th>
                <th className="py-3 px-4">Approval Mode</th>
                <th className="py-3 pl-4 text-right">Policy State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {actions.map((act) => (
                <tr key={act.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 pr-4">
                    <div className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {act.code}
                    </div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">{act.name}</div>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                    {act.targetType}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                    {act.commandTemplate}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300">
                    {act.timeoutSec}s · Max {act.maxRetries} · {act.cooldownMinutes}m ({act.maxExecutionsPerHour}/hr)
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleToggleActionPolicy(act, 'requiresApproval')}
                      className="text-xs font-mono underline text-slate-700 dark:text-slate-300 hover:text-blue-600"
                    >
                      {act.requiresApproval ? 'Manual Approval Required' : 'Autonomous Execution'}
                    </button>
                  </td>
                  <td className="py-3 pl-4 text-right">
                    <button
                      onClick={() => handleToggleActionPolicy(act, 'enabled')}
                      className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                        act.enabled
                          ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                          : 'border-slate-300 text-slate-500'
                      }`}
                    >
                      {act.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Execution History & Verification Audit */}
      <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Auto-Healing Execution & Post-Remediation Verification Log
        </h3>
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="border border-slate-200 dark:border-slate-800 p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-mono font-semibold ${
                      job.status === 'COMPLETED'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : job.status === 'DRY_RUN_OK'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {job.status === 'COMPLETED' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : job.status === 'DRY_RUN_OK' ? (
                      <ShieldCheck className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                    {job.status}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    {job.actionName}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                    Host: {job.hostname}
                  </span>
                </div>
                <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  Duration: {job.durationMs} ms · Retries: {job.retryCount} · By: {job.triggeredBy} ·{' '}
                  {new Date(job.createdAt).toLocaleTimeString()}
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                {job.verificationResult}
              </div>
              <pre className="mt-2 p-2.5 bg-slate-950 text-slate-200 text-xs font-mono overflow-x-auto rounded">
                {job.executionOutput}
              </pre>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

// 3. Docker, AWS EC2 & Network Monitoring View
export const CloudContainersNetworkView: React.FC<{
  activeSubTab: 'docker' | 'aws' | 'network';
  setActiveSubTab: (tab: 'docker' | 'aws' | 'network') => void;
  containers: DockerContainerItem[];
  awsInstances: AwsInstanceItem[];
  networkChecks: NetworkCheckItem[];
  apiCall: ApiCaller;
  onRefresh: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}> = ({
  activeSubTab,
  setActiveSubTab,
  containers,
  awsInstances,
  networkChecks,
  apiCall,
  onRefresh,
  showToast,
}) => {
  const [probingId, setProbingId] = useState<number | null>(null);
  const [restartingId, setRestartingId] = useState<number | null>(null);
  const [syncingAws, setSyncingAws] = useState<boolean>(false);

  // New Network Check Form
  const [newCheckName, setNewCheckName] = useState('');
  const [newCheckType, setNewCheckType] = useState('HTTP_ENDPOINT');
  const [newCheckHost, setNewCheckHost] = useState('');
  const [newCheckPort, setNewCheckPort] = useState(443);

  const handleRestartContainer = async (id: number, name: string) => {
    setRestartingId(id);
    try {
      await apiCall(`/api/v1/docker/${id}/restart`, { method: 'POST' });
      showToast(`Container ${name} safely restarted and verified running`, 'success');
      await onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to restart container', 'error');
    } finally {
      setRestartingId(null);
    }
  };

  const handleSyncAws = async () => {
    setSyncingAws(true);
    try {
      await apiCall('/api/v1/aws/sync', { method: 'POST' });
      showToast('Synchronized AWS EC2 state & CloudWatch metrics via IAM Role', 'success');
      await onRefresh();
    } catch (err: any) {
      showToast(err.message || 'AWS sync failed', 'error');
    } finally {
      setSyncingAws(false);
    }
  };

  const handleRunProbe = async (id: number, name: string) => {
    setProbingId(id);
    try {
      const res = await apiCall(`/api/v1/network/${id}/probe`, { method: 'POST' });
      showToast(
        `Probe completed for ${name}: ${res.check.reachable ? 'Reachable' : 'Unreachable'} (${res.check.latencyMs} ms)`,
        res.check.reachable ? 'success' : 'error'
      );
      await onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Probe failed', 'error');
    } finally {
      setProbingId(null);
    }
  };

  const handleAddNetworkCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckName || !newCheckHost) return;
    try {
      await apiCall('/api/v1/network', {
        method: 'POST',
        body: JSON.stringify({
          name: newCheckName,
          checkType: newCheckType,
          targetHost: newCheckHost,
          port: newCheckPort,
          expectedStatus: 200,
          timeoutSec: 5,
          intervalSec: 30,
        }),
      });
      setNewCheckName('');
      setNewCheckHost('');
      showToast(`Added and probed endpoint check "${newCheckName}"`, 'success');
      await onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to add network check', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
        <button
          onClick={() => setActiveSubTab('docker')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded transition-colors ${
            activeSubTab === 'docker'
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          Docker Containers ({containers.length})
        </button>
        <button
          onClick={() => setActiveSubTab('aws')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded transition-colors ${
            activeSubTab === 'aws'
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <Cloud className="w-3.5 h-3.5" />
          AWS EC2 Cloud ({awsInstances.length})
        </button>
        <button
          onClick={() => setActiveSubTab('network')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded transition-colors ${
            activeSubTab === 'network'
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          Network & HTTP Probes ({networkChecks.length})
        </button>
      </div>

      {/* Docker Containers Tab */}
      {activeSubTab === 'docker' && (
        <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Docker Engine & cAdvisor Container Telemetry
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Detects stopped containers, CrashLoop restarts, CPU/memory spikes, and provides authorized container restart automation
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 pr-4">Container · Host</th>
                  <th className="py-3 px-4">Image</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">CPU %</th>
                  <th className="py-3 px-4 text-right">Memory</th>
                  <th className="py-3 px-4 text-right">Net RX / TX</th>
                  <th className="py-3 px-4 text-right">Restarts · Uptime</th>
                  <th className="py-3 pl-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {containers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 pr-4">
                      <div className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {c.containerName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{c.hostName}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {c.image}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-mono font-semibold ${
                          c.status === 'running'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : c.status === 'restarting'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {c.status === 'running' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                        {c.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300">
                      {c.cpuPercent.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300">
                      {c.memoryMb.toFixed(0)} / {c.memoryLimitMb.toFixed(0)} MB
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300">
                      {c.networkRxMb.toFixed(1)} / {c.networkTxMb.toFixed(1)} MB
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400">
                      {c.restartCount} restarts · {c.uptime}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <button
                        onClick={() => handleRestartContainer(c.id, c.containerName)}
                        disabled={restartingId === c.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                      >
                        <RefreshCw className={`w-3 h-3 ${restartingId === c.id ? 'animate-spin' : ''}`} />
                        Safe Restart
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* AWS EC2 Tab */}
      {activeSubTab === 'aws' && (
        <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                AWS EC2 Cloud Inventory & CloudWatch Status Checks
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Authenticated via IAM Role Assume & Encrypted AWS Secrets Manager (Zero plaintext keys stored)
              </p>
            </div>
            <button
              onClick={handleSyncAws}
              disabled={syncingAws}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingAws ? 'animate-spin' : ''}`} />
              {syncingAws ? 'Syncing CloudWatch...' : 'Sync CloudWatch Telemetry'}
            </button>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 pr-4">Instance ID · Name</th>
                  <th className="py-3 px-4">Type · AZ</th>
                  <th className="py-3 px-4">IP Addresses</th>
                  <th className="py-3 px-4">State · Status Checks</th>
                  <th className="py-3 px-4 text-right">CPU %</th>
                  <th className="py-3 px-4 text-right">Network In/Out</th>
                  <th className="py-3 pl-4 text-right">EBS Disk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {awsInstances.map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 pr-4">
                      <div className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {inst.instanceId}
                      </div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{inst.name}</div>
                      <div className="text-xs font-mono text-slate-400 truncate max-w-xs">
                        {inst.iamRoleArn}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {inst.instanceType} · {inst.availabilityZone}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                      Pub: {inst.publicIp}
                      <br />
                      Priv: {inst.privateIp}
                    </td>
                    <td className="py-3 px-4">
                      <div
                        className={`text-xs font-mono font-semibold ${
                          inst.state === 'running'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {inst.state.toUpperCase()}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{inst.statusCheck}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300">
                      {inst.cpuUtilization.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300">
                      {inst.networkInMb.toFixed(1)} / {inst.networkOutMb.toFixed(1)} MB
                    </td>
                    <td className="py-3 pl-4 text-right font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300">
                      {inst.ebsDiskUsage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Network & Application Endpoint Monitoring Tab */}
      {activeSubTab === 'network' && (
        <div className="space-y-6">
          <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Network & Application Endpoint Monitoring
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Live TCP port, DNS resolution, and HTTP/HTTPS synthetic probes executed directly by the backend
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <th className="py-3 pr-4">Check Name</th>
                    <th className="py-3 px-4">Type · Target</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Latency (RTT)</th>
                    <th className="py-3 px-4 text-right">Packet Loss</th>
                    <th className="py-3 px-4">Last Probe Output</th>
                    <th className="py-3 pl-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  {networkChecks.map((chk) => (
                    <tr key={chk.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">
                        {chk.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {chk.checkType} · {chk.targetHost}:{chk.port}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-mono font-semibold ${
                            chk.reachable
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {chk.reachable ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          {chk.reachable ? 'Reachable' : 'Unreachable'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300">
                        {chk.latencyMs.toFixed(2)} ms
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300">
                        {chk.packetLossPercent.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {chk.responseSnippet}
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <button
                          onClick={() => handleRunProbe(chk.id, chk.name)}
                          disabled={probingId === chk.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                        >
                          <Activity className={`w-3 h-3 ${probingId === chk.id ? 'animate-spin' : ''}`} />
                          {probingId === chk.id ? 'Probing...' : 'Run Live Probe'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Add New Network/Application Endpoint Check */}
          <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Add Network / HTTP Application Check
            </h3>
            <form onSubmit={handleAddNetworkCheck} className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <input
                type="text"
                placeholder="Check Name (e.g. Auth API Health)"
                value={newCheckName}
                onChange={(e) => setNewCheckName(e.target.value)}
                required
                className="px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded"
              />
              <select
                value={newCheckType}
                onChange={(e) => setNewCheckType(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded"
              >
                <option value="HTTP_ENDPOINT">HTTP / HTTPS Endpoint</option>
                <option value="TCP_PORT">TCP Port Check</option>
                <option value="DNS">DNS Resolution</option>
              </select>
              <input
                type="text"
                placeholder="Target URL or IP (e.g. https://example.com)"
                value={newCheckHost}
                onChange={(e) => setNewCheckHost(e.target.value)}
                required
                className="px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded"
              />
              <input
                type="number"
                placeholder="Port (443)"
                value={newCheckPort}
                onChange={(e) => setNewCheckPort(Number(e.target.value))}
                className="px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Add & Probe Target
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

// 4. Centralized Logs, Reports, Backups, Users/RBAC, Notifications, Settings & Audit Logs
export const OperationsGovernanceView: React.FC<{
  activeTab: 'logs' | 'reports' | 'backups' | 'users' | 'notifications' | 'settings' | 'audit';
  setActiveTab: (
    tab: 'logs' | 'reports' | 'backups' | 'users' | 'notifications' | 'settings' | 'audit'
  ) => void;
  servers: ServerItem[];
  logs: LogItem[];
  alerts: AlertItem[];
  incidents: IncidentItem[];
  jobs: RemediationJobItem[];
  backups: BackupJobItem[];
  users: UserItem[];
  roles: RoleItem[];
  notifications: NotificationChannelItem[];
  settings: SettingItem[];
  auditLogs: AuditLogItem[];
  apiCall: ApiCaller;
  onRefresh: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}> = ({
  activeTab,
  setActiveTab,
  servers,
  logs,
  alerts,
  incidents,
  jobs,
  backups,
  users,
  roles,
  notifications,
  settings,
  auditLogs,
  apiCall,
  onRefresh,
  showToast,
}) => {
  // Log filter state
  const [logSearch, setLogSearch] = useState('');
  const [logSeverity, setLogSeverity] = useState('ALL');
  const [logHost, setLogHost] = useState('ALL');

  // Report cadence state
  const [reportCadence, setReportCadence] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');

  // Audit search
  const [auditSearch, setAuditSearch] = useState('');

  const filteredLogs = logs.filter((l) => {
    const matchesSeverity = logSeverity === 'ALL' || l.severity === logSeverity;
    const matchesHost = logHost === 'ALL' || l.hostname === logHost;
    const matchesKeyword =
      !logSearch ||
      l.message.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.application.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.hostname.toLowerCase().includes(logSearch.toLowerCase());
    return matchesSeverity && matchesHost && matchesKeyword;
  });

  const handleExportReport = (format: 'json' | 'csv') => {
    const reportPayload = {
      reportType: `${reportCadence} Infrastructure SLA & Telemetry Report`,
      generatedAt: new Date().toISOString(),
      summary: {
        totalServers: servers.length,
        healthyServers: servers.filter((s) => s.status === 'Healthy').length,
        criticalServers: servers.filter((s) => s.status === 'Critical').length,
        activeAlerts: alerts.filter((a) => a.status === 'FIRING').length,
        openIncidents: incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length,
        autoHealingExecutions: jobs.length,
      },
      topCpuServers: [...servers]
        .sort((a, b) => b.cpuUsage - a.cpuUsage)
        .map((s) => ({
          hostname: s.hostname,
          ip: s.ipAddress,
          cpuUsagePercent: s.cpuUsage,
          ramUsagePercent: s.ramUsage,
          diskUsagePercent: s.diskUsage,
        })),
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(reportPayload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aegis-noc-${reportCadence.toLowerCase()}-report.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported ${reportCadence} Report as JSON`, 'success');
    } else {
      const header = 'Hostname,IP Address,OS,Environment,Status,CPU %,RAM %,Disk %\n';
      const rows = servers
        .map(
          (s) =>
            `${s.hostname},${s.ipAddress},${s.os},${s.environment},${s.status},${s.cpuUsage},${s.ramUsage},${s.diskUsage}`
        )
        .join('\n');
      const blob = new Blob([header + rows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aegis-noc-${reportCadence.toLowerCase()}-report.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported ${reportCadence} Report as CSV`, 'success');
    }
  };

  const handleCreateBackup = async () => {
    try {
      await apiCall('/api/v1/backups', {
        method: 'POST',
        body: JSON.stringify({ backupType: 'MANUAL' }),
      });
      showToast('Created and SHA-256 verified manual backup snapshot', 'success');
      await onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Backup failed', 'error');
    }
  };

  const handleTestNotification = async (id: number) => {
    try {
      await apiCall(`/api/v1/notifications/${id}/test`, { method: 'POST' });
      showToast('Test alert notification dispatched', 'success');
      await onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Notification test failed', 'error');
    }
  };

  const handleUpdateUserRole = async (userId: number, role: string) => {
    try {
      await apiCall(`/api/v1/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      showToast(`Updated user role to ${role}`, 'success');
      await onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Role update failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
        {[
          { id: 'logs', label: 'Centralized Logs (Loki)', icon: Terminal },
          { id: 'reports', label: 'SLA Reports & Export', icon: FileText },
          { id: 'backups', label: 'Backup & Recovery', icon: Database },
          { id: 'users', label: 'Users & RBAC', icon: Users },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'settings', label: 'Settings', icon: Settings },
          { id: 'audit', label: 'Audit Logs', icon: Lock },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
                activeTab === item.id
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* 1. Centralized Logs */}
      {activeTab === 'logs' && (
        <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Loki Centralized Log Explorer
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Structured log stream aggregated via Promtail/Alloy (Secrets & tokens automatically masked)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search log keywords..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded"
                />
              </div>
              <select
                value={logHost}
                onChange={(e) => setLogHost(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded"
              >
                <option value="ALL">All Hosts</option>
                {servers.map((s) => (
                  <option key={s.id} value={s.hostname}>
                    {s.hostname}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded">
                {['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setLogSeverity(sev)}
                    className={`px-2.5 py-1 text-xs font-mono rounded ${
                      logSeverity === sev
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 bg-slate-950 text-slate-200 p-4 font-mono text-xs space-y-2 max-h-[480px] overflow-y-auto rounded">
            {filteredLogs.length === 0 ? (
              <div className="text-slate-500 py-8 text-center">
                No log entries match your current filter criteria.
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-start gap-2 py-1.5 border-b border-slate-900"
                >
                  <span className="text-slate-500 shrink-0 tabular-nums">
                    {new Date(log.createdAt).toISOString()}
                  </span>
                  <span
                    className={`shrink-0 w-14 font-semibold ${
                      log.severity === 'ERROR'
                        ? 'text-red-400'
                        : log.severity === 'WARN'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    [{log.severity}]
                  </span>
                  <span className="text-cyan-400 shrink-0">{log.hostname}</span>
                  <span className="text-indigo-300 shrink-0">{log.application}:</span>
                  <span className="text-slate-200 break-all">{log.message}</span>
                  <span className="text-slate-600 ml-auto shrink-0">id={log.requestId}</span>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* 2. Reports & SLA Export */}
      {activeTab === 'reports' && (
        <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {reportCadence} Infrastructure Reliability & Resource Report
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Uptime SLA, top resource consumers, incident resolution metrics, and auto-healing efficacy
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded">
                {(['Daily', 'Weekly', 'Monthly'] as const).map((cad) => (
                  <button
                    key={cad}
                    onClick={() => setReportCadence(cad)}
                    className={`px-3 py-1 text-xs font-medium rounded ${
                      reportCadence === cad
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {cad}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleExportReport('csv')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
              <button
                onClick={() => handleExportReport('json')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Download className="w-3.5 h-3.5" />
                Export JSON
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-xs text-slate-500">Fleet Availability SLA</div>
              <div className="text-2xl font-mono font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                99.94%
              </div>
              <div className="text-xs text-slate-500 mt-1">Target SLA: 99.90% ({reportCadence})</div>
            </div>
            <div className="border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-xs text-slate-500">Mean Time To Detect (MTTD)</div>
              <div className="text-2xl font-mono font-semibold text-slate-900 dark:text-white mt-1">
                14.2s
              </div>
              <div className="text-xs text-slate-500 mt-1">Prometheus 15s scrape cadence</div>
            </div>
            <div className="border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-xs text-slate-500">Auto-Healing Recovery Rate</div>
              <div className="text-2xl font-mono font-semibold text-blue-600 dark:text-blue-400 mt-1">
                94.8%
              </div>
              <div className="text-xs text-slate-500 mt-1">{jobs.length} automated remediations logged</div>
            </div>
            <div className="border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-xs text-slate-500">Total Incidents ({reportCadence})</div>
              <div className="text-2xl font-mono font-semibold text-slate-900 dark:text-white mt-1">
                {incidents.length}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').length} resolved
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Top Resource-Consuming Servers (CPU / Memory / Disk)
            </h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500">
                  <th className="py-2.5 pr-4">Hostname</th>
                  <th className="py-2.5 px-4">Environment</th>
                  <th className="py-2.5 px-4 text-right">CPU %</th>
                  <th className="py-2.5 px-4 text-right">RAM %</th>
                  <th className="py-2.5 pl-4 text-right">Disk %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {[...servers]
                  .sort((a, b) => b.cpuUsage - a.cpuUsage)
                  .map((s) => (
                    <tr key={s.id}>
                      <td className="py-2.5 pr-4 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {s.hostname}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-500">{s.environment}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs">
                        {s.cpuUsage.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs">
                        {s.ramUsage.toFixed(1)}%
                      </td>
                      <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-xs">
                        {s.diskUsage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 3. Backup & Recovery */}
      {activeTab === 'backups' && (
        <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Database & Configuration Backup Management
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Automated daily snapshots and manual verified backups with SHA-256 integrity checks
              </p>
            </div>
            <button
              onClick={handleCreateBackup}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
            >
              <Database className="w-3.5 h-3.5" />
              Trigger Manual Backup Snapshot
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500">
                  <th className="py-3 pr-4">Archive Filename</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Size</th>
                  <th className="py-3 px-4">SHA-256 Checksum</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 pl-4 text-right">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {backups.map((b) => (
                  <tr key={b.id}>
                    <td className="py-3 pr-4 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {b.backupName}
                      <div className="text-xs font-normal text-slate-400">{b.storageLocation}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {b.backupType}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                      {b.sizeMb.toFixed(1)} MB
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500 truncate max-w-xs">
                      {b.checksumSha256.slice(0, 24)}...
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 pl-4 text-right font-mono text-xs text-slate-500">
                      {new Date(b.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Production Restore Runbook (Requires Explicit Maintenance Window)
            </h3>
            <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 overflow-x-auto">
{`# 1. Verify archive integrity checksum before restore:
sha256sum -c pg_dump_aegis_noc_2026_10_07_0000.sql.gz.sha256
# 2. Stop active auto-healing workers during restore window:
docker compose stop backend-worker
# 3. Restore compressed PostgreSQL archive into target database:
gunzip -c pg_dump_aegis_noc_2026_10_07_0000.sql.gz | psql -h $SQL_HOST -U $SQL_ADMIN_USER -d $SQL_DB_NAME`}
            </pre>
          </div>
        </section>
      )}

      {/* 4. Users & RBAC */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Authenticated NOC Users & Role Assignment
            </h2>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500">
                  <th className="py-3 pr-4">Name · Email</th>
                  <th className="py-3 px-4">Firebase UID</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 pl-4 text-right">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{u.name}</div>
                      <div className="text-xs font-mono text-slate-500">{u.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">{u.uid}</td>
                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                        className="px-2.5 py-1 text-xs font-mono border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded"
                      >
                        {['Super Admin', 'Admin', 'Operator', 'Viewer'].map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 pl-4 text-right font-mono text-xs text-slate-500">
                      {new Date(u.lastLoginAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Granular Role-Based Access Control (RBAC) Permission Matrix
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map((r) => (
                <div key={r.id} className="border border-slate-200 dark:border-slate-800 p-4">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{r.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {r.description}
                  </div>
                  <div className="mt-3 font-mono text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {r.permissions.join(' · ')}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* 5. Notifications */}
      {activeTab === 'notifications' && (
        <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
            Alertmanager Notification Channels (Email, Telegram & Web Push)
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Configurable dispatch pipelines for CRITICAL, HIGH, WARNING, and INFO alerts
          </p>
          <div className="space-y-4">
            {notifications.map((ch) => (
              <div
                key={ch.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-slate-200 dark:border-slate-800"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {ch.name} ({ch.provider})
                  </div>
                  <div className="text-xs font-mono text-slate-500 mt-0.5">
                    Destination: {ch.destinationMasked} · Min Severity: {ch.minSeverity} · Status:{' '}
                    {ch.lastDeliveryStatus}
                  </div>
                </div>
                <button
                  onClick={() => handleTestNotification(ch.id)}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded hover:opacity-90 whitespace-nowrap"
                >
                  Send Test Notification
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. Settings */}
      {activeTab === 'settings' && (
        <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Platform Configuration & Security Parameters
          </h2>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {settings.map((st) => (
              <div
                key={st.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {st.key}
                  </div>
                  <div className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">
                    {st.description}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    defaultValue={st.value}
                    onBlur={async (e) => {
                      if (e.target.value !== st.value) {
                        await apiCall(`/api/v1/settings/${st.id}`, {
                          method: 'PATCH',
                          body: JSON.stringify({ value: e.target.value }),
                        });
                        showToast(`Updated ${st.key}`, 'success');
                        await onRefresh();
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-mono border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. Immutable Audit Logs */}
      {activeTab === 'audit' && (
        <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Security & Operational Audit Trail
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Every authentication, configuration change, alert action, and auto-healing execution is recorded
              </p>
            </div>
            <input
              type="text"
              placeholder="Filter audit actions or users..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded"
            />
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500">
                  <th className="py-3 pr-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Result</th>
                  <th className="py-3 pl-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs font-mono">
                {auditLogs
                  .filter(
                    (a) =>
                      !auditSearch ||
                      a.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
                      a.userEmail.toLowerCase().includes(auditSearch.toLowerCase()) ||
                      a.details.toLowerCase().includes(auditSearch.toLowerCase())
                  )
                  .map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 pr-4 tabular-nums text-slate-500">
                        {new Date(a.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                        {a.userEmail}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-blue-600 dark:text-blue-400">
                        {a.action}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                        {a.resource}:{a.resourceId}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={
                            a.result === 'SUCCESS'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }
                        >
                          {a.result}
                        </span>
                      </td>
                      <td className="py-2.5 pl-4 font-sans text-slate-600 dark:text-slate-300">
                        {a.details}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
