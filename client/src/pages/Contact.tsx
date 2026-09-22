import React, { useState } from 'react';
import { GlassCard } from '../components/ui/GlassCard.js';
import { GradientButton } from '../components/ui/GradientButton.js';
import { Mail, MapPin, Phone, MessageSquare, Send, CheckCircle2, HelpCircle } from 'lucide-react';

export const Contact: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-900/30 border border-purple-500/30 text-purple-300 text-xs font-mono mb-4">
          <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
          <span>Support & Inquiries</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-4">
          Contact The Committee
        </h1>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
          Have questions regarding team registration, venue logistics, or contest policies? Our technical organizers are ready to assist.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Info Cards */}
        <div className="space-y-6">
          <GlassCard className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Email Communications</h3>
            <p className="text-xs text-slate-300">
              General Inquiries: <a href="mailto:info@codebreak.dev" className="text-purple-400">info@codebreak.dev</a>
            </p>
            <p className="text-xs text-slate-300">
              Technical Support: <a href="mailto:support@codebreak.dev" className="text-purple-400">support@codebreak.dev</a>
            </p>
          </GlassCard>

          <GlassCard className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Phone className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Hotline & Urgent Support</h3>
            <p className="text-xs text-slate-300">Available Mon-Sat (9:00 AM - 7:00 PM IST)</p>
            <p className="text-xs font-mono text-indigo-300">+91 (0) 80 4920 1000</p>
          </GlassCard>

          <GlassCard className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Contest Headquarters</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              CODEBREAK Technical Committee, Innovation Arena, Tech Park Campus, Bangalore - 560100, India.
            </p>
          </GlassCard>
        </div>

        {/* Form */}
        <div className="lg:col-span-2">
          <GlassCard className="p-8">
            {submitted ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-white">Message Transmitted!</h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Thank you for reaching out. A representative from the CODEBREAK Technical Committee will respond within 4 hours.
                </p>
                <GradientButton size="sm" variant="secondary" onClick={() => setSubmitted(false)}>
                  Send Another Inquiry
                </GradientButton>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <h3 className="text-xl font-bold text-white mb-2">Send an Inquiry</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Alex Chen"
                      className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="alex@college.edu"
                      className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Subject</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g. Question regarding Team Member replacement"
                    className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Message</label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Describe your inquiry in detail..."
                    className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 resize-none"
                  />
                </div>

                <GradientButton type="submit" size="md" rightIcon={<Send className="w-4 h-4" />}>
                  Dispatch Message
                </GradientButton>
              </form>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
