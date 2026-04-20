/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { Layout, User, BarChart3, BookOpen, LogOut, BrainCircuit, ChevronRight, Plus, X, Loader2, CheckCircle2, Circle, Bell, Check, ExternalLink, Pencil, Search, Sparkles, MessageSquare, Send, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { analyzeSkillGap, SkillGapAnalysis, aiChat } from './services/geminiService';
import { cn } from './lib/utils';
import Markdown from 'react-markdown';
import { auth, db, googleProvider, signInWithPopup, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, doc, getDoc, setDoc, updateDoc, collection, query, getDocs, onSnapshot, addDoc, serverTimestamp, orderBy, limit, Timestamp, handleFirestoreError, FirebaseUser } from './lib/firebase';

// --- Types ---
interface UserData {
  id: string;
  name: string;
  email: string;
  target_role: string;
  career_stage?: 'Basic' | 'Intermediate' | 'Advanced';
  skills: string[];
  cached_analysis?: string;
  cached_analysis_hash?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: any;
}

// --- Components ---

const Toast = ({ message, visible, onClose }: { message: string; visible: boolean; onClose: () => void }) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 20, x: '-50%' }}
          className="fixed bottom-8 left-1/2 z-[100] bg-zinc-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-zinc-800"
        >
          <div className="bg-emerald-500/20 p-1 rounded-full">
            <Check className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-sm font-semibold">{message}</span>
          <button onClick={onClose} className="ml-2 text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Navbar = ({ user, onLogout }: { user: UserData | null; onLogout: () => void }) => {
  return (
    <nav className="border-b border-zinc-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-zinc-900">SkillGap AI</span>
          </Link>
          
          {user ? (
            <div className="flex items-center gap-6">
              <Link to="/dashboard" className="text-sm font-medium text-zinc-600 hover:text-indigo-600 transition-colors">Dashboard</Link>
              <Link to="/profile" className="text-sm font-medium text-zinc-600 hover:text-indigo-600 transition-colors">Profile</Link>
              <button 
                onClick={onLogout}
                className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Sign In</Link>
          )}
        </div>
      </div>
    </nav>
  );
};

const AuthPage = () => {
  const [isManual, setIsManual] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        
        // Explicitly create the doc to ensure the name is stored correctly
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          id: userCredential.user.uid,
          name: name,
          email: email,
          target_role: '',
          career_stage: 'Basic',
          skills: []
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-zinc-50 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-zinc-200"
      >
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <BrainCircuit className="w-8 h-8 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 mb-2 text-center">Welcome to SkillGap AI</h2>
        <p className="text-zinc-500 mb-8 text-center">Sign in to start your personalized career journey.</p>
        
        {isManual ? (
          <form onSubmit={handleManualAuth} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">Full Name</label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 px-4 py-3 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                  placeholder="Enter your name"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">Email Address</label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 px-4 py-3 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">Password</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 px-4 py-3 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                placeholder="••••••••"
                required
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (isRegister ? 'Create Account' : 'Sign In')}
            </button>
            <button 
              type="button"
              onClick={() => { setIsManual(false); setIsRegister(false); }}
              className="w-full text-zinc-500 text-sm font-bold py-2 hover:text-zinc-700"
            >
              Back to Google Sign-in
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <button 
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-zinc-200 text-zinc-700 py-3.5 rounded-2xl font-bold hover:bg-zinc-50 transition-all shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-zinc-400 font-bold tracking-widest">Or securely with email</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => { setIsManual(true); setIsRegister(false); }}
                className="px-4 py-3 border border-zinc-200 rounded-2xl text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-all"
              >
                Sign In
              </button>
              <button 
                onClick={() => { setIsManual(true); setIsRegister(true); }}
                className="px-4 py-3 bg-zinc-900 text-white rounded-2xl text-sm font-bold hover:bg-black transition-all shadow-lg shadow-zinc-200"
              >
                Register
              </button>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-600 font-medium px-4">{error}</p>}
        
        <div className="mt-8 pt-8 border-t border-zinc-100 italic text-[10px] text-zinc-400 leading-relaxed">
          By continuing, you agree to our Terms of Service and Privacy Policy. Securely powered by Firebase.
        </div>
      </motion.div>
    </div>
  );
};

const ProfilePage = ({ user, onUpdate, onNotify }: { user: UserData; onUpdate: (data: Partial<UserData>) => void; onNotify: (msg: string) => void }) => {
  const [userName, setUserName] = useState(user.name || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [targetRole, setTargetRole] = useState(user.target_role || '');
  const [skills, setSkills] = useState<string[]>(user.skills || []);
  const [saving, setSaving] = useState(false);
  const [skillsText, setSkillsText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Suggested skills from AI analysis if available
  const analysisObj = user.cached_analysis ? (() => {
    try { return JSON.parse(user.cached_analysis); } catch(e) { return null; }
  })() : null;
  
  const aiSuggestions = (analysisObj?.requiredSkills?.map((s: any) => s.name) || []) as string[];
  const commonSkills = ['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker', 'SQL', 'UI/UX Design', 'Project Management', 'Agile', 'Git', 'JavaScript', 'CSS', 'HTML', 'Java', 'C++', 'Golang', 'Kubernetes', 'Terraform', 'GraphQL'];
  const allPossibleSuggestions = Array.from(new Set([...aiSuggestions, ...commonSkills]));

  const filteredSuggestions = skillsText.trim() 
    ? allPossibleSuggestions.filter(s => 
        s.toLowerCase().includes(skillsText.toLowerCase()) && 
        !skills.some(existing => existing.toLowerCase() === s.toLowerCase())
      ).slice(0, 5)
    : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSkillsKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillsText.trim()) {
      e.preventDefault();
      handleAddSkill(skillsText.trim());
      setSkillsText("");
      setShowSuggestions(false);
    }
  };

  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skills.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      const updatedSkills = [...skills, trimmed];
      setSkills(updatedSkills);
      setSkillsText("");
      setShowSuggestions(false);
    }
  };

  const handleRemoveSkill = (skill: string) => {
    const updatedSkills = skills.filter(s => s !== skill);
    setSkills(updatedSkills);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({ name: userName, target_role: targetRole, skills });
      onNotify('Profile updated successfully');
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to save profile', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Briefing */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-200/50"
          >
            <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="mb-2 group relative">
              <span className="text-xs font-black uppercase tracking-widest text-indigo-200">Authenticated User</span>
              {isEditingName ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    autoFocus
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-xl font-bold font-sans outline-none focus:ring-2 focus:ring-indigo-300 w-full"
                  />
                  <button onClick={() => setIsEditingName(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 mt-1 group">
                  <h2 className="text-3xl font-bold font-sans">{user.name}</h2>
                  <button 
                    onClick={() => setIsEditingName(true)}
                    className="p-1.5 bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
                    title="Edit Name"
                  >
                    <Pencil className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-indigo-100 text-sm leading-relaxed opacity-90">
              Your profile is the blueprint the AI uses to map your future journey. Keep it updated to receive the most accurate skill gap analysis.
            </p>
            
            <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-xs font-medium text-indigo-50 leading-none">Smart Role Matching</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-xs font-medium text-indigo-50 leading-none">Progress Persistence</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Settings */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 space-y-6"
        >
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-zinc-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">Career Settings</h2>
                <p className="text-sm text-zinc-500">Fine-tune your career trajectory.</p>
              </div>
              <div className="text-xs font-bold text-indigo-600 px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100 uppercase tracking-wider">
                Active
              </div>
            </div>
            
            <div className="p-8 space-y-10">
              {/* Target Role section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  <label className="text-sm font-bold text-zinc-900 uppercase tracking-tight">Your Goal</label>
                </div>
                <div className="relative group">
                  <input 
                    type="text" 
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-zinc-900 font-medium placeholder:text-zinc-400"
                    placeholder="e.g. Senior Product Manager"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400 bg-white px-2 py-1 rounded border border-zinc-100 opacity-0 group-focus-within:opacity-100 transition-opacity">
                    ESC TO CANCEL
                  </div>
                </div>
              </section>

              {/* Toolkit section */}
              <section className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layout className="w-4 h-4 text-indigo-600" />
                      <label className="text-sm font-bold text-zinc-900 uppercase tracking-tight">Toolkit</label>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{skills.length} SKILLS ADDED</span>
                  </div>
                  
                  <div className="relative" ref={suggestionsRef}>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <Search className="w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                      </div>
                      <input 
                        type="text"
                        value={skillsText}
                        onChange={(e) => {
                          setSkillsText(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onKeyDown={handleSkillsKeyDown}
                        className="w-full pl-11 pr-5 py-4 rounded-2xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-zinc-900 font-medium placeholder:text-zinc-400"
                        placeholder="Type a skill and press Enter..."
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {skillsText.length > 0 && (
                          <div className="text-[10px] font-bold text-zinc-400 bg-white px-2 py-1 rounded border border-zinc-100">
                            ENTER TO ADD
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Autocomplete Suggestions */}
                    <AnimatePresence>
                      {showSuggestions && filteredSuggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl border border-zinc-200 shadow-xl overflow-hidden"
                        >
                          <div className="p-2">
                            {filteredSuggestions.map((suggestion) => (
                              <button
                                key={suggestion}
                                onClick={() => handleAddSkill(suggestion)}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 text-left rounded-xl transition-colors group"
                              >
                                <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center group-hover:bg-indigo-100">
                                  <Plus className="w-4 h-4 text-zinc-400 group-hover:text-indigo-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-zinc-900">{suggestion}</div>
                                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Available to add</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2.5">
                    <AnimatePresence mode="popLayout">
                      {skills.map(skill => (
                        <motion.span 
                          key={skill}
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="group inline-flex items-center gap-2 pl-4 pr-2 py-2 bg-white text-zinc-700 rounded-xl text-xs font-bold border border-zinc-200 shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition-all cursor-default"
                        >
                          {skill}
                          <button 
                            onClick={() => handleRemoveSkill(skill)} 
                            className="p-1 rounded-md text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Suggestions Box (Quick Add) */}
                  <div className="pt-4 border-t border-dashed border-zinc-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Quick Add AI Recommended</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(aiSuggestions.length > 0 ? aiSuggestions : commonSkills).filter(s => !skills.some(existing => existing.toLowerCase() === s.toLowerCase())).slice(0, 8).map(suggestion => (
                        <button
                          key={suggestion}
                          onClick={() => handleAddSkill(suggestion)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 text-zinc-500 rounded-lg text-[10px] font-bold border border-zinc-200 hover:bg-white hover:border-indigo-200 hover:text-indigo-600 transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Action */}
              <div className="pt-6">
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-zinc-200 disabled:opacity-50 flex items-center justify-center gap-3 group overflow-hidden relative"
                >
                  <motion.div
                    className="absolute inset-0 bg-indigo-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none"
                  />
                  <span className="relative z-10 font-sans tracking-tight">
                    {saving ? 'UPDATING...' : 'SAVE CAREER CHANGES'}
                  </span>
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                  ) : (
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const DashboardPage = ({ user, onUpdate, onNotify }: { user: UserData; onUpdate: (data: Partial<UserData>) => void; onNotify: (msg: string) => void }) => {
  const [analysis, setAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [skillProgress, setSkillProgress] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    if (user.target_role && user.skills.length > 0) {
      handleAnalyze();
      fetchProgress();
      fetchSkillProgress();
    }
  }, []);

  const fetchProgress = async () => {
    try {
      const q = query(collection(db, 'users', user.id, 'learning_path'));
      const snapshot = await getDocs(q);
      const progressMap: Record<string, boolean> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        progressMap[data.item_title] = data.completed;
      });
      setProgress(progressMap);
    } catch (err) {
      console.error('Failed to fetch progress', err);
    }
  };

  const fetchSkillProgress = async () => {
    try {
      const q = query(collection(db, 'users', user.id, 'skill_mastery'));
      const snapshot = await getDocs(q);
      const skillMap: Record<string, number> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        skillMap[data.skill_name] = data.proficiency;
      });
      setSkillProgress(skillMap);
    } catch (err) {
      console.error('Failed to fetch skill progress', err);
    }
  };

  const updateSkillProgress = async (skillName: string, proficiency: number, requiredLevel: number) => {
    setSkillProgress(prev => ({ ...prev, [skillName]: proficiency }));
    
    // Check if 80% complete
    const is80Percent = proficiency >= (requiredLevel * 0.8);
    if (is80Percent && !user.skills.includes(skillName)) {
      const updatedSkills = [...user.skills, skillName];
      try {
        await onUpdate({ skills: updatedSkills });
        onNotify(`Mastered ${skillName}! Added to your skills.`);
      } catch (err) {
        console.error('Failed to auto-update current skills', err);
      }
    }

    try {
      const skillId = skillName.replace(/\s+/g, '_').toLowerCase();
      await setDoc(doc(db, 'users', user.id, 'skill_mastery', skillId), {
        skill_name: skillName,
        proficiency,
        updated_at: serverTimestamp()
      });
      onNotify('Progress updated');
    } catch (err) {
      console.error('Failed to update skill progress', err);
    }
  };

  const toggleProgress = async (rec: any) => {
    const title = rec.title;
    const isCompleted = !progress[title];
    setProgress(prev => ({ ...prev, [title]: isCompleted }));
    
    try {
      const itemId = title.replace(/\s+/g, '_').toLowerCase();
      await setDoc(doc(db, 'users', user.id, 'learning_path', itemId), {
        item_title: title,
        completed: isCompleted,
        updated_at: serverTimestamp()
      });
      onNotify(isCompleted ? 'Item marked as complete' : 'Item marked as incomplete');

      // Auto-increase skill levels on completion
      if (isCompleted && rec.targetedSkills && Array.isArray(rec.targetedSkills)) {
        rec.targetedSkills.forEach((target: { skillName: string; masteryGain: number }) => {
          const skill = analysis?.requiredSkills.find(s => normalize(s.name) === normalize(target.skillName));
          if (skill) {
            const currentProficiency = getProficiency(skill.name, skill.level);
            if (currentProficiency < skill.level) {
              const gain = target.masteryGain || 1;
              const newProficiency = Math.min(currentProficiency + gain, skill.level);
              updateSkillProgress(skill.name, newProficiency, skill.level);
              onNotify(`Proficiency in ${skill.name} increased (+${gain})!`);
            }
          }
        });
      }
    } catch (err) {
      console.error('Failed to update progress', err);
      // Rollback on error
      setProgress(prev => ({ ...prev, [title]: !isCompleted }));
    }
  };

  const handleAnalyze = async (force = false) => {
    // Optimization: Cache depends only on target_role
    const currentHash = user.target_role;
    
    if (!force && user.cached_analysis && user.cached_analysis_hash === currentHash) {
      try {
        setAnalysis(JSON.parse(user.cached_analysis));
        setIsCached(true);
        return;
      } catch (e) {
        console.error('Failed to parse cached analysis', e);
      }
    }

    setLoading(true);
    setIsCached(false);
    try {
      const result = await analyzeSkillGap(user.skills, user.target_role);
      setAnalysis(result);
      
      // Save to cache
      await fetch(`/api/user/${user.id}/cache`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis: result, hash: currentHash }),
      });
      
      // Update local user state via parent if needed, but here we just update local analysis
      // To be strictly correct, we should update the user object in parent state too
      onUpdate({ cached_analysis: JSON.stringify(result), cached_analysis_hash: currentHash });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user.target_role || user.skills.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <User className="w-8 h-8 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Complete Your Profile</h2>
        <p className="text-zinc-600 mb-8">We need your target role and current skills to perform an analysis.</p>
        <Link to="/profile" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm">
          Go to Profile
        </Link>
      </div>
    );
  }

  const normalize = (s: string) => s.toLowerCase().trim().replace(/\.js$/, '').replace(/\s+/g, '');

  const getProficiency = (skillName: string, requiredLevel: number) => {
    if (skillProgress[skillName] !== undefined) return skillProgress[skillName];
    // If user has it in profile, assume 80% of target level or at least 8
    const hasSkill = user.skills.some(s => normalize(s) === normalize(skillName));
    return hasSkill ? Math.max(8, requiredLevel) : 0;
  };

  const chartData = analysis?.requiredSkills.map(s => ({
    subject: s.name,
    A: getProficiency(s.name, s.level),
    B: s.level,
    fullMark: 10,
  })) || [];

  const overallLearningProgress = (() => {
    if (!analysis || !analysis.recommendations.length) return 0;
    const totalWeight = analysis.recommendations.reduce((acc, rec) => acc + (rec.weight || 1), 0);
    const completedWeight = analysis.recommendations
      .filter(rec => progress[rec.title])
      .reduce((acc, rec) => acc + (rec.weight || 1), 0);
    return Math.round((completedWeight / totalWeight) * 100);
  })();

  const categories = analysis ? ['All', ...Array.from(new Set(analysis.requiredSkills.map(s => s.category)))] : [];
  const filteredSkills = analysis?.requiredSkills.filter(s => selectedCategory === 'All' || s.category === selectedCategory) || [];

  const handleAdvanceStage = async () => {
    if (!user) return;
    const stages: UserData['career_stage'][] = ['Basic', 'Intermediate', 'Advanced'];
    const currentIdx = stages.indexOf(user.career_stage || 'Basic');
    if (currentIdx < stages.length - 1) {
      const nextStage = stages[currentIdx + 1];
      try {
        await fetch(`/api/user/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ career_stage: nextStage })
        });
        onUpdate({ career_stage: nextStage });
        onNotify(`Promoted to ${nextStage} Stage!`);
        // We might want to force a re-analysis if content should change per stage
        handleAnalyze(true);
      } catch (e) {
        console.error("Failed to update stage", e);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-bold text-zinc-600">Welcome, {user.name}</span>
            </div>
            <h1 className="text-3xl font-bold text-zinc-900">Skill Gap Analysis</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-zinc-500">Targeting: <span className="text-indigo-600 font-semibold">{user.target_role}</span></p>
              {isCached && (
                <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold border border-emerald-100 uppercase">
                  Analysis Active
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-2xl">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Career Stage</span>
                <span className="text-sm font-bold text-indigo-700">{user.career_stage || 'Basic'}</span>
              </div>
            </div>

            {overallLearningProgress >= 90 && (user.career_stage !== 'Advanced') && (
              <motion.button
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAdvanceStage}
                className="bg-emerald-500 text-white px-5 py-2 rounded-2xl font-bold text-xs shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all flex items-center gap-2"
              >
                LEVEL UP TO {user.career_stage === 'Intermediate' ? 'ADVANCED' : 'INTERMEDIATE'}
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Overall Learning Progress</div>
            <div className="w-48 h-3 bg-zinc-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${overallLearningProgress}%` }}
                className="h-full bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.4)]"
              />
            </div>
            <div className="text-lg font-bold text-indigo-600 w-12 text-right">
              {overallLearningProgress}%
            </div>
          </div>
          
          <button 
            onClick={() => handleAnalyze(true)}
            disabled={loading}
            className="bg-zinc-900 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-zinc-800 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
            Refresh Analysis
          </button>
        </div>
      </div>

      {loading && !analysis ? (
        <div className="h-96 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-zinc-500 font-medium animate-pulse">AI is analyzing industry standards...</p>
        </div>
      ) : analysis ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Visualization */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-2 bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm"
          >
            <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Skill Proficiency Map
            </h3>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                  <PolarGrid stroke="#e4e4e7" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                  <Radar
                    name="Required"
                    dataKey="B"
                    stroke="#4f46e5"
                    fill="#4f46e5"
                    fillOpacity={0.1}
                  />
                  <Radar
                    name="Current"
                    dataKey="A"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.5}
                  />
                  <Tooltip />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Identified Gaps */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm flex flex-col"
          >
            <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Required Skills Progress
            </h3>

            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold transition-all border",
                    selectedCategory === cat 
                      ? "bg-indigo-600 text-white border-indigo-600" 
                      : "bg-zinc-50 text-zinc-500 border-zinc-200 hover:border-indigo-300"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
            
            <div className="space-y-6 flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
              {filteredSkills.map((skill, i) => {
                const currentProficiency = getProficiency(skill.name, skill.level);
                const percentage = (currentProficiency / skill.level) * 100;
                
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-700">{skill.name}</span>
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{skill.category}</span>
                      </div>
                      <span className="text-xs font-medium text-zinc-500">
                        {currentProficiency} / {skill.level}
                      </span>
                    </div>
                    <div className="relative h-2 bg-zinc-100 rounded-full overflow-hidden group/bar cursor-pointer">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(percentage, 100)}%` }}
                        className={cn(
                          "h-full transition-all",
                          percentage >= 80 ? "bg-emerald-500" : "bg-indigo-500"
                        )}
                      />
                      {/* Tooltip */}
                      <div className="absolute opacity-0 group-hover/bar:opacity-100 transition-opacity bg-zinc-900 text-white text-[10px] font-bold px-2 py-1 rounded bottom-full left-1/2 -translate-x-1/2 mb-1 pointer-events-none whitespace-nowrap z-50">
                        {currentProficiency} / {skill.level} Proficiency
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-900"></div>
                      </div>
                      
                      <input 
                        type="range" 
                        min="0" 
                        max="10" 
                        step="1"
                        value={currentProficiency}
                        onChange={(e) => updateSkillProgress(skill.name, parseInt(e.target.value), skill.level)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })}
              {filteredSkills.length === 0 && (
                <div className="text-center py-10 text-zinc-400 text-sm italic">
                  No skills found in this category.
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-100">
              <h3 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
                <X className="w-4 h-4 text-red-500" />
                Identified Gaps
              </h3>
              <div className="space-y-2">
                {analysis.gaps.map((gap, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-red-50/50 border border-red-100/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    <span className="text-xs font-medium text-red-900">{gap}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Learning Path */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-3 bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Recommended Learning Path
              </h3>
              
              {analysis.recommendations.length > 0 && (
                <div className="flex items-center gap-3 bg-zinc-50 px-4 py-2 rounded-xl border border-zinc-100">
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Overall Progress</div>
                  <div className="w-32 h-2 bg-zinc-200 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${overallLearningProgress}%` }}
                      className="h-full bg-indigo-600"
                    />
                  </div>
                  <div className="text-sm font-bold text-indigo-600">
                    {overallLearningProgress}%
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...analysis.recommendations].sort((a, b) => (a.order || 0) - (b.order || 0)).map((rec, i) => (
                <div 
                  key={i} 
                  onClick={() => toggleProgress(rec)}
                  className={cn(
                    "group p-6 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col h-full",
                    progress[rec.title] 
                      ? "bg-indigo-50/50 border-indigo-200 shadow-sm" 
                      : "bg-zinc-50 border-zinc-100 hover:bg-white hover:shadow-md hover:border-indigo-200"
                  )}
                >
                  {/* Phase/Order Badge */}
                  <div className="absolute top-0 right-0 px-3 py-1 bg-zinc-200 text-zinc-600 text-[10px] font-black rounded-bl-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    PHASE {rec.order || i + 1}
                  </div>

                  <div className="flex justify-between items-start mb-2">
                    <span className={cn(
                      "text-[10px] uppercase tracking-wider font-bold block",
                      progress[rec.title] ? "text-indigo-600" : "text-zinc-400"
                    )}>
                      {rec.type}
                    </span>
                    {progress[rec.title] ? (
                      <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-zinc-300 group-hover:text-indigo-300 transition-colors" />
                    )}
                  </div>
                  
                  <h4 className={cn(
                    "font-bold mb-2 transition-colors",
                    progress[rec.title] ? "text-indigo-900" : "text-zinc-900 group-hover:text-indigo-600"
                  )}>
                    {rec.title}
                  </h4>
                  <p className={cn(
                    "text-sm line-clamp-3 mb-4 flex-1",
                    progress[rec.title] ? "text-indigo-700/70" : "text-zinc-500"
                  )}>
                    {rec.description}
                  </p>

                  {/* Enhanced Skill Gain Info */}
                  {rec.targetedSkills && Array.isArray(rec.targetedSkills) && rec.targetedSkills.length > 0 && (
                    <div className="mb-4 space-y-2">
                       <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Mastery Potential</div>
                       <div className="flex flex-wrap gap-2">
                        {rec.targetedSkills.map((target: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-zinc-200 text-[10px] font-bold text-zinc-600 shadow-sm group-hover:border-indigo-100 transition-all">
                            <BarChart3 className="w-3 h-3 text-indigo-500" />
                            {target.skillName}
                            <span className="ml-1 text-emerald-600 font-black">+{target.masteryGain || 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className={cn(
                    "flex items-center justify-between text-xs font-semibold transition-transform mt-auto",
                    progress[rec.title] ? "text-indigo-600" : "text-zinc-900 group-hover:translate-x-1"
                  )}>
                    <div className="flex items-center">
                      {progress[rec.title] ? 'Completed' : 'Mark as Complete'} <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                    {rec.url && (
                      <a 
                        href={rec.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 bg-white px-2 py-1 rounded-lg border border-indigo-100 shadow-sm transition-all hover:scale-105"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Resource
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
};

const ChatAssistant = ({ user }: { user: UserData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      const q = query(
        collection(db, 'users', user.id, 'chats', 'default', 'messages'),
        orderBy('timestamp', 'asc'),
        limit(50)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ChatMessage[];
        setMessages(msgs);
        if (msgs.length === 0) {
          // Initial greeting
          addMessage('model', `Hi **${user.name}**! I'm your **SkillGap AI Advisor**. How can I help you prepare for your next step as a **${user.target_role || 'professional'}**?`);
        }
      });
      return () => unsubscribe();
    }
  }, [isOpen, user?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const addMessage = async (role: 'user' | 'model', content: string) => {
    try {
      await addDoc(collection(db, 'users', user.id, 'chats', 'default', 'messages'), {
        role,
        content,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, 'create', `users/${user.id}/chats/default/messages`);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMessage = input.trim();
    setInput('');
    setIsTyping(true);

    // Add user message to Firestore
    await addMessage('user', userMessage);

    try {
      // Get AI response
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: userMessage });
      
      const response = await aiChat(history, user);
      await addMessage('model', response);
    } catch (err) {
      console.error('Chat AI failed', err);
      await addMessage('model', "I'm sorry, I'm having trouble connecting right now. Please try again later.");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 w-[380px] h-[520px] bg-white rounded-3xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">AI Career Coach</h3>
                  <div className="flex items-center gap-1.5 ">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-medium text-indigo-100">Advisor Online</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
            >
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                    msg.role === 'user' 
                      ? "bg-indigo-600 text-white rounded-tr-none" 
                      : "bg-zinc-100 text-zinc-900 rounded-tl-none prose prose-sm prose-zinc max-w-none prose-p:leading-relaxed prose-strong:text-zinc-900 prose-strong:font-black prose-ul:my-2 prose-li:my-0.5"
                  )}>
                    <Markdown>{msg.content}</Markdown>
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-1 px-1 font-medium italic">
                    {msg.timestamp ? (msg.timestamp as Timestamp).toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </span>
                </div>
              ))}
              {isTyping && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Advisor is thinking...</span>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-zinc-100 bg-zinc-50/50">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2"
              >
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your skills or career..."
                  className="flex-1 bg-white border border-zinc-200 px-4 py-3 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-indigo-600 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:bg-indigo-700 transition-colors group relative"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="w-7 h-7" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
            >
              <MessageSquare className="w-7 h-7" />
            </motion.div>
          )}
        </AnimatePresence>
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white" />
        )}
      </motion.button>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  const showNotification = (message: string) => {
    setNotification({ message, visible: true });
    setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 3000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as UserData);
          } else {
            const newUser: UserData = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Learner',
              email: firebaseUser.email || '',
              target_role: '',
              career_stage: 'Basic',
              skills: []
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser(newUser);
          }
        } catch (error) {
          handleFirestoreError(error, 'get', `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateUser = async (data: Partial<UserData>) => {
    if (!user) return;
    const updatedUser = { ...user, ...data };
    setUser(updatedUser);
    
    try {
      await updateDoc(doc(db, 'users', user.id), data);
    } catch (error) {
      handleFirestoreError(error, 'update', `users/${user.id}`);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
        <Navbar user={user} onLogout={handleLogout} />
        <Toast 
          message={notification.message} 
          visible={notification.visible} 
          onClose={() => setNotification(prev => ({ ...prev, visible: false }))} 
        />
        
        <Routes>
          <Route path="/" element={
            user ? <Navigate to="/dashboard" /> : (
              <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 text-sm font-bold mb-8 border border-indigo-100">
                    <Bell className="w-4 h-4" />
                    AI-Powered Career Growth
                  </div>
                  <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 mb-6">
                    Bridge the Gap to Your <br />
                    <span className="text-indigo-600">Dream Career</span>
                  </h1>
                  <p className="text-xl text-zinc-600 max-w-2xl mx-auto mb-10">
                    AI-powered skill analysis that compares your current abilities against industry standards and generates a personalized learning path.
                  </p>
                  <div className="flex justify-center gap-4">
                    <Link to="/login" className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                      Get Started Free
                    </Link>
                  </div>
                </motion.div>
                
                <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { icon: BrainCircuit, title: "AI Analysis", desc: "Gemini-powered comparison against real-world job requirements." },
                    { icon: BarChart3, title: "Visual Insights", desc: "Clear visualization of your skill proficiency and gaps." },
                    { icon: BookOpen, title: "Learning Paths", desc: "Curated topics and resources to help you level up fast." }
                  ].map((feature, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i }}
                      className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm"
                    >
                      <div className="bg-indigo-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                        <feature.icon className="w-6 h-6 text-indigo-600" />
                      </div>
                      <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                      <p className="text-zinc-500 text-sm leading-relaxed">{feature.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          } />
          
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <AuthPage />} />
          <Route path="/dashboard" element={user ? <DashboardPage user={user} onUpdate={handleUpdateUser} onNotify={showNotification} /> : <Navigate to="/login" />} />
          <Route path="/profile" element={user ? <ProfilePage user={user} onUpdate={handleUpdateUser} onNotify={showNotification} /> : <Navigate to="/login" />} />
        </Routes>
        {user && <ChatAssistant user={user} />}
      </div>
    </Router>
  );
}
