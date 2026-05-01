import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Calendar, Check, Loader2, Sparkles, Heart } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { User } from '../types';

interface OnboardingModalProps {
  user: User;
  onComplete: () => void;
}

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
  'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150&h=150&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [birthday, setBirthday] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("A foto deve ter no máximo 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          avatar: avatar,
          birthday: birthday,
          onboarding_completed: true
        })
        .eq('id', user.id);
      
      if (error) throw error;
      onComplete();
    } catch (err) {
      console.error("Error updating profile during onboarding:", err);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden"
      >
        {/* Header Decor */}
        <div className="h-32 bg-gradient-to-br from-brand-blue to-brand-green relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <circle cx="10" cy="10" r="30" fill="white" />
              <circle cx="90" cy="80" r="40" fill="white" />
            </svg>
          </div>
          <div className="absolute bottom-6 left-8">
            <h2 className="text-white text-2xl font-black tracking-tight">Seja bem-vindo!</h2>
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest leading-none mt-1">Vamos preparar seu perfil</p>
          </div>
        </div>

        <div className="p-10 pt-8 flex flex-col items-center">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full flex flex-col items-center gap-8"
              >
                <div className="text-center">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Sua Foto de Perfil</h3>
                  <p className="text-slate-400 font-medium text-sm mt-2 px-4 italic">Escolha uma foto bem bonita para os irmãos te reconhecerem!</p>
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group cursor-pointer"
                >
                  <div className="w-36 h-36 rounded-[2.5rem] overflow-hidden border-4 border-slate-50 shadow-xl transition-all group-hover:scale-105 group-hover:shadow-2xl flex items-center justify-center bg-slate-50">
                    {avatar ? (
                      <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-slate-300">
                        <Camera size={40} className="mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Enviar Foto</span>
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-brand-green text-white rounded-2xl flex items-center justify-center shadow-lg border-4 border-white group-hover:rotate-12 transition-all">
                    <Camera size={20} />
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>

                <div className="w-full">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-6">Toque no ícone para fazer o upload</p>
                </div>

                <button 
                  onClick={() => setStep(2)}
                  disabled={!avatar}
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  Continuar
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full flex flex-col items-center gap-8"
              >
                <div className="w-20 h-20 bg-brand-blue/10 text-brand-blue rounded-[1.8rem] flex items-center justify-center shadow-inner">
                  <Calendar size={36} />
                </div>

                <div className="w-full text-center">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Data de Aniversário</h3>
                  <p className="text-slate-400 font-medium text-sm mt-2 px-4">Queremos celebrar sua vida com alegria em nossa comunidade!</p>
                </div>

                <div className="w-full space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Sua data de nascimento</label>
                  <input 
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue transition-all"
                  />
                </div>

                <div className="w-full flex gap-4">
                   <button 
                    onClick={() => setStep(1)}
                    className="flex-1 bg-slate-50 text-slate-400 py-5 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-100 hover:bg-white transition-all"
                  >
                    Voltar
                  </button>
                  <button 
                    onClick={handleComplete}
                    disabled={loading || !birthday}
                    className="flex-[2] bg-brand-green text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-green/20 hover:bg-brand-green/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : (
                      <>
                        <Sparkles size={18} /> Começar Missão
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer progress */}
        <div className="flex justify-center gap-2 pb-8">
           <div className={`h-1.5 rounded-full transition-all duration-500 ${step === 1 ? 'w-8 bg-brand-blue' : 'w-4 bg-slate-100'}`} />
           <div className={`h-1.5 rounded-full transition-all duration-500 ${step === 2 ? 'w-8 bg-brand-blue' : 'w-4 bg-slate-100'}`} />
        </div>
      </motion.div>
    </div>
  );
};
