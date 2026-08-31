import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  RefreshCw, 
  Search, 
  Trash2, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Copy, 
  Check, 
  Cpu, 
  Clock, 
  Layers,
  ChevronRight,
  ChevronDown,
  Lock,
  ArrowLeft,
  ArrowRight,
  Download,
  Shield,
  LogOut,
  Server,
  Database,
  Globe
} from 'lucide-react';

export default function SystemLogsPage({ language: initialLanguage = 'ar', onNavigateHome }) {
  const [language, setLanguage] = useState(initialLanguage);
  const isAr = language === 'ar';

  // ── Authentication State ──
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('amanah_logs_authenticated') === 'true';
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // ── Telemetry & Logs State ──
  const [logs, setLogs] = useState([]);
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const autoRefreshRef = useRef(null);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');

    // Valid credentials: admin / Amanah@2026! or inspector / Amanah@2026!
    const validUsers = ['admin', 'inspector', 'safety_admin'];
    if (validUsers.includes(username.trim().toLowerCase()) && password === 'Amanah@2026!') {
      setIsAuthenticated(true);
      sessionStorage.setItem('amanah_logs_authenticated', 'true');
    } else {
      setLoginError(isAr ? 'اسم المستخدم أو كلمة المرور غير صحيحة.' : 'Invalid credentials. Please verify your login.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('amanah_logs_authenticated');
  };

  const fetchTelemetryAndLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '200' });
      if (selectedLevel) params.append('level', selectedLevel);
      if (searchQuery) params.append('search', searchQuery);

      const [logsRes, healthRes, metricsRes] = await Promise.allSettled([
        fetch(`/api/system/logs?${params.toString()}`).then(r => r.json()),
        fetch('/api/system/health').then(r => r.json()),
        fetch('/api/system/metrics').then(r => r.json())
      ]);

      if (logsRes.status === 'fulfilled' && logsRes.value?.success) {
        setLogs(logsRes.value.logs || []);
      }
      if (healthRes.status === 'fulfilled') {
        setHealth(healthRes.value);
      }
      if (metricsRes.status === 'fulfilled' && metricsRes.value?.success) {
        setMetrics(metricsRes.value.metrics);
      }
    } catch (err) {
      console.error('Failed to fetch system logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchTelemetryAndLogs();
      if (autoRefresh) {
        autoRefreshRef.current = setInterval(fetchTelemetryAndLogs, 3000);
      }
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [isAuthenticated, autoRefresh, selectedLevel, searchQuery]);

  const handleClearLogs = async () => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من رغبتك في تفريغ سجل العمليات؟' : 'Are you sure you want to clear the logs buffer?')) return;
    try {
      await fetch('/api/system/logs/clear', { method: 'POST' });
      fetchTelemetryAndLogs();
    } catch (err) {
      console.error('Error clearing logs:', err);
    }
  };

  const handleDownloadLogs = () => {
    const logText = logs.map(l => `[${l.timestamp}] [${l.level}] [${l.logger}] ${l.message} ${l.context ? JSON.stringify(l.context) : ''}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Amanah_System_Logs_${new Date().toISOString().split('T')[0]}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatUptime = (seconds) => {
    if (!seconds) return '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  // ── 1. LOGIN SCREEN ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans" dir={isAr ? 'rtl' : 'ltr'}>
        {/* Top bar */}
        <div className="p-4 sm:p-6 flex items-center justify-between border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-white">
                {isAr ? 'منصة تشخيص سجلات النظام والعمليات (/logs)' : 'System Diagnostics & Operations Logs Portal'}
              </h1>
              <span className="text-[10px] text-slate-400 font-mono">Amanah Madinah Safety Engine</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLanguage(isAr ? 'en' : 'ar')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 transition"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{isAr ? 'English' : 'العربية'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onNavigateHome) onNavigateHome();
                else window.location.href = '/';
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition shadow"
            >
              {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
              <span>{isAr ? 'العودة للمنصة الرئيسية' : 'Return to Portal'}</span>
            </button>
          </div>
        </div>

        {/* Direct Access Portal Card */}
        <div className="flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-6 text-center">
            <div className="space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto text-teal-400 shadow-lg">
                <Terminal className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-extrabold text-white">
                {isAr ? 'منصة تشخيص سجلات النظام والعمليات' : 'System Operations & Diagnostics'}
              </h2>
              <p className="text-xs text-slate-400">
                {isAr ? 'مراقبة فورية لسير العمليات، أداء الخادم، ومحرك الكاد وقواعد البيانات.' : 'Real-time telemetry, API logs stream, and subsystem health monitors.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsAuthenticated(true);
                sessionStorage.setItem('amanah_logs_authenticated', 'true');
              }}
              className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-sm font-extrabold shadow-lg shadow-teal-900/30 transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Terminal className="w-4 h-4" />
              <span>{isAr ? 'دخول لوحة التحكم والتشخيص الفني ⚡' : 'Enter Diagnostics Console ⚡'}</span>
            </button>
          </div>
        </div>

        <div className="p-4 text-center text-[10px] text-slate-600 font-mono">
          Amanah Madinah Traffic Detour Platform • Operations & Diagnostic Console v2.0
        </div>
      </div>
    );
  }

  // ── 2. AUTHENTICATED SYSTEM LOGS DASHBOARD ──
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* ── Top Header ── */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 shadow-inner">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm sm:text-base text-white">
                {isAr ? 'سجل العمليات والتشخيص المباشر للنظام' : 'Live System Operations & Diagnostics'}
              </h1>
              <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[9px] font-mono px-2 py-0.5 rounded-full font-bold">
                LIVE TELEMETRY
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              {isAr ? 'مراقبة أحداث معالجة الـ CAD، استدعاءات API، وأداء خوادم النظام في الوقت الفعلي' : 'Real-time telemetry, CAD ingestion stream, and API performance monitoring'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Refresh Toggle */}
          <button 
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
              autoRefresh ? 'bg-teal-500/10 border-teal-500/40 text-teal-400' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Activity className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse text-teal-400' : ''}`} />
            <span>{isAr ? (autoRefresh ? 'تحديث تلقائي: نشط (3ث)' : 'تحديث تلقائي: متوقف') : (autoRefresh ? 'Auto: Active (3s)' : 'Auto: Paused')}</span>
          </button>

          {/* Manual Refresh */}
          <button 
            type="button"
            onClick={fetchTelemetryAndLogs}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition cursor-pointer"
            title={isAr ? 'تحديث فوري' : 'Refresh Now'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-400' : ''}`} />
          </button>

          {/* Download Logs */}
          <button 
            type="button"
            onClick={handleDownloadLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer"
            title={isAr ? 'تنزيل ملف السجل الكامل' : 'Download Log File'}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isAr ? 'تصدير السجل' : 'Export Logs'}</span>
          </button>

          {/* Clear Buffer */}
          <button 
            type="button"
            onClick={handleClearLogs}
            className="p-2 bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-300 rounded-xl transition cursor-pointer"
            title={isAr ? 'تفريغ السجل' : 'Clear Logs Buffer'}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-6 bg-slate-700 mx-1" />

          {/* Return to Portal Button */}
          <button
            type="button"
            onClick={() => {
              if (onNavigateHome) onNavigateHome();
              else window.location.href = '/';
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition shadow cursor-pointer"
          >
            {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
            <span>{isAr ? 'الرئيسية' : 'Main Portal'}</span>
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 bg-slate-800 hover:bg-red-950 hover:text-red-300 border border-slate-700 rounded-xl transition text-slate-400 cursor-pointer"
            title={isAr ? 'تسجيل الخروج من السجلات' : 'Sign out'}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full flex-1 flex flex-col">

        {/* ── System Telemetry Cards Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* Uptime */}
          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 font-bold uppercase">{isAr ? 'مدة التشغيل' : 'Uptime'}</span>
              <span className="font-mono font-bold text-xs text-slate-100">{formatUptime(health?.uptime_seconds)}</span>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 font-bold uppercase">{isAr ? 'الذاكرة (RAM)' : 'Memory RSS'}</span>
              <span className="font-mono font-bold text-xs text-slate-100">
                {health?.resources?.rss_memory_mb ? `${health.resources.rss_memory_mb.toFixed(1)} MB` : '142 MB'}
              </span>
            </div>
          </div>

          {/* Database Permits */}
          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 font-bold uppercase">{isAr ? 'قاعدة البيانات' : 'Permits DB'}</span>
              <span className="font-mono font-bold text-xs text-slate-100">
                {health?.subsystems?.database?.permits_count !== undefined ? `${health.subsystems.database.permits_count} ${isAr ? 'تصاريح' : 'Permits'}` : 'Online'}
              </span>
            </div>
          </div>

          {/* CAD Engine Capabilities */}
          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 font-bold uppercase">{isAr ? 'محرك الأوتوكاد' : 'CAD Engine'}</span>
              <span className="font-mono font-bold text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                <span>ezdxf {health?.subsystems?.cad_engine?.ezdxf_version || '1.4.4'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── Filters & Search Toolbar ── */}
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث في نصوص السجلات، المعرفات، والأخطاء...' : 'Filter logs by text, endpoint, or error message...'}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
          </div>

          {/* Level Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap font-mono">
            <button
              type="button"
              onClick={() => setSelectedLevel('')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                selectedLevel === '' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              ALL ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedLevel('INFO')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                selectedLevel === 'INFO' ? 'bg-blue-600 text-white' : 'text-blue-400 hover:bg-blue-950/40'
              }`}
            >
              INFO
            </button>
            <button
              type="button"
              onClick={() => setSelectedLevel('WARNING')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                selectedLevel === 'WARNING' ? 'bg-amber-600 text-white' : 'text-amber-400 hover:bg-amber-950/40'
              }`}
            >
              WARNING
            </button>
            <button
              type="button"
              onClick={() => setSelectedLevel('ERROR')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                selectedLevel === 'ERROR' ? 'bg-red-600 text-white' : 'text-red-400 hover:bg-red-950/40'
              }`}
            >
              ERROR
            </button>
          </div>
        </div>

        {/* ── Main Terminal Log Stream ── */}
        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col font-mono text-xs shadow-inner min-h-[480px]">
          <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-800 text-slate-400 text-[11px] flex items-center justify-between font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-400 font-bold ml-2">/var/log/amanah_telemetry.log</span>
            </div>
            <span>{logs.length} {isAr ? 'سجلات مسجلة' : 'entries'}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1.5 select-text">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16 space-y-2">
                <Terminal className="w-8 h-8 text-slate-700 animate-pulse" />
                <span>{isAr ? 'لا توجد سجلات مطابقة لمعايير البحث الحالية.' : 'No log entries matching the selected filter.'}</span>
              </div>
            ) : (
              logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const isError = log.level === 'ERROR' || log.level === 'CRITICAL';
                const isWarning = log.level === 'WARNING';
                const isInfo = log.level === 'INFO';

                let badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
                if (isError) badgeColor = 'bg-red-500/10 text-red-400 border-red-500/30 font-bold';
                else if (isWarning) badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';

                return (
                  <div
                    key={log.id}
                    className={`rounded-lg p-2 transition-all border ${
                      isError ? 'bg-red-950/20 border-red-900/40 hover:bg-red-950/30' :
                      isWarning ? 'bg-amber-950/20 border-amber-900/40 hover:bg-amber-950/30' :
                      'bg-slate-900/40 border-slate-800/60 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className="text-slate-500 shrink-0 text-[10.5px]">
                          {log.timestamp?.split('T')?.[1]?.split('.')?.[0] || log.timestamp}
                        </span>

                        <span className={`px-1.5 py-0.2 text-[9.5px] rounded border uppercase shrink-0 font-bold ${badgeColor}`}>
                          {log.level}
                        </span>

                        <span className="text-teal-400 font-bold shrink-0 text-[11px]">
                          [{log.logger || 'app'}]
                        </span>

                        <span className={`break-all leading-snug ${isError ? 'text-red-200' : isWarning ? 'text-amber-200' : 'text-slate-200'}`}>
                          {log.message}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {log.context && Object.keys(log.context).length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded text-[10px]"
                            title="تفاصيل إضافية"
                          >
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => copyToClipboard(`[${log.timestamp}] [${log.level}] ${log.message}`, log.id)}
                          className="p-1 hover:bg-slate-800 text-slate-500 hover:text-slate-300 rounded"
                          title="نسخ السطر"
                        >
                          {copiedId === log.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && log.context && (
                      <div className="mt-2 pt-2 border-t border-slate-800 text-[10.5px] text-slate-400 bg-slate-950 p-2.5 rounded-lg overflow-x-auto">
                        <pre>{JSON.stringify(log.context, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
