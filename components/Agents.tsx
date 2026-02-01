import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../supabaseClient';
import { Mail, Phone, Award, ShieldCheck, Loader2, Search, Users, Send, MessageSquare, X } from 'lucide-react';

interface AgentsProps {
  users: User[];
  currentUser: User;
  onRefresh: () => void;
}

export const Agents: React.FC<AgentsProps> = ({ users, currentUser, onRefresh }) => {
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const isCurrentUserAdmin = currentUser && (
    currentUser.role === UserRole.ADMIN || 
    (currentUser.role as string) === 'admin' || 
    (currentUser.role as string) === 'Admin' ||
    (typeof currentUser.role === 'string' && (currentUser.role as string).toLowerCase().includes('coorden'))
  );

  const handlePromote = async (userId: string) => {
    if (!confirm("Tem certeza que deseja promover este membro a Coordenador?")) return;
    
    setPromotingId(userId);
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ role: UserRole.ADMIN })
            .eq('id', userId);
        
        if (error) throw error;
        
        // Notify the user about promotion (Safe Block)
        try {
            await supabase.from('notifications').insert({
                user_id: userId,
                type: 'system',
                title: 'Parabéns!',
                content: `Você foi promovido a ${UserRole.ADMIN}.`
            });
        } catch (notifyError) {
            console.warn("Falha ao enviar notificação de promoção:", notifyError);
        }

        onRefresh();
    } catch (err: any) {
        alert("Erro ao promover usuário: " + err.message);
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
            // Single User Message
            notificationsPayload.push({
                user_id: messageTarget.id,
                type: 'system',
                title: messageForm.title,
                content: messageForm.content,
                is_read: false
            });
        } else {
            // Broadcast Message (All users except self)
            notificationsPayload = users
                .filter(u => u.id !== currentUser.id)
                .map(u => ({
                    user_id: u.id,
                    type: 'system',
                    title: `📢 ${messageForm.title}`, // Add megaphone icon for broadcasts
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
        console.error("Erro ao enviar mensagem:", e);
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
    <div className="max-w-6xl mx-auto p-4 pb-24 lg:pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Diretório de Agentes</h2>
            <p className="text-sm text-gray-500">Conheça nossa equipe e suas habilidades</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {isCurrentUserAdmin && (
                <button 
                    onClick={() => handleOpenMessageModal()}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                    <MessageSquare size={18} /> Enviar Comunicado
                </button>
            )}
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar por nome ou habilidade..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 pl-10 bg-white text-gray-900 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none placeholder-gray-500"
                />
            </div>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
              <Users className="mx-auto text-gray-300 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-700">Nenhum agente encontrado</h3>
              <p className="text-gray-500 text-sm mt-1">
                  {users.length === 0 
                    ? "Ainda não há usuários cadastrados na plataforma." 
                    : "Nenhum resultado corresponde à sua busca."}
              </p>
          </div>
      ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredUsers.map((user) => {
              const isCoordinator = user.role === UserRole.ADMIN || (user.role as string) === 'Coordenador';
              const isMe = user.id === currentUser.id;
              
              return (
                <div key={user.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center text-center relative hover:border-blue-300 transition-colors group">
                    <span className={`absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isCoordinator ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-600'
                    }`}>
                        {user.role}
                    </span>
                    
                    <img src={user.avatar} alt={user.name} className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-gray-50 group-hover:scale-105 transition-transform" />
                    
                    <h3 className="font-bold text-gray-900 text-lg">{user.name}</h3>
                    <p className="text-sm text-gray-500 mb-4 h-5">{formatBirthday(user.birthday)}</p>
                    
                    <div className="flex flex-wrap gap-1 justify-center mb-6 min-h-[2rem]">
                        {user.skills.slice(0, 3).map(skill => (
                            <span key={skill} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{skill}</span>
                        ))}
                        {user.skills.length > 3 && (
                            <span className="text-xs bg-gray-50 text-gray-400 px-2 py-1 rounded">+{user.skills.length - 3}</span>
                        )}
                    </div>

                    <div className="flex gap-2 w-full mt-auto mb-2">
                        {isCurrentUserAdmin && !isMe ? (
                            <button 
                                onClick={() => handleOpenMessageModal(user)}
                                className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                <Send size={16} /> Mensagem
                            </button>
                        ) : (
                            // Placeholder buttons for non-admin view or self
                            <button className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 hover:text-blue-600 transition-colors cursor-not-allowed opacity-70">
                                <Mail size={16} /> Contato
                            </button>
                        )}
                    </div>

                    {/* Admin Promotion Action */}
                    {isCurrentUserAdmin && !isCoordinator && !isMe && (
                        <button 
                            onClick={() => handlePromote(user.id)}
                            disabled={promotingId === user.id}
                            className="w-full mt-2 py-2 text-xs font-bold text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                        >
                            {promotingId === user.id ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                            Promover a Coordenador
                        </button>
                    )}
                </div>
              );
            })}
          </div>
      )}

      {/* MESSAGE MODAL */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Send size={18} className="text-blue-600" /> 
                        {messageTarget?.id ? 'Enviar Mensagem' : 'Novo Comunicado'}
                    </h3>
                    <button onClick={() => setIsMessageModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <span className="text-xs font-bold text-blue-500 uppercase block mb-1">Destinatário</span>
                        <p className="text-sm font-medium text-blue-900">{messageTarget?.name}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Assunto</label>
                        <input 
                            type="text" 
                            value={messageForm.title}
                            onChange={(e) => setMessageForm({...messageForm, title: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                            placeholder="Ex: Reunião Extraordinária"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
                        <textarea 
                            value={messageForm.content}
                            onChange={(e) => setMessageForm({...messageForm, content: e.target.value})}
                            rows={5}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                            placeholder="Digite sua mensagem aqui..."
                        />
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button 
                        onClick={() => setIsMessageModalOpen(false)} 
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSendMessage}
                        disabled={isSending || !messageForm.title.trim() || !messageForm.content.trim()}
                        className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSending && <Loader2 size={16} className="animate-spin" />}
                        Enviar
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};