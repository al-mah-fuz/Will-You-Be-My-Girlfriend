import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  Mail,
  Key,
  Layers,
  FileCode,
  ExternalLink,
  Send,
  Loader2,
  Copy,
  Info,
} from 'lucide-react';
import { EmailJsConfig } from '../types';
import { getEmailJsSettingsApi, saveEmailJsSettingsApi } from '../lib/api';
import { testEmailJsConnection } from '../lib/emailjs';

interface EmailJsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailJsSettingsModal: React.FC<EmailJsSettingsModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<EmailJsConfig>({
    serviceId: '',
    templateId: '',
    publicKey: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Test Email state
  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setErrorMessage(null);
    setSaveSuccess(false);
    setTestResult(null);

    getEmailJsSettingsApi()
      .then((data) => {
        if (data) {
          setConfig({
            serviceId: data.serviceId || '',
            templateId: data.templateId || '',
            publicKey: data.publicKey || '',
          });
        }
      })
      .catch((err) => {
        console.warn('Could not load existing EmailJS settings:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const saved = await saveEmailJsSettingsApi(config);
      setConfig(saved);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save settings.';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail.trim()) {
      setTestResult({
        success: false,
        message: 'Please enter a test recipient email address.',
      });
      return;
    }

    if (!config.serviceId.trim() || !config.templateId.trim() || !config.publicKey.trim()) {
      setTestResult({
        success: false,
        message: 'Please fill in Service ID, Template ID, and Public Key first.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Auto-save current config before testing
      await saveEmailJsSettingsApi(config);

      const result = await testEmailJsConnection(config, testEmail.trim());
      if (result.sent) {
        setTestResult({
          success: true,
          message: `Success! Test email sent via EmailJS to ${testEmail.trim()}. Check your inbox/spam!`,
        });
      } else {
        setTestResult({
          success: false,
          message: result.error || 'Failed to deliver test email via EmailJS.',
        });
      }
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Unknown test email failure.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedVar(label);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  return (
    <div
      id="emailjs-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-950/40 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        id="emailjs-modal-card"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-rose-100 my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-rose-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-rose-950">EmailJS Configuration</h2>
              <p className="text-xs text-rose-700/80">
                Replace Resend with free, reliable EmailJS delivery
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-rose-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-colors text-xl font-bold cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-rose-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">Loading EmailJS configuration...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            {/* Service ID */}
            <div>
              <label
                htmlFor="emailjs-service-id"
                className="block text-xs font-semibold text-rose-900 mb-1.5 flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-rose-500" />
                EmailJS Service ID
              </label>
              <input
                id="emailjs-service-id"
                type="text"
                value={config.serviceId}
                onChange={(e) => setConfig({ ...config, serviceId: e.target.value })}
                placeholder="e.g. service_xxxxxxx"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/50 bg-rose-50/30 text-rose-950 font-mono placeholder:font-sans placeholder:text-rose-300"
              />
              <p className="text-[11px] text-rose-600/75 mt-1">
                Found under Email Services in your EmailJS Dashboard.
              </p>
            </div>

            {/* Template ID */}
            <div>
              <label
                htmlFor="emailjs-template-id"
                className="block text-xs font-semibold text-rose-900 mb-1.5 flex items-center gap-1.5"
              >
                <FileCode className="w-3.5 h-3.5 text-rose-500" />
                EmailJS Template ID
              </label>
              <input
                id="emailjs-template-id"
                type="text"
                value={config.templateId}
                onChange={(e) => setConfig({ ...config, templateId: e.target.value })}
                placeholder="e.g. template_xxxxxxx"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/50 bg-rose-50/30 text-rose-950 font-mono placeholder:font-sans placeholder:text-rose-300"
              />
              <p className="text-[11px] text-rose-600/75 mt-1">
                Found under Email Templates in your EmailJS Dashboard.
              </p>
            </div>

            {/* Public Key */}
            <div>
              <label
                htmlFor="emailjs-public-key"
                className="block text-xs font-semibold text-rose-900 mb-1.5 flex items-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5 text-rose-500" />
                EmailJS Public Key (Account Public Key)
              </label>
              <input
                id="emailjs-public-key"
                type="text"
                value={config.publicKey}
                onChange={(e) => setConfig({ ...config, publicKey: e.target.value })}
                placeholder="e.g. your_public_key_xxxx"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/50 bg-rose-50/30 text-rose-950 font-mono placeholder:font-sans placeholder:text-rose-300"
              />
              <p className="text-[11px] text-rose-600/75 mt-1">
                Found in EmailJS Account &gt; General &gt; Public Key. (Safe for client-side use).
              </p>
            </div>

            {/* Template Variables Helper */}
            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100 text-xs text-rose-900">
              <div className="flex items-center gap-1.5 font-semibold text-rose-950 mb-2">
                <Info className="w-4 h-4 text-rose-500" />
                <span>EmailJS Template Variables Guide</span>
              </div>
              <p className="text-rose-800/80 mb-2.5 text-[11px] leading-relaxed">
                In your EmailJS Template Settings, set the <strong>&quot;To Email&quot;</strong> field to{' '}
                <code className="bg-white px-1.5 py-0.5 rounded border border-rose-200 font-bold text-rose-700">
                  {'{{to_email}}'}
                </code>{' '}
                so the notification is dynamically delivered to the invitation creator&apos;s email address!
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {[
                  { label: '{{to_email}}', desc: "Creator's email" },
                  { label: '{{creator_name}}', desc: "Creator's name" },
                  { label: '{{recipient_name}}', desc: "Partner's name" },
                  { label: '{{message}}', desc: 'Acceptance message' },
                  { label: '{{invitation_id}}', desc: 'Invitation ID' },
                  { label: '{{accepted_at}}', desc: 'Timestamp' },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => copyToClipboard(item.label, item.label)}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-white/80 border border-rose-200/70 hover:bg-white text-left cursor-pointer transition-colors"
                  >
                    <span className="font-mono text-rose-700 font-semibold">{item.label}</span>
                    <span className="text-[10px] text-rose-400">
                      {copiedVar === item.label ? 'Copied!' : item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Success & Error messages */}
            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Settings saved and will persist across browser and server sessions!</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-rose-700 hover:text-rose-900 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {isSaving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>

            {/* Test Email Section */}
            <div className="mt-6 pt-5 border-t border-rose-100">
              <h3 className="text-xs font-bold text-rose-950 mb-1 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-rose-500" />
                Test Email Delivery
              </h3>
              <p className="text-[11px] text-rose-700/80 mb-3">
                Send a real test email through your EmailJS template to confirm delivery to any Gmail or inbox.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Enter email to receive test (e.g. your@gmail.com)"
                  className="flex-1 px-3 py-2 rounded-xl border border-rose-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400/50 bg-rose-50/20 text-rose-950"
                />
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={isTesting}
                  className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {isTesting ? 'Sending...' : 'Send Test'}
                </button>
              </div>

              {testResult && (
                <div
                  className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
