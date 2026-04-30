import React, { useState, useRef } from 'react';
import { User, Task, ScheduleEvent, Post, TaskStatus } from '../types';
import { supabase } from '../supabaseClient';
import { 
  Camera, Mail, Calendar, Briefcase, Save, X, Award, 
  CheckCircle2, Layout, Edit2, Loader2, UserCircle, 
  Lock, LogOut, ChevronRight, Star, Heart, Share2, 
  Settings, Clock, Check, Inbox
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileProps {
  user: User;
  email?: string;
  tasks: Task[];
  schedules: ScheduleEvent[];
  posts: Post[];
  onUpdate: () => void;
  onLogout?: () => void;
}

const AVAILABLE_SKILLS = [
  "Fotografia",
  "Transmissão",
  "Vídeo",
  "Social Media",
  "Design Gráfico",
  "Redação",
  "Articulação"
];

export const Profile: React.FC<ProfileProps> = ({ user, email, tasks, schedules, posts, onUpdate, onLogout }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password Change States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' });

  // Form State
  const [formData, setFormData] = useState({
    name: user.name,
    birthday: user.birthday
  });
  
  const [skills, setSkills] = useState<string[]>(user.skills || []);

  // Stats Calculation
  const stats = {
    tasksCompleted: tasks.filter(t => t.assigneeIds.includes(user.id) && t.status === TaskStatus.DONE).length,
    tasksPending: tasks.filter(t => t.assigneeIds.includes(user.id) && t.status !== TaskStatus.DONE).length,
    schedulesCount: schedules.filter(s => s.roles.some(r => r.assignedUserId === user.id)).length,
    postsCount: posts.filter(p => p.authorId === user.id).length
  };

  const formatBirthday = (dateString: string) => {
    if (!dateString) return 'Não informado';
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('pt-BR');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    setLoading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars') 
        .upload(filePath, file);

      if (uploadError) {
         if ((uploadError as any).error === 'Bucket not found' || (uploadError as any).statusCode === '404') {
             alert("Aviso: O bucket 'avatars' não foi encontrado no Supabase.");
             setLoading(false);
             return;
         }
         throw uploadError;
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar: urlData.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      onUpdate();
    } catch (error: any) {
      alert('Erro ao atualizar foto: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          birthday: formData.birthday,
          skills: skills
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      alert('Erro ao salvar perfil: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
        alert("As senhas não coincidem.");
        return;
    }
    if (passwordForm.new.length < 6) {
        alert("A senha deve ter pelo menos 6 caracteres.");
        return;
    }

    setPassLoading(true);
    try {
        const { error } = await supabase.auth.updateUser({ 
            password: passwordForm.new 
        });

        if (error) throw error;

        alert("Senha atualizada com sucesso!");
        setIsPasswordModalOpen(false);
        setPasswordForm({ new: '', confirm: '' });
    } catch (e: any) {
        alert("Erro ao atualizar senha: " + e.message);
    } finally {
        setPassLoading(false);
    }
  };

  const toggleSkill = (skill: string) => {
    if (skills.includes(skill)) {
      setSkills(skills.filter(s => s !== skill));
    } else {
      setSkills([...skills, skill]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-10 pb-32 space-y-8 md:space-y-12 animate-in fade-in duration-1000">
      
      {/* modern Hero Header */}
      <section className="relative h-[320px] sm:h-[280px] md:h-[350px] rounded-[2rem] md:rounded-[3rem] overflow-hidden group shadow-2xl">
        {/* Abstract Background Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-blue via-brand-blue/90 to-slate-900 z-0" />
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
            <svg viewBox="0 0 400 400" className="w-full h-full text-white fill-current">
                <circle cx="400" cy="0" r="400" />
            </svg>
        </div>
        
        <div className="absolute inset-0 z-10 flex flex-col justify-end p-6 md:p-16">
            <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6 md:gap-8">
                <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-10">
                    {/* Avatar with Ring */}
                    <div className="relative group shrink-0">
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-24 h-24 sm:w-32 sm:h-32 md:w-44 md:h-44 rounded-[2rem] md:rounded-[2.5rem] p-1.5 md:p-2 bg-white/20 backdrop-blur-md shadow-2xl relative z-20 overflow-hidden ring-4 ring-white/30"
                        >
                            <img 
                                src={user.avatar || "https://images.unsplash.com/photo-1511367461989-f85a21fda167?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"} 
                                alt={user.name} 
                                className="w-full h-full rounded-[1.4rem] md:rounded-[1.8rem] object-cover"
                            />
                        </motion.div>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 bg-white text-brand-blue p-2.5 md:p-4 rounded-xl md:rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all z-30 ring-2 md:ring-4 ring-brand-blue"
                            title="Alterar foto"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin md:w-5 md:h-5" /> : <Camera className="w-4 h-4 md:w-5 md:h-5" strokeWidth={3} />}
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                    </div>

                    <div className="text-center md:text-left space-y-1 md:space-y-2">
                        <motion.div 
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-col md:flex-row items-center gap-2 md:gap-3"
                        >
                            <h1 className="text-3xl md:text-6xl font-black text-white tracking-tighter leading-none">{user.name}</h1>
                            <div className="bg-brand-green text-white px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-green/20">Ativo</div>
                        </motion.div>
                        <motion.p 
                             initial={{ x: -20, opacity: 0 }}
                             animate={{ x: 0, opacity: 1 }}
                             transition={{ delay: 0.3 }}
                             className="text-white/60 text-base md:text-xl font-bold italic font-sans"
                        >
                            {user.role} na Pascom Hub
                        </motion.p>
                    </div>
                </div>

                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-wrap justify-center gap-2 md:gap-4 w-full md:w-auto"
                >
                    {isEditing ? (
                        <div className="flex gap-2 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 w-full sm:w-auto">
                            <button 
                                onClick={() => setIsEditing(false)}
                                className="flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-3 text-white/70 hover:text-white font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={loading}
                                className="flex-1 sm:flex-none bg-white text-brand-blue px-6 md:px-8 py-2 md:py-3 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-[0.15em] md:tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 size={12} className="animate-spin md:w-[14px] md:h-[14px]" /> : <Save size={14} strokeWidth={3} />}
                                Salvar
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                            <button 
                                onClick={() => setIsPasswordModalOpen(true)}
                                className="group p-3 md:p-4 bg-white/10 backdrop-blur-md text-white rounded-xl md:rounded-2xl border border-white/20 hover:bg-white hover:text-brand-blue transition-all active:scale-95 shadow-lg"
                                title="Segurança"
                            >
                                <Lock size={18} className="md:w-5 md:h-5 group-hover:rotate-12 transition-transform" />
                            </button>
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="bg-white text-brand-blue px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-[1.8rem] font-black text-[9px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] shadow-2xl shadow-black/10 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 md:gap-3"
                            >
                                <Edit2 size={14} className="md:w-4 md:h-4" strokeWidth={3} /> Editar Perfil
                            </button>
                            {onLogout && (
                                <button 
                                    onClick={onLogout}
                                    className="p-3 md:p-4 bg-rose-500/20 backdrop-blur-md text-rose-200 border border-rose-500/30 rounded-xl md:rounded-2xl hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-lg"
                                    title="Sair do Sistema"
                                >
                                    <LogOut size={18} className="md:w-5 md:h-5" />
                                </button>
                            )}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
      </section>


      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* Left Aspect: Impact & Card */}
        <div className="lg:col-span-4 space-y-6 md:space-y-8">
            {/* Impact Bento Box */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="bento-card p-6 md:p-10 bg-white shadow-[0_32px_64px_-12px_rgba(0,0,0,0.05)] border border-slate-100 rounded-[2.5rem] md:rounded-[3rem] relative overflow-hidden"
            >
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-blue/5 rounded-full blur-3xl" />
                
                <div className="flex items-center gap-4 mb-8 md:mb-10">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 text-white rounded-xl md:rounded-[1.2rem] flex items-center justify-center shadow-lg">
                        <Award size={20} className="md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg md:text-xl font-black text-slate-800 tracking-tight leading-none mb-1">Impacto Pastoral</h3>
                        <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contribuição Técnica</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4">
                    <div className="group flex justify-between items-center p-4 md:p-5 bg-slate-50 hover:bg-brand-green/10 transition-all rounded-2xl md:rounded-[2rem] border border-slate-100/50 hover:border-brand-green/20">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="p-2.5 md:p-3 bg-white rounded-xl md:rounded-2xl text-brand-green shadow-sm shadow-brand-green/10 group-hover:bg-brand-green group-hover:text-white transition-all"><CheckCircle2 size={18} className="md:w-5 md:h-5" strokeWidth={2.5} /></div>
                            <div>
                                <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] group-hover:text-brand-green/70 transition-colors">Entregas</p>
                                <span className="text-base md:text-lg font-black text-slate-800">Finalizadas</span>
                            </div>
                        </div>
                        <span className="text-2xl md:text-3xl font-black text-slate-900 group-hover:scale-110 transition-transform">{stats.tasksCompleted}</span>
                    </div>

                    <div className="group flex justify-between items-center p-4 md:p-5 bg-slate-50 hover:bg-brand-yellow/10 transition-all rounded-2xl md:rounded-[2rem] border border-slate-100/50 hover:border-brand-yellow/20">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="p-2.5 md:p-3 bg-white rounded-xl md:rounded-2xl text-brand-yellow shadow-sm shadow-brand-yellow/10 group-hover:bg-brand-yellow group-hover:text-white transition-all"><Calendar size={18} className="md:w-5 md:h-5" strokeWidth={2.5} /></div>
                            <div>
                                <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] group-hover:text-brand-yellow/70 transition-colors">Plantões</p>
                                <span className="text-base md:text-lg font-black text-slate-800">Participações</span>
                            </div>
                        </div>
                        <span className="text-2xl md:text-3xl font-black text-slate-900 group-hover:scale-110 transition-transform">{stats.schedulesCount}</span>
                    </div>

                    <div className="group flex justify-between items-center p-4 md:p-5 bg-slate-50 hover:bg-brand-blue/10 transition-all rounded-2xl md:rounded-[2rem] border border-slate-100/50 hover:border-brand-blue/20 sm:col-span-2 lg:col-span-1">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="p-2.5 md:p-3 bg-white rounded-xl md:rounded-2xl text-brand-blue shadow-sm shadow-brand-blue/10 group-hover:bg-brand-blue group-hover:text-white transition-all"><Layout size={18} className="md:w-5 md:h-5" strokeWidth={2.5} /></div>
                            <div>
                                <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] group-hover:text-brand-blue/70 transition-colors">Engajamento</p>
                                <span className="text-base md:text-lg font-black text-slate-800">Publicações</span>
                            </div>
                        </div>
                        <span className="text-2xl md:text-3xl font-black text-slate-900 group-hover:scale-110 transition-transform">{stats.postsCount}</span>
                    </div>
                </div>
            </motion.div>

            {/* modern Virtual ID Card */}
            <motion.div 
               whileHover={{ scale: 1.02 }}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="bg-slate-900 p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl relative overflow-hidden group cursor-pointer"
            >
                 <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
                 <div className="absolute bottom-0 left-0 w-24 h-24 bg-brand-blue/20 blur-2xl rounded-full" />
                 
                 <div className="flex justify-between items-start mb-10 md:mb-12">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                        <Share2 size={20} className="md:w-6 md:h-6 text-white/60" />
                    </div>
                    <div className="text-right">
                        <p className="text-[8px] md:text-[9px] font-black text-white/40 uppercase tracking-[0.3em] mb-1">Membership</p>
                        <p className="text-[10px] md:text-xs font-bold text-white leading-none italic">ID-{user.id.slice(0, 8)}</p>
                    </div>
                 </div>

                 <div className="flex items-center gap-4 md:gap-6 mb-6 md:mb-8">
                    <UserCircle size={40} className="md:w-12 md:h-12 text-brand-blue opacity-80 group-hover:rotate-12 transition-transform" />
                    <div>
                        <h4 className="text-white font-black text-lg md:text-xl tracking-tight leading-none mb-1 md:mb-2">Cartão do Agente</h4>
                        <p className="text-white/40 text-[8px] md:text-[10px] font-black uppercase tracking-widest leading-none">Acesso Autorizado Pascom</p>
                    </div>
                 </div>

                 <div className="flex items-end justify-between">
                    <div>
                        <p className="text-[8px] md:text-[9px] font-black text-brand-blue uppercase tracking-[0.2em] mb-1">Especialidade Master</p>
                        <p className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter truncate max-w-[150px] md:max-w-[180px]">{user.role}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white shadow-xl shadow-white/10 px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl">
                        <Star size={10} className="md:w-3 md:h-3 fill-brand-yellow text-brand-yellow" />
                        <span className="text-[8px] md:text-[10px] font-black text-slate-800">PRO</span>
                    </div>
                 </div>
            </motion.div>
        </div>


        {/* Right Content Area: Details & Skills */}
        <div className="lg:col-span-8 space-y-10">
            
            {/* bento Block: Info */}
            <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="bg-white p-10 md:p-14 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.05)] border border-slate-100"
            >
                <div className="flex items-center justify-between mb-12">
                   <div className="flex items-center gap-4">
                        <div className="p-4 bg-brand-blue/5 text-brand-blue rounded-3xl shadow-sm"><Settings size={28} /></div>
                        <div>
                            <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-1">Dados Sincronizados</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Configurações da Conta</p>
                        </div>
                   </div>
                   {isEditing && (
                     <div className="hidden sm:block animate-in fade-in slide-in-from-right-4">
                        <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest bg-brand-blue/5 px-4 py-2 rounded-full">Modo de Edição Ativo</p>
                     </div>
                   )}
                </div>
                
                <AnimatePresence mode="wait">
                {isEditing ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-10"
                    >
                        <div className="space-y-4">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nome Social Pascom</label>
                            <input 
                                type="text" 
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue outline-none font-bold text-slate-800 text-lg transition-all"
                                placeholder="Seu nome completo..."
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Ciclo de Nascimento</label>
                            <div className="relative group">
                                <input 
                                    type="date" 
                                    value={formData.birthday}
                                    onChange={(e) => setFormData({...formData, birthday: e.target.value})}
                                    className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue outline-none font-black text-slate-800 cursor-pointer transition-all"
                                />
                                <Calendar className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={20} />
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-4">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Endereço de Login (Imutável)</label>
                            <div className="w-full px-8 py-5 bg-slate-100 text-slate-400 border border-slate-200 rounded-[2rem] font-bold">
                                {email || 'Sincronizando...'}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14">
                        <div className="group flex items-start gap-6 p-6 rounded-[2.5rem] bg-slate-50 border border-slate-100/50 hover:bg-white hover:shadow-xl transition-all">
                            <div className="p-4 bg-white rounded-2xl shadow-sm text-slate-400 group-hover:text-brand-blue transition-colors"><Mail size={24} /></div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 italic opacity-60">E-mail Corporativo</p>
                                <p className="text-xl font-black text-slate-800 tracking-tight leading-none truncate max-w-[200px]">{email || 'Indisponível'}</p>
                            </div>
                        </div>
                        <div className="group flex items-start gap-6 p-6 rounded-[2.5rem] bg-slate-50 border border-slate-100/50 hover:bg-white hover:shadow-xl transition-all">
                            <div className="p-4 bg-white rounded-2xl shadow-sm text-slate-400 group-hover:text-brand-blue transition-colors"><Calendar size={24} /></div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 italic opacity-60">Celebração Vida</p>
                                <p className="text-xl font-black text-slate-800 tracking-tight leading-none uppercase">{formatBirthday(user.birthday)}</p>
                            </div>
                        </div>
                        <div className="group flex items-start gap-6 p-6 rounded-[2.5rem] bg-slate-50 border border-slate-100/50 hover:bg-white hover:shadow-xl transition-all">
                            <div className="p-4 bg-white rounded-2xl shadow-sm text-slate-400 group-hover:text-brand-blue transition-colors"><Briefcase size={24} /></div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 italic opacity-60">Cargo Estratégico</p>
                                <p className="text-xl font-black text-slate-800 tracking-tight leading-none uppercase">{user.role}</p>
                            </div>
                        </div>
                        <div className="group flex items-start gap-6 p-6 rounded-[2.5rem] bg-slate-50 border border-slate-100/50 hover:bg-white hover:shadow-xl transition-all">
                            <div className="p-4 bg-white rounded-2xl shadow-sm text-slate-400 group-hover:text-brand-blue transition-colors"><Clock size={24} /></div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 italic opacity-60">Última Atualização</p>
                                <p className="text-xl font-black text-slate-800 tracking-tight leading-none uppercase">Hoje</p>
                            </div>
                        </div>
                    </div>
                )}
                </AnimatePresence>
            </motion.div>

            {/* bento Block: Skills */}
            <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.2 }}
               className="bg-white p-10 md:p-14 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.05)] border border-slate-100"
            >
                <div className="flex items-center gap-4 mb-12">
                   <div className="p-4 bg-brand-green/5 text-brand-green rounded-3xl shadow-sm"><Award size={28} /></div>
                   <div>
                       <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-1">Skill Matrix</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Habilidades Técnicas</p>
                   </div>
                </div>
                
                <div className="flex flex-wrap gap-4">
                    <AnimatePresence mode="popLayout">
                    {isEditing ? (
                        AVAILABLE_SKILLS.map((skill) => {
                            const isSelected = skills.includes(skill);
                            return (
                                <motion.button
                                    layout
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    key={skill}
                                    onClick={() => toggleSkill(skill)}
                                    className={`px-8 py-4 rounded-[1.8rem] text-xs font-black uppercase tracking-widest border transition-all flex items-center gap-3 ${
                                        isSelected 
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/10 scale-105' 
                                        : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                    {isSelected ? <Check size={16} strokeWidth={4} /> : <div className="w-4 h-4 rounded-full border-2 border-slate-100" />}
                                    {skill}
                                </motion.button>
                            );
                        })
                    ) : (
                        skills.map((skill, index) => (
                            <motion.span 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                key={skill} 
                                className="px-8 py-4 bg-brand-blue/5 text-brand-blue rounded-[1.8rem] text-xs font-black uppercase tracking-widest border border-brand-blue/10 flex items-center gap-3 group hover:bg-brand-blue hover:text-white transition-all shadow-sm"
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-brand-blue group-hover:bg-white animate-pulse" />
                                {skill}
                            </motion.span>
                        ))
                    )}
                    </AnimatePresence>
                    {!isEditing && skills.length === 0 && (
                        <div className="w-full text-center py-16 bg-slate-50 border-2 border-dashed border-slate-200/50 rounded-[3rem]">
                             <Inbox size={40} className="mx-auto text-slate-200 mb-4" />
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Nenhuma habilidade mapeada no momento.</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
      </div>

      {/* PASSWORD CHANGE MODAL */}
      <AnimatePresence>
      {isPasswordModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" 
                    onClick={() => setIsPasswordModalOpen(false)}
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 40 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 40 }}
                    className="bg-white rounded-[3rem] shadow-2xl p-12 max-w-md w-full relative z-10 ring-1 ring-black/5"
                >
                  <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-blue text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-blue/20">
                            <Lock size={20} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Segurança</h3>
                    </div>
                    <button 
                        onClick={() => setIsPasswordModalOpen(false)} 
                        className="p-3 bg-slate-50 text-slate-300 hover:text-slate-900 rounded-xl transition-all active:scale-90"
                    >
                        <X size={20} strokeWidth={3} />
                    </button>
                  </div>
                  
                  <div className="space-y-8">
                      <div className="space-y-3">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nova Credencial</label>
                          <input 
                              type="password" 
                              value={passwordForm.new}
                              onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})}
                              className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.8rem] focus:ring-4 focus:ring-brand-blue/10 outline-none font-bold text-slate-800 transition-all"
                              placeholder="Mínimo 6 caracteres..."
                          />
                      </div>
                      <div className="space-y-3">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Confirmar Credencial</label>
                          <input 
                              type="password" 
                              value={passwordForm.confirm}
                              onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})}
                              className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.8rem] focus:ring-4 focus:ring-brand-blue/10 outline-none font-bold text-slate-800 transition-all"
                              placeholder="Repita a nova senha..."
                          />
                      </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 mt-12">
                      <button 
                        onClick={() => setIsPasswordModalOpen(false)} 
                        className="flex-1 py-5 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 rounded-[1.5rem] transition-all"
                        disabled={passLoading}
                      >
                          Cancelar
                      </button>
                      <button 
                        onClick={handlePasswordUpdate}
                        disabled={passLoading || !passwordForm.new || !passwordForm.confirm}
                        className="flex-[2] py-5 bg-brand-blue text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-blue/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                          {passLoading ? <Loader2 size={16} className="animate-spin text-white/50" /> : <Save size={16} strokeWidth={3} />}
                          Sincronizar Senha
                      </button>
                  </div>
              </motion.div>
          </div>
      )}
      </AnimatePresence>
    </div>
  );
};
