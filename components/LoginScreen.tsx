import React, { useState, useEffect } from 'react';
import { GraduationCap, BookOpen, ChevronRight, User, Key, X, Check } from 'lucide-react';

interface Props {
  onTutorSelect: () => void;
  onStudentLogin: (name: string) => void;
}

export const LoginScreen: React.FC<Props> = ({ onTutorSelect, onStudentLogin }) => {
  const [role, setRole] = useState<'selection' | 'student'>('selection');
  const [studentName, setStudentName] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Load existing API key if available
  useEffect(() => {
    const existingKey = localStorage.getItem('mandarin_app_api_key');
    setHasApiKey(!!existingKey);
    if (existingKey) {
      setApiKey(existingKey);
    }
  }, []);

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem('mandarin_app_api_key', apiKey.trim());
      setHasApiKey(true);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setShowApiKeyModal(false);
      }, 1500);
    }
  };

  const handleOpenModal = () => {
    const existingKey = localStorage.getItem('mandarin_app_api_key');
    setApiKey(existingKey || '');
    setShowApiKeyModal(true);
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentName.trim()) {
      onStudentLogin(studentName);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-slate-900 mb-3">Mandarin Master Plan</h1>
        <p className="text-slate-500 text-lg">IGCSE Preparation Platform</p>
      </div>

      {/* API Key Button */}
      <div className="mb-6">
        <button
          onClick={handleOpenModal}
          className={`flex items-center gap-2 px-4 py-2 text-sm bg-white border rounded-lg transition-all shadow-sm ${
            hasApiKey 
              ? 'text-green-700 border-green-200 hover:border-green-300 hover:bg-green-50' 
              : 'text-slate-600 hover:text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <Key size={16} />
          {hasApiKey ? (
            <>
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Update API Key
            </>
          ) : (
            'Enter API Key'
          )}
        </button>
      </div>

      {role === 'selection' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <button
            onClick={onTutorSelect}
            className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-brand-300 hover:shadow-md transition-all group"
          >
            <div className="bg-brand-50 p-4 rounded-full mb-4 group-hover:bg-brand-100 transition-colors">
              <GraduationCap className="w-10 h-10 text-brand-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">I am a Tutor</h2>
            <p className="text-slate-500 text-center">Create lesson plans and assign exercises to students.</p>
          </button>

          <button
            onClick={() => setRole('student')}
            className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="bg-blue-50 p-4 rounded-full mb-4 group-hover:bg-blue-100 transition-colors">
              <BookOpen className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">I am a Student</h2>
            <p className="text-slate-500 text-center">Log in to view your dashboard and complete exercises.</p>
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          <button 
            onClick={() => setRole('selection')}
            className="text-sm text-slate-400 hover:text-slate-600 mb-6 flex items-center gap-1"
          >
            ← Back
          </button>
          
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Student Login</h2>
          
          <form onSubmit={handleStudentSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                What's your name?
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Enter your name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                />
              </div>
            </div>
            
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-200 transform active:scale-[0.98]"
            >
              Enter Dashboard <ChevronRight size={18} />
            </button>
          </form>
        </div>
      )}

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <Key size={20} className="text-brand-600" />
                <h3 className="font-bold text-slate-800">API Key Configuration</h3>
              </div>
              <button 
                onClick={() => setShowApiKeyModal(false)} 
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleApiKeySubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Google Gemini API Key
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Gemini API key (e.g., AIzaSy...)"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all font-mono text-sm"
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-2">
                  This API key is used for all AI-powered features including vocabulary generation, lesson creation, and exercises.
                </p>
              </div>

              {showSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 animate-in fade-in slide-in-from-top-2">
                  <Check size={16} />
                  <span className="text-sm font-medium">API key saved successfully!</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!apiKey.trim()}
                  className="flex-1 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};