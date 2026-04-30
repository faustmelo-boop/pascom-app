import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { User, UserRole, isCoordinator } from '../types';
import { supabase } from '../supabaseClient';
import { 
  Mail, Phone, Award, ShieldCheck, Loader2, Search, Users, 
  Send, MessageSquare, X, CheckCircle2, Calendar, ChevronRight, 
  Filter, MoreVertical, Star, Info, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AgentsProps {
  users: User[];
  currentUser: User;
  onRefresh: () => void;
}

export const Agents: React.FC<AgentsProps> = ({ users, currentUser, onRefresh }) => {
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<User | null>(null);

  // Message / Notification State
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState<{id: string | null, name: string} | null>(null);
  const [messageForm, setMessageForm] = useState({ title: '', content: '' });
  const [isSending, setIsSending] = useState(false);

  // Helper to fix timezone issue on birthday display
  const formatBirthday = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('pt-BR', {day: 'numeric', month: 'long'});
  };

  const isCurrentUserCoordinator = currentUser && isCoordinator(currentUser.role);

  // Scroll lock when modal is open
  React.useEffect(() => {
    // We target the main scrollable container in App.tsx
    const scrollContainer = document.querySelector('.overflow-y-auto.flex-1');
    
    if (selectedAgent || isMessageModalOpen) {
      if (scrollContainer instanceof HTMLElement) {
        scrollContainer.style.overflow = 'hidden';
      }
      document.body.style.overflow = 'hidden';
    } else {
      if (scrollContainer instanceof HTMLElement) {
        scrollContainer.style.overflow = 'auto';
      }
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      if (scrollContainer instanceof HTMLElement) {
        scrollContainer.style.overflow = 'auto';
      }
      document.body.style.overflow = 'unset';
    };
  }, [selectedAgent, isMessageModalOpen]);

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    if (!confirm(`Tem certeza que deseja promover este membro a ${newRole}?`)) return;
    
    setPromotingId(userId);
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId)
            .select();
        
        if (error) throw error;
        if (!data || data.length === 0) {
            alert("Erro de Permissão: Verifique as RLS policies no Supabase.");
            return;
        }
        
        alert(`Sucesso! Usuário promovido.`);
        onRefresh();
    } catch (err: any) {
        alert("Falha ao promover: " + (err.message || "Erro desconhecido"));
    } finally {
        setPromotingId(null);
    }
  };

  const handleOpenMessageModal = (targetUser?: User) => {
    if (targetUser) {
        setMessageTarget({ id: targetUser.id, name: targetUser.name });
    } else {
        setMessageTarget({ id: null, name: 'Todos os Agentes (Comunicado)' });
    }
    setMessageForm({ title: '', content: '' });
    setIsMessageModalOpen(true);
  };

  const handleSendMessage = async () => {
    if (!messageForm.title.trim() || !messageForm.content.trim()) return;
    setIsSending(true);

    try {
        let notificationsPayload = [];

        if (messageTarget?.id) {
            notificationsPayload.push({
                user_id: messageTarget.id,
                type: 'system',
                title: messageForm.title,
                content: messageForm.content,
                is_read: false
            });
        } else {
            notificationsPayload = users
                .filter(u => u.id !== currentUser.id)
                .map(u => ({
                    user_id: u.id,
                    type: 'system',
                    title: `📢 ${messageForm.title}`, 
                    content: messageForm.content,
                    is_read: false
                }));
        }

        if (notificationsPayload.length > 0) {
            const { error } = await supabase.from('notifications').insert(notificationsPayload);
            if (error) throw error;
            alert('Mensagem enviada com sucesso!');
            setIsMessageModalOpen(false);
        } else {
            alert('Nenhum destinatário encontrado.');
        }

    } catch (e: any) {
        alert(`Erro ao enviar: ${e.message}`);
    } finally {
        setIsSending(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-10 space-y-10 animate-in fade-in duration-1000 pb-32">
      {/* modern Header */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 py-6">
        <div className="animate-in slide-in-from-left-8 duration-700">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-brand-blue rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl shadow-brand-blue/30 rotate-3">
                <Users size={28} />
            </div>
            <p className="text-[10px] font-black text-brand-blue uppercase tracking-[0.3em] bg-brand-blue/10 px-4 py-2 rounded-full border border-brand-blue/10">Equipe Pascom</p>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">Agentes</h1>
          <p className="text-slate-400 font-medium text-lg italic mt-2">Nossa força reside na diversidade de talentos e na unidade de nossa missão.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 animate-in slide-in-from-right-8 duration-700">
            {isCurrentUserCoordinator && (
                <button 
                  onClick={() => handleOpenMessageModal()}
                  className="bg-brand-blue text-white px-8 py-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all shadow-[0_20px_40px_-10px_rgba(59,130,246,0.25)] flex items-center justify-center gap-3 hover:scale-105 active:scale-95 group"
                >
                  <MessageSquare size={18} className="group-hover:rotate-12 transition-transform" /> Comunicado Geral
                </button>
            )}
            <div className="relative group min-w-[280px]">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-blue transition-all" size={20} />
                <input 
                    type="text" 
                    placeholder="Buscar agente..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-14 pr-8 py-4 bg-white rounded-[1.8rem] border border-slate-100 shadow-sm outline-none focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue font-bold text-sm transition-all"
                />
            </div>
        </div>
      </header>

      {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-slate-100 text-center animate-in zoom-in-95 shadow-sm">
              <div className="p-8 bg-slate-50 rounded-[2.5rem] mb-6 text-slate-200 ring-8 ring-slate-50/50">
                <Users size={64} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Nenhum talento encontrado</h3>
              <p className="text-slate-500 font-bold mt-2 max-w-xs mx-auto italic">
                {users.length === 0 
                  ? "O diretório está aguardando os primeiros cadastros." 
                  : "Tente um termo de busca diferente ou menos específico."}
              </p>
          </div>
      ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-10">
            {filteredUsers.map((user, idx) => {
              const userIsCoordinator = isCoordinator(user.role);
              const isMe = user.id === currentUser.id;
              
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={user.id} 
                  onClick={() => setSelectedAgent(user)}
                  className="group relative bg-white p-6 rounded-[2.5rem] border border-slate-100 hover:border-brand-blue/20 transition-all cursor-pointer shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_32px_64px_-12px_rgba(59,130,246,0.1)] flex flex-col items-center text-center overflow-hidden"
                >
                    {/* Decorative Element */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-blue/[0.02] rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
                    
                    <div className="absolute top-6 right-6">
                      {userIsCoordinator ? (
                        <div className="bg-brand-yellow/10 p-1.5 rounded-full text-brand-yellow" title="Coordenador">
                           <Star size={14} fill="currentColor" />
                        </div>
                      ) : (
                        <div className="bg-slate-50 p-1.5 rounded-full text-slate-300">
                           <Info size={14} />
                        </div>
                      )}
                    </div>
                    
                    {/* Avatar with dynamic border */}
                    <div className="relative mb-6">
                      <div className={`w-28 h-28 rounded-[2.5rem] p-1.5 ${userIsCoordinator ? 'bg-gradient-to-tr from-brand-yellow to-amber-500' : 'bg-gradient-to-tr from-brand-blue to-cyan-500'} overflow-hidden group-hover:rotate-6 transition-transform duration-500 shadow-xl relative z-10`}>
                        <img src={user.avatar} alt={user.name} className="w-full h-full rounded-[2.2rem] object-cover ring-2 ring-white/20" />
                      </div>
                      {isMe && (
                        <div className="absolute -bottom-2 -right-2 bg-slate-900 text-white p-2.5 rounded-2xl shadow-xl z-20 ring-4 ring-white">
                          <CheckCircle2 size={16} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-1 mb-6 flex-1">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-brand-blue transition-colors leading-tight mb-1">{user.name}</h3>
                      <p className={`text-[9px] font-black uppercase tracking-[0.15em] py-1 px-3 rounded-full inline-block ${userIsCoordinator ? 'bg-brand-yellow/10 text-brand-yellow' : 'bg-brand-blue/10 text-brand-blue'}`}>
                        {user.role}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-center mb-8 h-[52px] overflow-hidden">
                        {user.skills.slice(0, 3).map((skill, sIdx) => (
                            <span key={`${user.id}-skill-${sIdx}`} className="text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 px-3 py-1.5 rounded-xl border border-slate-100 group-hover:bg-brand-blue/5 group-hover:text-brand-blue group-hover:border-brand-blue/10 transition-all">
                              {skill}
                            </span>
                        ))}
                        {user.skills.length > 3 && (
                            <span className="text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white px-3 py-1.5 rounded-xl">
                              +{user.skills.length - 3}
                            </span>
                        )}
                    </div>

                    <div className="w-full mt-auto">
                        <button className="w-full py-4 bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all flex items-center justify-center gap-2 group/btn">
                           Visualizar <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </motion.div>
              );
            })}
          </div>
      )}

      {/* MODALS WITH FRAMER MOTION - PORTALED TO BODY */}
      {createPortal(
        <AnimatePresence>
          {selectedAgent && (
            <div key="agent-details-modal-root" className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
                <motion.div 
                    key="agent-details-backdrop"
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl"
                    onClick={() => setSelectedAgent(null)}
                />
                <motion.div 
                    key="agent-details-content"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden relative z-[1010] flex flex-col md:flex-row max-h-[90vh] md:max-h-auto"
                >
                    {/* Modal Left / Top Bar */}
                    <div className="w-full md:w-[35%] bg-slate-900 p-8 flex flex-col items-center text-center relative overflow-hidden shrink-0">
                        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                            <svg viewBox="0 0 100 100" className="w-full h-full fill-white">
                                <circle cx="0" cy="0" r="50" />
                            </svg>
                        </div>
                        
                        <button 
                          onClick={() => setSelectedAgent(null)}
                          className="absolute top-4 right-4 md:hidden p-2 text-white/50 hover:text-white"
                        >
                           <X size={20} />
                        </button>

                        <div className="relative mb-6 z-10">
                            <div className="w-32 h-32 md:w-36 md:h-36 rounded-[2.5rem] p-1.5 bg-white/10 backdrop-blur-md shadow-2xl overflow-hidden ring-4 ring-white/10">
                              <img src={selectedAgent.avatar} alt={selectedAgent.name} className="w-full h-full rounded-[2.2rem] object-cover" />
                            </div>
                        </div>

                        <div className="space-y-4 z-10">
                            <h2 className="text-2xl font-black text-white tracking-tight leading-tight">{selectedAgent.name}</h2>
                            <div className="flex flex-col items-center gap-2">
                               <span className="px-4 py-1.5 bg-brand-blue text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-blue/20 ring-4 ring-brand-blue/10 inline-block">
                                  {selectedAgent.role}
                               </span>
                               <p className="text-white/40 text-[9px] font-black uppercase tracking-widest italic">{formatBirthday(selectedAgent.birthday)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Modal Content */}
                    <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-white flex flex-col">
                        <div className="hidden md:flex justify-end mb-8">
                           <button onClick={() => setSelectedAgent(null)} className="p-3 bg-slate-50 text-slate-300 hover:text-slate-900 rounded-2xl transition-all">
                              <X size={20} strokeWidth={3} />
                           </button>
                        </div>

                        <div className="flex-1 space-y-10">
                            <section>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 md:w-10 md:h-10 bg-brand-blue/5 text-brand-blue rounded-xl flex items-center justify-center ring-4 ring-brand-blue/5">
                                        <Award size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Especialidades</h4>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic leading-none mt-0.5">Skill Mapping</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {selectedAgent.skills.length > 0 ? (
                                      selectedAgent.skills.map((skill, sIdx) => (
                                        <span key={`agent-skill-${sIdx}`} className="px-4 py-2.5 bg-slate-50 text-slate-600 text-[10px] font-black rounded-xl border border-slate-100 uppercase tracking-widest flex items-center gap-2">
                                           <div className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                                           {skill}
                                        </span>
                                      ))
                                    ) : (
                                      <p className="text-sm text-slate-400 italic">O agente ainda não definiu suas habilidades principais.</p>
                                    )}
                                </div>
                            </section>

                            {isCurrentUserCoordinator && selectedAgent.id !== currentUser.id && (
                              <section className="bg-slate-50 p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-inner">
                                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                     <Settings size={14} className="text-brand-blue" /> Painel de Comando
                                  </h4>
                                  <div className="space-y-4">
                                      <button 
                                        onClick={() => handleOpenMessageModal(selectedAgent)}
                                        className="w-full flex items-center justify-center gap-3 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-900/10"
                                      >
                                         <Send size={16} /> Enviar Mensagem Direta
                                      </button>
                                      
                                      <div className="flex gap-3">
                                        {!isCoordinator(selectedAgent.role) && (
                                          <button 
                                              onClick={() => handleUpdateRole(selectedAgent.id, UserRole.ADMIN)}
                                              disabled={promotingId === selectedAgent.id}
                                              className="flex-1 py-4 text-brand-yellow bg-white border border-brand-yellow/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-yellow hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"
                                          >
                                              {promotingId === selectedAgent.id ? <Loader2 size={16} className="animate-spin" /> : <Star size={16} fill="currentColor" />}
                                              Tornar Coord.
                                          </button>
                                        )}
                                        {selectedAgent.role !== UserRole.TREASURER && (
                                            <button 
                                                onClick={() => handleUpdateRole(selectedAgent.id, UserRole.TREASURER)}
                                                disabled={promotingId === selectedAgent.id}
                                                className="flex-1 py-4 text-brand-blue bg-white border border-brand-blue/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-blue hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"
                                            >
                                                {promotingId === selectedAgent.id ? <Loader2 size={16} className="animate-spin" /> : <Award size={16} />}
                                                Tornar Tesour.
                                            </button>
                                        )}
                                      </div>
                                  </div>
                              </section>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
          )}

          {isMessageModalOpen && (
              <div key="message-modal-root" className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
                  <motion.div 
                      key="message-modal-backdrop"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
                      onClick={() => setIsMessageModalOpen(false)}
                  />
                  <motion.div 
                      key="message-modal-content"
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 20 }}
                      className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden relative z-[2010]"
                  >
                      <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-900">
                          <div className="space-y-1">
                            <h3 className="text-xl font-black text-white tracking-tight leading-none">
                              {messageTarget?.id ? 'Mensagem Privada' : 'Comunicado Central'}
                            </h3>
                            <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest italic opacity-80 leading-none">
                              Destino: {messageTarget?.name}
                            </p>
                          </div>
                          <button onClick={() => setIsMessageModalOpen(false)} className="p-3 text-white/20 hover:text-white transition-all">
                            <X size={20} strokeWidth={3} />
                          </button>
                      </div>
                      
                      <div className="p-10 space-y-8">
                          <div className="space-y-3">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Assunto Principal</label>
                            <input 
                                type="text"
                                value={messageForm.title}
                                onChange={(e) => setMessageForm({...messageForm, title: e.target.value})}
                                className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.8rem] focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue outline-none placeholder-slate-300 font-bold transition-all text-slate-900"
                                placeholder="Título breve e explicativo..."
                            />
                          </div>
                          
                          <div className="space-y-3">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Conteúdo Detalhado</label>
                            <textarea 
                                value={messageForm.content}
                                onChange={(e) => setMessageForm({...messageForm, content: e.target.value})}
                                className="w-full bg-slate-50 text-slate-900 border border-slate-100 rounded-[2.2rem] p-8 text-sm font-medium focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue outline-none resize-none h-48 transition-all"
                                placeholder="Escreva as diretrizes ou a mensagem..."
                            ></textarea>
                          </div>
                      </div>

                      <div className="px-10 pb-10 flex gap-4">
                          <button 
                              onClick={() => setIsMessageModalOpen(false)}
                              className="flex-1 py-5 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 rounded-[1.5rem] transition-all"
                          >
                              Cancelar
                          </button>
                          <button 
                              onClick={handleSendMessage}
                              disabled={!messageForm.title.trim() || !messageForm.content.trim() || isSending}
                              className="flex-[2] py-5 bg-brand-blue text-white font-black text-[10px] uppercase tracking-widest rounded-[1.5rem] shadow-xl shadow-brand-blue/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                          >
                              {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} strokeWidth={3} />}
                              Enviar Agora
                          </button>
                      </div>
                  </motion.div>
              </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
