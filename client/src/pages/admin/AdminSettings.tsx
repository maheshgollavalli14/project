import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { GlassCard } from '../../components/ui/GlassCard.js';
import { GradientButton } from '../../components/ui/GradientButton.js';
import {
  Settings,
  Save,
  CheckCircle2,
  RefreshCw,
  DollarSign,
  Shield,
} from 'lucide-react';

interface SettingMap {
  [key: string]: string;
}

const DEFAULT_SETTINGS = {
  REGISTRATION_OPEN: 'true',
  REGISTRATION_FEE: '200',
  REGISTRATION_FEE_INDIVIDUAL: '200',
  LEADERBOARD_FROZEN: 'false',
  STRICT_FULLSCREEN_ENFORCEMENT: 'true',
  MAX_VIOLATIONS_BEFORE_WARNING: '1',
  MAX_VIOLATIONS_BEFORE_DISQUALIFICATION_REVIEW: '5',
  SUPPORT_EMAIL: 'support@codebreak.dev',
};

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<SettingMap>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/admin/settings');
      if (res.success && res.data?.settings) {
        const map: SettingMap = { ...DEFAULT_SETTINGS };
        for (const s of res.data.settings) {
          map[s.key] = s.value;
        }
        setSettings(map);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
      }));

      const res = await api.patch('/api/admin/settings', { settings: payload });
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update contest settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Settings className="w-7 h-7 text-purple-400" />
            Contest Platform Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global operational toggles, registration pricing, anti-cheat thresholds, and live leaderboard parameters
          </p>
        </div>

        <GradientButton
          variant="ghost"
          size="sm"
          onClick={fetchSettings}
          disabled={isLoading}
          className="border border-purple-500/30"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Reload
        </GradientButton>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <strong>Configuration Saved!</strong> All contest rules and parameters have been updated across active servers and client sessions.
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Registration Section */}
        <GlassCard className="p-6 border border-purple-500/20 space-y-4">
          <div className="flex items-center gap-3 border-b border-purple-500/20 pb-3">
            <DollarSign className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Registration & Pricing</h2>
              <p className="text-[11px] text-slate-400">Control registration window status and entry ticket amounts (INR ₹)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Registration Status
              </label>
              <select
                value={settings.REGISTRATION_OPEN}
                onChange={(e) => handleChange('REGISTRATION_OPEN', e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/60 border border-purple-500/20 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="true">Open (Accepting Registrations)</option>
                <option value="false">Closed (Registration Disabled)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Support Inquiries Email
              </label>
              <input
                type="email"
                value={settings.SUPPORT_EMAIL}
                onChange={(e) => handleChange('SUPPORT_EMAIL', e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/60 border border-purple-500/20 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Participant Registration Fee (INR ₹)
              </label>
              <input
                type="number"
                value={settings.REGISTRATION_FEE || settings.REGISTRATION_FEE_INDIVIDUAL}
                onChange={(e) => {
                  handleChange('REGISTRATION_FEE', e.target.value);
                  handleChange('REGISTRATION_FEE_INDIVIDUAL', e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-900/60 border border-purple-500/20 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </GlassCard>

        {/* Security & Leaderboard Controls */}
        <GlassCard className="p-6 border border-purple-500/20 space-y-4">
          <div className="flex items-center gap-3 border-b border-purple-500/20 pb-3">
            <Shield className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Anti-Cheating & Leaderboard Freeze</h2>
              <p className="text-[11px] text-slate-400">Configure scoreboard visibility and proctoring strictness</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Leaderboard Scoreboard Freeze
              </label>
              <select
                value={settings.LEADERBOARD_FROZEN}
                onChange={(e) => handleChange('LEADERBOARD_FROZEN', e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/60 border border-purple-500/20 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="false">Live (Public ranks updating in real time)</option>
                <option value="true">Frozen (Scoreboard hidden/frozen for participants)</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Used in the final 30 minutes of Round 3 for suspense before winner reveal.
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Strict Fullscreen & Focus Loss Detection
              </label>
              <select
                value={settings.STRICT_FULLSCREEN_ENFORCEMENT}
                onChange={(e) => handleChange('STRICT_FULLSCREEN_ENFORCEMENT', e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/60 border border-purple-500/20 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="true">Strict (Logs violation on any tab switch / window blur)</option>
                <option value="false">Lenient (Passive warning banner only)</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Audits all window focus changes and devtool toggles into the Anti-Cheat log.
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Violations Threshold for Warning
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.MAX_VIOLATIONS_BEFORE_WARNING}
                onChange={(e) => handleChange('MAX_VIOLATIONS_BEFORE_WARNING', e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/60 border border-purple-500/20 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-purple-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Number of logged integrity violations before participant receives formal warning.
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Violations Threshold for Disqualification Review
              </label>
              <input
                type="number"
                min="2"
                max="50"
                value={settings.MAX_VIOLATIONS_BEFORE_DISQUALIFICATION_REVIEW}
                onChange={(e) => handleChange('MAX_VIOLATIONS_BEFORE_DISQUALIFICATION_REVIEW', e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/60 border border-purple-500/20 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-purple-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Flags contestant in admin audit panel for mandatory proctor review.
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <GradientButton type="submit" size="md" disabled={isSaving}>
            <Save className={`w-4 h-4 mr-2 ${isSaving ? 'animate-spin' : ''}`} />
            {isSaving ? 'Saving Configurations...' : 'Save Settings'}
          </GradientButton>
        </div>
      </form>
    </div>
  );
};
