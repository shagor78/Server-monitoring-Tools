import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleAuthProvider } from './lib/firebase.ts';
import {
  Activity,
  Server,
  AlertTriangle,
  ShieldAlert,
  Cpu,
  HardDrive,
  Network,
  Wrench,
  Terminal,
  RefreshCw,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Sun,
  Moon,
  LogOut,
  Trash2,
  Play,
  Sliders,
  Box,
} from 'lucide-react';
import {
  BootstrapResponse,
  ServerItem,
  AlertItem,
  IncidentItem,
} from './types.ts';
import {
  MonitoringView,
  AutomationView,
  CloudContainersNetworkView,
  OperationsGovernanceView,
} from './components/NocViews.tsx';

type NavSection =
  | 'dashboard'
  | 'servers'
  | 'monitoring'
  | 'alerts'
  | 'incidents'
  | 'automation'
  | 'cloud'
  | 'governance';

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');
  const [cloudSubTab, setCloudSubTab] = useState<'docker' | 'aws' | 'network'>('docker');
  const [govSubTab, setGovSubTab] = useState<
    'logs' | 'reports' | 'backups' | 'users' | 'notifications' | 'settings' | 'audit'
  >('logs');

  const [nocData, setNocData] = useState<BootstrapResponse | null>(null);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Server Inventory Filter & Detail Selection
  const [serverSearch, setServerSearch] = useState<string>('');
  const [serverEnvFilter, setServerEnvFilter] = useState<string>('All');
  const [serverOsFilter, setServerOsFilter] = useState<string>('All');
  const [selectedServerId, setSelectedServerId] = useState<number | null>(null);
  const [showAddServerModal, setShowAddServerModal] = useState<boolean>(false);

  // Add Server Form State
  const [newServerForm, setNewServerForm] = useState({
    hostname: '',
    ipAddress: '',
    os: 'Linux',
    osVersion: 'Ubuntu 24.04 LTS',
    environment: 'Production',
    location: 'ap-southeast-1a (Singapore)',
    serverType: 'Application Server',
    cpuCores: 16,
    ramGb: 64,
    diskGb: 500,
    exporterType: 'node_exporter',
    exporterPort: 9100,
  });

  // Alerts Filter & Add Rule State
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<string>('ALL');
  const [alertStatusFilter, setAlertStatusFilter] = useState<string>('ALL');
  const [showAddRuleModal, setShowAddRuleModal] = useState<boolean>(false);
  const [newRuleForm, setNewRuleForm] = useState({
    name: '',
    metric: 'cpu_usage',
    condition: '>',
    threshold: 90,
    durationSec: 60,
    severity: 'CRITICAL',
    targetType: 'Server',
    remediationActionId: 1,
  });

  // Incidents Filter & Add Incident State
  const [incidentStatusFilter, setIncidentStatusFilter] = useState<string>('ALL');
  const [showAddIncidentModal, setShowAddIncidentModal] = useState<boolean>(false);
  const [newIncidentForm, setNewIncidentForm] = useState({
    title: '',
    description: '',
    severity: 'HIGH',
    affectedHostname: '',
    affectedService: 'nginx',
    assignedTo: 'SRE On-Call',
  });

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  }, []);

  // Listen to Firebase Auth State (token kept strictly in memory)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const token = await user.getIdToken();
        setIdToken(token);
      } else {
        setIdToken(null);
        setNocData(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const apiCall = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const currentToken = firebaseUser ? await firebaseUser.getIdToken() : idToken;
      if (!currentToken) {
        throw new Error('Authentication required');
      }
      const res = await fetch(path, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
          ...(options.headers || {}),
        },
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json?.error?.message || `API Error (${res.status})`);
      }
      return json;
    },
    [firebaseUser, idToken]
  );

  const fetchBootstrapData = useCallback(async () => {
    if (!firebaseUser) return;
    setLoadingData(true);
    try {
      const response: BootstrapResponse = await apiCall('/api/v1/bootstrap');
      setNocData(response);
      if (!selectedServerId && response.data.servers.length > 0) {
        setSelectedServerId(response.data.servers[0].id);
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to load infrastructure telemetry', 'error');
    } finally {
      setLoadingData(false);
    }
  }, [firebaseUser, apiCall, selectedServerId, showToast]);

  useEffect(() => {
    if (firebaseUser && idToken) {
      fetchBootstrapData();
    }
  }, [firebaseUser, idToken, fetchBootstrapData]);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error: any) {
      setAuthError(error?.message || 'Sign-in failed. Please try again.');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setNocData(null);
  };

  // Domain Handlers
  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCall('/api/v1/servers', {
        method: 'POST',
        body: JSON.stringify(newServerForm),
      });
      setShowAddServerModal(false);
      setNewServerForm({
        ...newServerForm,
        hostname: '',
        ipAddress: '',
      });
      showToast(`Enrolled server ${newServerForm.hostname} into monitoring`, 'success');
      await fetchBootstrapData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateServerFlag = async (
    server: ServerItem,
    field: 'monitoringEnabled' | 'maintenanceMode' | 'autoHealingEnabled'
  ) => {
    try {
      await apiCall(`/api/v1/servers/${server.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: !server[field] }),
      });
      showToast(`Updated ${field} on ${server.hostname}`, 'success');
      await fetchBootstrapData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleTestServer = async (serverId: number) => {
    try {
      const res = await apiCall(`/api/v1/servers/${serverId}/test`, { method: 'POST' });
      showToast(
        `Connectivity verified: ${res.probeResult.exporterEndpoint} (${res.probeResult.exporterStatus}, ${res.probeResult.latencyMs}ms)`,
        'success'
      );
      await fetchBootstrapData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteServer = async (server: ServerItem) => {
    try {
      await apiCall(`/api/v1/servers/${server.id}`, { method: 'DELETE' });
      showToast(`Removed ${server.hostname} from inventory`, 'success');
      if (selectedServerId === server.id) {
        setSelectedServerId(null);
      }
      await fetchBootstrapData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAlertAction = async (
    alert: AlertItem,
    action: 'acknowledge' | 'silence' | 'resolve'
  ) => {
    try {
      await apiCall(`/api/v1/alerts/${alert.id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ durationMinutes: 60 }),
      });
      showToast(`Alert ${action}d: ${alert.title}`, 'success');
      await fetchBootstrapData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleQuickAutoHealAlert = async (alert: AlertItem) => {
    if (!nocData || !alert.serverId) return;
    const rule = nocData.data.alertRules.find((r) => r.id === alert.ruleId);
    const actionId =
      rule?.remediationActionId || nocData.data.remediationActions[0]?.id || 1;
    try {
      const res = await apiCall('/api/v1/remediation/execute', {
        method: 'POST',
        body: JSON.stringify({
          actionId,
          serverId: alert.serverId,
          dryRun: false,
        }),
      });
      showToast(
        `Auto-Healing completed: ${res.job.actionName} on ${alert.hostname}`,
        'success'
      );
      await fetchBootstrapData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCall('/api/v1/alert-rules', {
        method: 'POST',
        body: JSON.stringify(newRuleForm),
      });
      setShowAddRuleModal(false);
      setNewRuleForm({ ...newRuleForm, name: '' });
      showToast(`Created Alertmanager rule "${newRuleForm.name}"`, 'success');
      await fetchBootstrapData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCall('/api/v1/incidents', {
        method: 'POST',
        body: JSON.stringify(newIncidentForm),
      });
      setShowAddIncidentModal(false);
      setNewIncidentForm({ ...newIncidentForm, title: '', description: '' });
      showToast('Created new operational incident', 'success');
      await fetchBootstrapData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateIncidentStatus = async (incident: IncidentItem, status: string) => {
    try {
      await apiCall(`/api/v1/incidents/${incident.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      showToast(`Incident ${incident.incidentKey} transitioned to ${status}`, 'success');
      await fetchBootstrapData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Status icon + label helper (Zero Hue-Only State Signaling)
  const renderServerStatus = (status: string) => {
    switch (status) {
      case 'Healthy':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Healthy
          </span>
        );
      case 'Warning':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            Warning
          </span>
        );
      case 'Critical':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-red-600 dark:text-red-400">
            <XCircle className="w-3.5 h-3.5" />
            Critical
          </span>
        );
      case 'Maintenance':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
            <Wrench className="w-3.5 h-3.5" />
            Maintenance
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            {status}
          </span>
        );
    }
  };

  // Unauthenticated Login Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-sm font-mono text-slate-400">
          Initializing AegisNOC Security Context...
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between">
          {/* Top Bar Contract */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <a href="#top" className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              AegisNOC
            </a>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
              <span>Linux & Windows Telemetry</span>
              <span>Prometheus & Loki</span>
              <span>Controlled Auto-Healing</span>
              <span>Role-Based Access Control</span>
            </nav>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded"
                aria-label="Toggle theme"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={handleGoogleSignIn}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors whitespace-nowrap"
              >
                Sign In to NOC Console
              </button>
            </div>
          </header>

          {/* Main Login & Architecture Brief */}
          <main className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="text-xs font-mono text-blue-600 dark:text-blue-400">
                Enterprise NOC · Infrastructure Monitoring · Automated Remediation
              </div>
              <h1
                className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white"
                style={{ textWrap: 'balance' }}
              >
                Centralized Observability & Controlled Auto-Healing Across Linux, Windows, Docker, and AWS EC2.
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                Collect real-time Prometheus exporter metrics, monitor critical Windows and systemd services, aggregate structured Loki logs, and execute allowlisted auto-healing remediations with strict cooldown, retry, and incident escalation guardrails.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <div className="font-mono text-lg font-semibold text-slate-900 dark:text-white">
                    Multi-Platform
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Node Exporter · Windows Exporter · cAdvisor · AWS CloudWatch · TCP/HTTP Probes
                  </div>
                </div>
                <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <div className="font-mono text-lg font-semibold text-slate-900 dark:text-white">
                    Safe Auto-Heal
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Predefined Allowlist · Dry-Run Mode · Cooldown & Retry Limits · Auto-Escalation
                  </div>
                </div>
                <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <div className="font-mono text-lg font-semibold text-slate-900 dark:text-white">
                    RBAC & Audit
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Super Admin, Admin, Operator & Viewer Roles · Full Immutable Audit Trail
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  NOC Operator Authentication
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Authenticate with your organization Google account to access the NOC console.
                </p>
              </div>

              {authError && (
                <div className="p-3 border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/50 text-xs text-red-700 dark:text-red-300">
                  {authError}
                </div>
              )}

              <button
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors whitespace-nowrap"
              >
                Continue with Google Sign-In
              </button>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <div>Authentication: Firebase OAuth 2.0 + Bearer ID Token Verification</div>
                <div>Authorization: Granular Role-Based Access Control (RBAC)</div>
                <div>Command Safety: Arbitrary remote command execution prohibited</div>
              </div>
            </div>
          </main>

          <footer className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
            <span>AegisNOC Infrastructure Monitoring & Auto-Healing Platform</span>
            <span>HTTPS · Rate-Limited API · Audited Operations</span>
          </footer>
        </div>
      </div>
    );
  }

  // Derived Summary Metrics
  const allServers = nocData?.data.servers || [];
  const allContainers = nocData?.data.dockerContainers || [];
  const allAlerts = nocData?.data.alerts || [];
  const allIncidents = nocData?.data.incidents || [];
  const allJobs = nocData?.data.remediationJobs || [];

  const onlineServers = allServers.filter(
    (s) => s.status === 'Healthy' || s.status === 'Warning' || s.status === 'Critical'
  ).length;
  const warningServers = allServers.filter((s) => s.status === 'Warning').length;
  const criticalServers = allServers.filter((s) => s.status === 'Critical').length;
  const maintenanceServers = allServers.filter((s) => s.status === 'Maintenance').length;

  const runningContainers = allContainers.filter((c) => c.status === 'running').length;
  const failedContainers = allContainers.filter((c) => c.status !== 'running').length;

  const firingAlerts = allAlerts.filter((a) => a.status === 'FIRING');
  const criticalAlertsCount = firingAlerts.filter((a) => a.severity === 'CRITICAL').length;
  const activeIncidentsCount = allIncidents.filter(
    (i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED'
  ).length;

  const avgCpu =
    allServers.length > 0
      ? allServers.reduce((acc, s) => acc + s.cpuUsage, 0) / allServers.length
      : 0;
  const avgRam =
    allServers.length > 0
      ? allServers.reduce((acc, s) => acc + s.ramUsage, 0) / allServers.length
      : 0;
  const avgDisk =
    allServers.length > 0
      ? allServers.reduce((acc, s) => acc + s.diskUsage, 0) / allServers.length
      : 0;
  const totalNetRx = allServers.reduce((acc, s) => acc + s.networkRxMbps, 0);
  const totalNetTx = allServers.reduce((acc, s) => acc + s.networkTxMbps, 0);

  const filteredServers = allServers.filter((s) => {
    const matchEnv = serverEnvFilter === 'All' || s.environment === serverEnvFilter;
    const matchOs = serverOsFilter === 'All' || s.os === serverOsFilter;
    const matchSearch =
      !serverSearch ||
      s.hostname.toLowerCase().includes(serverSearch.toLowerCase()) ||
      s.ipAddress.toLowerCase().includes(serverSearch.toLowerCase()) ||
      s.serverType.toLowerCase().includes(serverSearch.toLowerCase());
    return matchEnv && matchOs && matchSearch;
  });

  const inspectedServer =
    allServers.find((s) => s.id === selectedServerId) || filteredServers[0] || allServers[0];

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
        {/* Strict 3-Zone Top Bar Contract */}
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              setActiveNav('dashboard');
            }}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white"
          >
            AegisNOC
          </a>

          {/* Zone 2: 5 clean text navigation links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
            <button
              onClick={() => setActiveNav('dashboard')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors ${
                activeNav === 'dashboard' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''
              }`}
            >
              NOC Overview
            </button>
            <button
              onClick={() => setActiveNav('servers')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors ${
                activeNav === 'servers' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''
              }`}
            >
              Servers
            </button>
            <button
              onClick={() => setActiveNav('monitoring')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors ${
                activeNav === 'monitoring' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''
              }`}
            >
              Prometheus & Grafana
            </button>
            <button
              onClick={() => setActiveNav('alerts')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors ${
                activeNav === 'alerts' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''
              }`}
            >
              Alerts ({firingAlerts.length})
            </button>
            <button
              onClick={() => setActiveNav('automation')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors ${
                activeNav === 'automation' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''
              }`}
            >
              Auto-Healing
            </button>
          </nav>

          {/* Zone 3: 2 Primary Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded"
              title="Toggle Dark / Light Mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={fetchBootstrapData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              Sync Telemetry
            </button>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 whitespace-nowrap"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Toast Notification Banner */}
        {toast && (
          <div
            className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded shadow-lg border text-xs font-medium flex items-center gap-2 ${
              toast.type === 'error'
                ? 'bg-red-950 border-red-800 text-red-200'
                : 'bg-slate-900 border-slate-700 text-emerald-300'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Workspace Layout: Sidebar (250px) + Main Content */}
        <div className="flex-1 flex">
          <aside className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hidden md:flex flex-col justify-between p-4">
            <div className="space-y-1">
              {[
                { id: 'dashboard', label: 'NOC Dashboard', icon: Activity },
                { id: 'servers', label: `Server Inventory (${allServers.length})`, icon: Server },
                { id: 'monitoring', label: 'Prometheus & Grafana', icon: Cpu },
                { id: 'alerts', label: `Alerts (${firingAlerts.length} Firing)`, icon: AlertTriangle },
                { id: 'incidents', label: `Incidents (${activeIncidentsCount} Open)`, icon: ShieldAlert },
                { id: 'automation', label: 'Auto-Healing Engine', icon: Wrench },
                { id: 'cloud', label: 'Docker · AWS · Network', icon: Box },
                { id: 'governance', label: 'Logs · Reports · Admin', icon: Terminal },
              ].map((item) => {
                const Icon = item.icon;
                const active = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveNav(item.id as NavSection)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded transition-colors ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {nocData?.currentUser && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {nocData.currentUser.name}
                </div>
                <div className="font-mono text-slate-500 truncate">{nocData.currentUser.email}</div>
                <div className="font-mono text-blue-600 dark:text-blue-400">
                  Role: {nocData.currentUser.role}
                </div>
              </div>
            )}
          </aside>

          {/* Main NOC Viewport */}
          <main className="flex-1 p-6 overflow-y-auto max-w-[1600px]">
            {/* Mobile Section Switcher */}
            <div className="flex md:hidden items-center gap-2 overflow-x-auto pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              {(
                [
                  'dashboard',
                  'servers',
                  'monitoring',
                  'alerts',
                  'incidents',
                  'automation',
                  'cloud',
                  'governance',
                ] as NavSection[]
              ).map((sec) => (
                <button
                  key={sec}
                  onClick={() => setActiveNav(sec)}
                  className={`px-3 py-1.5 text-xs font-medium rounded capitalize whitespace-nowrap ${
                    activeNav === sec
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>

            {/* 1. NOC DASHBOARD VIEW */}
            {activeNav === 'dashboard' && (
              <div className="space-y-8">
                {/* Infrastructure Summary Grid */}
                <section>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                      <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                        Network Operations Center — Infrastructure Overview
                      </h1>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Real-time telemetry across Linux hosts, Windows servers, Docker containers, AWS EC2, and synthetic probes
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setActiveNav('servers');
                          setShowAddServerModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Enroll Server
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Total Servers</div>
                      <div className="text-2xl font-mono font-bold tabular-nums text-slate-900 dark:text-white mt-1">
                        {allServers.length}
                      </div>
                      <div className="text-xs font-mono text-slate-500 mt-1">
                        {onlineServers} Online · {maintenanceServers} Maint
                      </div>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Critical / Warning Hosts
                      </div>
                      <div className="text-2xl font-mono font-bold tabular-nums text-red-600 dark:text-red-400 mt-1">
                        {criticalServers} / {warningServers}
                      </div>
                      <div className="text-xs font-mono text-slate-500 mt-1">
                        Immediate attention
                      </div>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Docker Containers
                      </div>
                      <div className="text-2xl font-mono font-bold tabular-nums text-slate-900 dark:text-white mt-1">
                        {runningContainers} / {allContainers.length}
                      </div>
                      <div className="text-xs font-mono text-amber-600 dark:text-amber-400 mt-1">
                        {failedContainers} Degraded / Exited
                      </div>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Active Alerts</div>
                      <div className="text-2xl font-mono font-bold tabular-nums text-amber-600 dark:text-amber-400 mt-1">
                        {firingAlerts.length}
                      </div>
                      <div className="text-xs font-mono text-red-600 dark:text-red-400 mt-1">
                        {criticalAlertsCount} Critical Severity
                      </div>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Active Incidents
                      </div>
                      <div className="text-2xl font-mono font-bold tabular-nums text-slate-900 dark:text-white mt-1">
                        {activeIncidentsCount}
                      </div>
                      <div className="text-xs font-mono text-slate-500 mt-1">
                        {allIncidents.length} Total Tracked
                      </div>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Auto-Healing Jobs
                      </div>
                      <div className="text-2xl font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                        {allJobs.length}
                      </div>
                      <div className="text-xs font-mono text-slate-500 mt-1">
                        Allowlist Policy Active
                      </div>
                    </div>
                  </div>
                </section>

                {/* Fleet Resource Overview */}
                <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Average Fleet CPU</span>
                      <Cpu className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-mono font-semibold tabular-nums text-slate-900 dark:text-white mt-2">
                      {avgCpu.toFixed(1)}%
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 mt-3 overflow-hidden">
                      <div
                        className="h-full bg-blue-600"
                        style={{ width: `${Math.min(100, avgCpu)}%` }}
                      />
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Average Fleet Memory</span>
                      <Activity className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-mono font-semibold tabular-nums text-slate-900 dark:text-white mt-2">
                      {avgRam.toFixed(1)}%
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 mt-3 overflow-hidden">
                      <div
                        className="h-full bg-emerald-600"
                        style={{ width: `${Math.min(100, avgRam)}%` }}
                      />
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Average Disk Utilization</span>
                      <HardDrive className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="text-2xl font-mono font-semibold tabular-nums text-slate-900 dark:text-white mt-2">
                      {avgDisk.toFixed(1)}%
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 mt-3 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600"
                        style={{ width: `${Math.min(100, avgDisk)}%` }}
                      />
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Aggregate Network Traffic</span>
                      <Network className="w-4 h-4 text-cyan-500" />
                    </div>
                    <div className="text-2xl font-mono font-semibold tabular-nums text-slate-900 dark:text-white mt-2">
                      {(totalNetRx + totalNetTx).toFixed(0)} Mbps
                    </div>
                    <div className="text-xs font-mono text-slate-500 mt-2">
                      RX: {totalNetRx.toFixed(1)} Mbps · TX: {totalNetTx.toFixed(1)} Mbps
                    </div>
                  </div>
                </section>

                {/* Active Firing Alerts & One-Click Auto-Healing */}
                <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                        Active Firing Alerts & Immediate Auto-Healing
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Trigger approved remediation or acknowledge directly from the NOC triage queue
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveNav('alerts')}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View All Alerts →
                    </button>
                  </div>

                  {firingAlerts.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-500">
                      All firing alerts have been resolved. Infrastructure is operating nominally.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                      {firingAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                        >
                          <div>
                            <div className="flex items-center gap-2 text-xs font-mono">
                              <span
                                className={`font-semibold ${
                                  alert.severity === 'CRITICAL'
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-amber-600 dark:text-amber-400'
                                }`}
                              >
                                {alert.severity}
                              </span>
                              <span>·</span>
                              <span className="text-slate-700 dark:text-slate-300">
                                {alert.hostname}
                              </span>
                              <span>·</span>
                              <span className="text-slate-500">Value: {alert.metricValue}</span>
                            </div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                              {alert.title}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {alert.message}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleQuickAutoHealAlert(alert)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                            >
                              <Play className="w-3.5 h-3.5" />
                              Execute Auto-Heal
                            </button>
                            <button
                              onClick={() => handleAlertAction(alert, 'acknowledge')}
                              className="px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                            >
                              Acknowledge
                            </button>
                            <button
                              onClick={() => handleAlertAction(alert, 'resolve')}
                              className="px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                            >
                              Resolve
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Fleet Server Health Table */}
                <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                      Infrastructure Host Matrix
                    </h2>
                    <button
                      onClick={() => setActiveNav('servers')}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Manage Server Inventory →
                    </button>
                  </div>
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500">
                          <th className="py-3 pr-4">Hostname · IP</th>
                          <th className="py-3 px-4">OS · Environment</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">CPU</th>
                          <th className="py-3 px-4 text-right">RAM</th>
                          <th className="py-3 px-4 text-right">Disk</th>
                          <th className="py-3 pl-4 text-right">Services</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                        {allServers.map((srv) => (
                          <tr
                            key={srv.id}
                            onClick={() => {
                              setSelectedServerId(srv.id);
                              setActiveNav('servers');
                            }}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                          >
                            <td className="py-3 pr-4">
                              <div className="font-mono font-semibold text-slate-900 dark:text-white">
                                {srv.hostname}
                              </div>
                              <div className="font-mono text-xs text-slate-500">
                                {srv.ipAddress} · {srv.serverType}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                              {srv.os} ({srv.osVersion}) · {srv.environment}
                            </td>
                            <td className="py-3 px-4">{renderServerStatus(srv.status)}</td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                              {srv.cpuUsage.toFixed(1)}%
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                              {srv.ramUsage.toFixed(1)}%
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                              {srv.diskUsage.toFixed(1)}%
                            </td>
                            <td className="py-3 pl-4 text-right font-mono text-xs text-slate-500">
                              {srv.monitoredServices.filter((s) => s.status === 'running').length}/
                              {srv.monitoredServices.length} running
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            {/* 2. SERVER INVENTORY & LINUX/WINDOWS INSPECTOR */}
            {activeNav === 'servers' && (
              <div className="space-y-8">
                <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Server Inventory (Linux & Windows Hosts)
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Manage Node Exporter and Windows Exporter targets, maintenance windows, and per-host auto-healing
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search hostname or IP..."
                          value={serverSearch}
                          onChange={(e) => setServerSearch(e.target.value)}
                          className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded"
                        />
                      </div>

                      <select
                        value={serverEnvFilter}
                        onChange={(e) => setServerEnvFilter(e.target.value)}
                        className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded"
                      >
                        <option value="All">All Environments</option>
                        <option value="Production">Production</option>
                        <option value="Staging">Staging</option>
                        <option value="Development">Development</option>
                      </select>

                      <select
                        value={serverOsFilter}
                        onChange={(e) => setServerOsFilter(e.target.value)}
                        className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded"
                      >
                        <option value="All">All OS</option>
                        <option value="Linux">Linux</option>
                        <option value="Windows">Windows</option>
                      </select>

                      <button
                        onClick={() => setShowAddServerModal(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Server
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500">
                          <th className="py-3 pr-4">Hostname · IP</th>
                          <th className="py-3 px-4">OS · Type · Env</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">CPU / Load</th>
                          <th className="py-3 px-4 text-right">RAM / Swap</th>
                          <th className="py-3 px-4 text-right">Disk</th>
                          <th className="py-3 pl-4 text-right">Controls</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                        {filteredServers.map((srv) => (
                          <tr
                            key={srv.id}
                            onClick={() => setSelectedServerId(srv.id)}
                            className={`cursor-pointer transition-colors ${
                              inspectedServer?.id === srv.id
                                ? 'bg-blue-50/60 dark:bg-blue-950/30'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <td className="py-3 pr-4">
                              <div className="font-mono font-semibold text-slate-900 dark:text-white">
                                {srv.hostname}
                              </div>
                              <div className="font-mono text-xs text-slate-500">
                                {srv.ipAddress} · {srv.location}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                              {srv.os} · {srv.serverType} · {srv.environment}
                            </td>
                            <td className="py-3 px-4">{renderServerStatus(srv.status)}</td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                              {srv.cpuUsage.toFixed(1)}% · L:{srv.cpuLoad1m}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                              {srv.ramUsage.toFixed(1)}% · S:{srv.swapUsage}%
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                              {srv.diskUsage.toFixed(1)}%
                            </td>
                            <td
                              className="py-3 pl-4 text-right space-x-2 whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => handleTestServer(srv.id)}
                                className="px-2.5 py-1 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                Test Probe
                              </button>
                              <button
                                onClick={() => handleDeleteServer(srv)}
                                className="p-1 text-slate-400 hover:text-red-600"
                                title="Delete Server"
                              >
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Detailed Host Inspector */}
                {inspectedServer && (
                  <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                            {inspectedServer.hostname}
                          </h3>
                          {renderServerStatus(inspectedServer.status)}
                        </div>
                        <p className="text-xs font-mono text-slate-500 mt-1">
                          IP: {inspectedServer.ipAddress} · OS: {inspectedServer.os} ({inspectedServer.osVersion}) · Specs:{' '}
                          {inspectedServer.cpuCores} vCPU / {inspectedServer.ramGb} GB RAM / {inspectedServer.diskGb} GB Disk · Uptime:{' '}
                          {Math.floor(inspectedServer.uptimeSeconds / 86400)}d
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleUpdateServerFlag(inspectedServer, 'monitoringEnabled')}
                          className={`px-3 py-1.5 text-xs font-medium rounded border ${
                            inspectedServer.monitoringEnabled
                              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                              : 'border-slate-300 text-slate-500'
                          }`}
                        >
                          Monitoring: {inspectedServer.monitoringEnabled ? 'Enabled' : 'Disabled'}
                        </button>
                        <button
                          onClick={() => handleUpdateServerFlag(inspectedServer, 'autoHealingEnabled')}
                          className={`px-3 py-1.5 text-xs font-medium rounded border ${
                            inspectedServer.autoHealingEnabled
                              ? 'border-blue-600 text-blue-700 dark:text-blue-400'
                              : 'border-slate-300 text-slate-500'
                          }`}
                        >
                          Auto-Healing: {inspectedServer.autoHealingEnabled ? 'Enabled' : 'Disabled'}
                        </button>
                        <button
                          onClick={() => handleUpdateServerFlag(inspectedServer, 'maintenanceMode')}
                          className={`px-3 py-1.5 text-xs font-medium rounded border ${
                            inspectedServer.maintenanceMode
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {inspectedServer.maintenanceMode
                            ? 'Exit Maintenance Mode'
                            : 'Enter Maintenance Mode'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
                      <div className="border border-slate-200 dark:border-slate-800 p-4 space-y-1">
                        <div className="text-slate-500 font-sans">CPU & Kernel Load</div>
                        <div className="text-base font-bold text-slate-900 dark:text-white">
                          {inspectedServer.cpuUsage}% Utilization
                        </div>
                        <div>1m Load Avg: {inspectedServer.cpuLoad1m}</div>
                        <div>CPU iowait: {inspectedServer.cpuIowait}%</div>
                        <div>CPU steal: {inspectedServer.cpuSteal}%</div>
                      </div>
                      <div className="border border-slate-200 dark:border-slate-800 p-4 space-y-1">
                        <div className="text-slate-500 font-sans">Memory & Swap</div>
                        <div className="text-base font-bold text-slate-900 dark:text-white">
                          {inspectedServer.ramUsage}% ({((inspectedServer.ramGb * inspectedServer.ramUsage) / 100).toFixed(1)} GB)
                        </div>
                        <div>Total RAM: {inspectedServer.ramGb} GB</div>
                        <div>Swap Usage: {inspectedServer.swapUsage}%</div>
                        <div>Processes: {inspectedServer.processCount}</div>
                      </div>
                      <div className="border border-slate-200 dark:border-slate-800 p-4 space-y-1">
                        <div className="text-slate-500 font-sans">Disk Throughput & Inodes</div>
                        <div className="text-base font-bold text-slate-900 dark:text-white">
                          {inspectedServer.diskUsage}% Used
                        </div>
                        <div>Read: {inspectedServer.diskReadMbps} MB/s</div>
                        <div>Write: {inspectedServer.diskWriteMbps} MB/s</div>
                        <div>Inode Usage: {inspectedServer.inodeUsage}%</div>
                      </div>
                      <div className="border border-slate-200 dark:border-slate-800 p-4 space-y-1">
                        <div className="text-slate-500 font-sans">Network Interface</div>
                        <div className="text-base font-bold text-slate-900 dark:text-white">
                          RX {inspectedServer.networkRxMbps} / TX {inspectedServer.networkTxMbps} Mbps
                        </div>
                        <div>Packet Loss: {inspectedServer.packetLoss}%</div>
                        <div>Exporter: {inspectedServer.exporterType}:{inspectedServer.exporterPort}</div>
                      </div>
                    </div>
                  </section>
                )}

                {/* Add Server Modal */}
                {showAddServerModal && (
                  <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-4">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                        Enroll Infrastructure Server into Monitoring
                      </h3>
                      <form onSubmit={handleAddServer} className="space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block mb-1 text-slate-500">Hostname</label>
                            <input
                              type="text"
                              required
                              placeholder="prd-lnx-app-04.sg1.internal"
                              value={newServerForm.hostname}
                              onChange={(e) =>
                                setNewServerForm({ ...newServerForm, hostname: e.target.value })
                              }
                              className="w-full px-3 py-2 font-mono border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded"
                            />
                          </div>
                          <div>
                            <label className="block mb-1 text-slate-500">IP Address</label>
                            <input
                              type="text"
                              required
                              placeholder="10.24.10.55"
                              value={newServerForm.ipAddress}
                              onChange={(e) =>
                                setNewServerForm({ ...newServerForm, ipAddress: e.target.value })
                              }
                              className="w-full px-3 py-2 font-mono border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block mb-1 text-slate-500">Operating System</label>
                            <select
                              value={newServerForm.os}
                              onChange={(e) =>
                                setNewServerForm({
                                  ...newServerForm,
                                  os: e.target.value,
                                  osVersion:
                                    e.target.value === 'Windows'
                                      ? 'Windows Server 2022'
                                      : 'Ubuntu 24.04 LTS',
                                  exporterType:
                                    e.target.value === 'Windows'
                                      ? 'windows_exporter'
                                      : 'node_exporter',
                                  exporterPort: e.target.value === 'Windows' ? 9182 : 9100,
                                })
                              }
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded"
                            >
                              <option value="Linux">Linux</option>
                              <option value="Windows">Windows</option>
                            </select>
                          </div>
                          <div>
                            <label className="block mb-1 text-slate-500">Environment</label>
                            <select
                              value={newServerForm.environment}
                              onChange={(e) =>
                                setNewServerForm({ ...newServerForm, environment: e.target.value })
                              }
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded"
                            >
                              <option value="Production">Production</option>
                              <option value="Staging">Staging</option>
                              <option value="Development">Development</option>
                              <option value="Testing">Testing</option>
                            </select>
                          </div>
                          <div>
                            <label className="block mb-1 text-slate-500">Server Type</label>
                            <select
                              value={newServerForm.serverType}
                              onChange={(e) =>
                                setNewServerForm({ ...newServerForm, serverType: e.target.value })
                              }
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded"
                            >
                              <option value="Web Server">Web Server</option>
                              <option value="Application Server">Application Server</option>
                              <option value="Database Server">Database Server</option>
                              <option value="Container Host">Container Host</option>
                              <option value="Virtual Machine">Virtual Machine</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3">
                          <button
                            type="button"
                            onClick={() => setShowAddServerModal(false)}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700"
                          >
                            Enroll Host & Configure Exporter
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. PROMETHEUS & GRAFANA VIEW */}
            {activeNav === 'monitoring' && (
              <MonitoringView
                servers={allServers}
                targets={nocData?.data.monitoringTargets || []}
                onTestServer={handleTestServer}
              />
            )}

            {/* 4. ALERTS & ALERTMANAGER VIEW */}
            {activeNav === 'alerts' && (
              <div className="space-y-8">
                <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Alertmanager Queue & Escalations
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Grouped and deduplicated infrastructure alerts with Silencing, Acknowledgement, and Auto-Healing
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={alertSeverityFilter}
                        onChange={(e) => setAlertSeverityFilter(e.target.value)}
                        className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded"
                      >
                        <option value="ALL">All Severities</option>
                        <option value="CRITICAL">CRITICAL</option>
                        <option value="HIGH">HIGH</option>
                        <option value="WARNING">WARNING</option>
                        <option value="INFO">INFO</option>
                      </select>
                      <select
                        value={alertStatusFilter}
                        onChange={(e) => setAlertStatusFilter(e.target.value)}
                        className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="FIRING">FIRING</option>
                        <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                        <option value="SILENCED">SILENCED</option>
                        <option value="RESOLVED">RESOLVED</option>
                      </select>
                      <button
                        onClick={() => setShowAddRuleModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        New Alert Rule
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-200 dark:divide-slate-800 mt-2">
                    {allAlerts
                      .filter(
                        (a) =>
                          (alertSeverityFilter === 'ALL' || a.severity === alertSeverityFilter) &&
                          (alertStatusFilter === 'ALL' || a.status === alertStatusFilter)
                      )
                      .map((alert) => (
                        <div
                          key={alert.id}
                          className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                        >
                          <div>
                            <div className="flex items-center gap-2 text-xs font-mono">
                              <span
                                className={`font-semibold ${
                                  alert.severity === 'CRITICAL'
                                    ? 'text-red-600 dark:text-red-400'
                                    : alert.severity === 'HIGH'
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-blue-600 dark:text-blue-400'
                                }`}
                              >
                                {alert.severity}
                              </span>
                              <span>·</span>
                              <span className="font-semibold">{alert.status}</span>
                              <span>·</span>
                              <span>{alert.hostname}</span>
                              <span>·</span>
                              <span>Observed: {alert.metricValue}</span>
                            </div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                              {alert.title}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">{alert.message}</div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {alert.status !== 'RESOLVED' && (
                              <>
                                <button
                                  onClick={() => handleQuickAutoHealAlert(alert)}
                                  className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  Auto-Heal
                                </button>
                                <button
                                  onClick={() => handleAlertAction(alert, 'acknowledge')}
                                  className="px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                  Acknowledge
                                </button>
                                <button
                                  onClick={() => handleAlertAction(alert, 'silence')}
                                  className="px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                  Silence 1h
                                </button>
                                <button
                                  onClick={() => handleAlertAction(alert, 'resolve')}
                                  className="px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                  Resolve
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </section>

                {/* Alert Rules Table */}
                <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
                    Configured Prometheus & Alertmanager Rules
                  </h3>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500">
                        <th className="py-2.5 pr-4">Rule Name</th>
                        <th className="py-2.5 px-4">Condition</th>
                        <th className="py-2.5 px-4">For Duration</th>
                        <th className="py-2.5 px-4">Severity</th>
                        <th className="py-2.5 pl-4">Linked Auto-Healing Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs font-mono">
                      {(nocData?.data.alertRules || []).map((rule) => {
                        const linkedAction = nocData?.data.remediationActions.find(
                          (a) => a.id === rule.remediationActionId
                        );
                        return (
                          <tr key={rule.id}>
                            <td className="py-2.5 pr-4 font-sans font-medium text-slate-900 dark:text-white">
                              {rule.name}
                            </td>
                            <td className="py-2.5 px-4">
                              {rule.metric} {rule.condition} {rule.threshold}
                            </td>
                            <td className="py-2.5 px-4">{rule.durationSec}s</td>
                            <td className="py-2.5 px-4 font-semibold">{rule.severity}</td>
                            <td className="py-2.5 pl-4 text-blue-600 dark:text-blue-400">
                              {linkedAction ? `${linkedAction.code} (${linkedAction.name})` : 'Manual Triage'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </section>

                {showAddRuleModal && (
                  <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                        Create Prometheus Alert Rule
                      </h3>
                      <form onSubmit={handleCreateRule} className="space-y-3 text-xs">
                        <div>
                          <label className="block mb-1 text-slate-500">Rule Name</label>
                          <input
                            type="text"
                            required
                            placeholder="Disk Critical > 95%"
                            value={newRuleForm.name}
                            onChange={(e) =>
                              setNewRuleForm({ ...newRuleForm, name: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <select
                            value={newRuleForm.metric}
                            onChange={(e) =>
                              setNewRuleForm({ ...newRuleForm, metric: e.target.value })
                            }
                            className="px-2 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded"
                          >
                            <option value="cpu_usage">cpu_usage</option>
                            <option value="ram_usage">ram_usage</option>
                            <option value="disk_usage">disk_usage</option>
                            <option value="packet_loss">packet_loss</option>
                          </select>
                          <select
                            value={newRuleForm.condition}
                            onChange={(e) =>
                              setNewRuleForm({ ...newRuleForm, condition: e.target.value })
                            }
                            className="px-2 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded"
                          >
                            <option value=">">&gt;</option>
                            <option value=">=">&gt;=</option>
                            <option value="==">==</option>
                          </select>
                          <input
                            type="number"
                            value={newRuleForm.threshold}
                            onChange={(e) =>
                              setNewRuleForm({ ...newRuleForm, threshold: Number(e.target.value) })
                            }
                            className="px-2 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowAddRuleModal(false)}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded"
                          >
                            Save Rule
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. INCIDENT MANAGEMENT VIEW */}
            {activeNav === 'incidents' && (
              <div className="space-y-6">
                <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        NOC Incident Management & Root-Cause Tracking
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Lifecycle management from OPEN → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → CLOSED
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={incidentStatusFilter}
                        onChange={(e) => setIncidentStatusFilter(e.target.value)}
                        className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="OPEN">OPEN</option>
                        <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                      <button
                        onClick={() => setShowAddIncidentModal(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Declare Incident
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 mt-4">
                    {allIncidents
                      .filter(
                        (inc) =>
                          incidentStatusFilter === 'ALL' || inc.status === incidentStatusFilter
                      )
                      .map((inc) => (
                        <div
                          key={inc.id}
                          className="border border-slate-200 dark:border-slate-800 p-4 space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs font-mono">
                              <span className="font-bold text-blue-600 dark:text-blue-400">
                                {inc.incidentKey}
                              </span>
                              <span>·</span>
                              <span className="font-semibold text-red-600 dark:text-red-400">
                                {inc.severity}
                              </span>
                              <span>·</span>
                              <span className="font-semibold">{inc.status}</span>
                              <span>·</span>
                              <span>Host: {inc.affectedHostname}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {(['ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map(
                                (st) => (
                                  <button
                                    key={st}
                                    onClick={() => handleUpdateIncidentStatus(inc, st)}
                                    className={`px-2.5 py-1 text-xs font-mono rounded border ${
                                      inc.status === st
                                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900'
                                        : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                    }`}
                                  >
                                    {st}
                                  </button>
                                )
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                              {inc.title}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">{inc.description}</div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                            <div>
                              <span className="text-slate-400">Service:</span>{' '}
                              <span className="font-mono">{inc.affectedService}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Assigned To:</span>{' '}
                              <span>{inc.assignedTo}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Root Cause:</span>{' '}
                              <span>{inc.rootCause}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </section>

                {showAddIncidentModal && (
                  <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                        Declare Operational Incident
                      </h3>
                      <form onSubmit={handleCreateIncident} className="space-y-3 text-xs">
                        <input
                          type="text"
                          required
                          placeholder="Incident Title"
                          value={newIncidentForm.title}
                          onChange={(e) =>
                            setNewIncidentForm({ ...newIncidentForm, title: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded"
                        />
                        <textarea
                          rows={3}
                          placeholder="Description & initial symptoms"
                          value={newIncidentForm.description}
                          onChange={(e) =>
                            setNewIncidentForm({ ...newIncidentForm, description: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Affected Hostname (e.g. prd-lnx-db-01.sg1.internal)"
                          value={newIncidentForm.affectedHostname}
                          onChange={(e) =>
                            setNewIncidentForm({
                              ...newIncidentForm,
                              affectedHostname: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 font-mono border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded"
                        />
                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowAddIncidentModal(false)}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded"
                          >
                            Create Incident
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 6. AUTO-HEALING ENGINE VIEW */}
            {activeNav === 'automation' && (
              <AutomationView
                servers={allServers}
                actions={nocData?.data.remediationActions || []}
                jobs={allJobs}
                apiCall={apiCall}
                onRefresh={fetchBootstrapData}
                showToast={showToast}
              />
            )}

            {/* 7. DOCKER, AWS EC2 & NETWORK MONITORING VIEW */}
            {activeNav === 'cloud' && (
              <CloudContainersNetworkView
                activeSubTab={cloudSubTab}
                setActiveSubTab={setCloudSubTab}
                containers={allContainers}
                awsInstances={nocData?.data.awsInstances || []}
                networkChecks={nocData?.data.networkChecks || []}
                apiCall={apiCall}
                onRefresh={fetchBootstrapData}
                showToast={showToast}
              />
            )}

            {/* 8. LOGS, REPORTS, BACKUPS, RBAC, NOTIFICATIONS, SETTINGS & AUDIT VIEW */}
            {activeNav === 'governance' && (
              <OperationsGovernanceView
                activeTab={govSubTab}
                setActiveTab={setGovSubTab}
                servers={allServers}
                logs={nocData?.data.logs || []}
                alerts={allAlerts}
                incidents={allIncidents}
                jobs={allJobs}
                backups={nocData?.data.backupJobs || []}
                users={nocData?.data.users || []}
                roles={nocData?.data.roles || []}
                notifications={nocData?.data.notificationChannels || []}
                settings={nocData?.data.settings || []}
                auditLogs={nocData?.data.auditLogs || []}
                apiCall={apiCall}
                onRefresh={fetchBootstrapData}
                showToast={showToast}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
