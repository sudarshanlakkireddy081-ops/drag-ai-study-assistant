import React, { useState, useEffect } from 'react';
import {
  User,
  Save,
  Check,
  LogOut,
  Brain,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const SettingsView: React.FC = () => {
  const { user, updateProfile, logout } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [major, setMajor] = useState(user?.major || '');
  const [targetExam, setTargetExam] = useState(user?.targetExam || '');
  const [complexity, setComplexity] = useState(user?.preferredComplexity || 'undergrad');
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setMajor(user.major || '');
      setTargetExam(user.targetExam || '');
      setComplexity(user.preferredComplexity || 'undergrad');
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({
        name,
        major,
        targetExam,
        preferredComplexity: complexity as any,
      });
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 2500);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 max-w-4xl mx-auto w-full">
      <div className="pb-6 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Account & AI Preferences
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Customize student profile, target exams, and AI explanation depth.
          </p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {savedMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Profile and AI study preferences saved successfully!</span>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            <span>Student Profile</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Academic Major / Field
              </label>
              <input
                type="text"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="e.g. Computer Science, Medicine, Law..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Target Exam or Course Goal
              </label>
              <input
                type="text"
                value={targetExam}
                onChange={(e) => setTargetExam(e.target.value)}
                placeholder="e.g. OS Midterm, GRE, USMLE..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* AI Explanatory Depth Preference */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Brain className="w-4 h-4 text-indigo-600" />
            <span>AI Explanation Depth</span>
          </h2>
          <p className="text-xs text-slate-500">
            Choose how DrAG formulates explanations during PDF Chat and Study Tools.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              {
                id: 'simple',
                label: 'Simple Intuition',
                desc: 'Everyday analogies and intuitive plain English.',
              },
              {
                id: 'high_school',
                label: 'Foundational',
                desc: 'Clear definitions and basic step-by-step logic.',
              },
              {
                id: 'undergrad',
                label: 'Undergraduate',
                desc: 'Academic rigor, formal algorithms, and theorems.',
              },
              {
                id: 'expert',
                label: 'Exam / Advanced',
                desc: 'Edge cases, tricky questions, and high-yield scoring.',
              },
            ].map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => setComplexity(lvl.id as any)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  complexity === lvl.id
                    ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="font-semibold text-xs mb-1">{lvl.label}</div>
                <div className="text-[11px] text-slate-500 leading-snug">{lvl.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
};
