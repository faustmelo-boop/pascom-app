import React, { useState } from 'react';
import { Post, Task, ScheduleEvent, User, FinancialTransaction, InventoryItem, Course, TaskStatus } from '../types';
import { LayoutGrid, Calendar, CheckSquare, MessageSquare, DollarSign, Box, GraduationCap, ArrowUpRight, Clock, AlertCircle, ChevronRight, LayoutDashboard, Plus, Users, Shield, Copy, Check, Eye, EyeOff, ExternalLink, Mail, Palette, Instagram, Sparkles, LayoutTemplate, Lock, Unlock, Loader2, X, Circle, CheckCircle2 } from 'lucide-react';
import { Feed } from './Feed';
import { CREDS, DECODE } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';

interface DashboardProps {
  currentUser: User;
  users: User[];
  posts: Post[];
  tasks: Task[];
  schedules: ScheduleEvent[];
  transactions: FinancialTransaction[];
  inventory: InventoryItem[];
  courses: Course[];
  setActiveTab: (tab: any) => void;
  onRefresh: () => void;
}

const CredentialItem = ({ label, value, password, icon: Icon }: { label: string, value: string, password?: string, icon: any }) => {
  const [showPass, setShowPass] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-5 bg-slate-50/50 rounded-3xl border border-slate-100 group/cred transition-all hover:bg-white hover:border-slate-200 hover:shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={12} className="text-slate-400" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover/cred:opacity-100 transition-opacity">
          <button 
            onClick={() => handleCopy(value)} 
            className="p-1.5 text-slate-400 hover:text-brand-blue transition-colors"
            title="Copiar Usuário"
          >
            {copied ? <Check size={14} className="text-brand-green" /> : <Copy size={12} />}
          </button>
        </div>
      </div>
      <p className="text-xs font-bold text-slate-700 truncate mb-2">{value}</p>
      
      {password && (
        <div className="flex items-center justify-between bg-white/60 p-2.5 rounded-xl border border-slate-100 mt-2">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] leading-none mb-1">Senha</span>
            <span className={`text-[11px] font-mono font-bold tracking-widest ${showPass ? 'text-brand-blue' : 'text-slate-300'}`}>
              {showPass ? password : '••••••••••••'}
            </span>
          </div>
          <div className="flex gap-1">
            <button 
              onClick={() => setShowPass(!showPass)} 
              className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors"
            >
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button 
              onClick={() => handleCopy(password)} 
              className="p-1.5 text-slate-400 hover:text-brand-blue transition-colors"
            >
              <Copy size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ 
  currentUser, 
  users,
  posts, 
  tasks, 
  schedules, 
  transactions, 
  inventory, 
  courses,
  setActiveTab,
  onRefresh
}) => {
  const [isAcessosModalOpen, setIsAcessosModalOpen] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const pendingTasksCount = tasks.filter(t => t.status !== TaskStatus.DONE).length;
  const upcomingSchedules = schedules.filter(s => new Date(s.date) >= new Date()).slice(0, 3);

  const toggleTaskCompletion = async (task: Task) => {
    try {
      setUpdatingTaskId(task.id);
      const newStatus = task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', task.id);
      
      if (error) throw error;
      
      // Success feedback could be added here
      onRefresh();
    } catch (err) {
      console.error('Erro ao atualizar tarefa:', err);
    } finally {
      setUpdatingTaskId(null);
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-3 duration-1000">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Main Column: FEED (O Mural) */}
        <div className="lg:col-span-8 flex flex-col gap-8">
           <div className="feed-container-integrated">
              <Feed 
                posts={posts} 
                users={users} 
                currentUser={currentUser} 
                onRefresh={onRefresh} 
                isDashboardIntegrated={true}
              />
           </div>
        </div>

        {/* Sidebar Column: RESUMO BENTO */}
        <div className="lg:col-span-4 flex flex-col gap-8 lg:sticky lg:top-8">
          
          {/* Nova Caixa de Boas-vindas / Imagem Especial */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "circOut" }}
            className="w-full rounded-[2.5rem] overflow-hidden shadow-2xl shadow-brand-blue/10 border border-slate-100 group cursor-default"
          >
            <img 
              src="https://i.imgur.com/YpUkTdN.png" 
              alt="Destaque Pascom" 
              className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-1000"
            />
          </motion.div>

          <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-[-1rem]">Acesso Rápido</p>

          {/* AI and Design Links */}
          <div className="grid grid-cols-2 gap-4">
            <motion.a 
              href="https://chatgpt.com/g/g-68419bbfb07c819188a4f51c99fc8fef-pascom-diocese-de-santa-luzia"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ y: -8, scale: 1.05, rotate: -1 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-brand-blue p-8 rounded-[2.5rem] shadow-[0_20px_40px_-12px_rgba(59,130,246,0.3)] flex flex-col items-center justify-center text-center group cursor-pointer border border-white/10"
            >
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-[1.5rem] flex items-center justify-center mb-4 group-hover:bg-white group-hover:text-brand-blue transition-all shadow-lg group-hover:rotate-12">
                <Sparkles size={28} className="text-white transition-colors" />
              </div>
              <span className="text-white font-black text-[11px] uppercase tracking-[0.25em]">Auxílio Texto</span>
            </motion.a>

            <motion.a 
              href="https://www.canva.com/folder/FAFp4SfexIc"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ y: -8, scale: 1.05, rotate: 1 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-brand-green p-8 rounded-[2.5rem] shadow-[0_20px_40px_-12px_rgba(16,185,129,0.3)] flex flex-col items-center justify-center text-center group cursor-pointer border border-white/10 transition-all"
            >
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-[1.5rem] flex items-center justify-center mb-4 group-hover:bg-white group-hover:text-brand-green transition-all shadow-sm group-hover:-rotate-12">
                <LayoutTemplate size={28} className="text-white transition-colors" />
              </div>
              <span className="text-white font-black text-[11px] uppercase tracking-[0.25em]">Canva</span>
            </motion.a>
          </div>

          {/* Credentials Button - Modal Trigger */}
          <motion.button
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => setIsAcessosModalOpen(true)}
            className="bento-card bg-brand-yellow border-none shadow-[0_20px_40px_-12px_rgba(253,182,21,0.3)] p-8 group text-left relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-1000"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md text-white rounded-[1.5rem] flex items-center justify-center shadow-lg group-hover:bg-white group-hover:text-brand-yellow transition-all group-hover:rotate-6">
                  <Lock size={24} className="group-hover:hidden" />
                  <Unlock size={24} className="hidden group-hover:block" />
                </div>
                <div>
                  <h3 className="font-black text-white text-xl tracking-tight leading-none mb-1">Acessos</h3>
                  <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Senhas da Equipe</p>
                </div>
              </div>
              <ArrowUpRight size={20} className="text-white/40 group-hover:text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
            </div>
          </motion.button>
          
          <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-[-1rem]">Painel de Controle</p>

          {/* Próximas Escalas */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bento-card bg-white border-slate-50 shadow-sm p-8 group hover:border-brand-blue/30 transition-all"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-blue/10 text-brand-blue rounded-2xl flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-all shadow-sm">
                  <Calendar size={20} />
                </div>
                <h3 className="font-black text-slate-800 tracking-tight">Escalas</h3>
              </div>
              <button 
                onClick={() => setActiveTab('escalas')} 
                className="p-3 text-slate-300 hover:text-slate-900 transition-colors hover:scale-110 active:scale-95"
                title="Ver todas as escalas"
              >
                <ArrowUpRight size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              {upcomingSchedules.length > 0 ? upcomingSchedules.map((event, idx) => (
                <motion.div 
                  key={event.id} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + (idx * 0.1) }}
                  className="flex items-center gap-4 group/item hover:translate-x-2 transition-transform cursor-pointer"
                  onClick={() => setActiveTab('escalas')}
                >
                  <div className="w-12 h-12 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-100 text-brand-blue font-black leading-none group-hover/item:bg-brand-blue/10 transition-colors">
                    <span className="text-[9px] uppercase mb-1">{new Date(event.date).toLocaleDateString('pt-BR', {month: 'short'})}</span>
                    <span className="text-lg">{new Date(event.date).getDate()}</span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="font-bold text-slate-800 text-sm truncate">{event.title}</h4>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{event.time}</p>
                  </div>
                </motion.div>
              )) : (
                <p className="text-xs text-slate-400 italic">Nenhuma escala...</p>
              )}
            </div>
          </motion.div>

          {/* Tarefas Pendentes */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bento-card bg-brand-blue border-none text-white p-8 relative overflow-hidden group shadow-[0_20px_40px_-12px_rgba(59,130,246,0.4)]"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center transition-all group-hover:bg-white group-hover:text-brand-blue shadow-lg group-hover:rotate-3">
                  <CheckSquare size={20} />
                </div>
                <button 
                  onClick={() => setActiveTab('tarefas')} 
                  className="p-3 text-white/50 hover:text-white transition-all hover:scale-110 active:scale-95"
                  title="Ver todas as tarefas"
                >
                   <ArrowUpRight size={20} />
                </button>
              </div>
              <h3 className="text-2xl font-black tracking-tight mb-6">Nossa Missão</h3>
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {tasks.filter(t => t.status !== TaskStatus.DONE).slice(0, 4).map((task, idx) => (
                    <motion.div 
                      layout
                      key={task.id} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: 0.6 + (idx * 0.05) }}
                      className="bg-white/10 backdrop-blur-sm border border-white/10 p-4 rounded-2xl flex items-center gap-3 transition-all hover:bg-white/20 group/task cursor-pointer"
                      onClick={() => setActiveTab('tarefas')}
                    >
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskCompletion(task);
                        }}
                        disabled={updatingTaskId === task.id}
                        className={`shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          task.status === TaskStatus.DONE 
                          ? 'bg-brand-green border-brand-green shadow-[0_0_8px_rgba(16,185,129,0.6)]' 
                          : 'border-white/30 hover:border-white/60'
                        }`}
                      >
                        {updatingTaskId === task.id ? (
                          <Loader2 size={12} className="animate-spin text-white" />
                        ) : task.status === TaskStatus.DONE ? (
                          <Check size={14} className="text-white" strokeWidth={4} />
                        ) : null}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-black truncate transition-all ${task.status === TaskStatus.DONE ? 'line-through opacity-50' : ''}`}>
                          {task.title}
                        </p>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full mt-1 inline-block ${
                          task.priority === 'Alta' ? 'bg-rose-500/30 text-rose-100' : 'bg-white/10 text-white/60'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {tasks.filter(t => t.status !== TaskStatus.DONE).length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8 bg-white/5 rounded-[2rem] border border-dashed border-white/20 flex flex-col items-center animate-pulse"
                  >
                    <CheckCircle2 size={32} className="text-white/20 mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Tudo pronto!</p>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Formação / Educação */}
          <div className="bento-card bg-white border-slate-50 shadow-sm p-8 group hover:border-brand-green/30 transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-brand-green/10 text-brand-green rounded-2xl flex items-center justify-center group-hover:bg-brand-green group-hover:text-white transition-all shadow-sm">
                <GraduationCap size={20} />
              </div>
              <h3 className="font-black text-slate-800 tracking-tight">Formação</h3>
            </div>
            
            <div className="space-y-4">
              {courses.slice(0, 1).map(c => (
                <div key={c.id} className="space-y-4">
                  <div className="relative rounded-[1.5rem] overflow-hidden aspect-video shadow-md group-hover:shadow-xl transition-all">
                     <img src={c.thumbnail} alt={c.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                     <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent flex flex-col justify-end p-5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-brand-yellow mb-1">{c.category}</span>
                        <p className="text-white font-black leading-tight text-base tracking-tight">{c.title}</p>
                     </div>
                  </div>
                  <button onClick={() => setActiveTab('ava')} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-green hover:shadow-brand-green/20 hover:shadow-xl transition-all active:scale-95">
                    Continuar Estudos
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Patrimonio e Equipe */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div 
              whileHover={{ y: -5 }} 
              onClick={() => setActiveTab('patrimonio')} 
              className="bg-brand-blue/5 p-6 rounded-[2.5rem] border border-brand-blue/10 shadow-sm flex flex-col items-center justify-center cursor-pointer hover:bg-white hover:shadow-xl hover:shadow-brand-blue/10 transition-all"
            >
               <Box size={24} className="text-brand-blue mb-3" />
               <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-800">Patrimônio</span>
            </motion.div>
            <motion.div 
              whileHover={{ y: -5 }} 
              onClick={() => setActiveTab('agentes')} 
              className="bg-brand-green/5 p-6 rounded-[2.5rem] border border-brand-green/10 shadow-sm flex flex-col items-center justify-center cursor-pointer hover:bg-white hover:shadow-xl hover:shadow-brand-green/10 transition-all"
            >
               <Users size={24} className="text-brand-green mb-3" />
               <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-800">Agentes</span>
            </motion.div>
          </div>

        </div>
      </div>

      {/* CREDENTIALS MODAL */}
      <AnimatePresence>
        {isAcessosModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAcessosModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-brand-yellow/10 text-brand-yellow rounded-[2rem] flex items-center justify-center shadow-lg shadow-brand-yellow/10">
                    <Shield size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Cofre de Acessos</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Senhas e Contas Oficiais</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAcessosModalOpen(false)}
                  className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <CredentialItem 
                  label="E-mail Pascom" 
                  value={DECODE(CREDS.EMAIL)} 
                  password={DECODE(CREDS.PASS_MAIN)} 
                  icon={Mail} 
                />
                <CredentialItem 
                  label="Instagram do Santuário" 
                  value={DECODE(CREDS.IG_USER)} 
                  password={DECODE(CREDS.IG_PASS)} 
                  icon={Instagram} 
                />
              </div>

              <div className="mt-10 p-5 bg-brand-blue/5 rounded-3xl border border-brand-blue/10 flex items-start gap-4">
                <AlertCircle className="text-brand-blue shrink-0" size={18} />
                <p className="text-[10px] font-bold text-brand-blue leading-relaxed uppercase tracking-wider">
                  Mantenha estas informações seguras. Não as compartilhe com pessoas fora da coordenação ou agentes não autorizados.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
