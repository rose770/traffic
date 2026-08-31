import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  RefreshCw, 
  Search, 
  Trash2, 
  X, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Copy, 
  Check, 
  Cpu, 
  Clock, 
  Layers,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

export default function SystemLogsModal({ isOpen, onClose, language = 'ar' }) {
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

  const fetchTelemetryAndLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '150' });
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
    if (isOpen) {
      fetchTelemetryAndLogs();
      if (autoRefresh) {
        autoRefreshRef.current = setInterval(fetchTelemetryAndLogs, 3000);
      }
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [isOpen, autoRefresh, selectedLevel, searchQuery]);

  const handleClearLogs = async () => {
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من رغبتك في تفريغ سجل العمليات؟' : 'Are you sure you want to clear the logs buffer?')) return;
    try {
      await fetch('/api/system/logs/clear', { method: 'POST' });
      fetchTelemetryAndLogs();
    } catch (err) {
      console.error('Error clearing logs:', err);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 sm:p-6 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 font-sans">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  {language === 'ar' ? 'سجل العمليات والمراقبة الفنية' : 'System Operations & Diagnostics Console'}
                </h2>
                <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full border ${
                  health?.status === 'healthy' 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}>
                  {health?.status === 'healthy' ? '● SYSTEM HEALTHY' : '● DEGRADED'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'ar' ? 'متابعة حية للطلبات، معالجة ملفات الأوتوكاد، ومحرك الرؤية الحاسوبية' : 'Live telemetry for API requests, CAD geometry ingestion & CV spatial registration'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                autoRefresh 
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' 
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
              title={autoRefresh ? 'Auto-refresh active (3s)' : 'Auto-refresh paused'}
            >
              <Activity className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse text-teal-400' : ''}`} />
              <span>{autoRefresh ? (language === 'ar' ? 'مباشر (٣ث)' : 'Live (3s)') : (language === 'ar' ? 'متوقف' : 'Paused')}</span>
            </button>

            <button
              onClick={fetchTelemetryAndLogs}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title={language === 'ar' ? 'تحديث الآن' : 'Refresh Now'}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-400' : ''}`} />
            </button>

            <button
              onClick={handleClearLogs}
              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition"
              title={language === 'ar' ? 'تفريغ السجل' : 'Clear Log Buffer'}
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Telemetry Quick Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 sm:px-5 bg-slate-900/90 border-b border-slate-800 text-xs">
          <div className="bg-slate-800/60 border border-slate-700/50 p-2 rounded-lg flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">{language === 'ar' ? 'مدة التشغيل' : 'Uptime'}</span>
              <span className="font-mono font-bold text-white">{metrics ? `${Math.round(metrics.uptime_seconds)}s` : '—'}</span>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 p-2 rounded-lg flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">{language === 'ar' ? 'إجمالي الطلبات' : 'Total Requests'}</span>
              <span className="font-mono font-bold text-white">{metrics ? metrics.total_requests : '0'}</span>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 p-2 rounded-lg flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">{language === 'ar' ? 'متوسط الاستجابة' : 'Avg Latency'}</span>
              <span className="font-mono font-bold text-white">{metrics ? `${metrics.avg_response_time_ms} ms` : '—'}</span>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 p-2 rounded-lg flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">{language === 'ar' ? 'ذاكرة الخادم' : 'Memory (RSS)'}</span>
              <span className="font-mono font-bold text-white">{health?.resources?.rss_memory_mb ? `${health.resources.rss_memory_mb} MB` : '—'}</span>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 p-2 rounded-lg flex items-center gap-2.5">
            <AlertCircle className={`w-4 h-4 shrink-0 ${metrics?.error_rate_pct > 5 ? 'text-red-400' : 'text-slate-400'}`} />
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">{language === 'ar' ? 'نسبة الأخطاء' : 'Error Rate'}</span>
              <span className="font-mono font-bold text-white">{metrics ? `${metrics.error_rate_pct}%` : '0%'}</span>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-3 sm:px-5 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 text-[11px] font-semibold mr-1">{language === 'ar' ? 'المستوى:' : 'Level:'}</span>
            {[
              { id: '', label: 'ALL', color: 'text-slate-300' },
              { id: 'INFO', label: 'INFO', color: 'text-emerald-400' },
              { id: 'WARNING', label: 'WARN', color: 'text-amber-400' },
              { id: 'ERROR', label: 'ERROR', color: 'text-red-400' }
            ].map(lvl => (
              <button
                key={lvl.id}
                onClick={() => setSelectedLevel(lvl.id)}
                className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition-all ${
                  selectedLevel === lvl.id
                    ? 'bg-slate-700 text-white font-bold shadow-xs'
                    : 'bg-slate-800/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span className={lvl.color}>{lvl.label}</span>
              </button>
            ))}
          </div>

          <div className="relative flex-1 sm:max-w-xs min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ar' ? 'بحث في الرسائل، الوحدات، أو Request ID...' : 'Search logs, modules, or request ID...'}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
            />
          </div>
        </div>

        {/* Log Stream Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-1.5 font-mono text-xs bg-slate-950/90 select-text">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center py-12">
              <Terminal className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-sans">{language === 'ar' ? 'لا توجد سجلات تطابق البحث الحالي.' : 'No log entries match the current filter.'}</p>
            </div>
          ) : (
            logs.map((log, index) => {
              const isExpanded = expandedLogId === log.id || expandedLogId === index;
              const isError = log.level === 'ERROR' || log.level === 'CRITICAL';
              const isWarn = log.level === 'WARNING';
              const isInfo = log.level === 'INFO';

              return (
                <div
                  key={log.id || index}
                  className={`border rounded-lg transition-all ${
                    isError
                      ? 'bg-red-950/20 border-red-900/40 text-red-200'
                      : isWarn
                      ? 'bg-amber-950/20 border-amber-900/40 text-amber-200'
                      : 'bg-slate-900/70 border-slate-800/80 text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : (log.id || index))}
                    className="p-2.5 flex items-start gap-2 cursor-pointer select-text"
                  >
                    <button className="mt-0.5 text-slate-500 hover:text-slate-300 shrink-0">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>

                    <span className="text-slate-500 text-[11px] shrink-0">
                      {log.timestamp?.replace('T', ' ')?.slice(11, 23)}
                    </span>

                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                      isError
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : isWarn
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {log.level}
                    </span>

                    <span className="text-slate-400 font-semibold text-[11px] shrink-0 max-w-[140px] truncate">
                      {log.logger}
                    </span>

                    {log.request_id && log.request_id !== '-' && (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono border border-slate-700 shrink-0">
                        req:{log.request_id.slice(0, 8)}
                      </span>
                    )}

                    <span className="flex-1 text-white break-words text-[11.5px]">
                      {log.message}
                    </span>
                  </div>

                  {/* Expanded Diagnostics Drawer */}
                  {isExpanded && (
                    <div className="p-3.5 pt-0 border-t border-slate-800/80 text-[11px] space-y-2 bg-slate-950/60">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-400 pt-2">
                        <div>
                          <span className="text-slate-500">Timestamp: </span>
                          <span className="text-slate-200">{log.timestamp}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Request ID: </span>
                          <span className="text-slate-200">{log.request_id}</span>
                          {log.request_id && log.request_id !== '-' && (
                            <button
                              onClick={() => copyToClipboard(log.request_id, `req-${index}`)}
                              className="text-slate-400 hover:text-teal-300 p-0.5"
                              title="Copy Request ID"
                            >
                              {copiedId === `req-${index}` ? <Check className="w-3 h-3 text-teal-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                        {log.client_ip && (
                          <div>
                            <span className="text-slate-500">Client IP: </span>
                            <span className="text-slate-200">{log.client_ip}</span>
                          </div>
                        )}
                        {log.filename && (
                          <div>
                            <span className="text-slate-500">Source: </span>
                            <span className="text-slate-200">{log.filename}:{log.lineno}</span>
                          </div>
                        )}
                      </div>

                      {log.exception_msg && (
                        <div className="p-2.5 bg-red-950/40 border border-red-900/60 rounded text-red-300 space-y-1">
                          <div className="font-bold text-red-400">{log.exception_type || 'Exception'}:</div>
                          <div className="whitespace-pre-wrap">{log.exception_msg}</div>
                        </div>
                      )}

                      {log.metadata && (
                        <div className="p-2 bg-slate-900 rounded border border-slate-800">
                          <span className="text-slate-500 block mb-1">Metadata:</span>
                          <pre className="text-[10px] text-teal-300 whitespace-pre-wrap">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:px-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-500">
          <span>
            {language === 'ar' ? `عرض ${logs.length} سجلات حية` : `Showing ${logs.length} live log events`}
          </span>
          <span className="font-mono text-[11px]">
            FastAPI / OpenCV / Proj4 Logging Engine v1.1
          </span>
        </div>

      </div>
    </div>
  );
}
