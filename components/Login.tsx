import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, Check, ArrowLeft, UserPlus, KeyRound, Mail } from 'lucide-react';
import { UserRole } from '../types';

type AuthView = 'login' | 'signup' | 'forgot_password';

export const Login: React.FC = () => {
  const [view, setView] = useState<AuthView>('login');
  
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
                            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff`,
                            skills: []
                        }
                    ]);
                
                if (profileError) {
                    console.error("Erro ao criar perfil:", profileError);
                    // Don't throw here, user is created, just profile missing. Can be fixed later or via trigger.
                }
            }

            setSuccessMsg("Conta criada com sucesso! Verifique seu e-mail para confirmar o cadastro antes de entrar.");
            // Optional: switch back to login after delay
            setTimeout(() => setView('login'), 5000);
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
    <div className="min-h-screen w-full flex bg-white font-sans">
      
      {/* Left Side - Full Image Cover */}
      <div className="hidden md:block w-1/2 relative overflow-hidden bg-gray-100">
        <img 
            src="https://i.imgur.com/ynBYspt.png" 
            alt="Gestão de Tarefas Pascom" 
            className="absolute inset-0 w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
      </div>

      {/* Right Side - Forms */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-white relative">
        <div className="w-full max-w-md animate-fade-in">
            
            {/* Logo */}
            <div className="flex flex-col items-center mb-6">
                <img src="https://i.imgur.com/ofoiwCd.png" alt="Pascom Logo" className="h-16 w-auto object-contain mb-4" />
                <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wider">
                    {view === 'login' && 'Bem-vindo'}
                    {view === 'signup' && 'Criar Conta'}
                    {view === 'forgot_password' && 'Recuperar Senha'}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    {view === 'login' && 'Acesse sua conta Pascom Tasks'}
                    {view === 'signup' && 'Junte-se à equipe da Pascom'}
                    {view === 'forgot_password' && 'Digite seu e-mail para receber o link'}
                </p>
            </div>

            {/* Global Alerts */}
            {error && (
                <div className="mb-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-start gap-2 border border-red-100 animate-pulse">
                   <div className="mt-0.5"><Loader2 size={16} className="animate-spin" /></div> {/* Reuse icon as alert symbol placeholder or use generic */}
                   <span className="font-medium">{error}</span>
                </div>
            )}
            
            {successMsg && (
                <div className="mb-4 bg-green-50 text-green-600 text-sm p-3 rounded-lg flex items-start gap-2 border border-green-100">
                    <Check size={16} className="mt-0.5 shrink-0" />
                    <span className="font-medium">{successMsg}</span>
                </div>
            )}

            {/* --- VIEW: LOGIN --- */}
            {view === 'login' && (
                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-700 ml-1 mb-1 block uppercase">E-mail</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white text-gray-900 px-5 py-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm font-medium"
                                placeholder="seu@email.com"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-700 ml-1 mb-1 block uppercase">Senha</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white text-gray-900 px-5 py-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm font-medium"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div 
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-400 group-hover:border-blue-500'}`}
                                onClick={() => setRememberMe(!rememberMe)}
                            >
                                {rememberMe && <Check size={10} className="text-white" />}
                            </div>
                            <span className="text-gray-600 font-medium select-none" onClick={() => setRememberMe(!rememberMe)}>Lembrar de mim</span>
                        </label>
                        <button type="button" onClick={() => switchView('forgot_password')} className="text-blue-600 font-semibold hover:underline">Esqueceu a Senha?</button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5 hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-2 uppercase tracking-wide text-sm"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Entrar'}
                    </button>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600 text-sm font-medium">
                            Não tem uma conta? <button type="button" onClick={() => switchView('signup')} className="text-blue-600 font-bold hover:underline">Inscrever-se</button>
                        </p>
                    </div>
                </form>
            )}

            {/* --- VIEW: SIGN UP --- */}
            {view === 'signup' && (
                <form onSubmit={handleSignUp} className="space-y-4">
                     <div>
                        <label className="text-xs font-semibold text-gray-700 ml-1 mb-1 block uppercase">Nome Completo</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-white text-gray-900 px-5 py-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm font-medium"
                            placeholder="Ex: João da Silva"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-700 ml-1 mb-1 block uppercase">E-mail</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white text-gray-900 px-5 py-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm font-medium"
                            placeholder="seu@email.com"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-gray-700 ml-1 mb-1 block uppercase">Senha</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white text-gray-900 px-4 py-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm font-medium"
                                placeholder="Mín 6 caracteres"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-700 ml-1 mb-1 block uppercase">Confirmar</label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-white text-gray-900 px-4 py-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm font-medium"
                                placeholder="Repita a senha"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5 hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-2 uppercase tracking-wide text-sm mt-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <><UserPlus size={18} /> Criar Conta</>}
                    </button>

                    <div className="mt-4 text-center">
                         <button type="button" onClick={() => switchView('login')} className="text-gray-500 hover:text-gray-800 text-sm flex items-center justify-center gap-2 mx-auto">
                            <ArrowLeft size={16} /> Voltar para o Login
                         </button>
                    </div>
                </form>
            )}

            {/* --- VIEW: FORGOT PASSWORD --- */}
            {view === 'forgot_password' && (
                <form onSubmit={handleRecoverPassword} className="space-y-5">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 flex gap-3">
                        <KeyRound className="shrink-0 text-blue-500" size={20} />
                        <p>Insira o e-mail associado à sua conta. Enviaremos um link seguro para você redefinir sua senha.</p>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-700 ml-1 mb-1 block uppercase">E-mail de Recuperação</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white text-gray-900 px-5 py-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm font-medium"
                            placeholder="seu@email.com"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5 hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-2 uppercase tracking-wide text-sm"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <><Mail size={18} /> Enviar Link</>}
                    </button>

                    <div className="mt-6 text-center">
                         <button type="button" onClick={() => switchView('login')} className="text-gray-500 hover:text-gray-800 text-sm flex items-center justify-center gap-2 mx-auto">
                            <ArrowLeft size={16} /> Voltar para o Login
                         </button>
                    </div>
                </form>
            )}

        </div>
      </div>
    </div>
  );
};