import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, Check, ArrowLeft, UserPlus, KeyRound, Mail, ShieldCheck, ChevronRight, AlertTriangle, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { UserRole } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

type AuthView = 'welcome' | 'login' | 'signup' | 'forgot_password';

const COLORS = {
  primary: '#007cba', // Azul
  accent: '#6cc04a',  // Verde
  secondary: '#fdb615', // Amarelo
};

export const Login: React.FC = () => {
  const [view, setView] = useState<AuthView>('welcome');
  const [showPassword, setShowPassword] = useState(false);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // Only for signup
  const [confirmPassword, setConfirmPassword] = useState(''); // Only for signup
  const [rememberMe, setRememberMe] = useState(true);
  
  // Feedback States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const clearFeedback = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const switchView = (newView: AuthView) => {
    clearFeedback();
    setView(newView);
    // Keep email if user typed it, clear passwords
    setPassword('');
    setConfirmPassword('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearFeedback();

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' 
        ? 'E-mail ou senha incorretos.' 
        : 'Ocorreu um erro ao tentar entrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
        setError("As senhas não coincidem.");
        return;
    }
    if (password.length < 6) {
        setError("A senha deve ter no mínimo 6 caracteres.");
        return;
    }

    setLoading(true);
    clearFeedback();

    try {
        // 1. Create Auth User
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name: name }
            }
        });

        if (authError) throw authError;

        if (authData.user) {
            // 2. Create Public Profile
            // Check if profile exists first to avoid duplicate key errors if logic runs twice
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', authData.user.id)
                .single();

            if (!existingProfile) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        {
                            id: authData.user.id,
                            name: name,
                            email: email, // Optional, depending on schema, but good for redundancy
                            role: UserRole.AGENT, // Default role
                            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=fdb615&color=fff`,
                            skills: [],
                            onboarding_completed: false
                        }
                    ]);
                
                if (profileError) {
                    console.error("Erro ao criar perfil:", profileError);
                    // Don't throw here, user is created, just profile missing. Can be fixed later or via trigger.
                }
            }

            setSuccessMsg("Que alegria ter você conosco! Sua conta foi criada. Por favor, verifique sua caixa de entrada e confirme seu e-mail para que possamos caminhar juntos no serviço.");
            // Optional: switch back to login after delay
            // setTimeout(() => setView('login'), 10000); // Increased delay to allow reading
        }

    } catch (err: any) {
        setError(err.message || "Erro ao criar conta.");
    } finally {
        setLoading(false);
    }
  };

  const handleRecoverPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      clearFeedback();

      try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: window.location.origin, // PWA handles this
          });

          if (error) throw error;

          setSuccessMsg("Se houver uma conta com este e-mail, enviamos um link de recuperação.");
      } catch (err: any) {
          setError(err.message || "Erro ao solicitar recuperação.");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex items-center justify-center font-sans overflow-y-auto">
      
      {/* Container simulating a refined mobile-first layout or device mockup on large screens */}
      <div className="w-full max-w-[440px] min-h-screen lg:min-h-[850px] bg-white shadow-2xl lg:rounded-[3rem] overflow-hidden relative flex flex-col">
        
        {/* TOPOGRAPHIC HEADER */}
        <div className={`relative ${view === 'welcome' ? 'h-[240px]' : 'h-[160px]'} w-full overflow-hidden shrink-0 transition-all duration-500`}>
          <div className="absolute inset-0 bg-gradient-to-br from-[#007cba] via-[#007cba] to-[#6cc04a]">
            {/* Topographic Lines SVG Overlay */}
            <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
              <g fill="none" stroke="white" strokeWidth="1">
                <circle cx="100" cy="100" r="150" />
                <circle cx="100" cy="100" r="120" />
                <circle cx="100" cy="100" r="90" />
                <circle cx="100" cy="100" r="60" />
                <circle cx="100" cy="100" r="30" />
                
                <circle cx="350" cy="50" r="100" />
                <circle cx="350" cy="50" r="80" />
                <circle cx="350" cy="50" r="60" />
                <circle cx="350" cy="50" r="40" />

                <circle cx="200" cy="300" r="180" />
                <circle cx="200" cy="300" r="150" />
                <circle cx="200" cy="300" r="120" />
                <circle cx="200" cy="300" r="90" />
                <path d="M0,200 Q100,150 200,200 T400,200" />
                <path d="M0,220 Q100,170 200,220 T400,220" />
              </g>
            </svg>
          </div>

          {/* Botão Voltar (Apenas em telas secundárias) */}
          {view !== 'welcome' && (
            <motion.button 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setView('welcome')}
              className="absolute top-8 left-6 z-20 flex items-center gap-2 text-white/90 font-black text-[10px] uppercase tracking-widest bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 hover:bg-white/20 transition-all"
            >
              <ArrowLeft size={14} /> Voltar
            </motion.button>
          )}

          {/* Wave Transition */}
          <div className="absolute bottom-[-2px] left-0 right-0">
            <svg viewBox="0 0 400 120" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,60 C100,20 300,100 400,60 V120 H0 V60Z" />
            </svg>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 px-10 pb-12 pt-4 flex flex-col">
          <AnimatePresence mode="wait">
            
            {/* VIEW: WELCOME */}
            {view === 'welcome' && (
              <motion.div 
                key="welcome"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex-1 flex flex-col items-center justify-center text-center gap-2"
              >
                <motion.img 
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  src="https://i.imgur.com/ofoiwCd.png" 
                  alt="Pascom Tasks" 
                  className="h-20 w-auto mb-6 object-contain"
                />
                
                <div className="mt-10 w-full flex flex-col gap-4">
                   <button 
                    onClick={() => setView('login')}
                    className="w-full bg-brand-blue text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-blue/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                   >
                     ACESSAR O TASKS <ArrowRight size={18} />
                   </button>

                   <button 
                    onClick={() => setView('signup')}
                    className="w-full bg-slate-50 text-slate-600 py-5 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-100 hover:bg-white hover:shadow-lg transition-all"
                   >
                     Quero servir com vocês
                   </button>
                </div>
              </motion.div>
            )}

            {/* VIEW: LOGIN */}
            {view === 'login' && (
              <motion.div 
                key="login"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col gap-8"
              >
                <div>
                  <h1 className="text-4xl font-black text-slate-800 tracking-tight">Que bom te ver!</h1>
                  <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest italic">Acesse seu espaço de serviço</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                  {error && (
                    <div className="text-rose-500 text-xs font-bold bg-rose-50 p-3 rounded-xl border border-rose-100 flex items-center gap-2">
                      <AlertTriangle size={14} /> Ops! {error}
                    </div>
                  )}

                  <div className="space-y-1 group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                    <div className="relative border-b-2 border-slate-100 focus-within:border-brand-green transition-all pb-2 flex items-center gap-4">
                      <Mail className="text-slate-300" size={18} />
                      <input 
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Seu email"
                        className="w-full bg-transparent outline-none text-sm font-bold text-slate-700 placeholder:text-slate-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                    <div className="relative border-b-2 border-slate-100 focus-within:border-brand-green transition-all pb-2 flex items-center gap-4">
                      <KeyRound className="text-slate-300" size={18} />
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Sua senha"
                        className="w-full bg-transparent outline-none text-sm font-bold text-slate-700 placeholder:text-slate-300"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-300 hover:text-brand-green transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer group/check">
                      <div 
                        onClick={() => setRememberMe(!rememberMe)}
                        className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-brand-green border-brand-green' : 'bg-slate-50 border-slate-200'}`}
                      >
                        {rememberMe && <Check size={12} strokeWidth={4} className="text-white" />}
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">Lembrar-me</span>
                    </label>
                    <button type="button" onClick={() => switchView('forgot_password')} className="text-[11px] font-black text-brand-green uppercase tracking-tighter">Esqueceu a senha?</button>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-blue text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-blue/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : 'Entrar'}
                  </button>
                </form>

                <div className="mt-auto pt-8 text-center text-[11px] font-bold text-slate-400">
                   Não tem conta? <button onClick={() => switchView('signup')} className="text-brand-green hover:underline">Cadastre-se</button>
                </div>
              </motion.div>
            )}

            {/* VIEW: SIGN UP */}
            {view === 'signup' && (
              <motion.div 
                key="signup"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col gap-4 sm:gap-6"
              >
                <div>
                  <h1 className="text-3xl font-black text-slate-800 tracking-tight">Crie seu Perfil</h1>
                  <p className="text-slate-400 font-bold text-[10px] mt-1 uppercase tracking-widest italic">Junte-se à nossa equipe</p>
                </div>

                <form onSubmit={handleSignUp} className="space-y-4">
                  {successMsg ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-emerald-50 text-emerald-700 p-6 rounded-[2rem] border border-emerald-100 text-xs font-bold leading-relaxed flex flex-col items-center text-center gap-4"
                    >
                      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                        <Mail size={32} />
                      </div>
                      <p className="px-2">{successMsg}</p>
                      <button 
                        type="button" 
                        onClick={() => switchView('login')} 
                        className="bg-emerald-600 text-white px-8 py-3 rounded-xl uppercase tracking-widest text-[10px] font-black shadow-lg shadow-emerald-200"
                      >
                        Ir para o Login
                      </button>
                    </motion.div>
                  ) : (
                    <>
                      {error && (
                        <div className="text-rose-500 text-xs font-bold bg-rose-50 p-3 rounded-xl border border-rose-100 flex items-center gap-2">
                          <AlertTriangle size={14} /> {error}
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                        <input 
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Como devemos te chamar?"
                          className="w-full bg-slate-50 border border-slate-100 px-6 py-3.5 rounded-2xl outline-none focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue transition-all text-sm font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                        <input 
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Seu email"
                          className="w-full bg-slate-50 border border-slate-100 px-6 py-3.5 rounded-2xl outline-none focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue transition-all text-sm font-bold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                          <input 
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mín 6 letras"
                            className="w-full bg-slate-50 border border-slate-100 px-6 py-3.5 rounded-2xl outline-none focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue transition-all text-sm font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar</label>
                          <input 
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repetir"
                            className="w-full bg-slate-50 border border-slate-100 px-6 py-3.5 rounded-2xl outline-none focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue transition-all text-sm font-bold"
                          />
                        </div>
                      </div>

                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full bg-brand-green text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-green/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : 'Criar Perfil'}
                      </button>
                    </>
                  )}
                </form>

                <div className="mt-auto pt-8 text-center text-[11px] font-bold text-slate-400">
                   Já tem uma conta? <button onClick={() => switchView('login')} className="text-brand-blue hover:underline">Entrar agora</button>
                </div>
              </motion.div>
            )}

            {/* VIEW: FORGOT PASSWORD */}
            {view === 'forgot_password' && (
              <motion.div 
                key="forgot"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col gap-8"
              >
                <div>
                  <h1 className="text-4xl font-black text-slate-800 tracking-tight">Recuperar</h1>
                  <div className="w-12 h-1.5 bg-[#6cc04a] mt-2 rounded-full"></div>
                </div>

                <form onSubmit={handleRecoverPassword} className="space-y-6 flex-1 flex flex-col">
                  {successMsg ? (
                     <div className="bg-emerald-50 text-emerald-600 p-6 rounded-[2rem] border border-emerald-100 text-xs font-bold leading-relaxed flex flex-col items-center text-center gap-4">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                          <Mail size={32} />
                        </div>
                        <p>{successMsg}</p>
                        <button type="button" onClick={() => switchView('login')} className="bg-emerald-600 text-white px-6 py-3 rounded-xl uppercase tracking-widest text-[10px] font-black">Voltar ao Login</button>
                     </div>
                  ) : (
                    <>
                      <p className="text-slate-500 font-medium text-sm leading-relaxed">Insira seu e-mail abaixo. Enviaremos um link seguro para você redefinir sua senha.</p>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Cadastrado</label>
                        <input 
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="seu@email.com"
                          className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue transition-all text-sm font-bold"
                        />
                      </div>

                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full bg-slate-800 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
                      >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : 'Mandar Link'}
                      </button>

                      <button type="button" onClick={() => switchView('login')} className="mt-8 text-slate-400 hover:text-slate-600 transition-colors text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3">
                        <ArrowLeft size={16} /> Lembrei a senha
                      </button>
                    </>
                  )}
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};