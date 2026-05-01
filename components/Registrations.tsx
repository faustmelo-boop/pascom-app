import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { User, isCoordinator } from '../types';
import { 
  ClipboardList, Search, Trash2, Loader2, 
  Eye, X, Mail, Phone, Database, Save, Loader2 as Spinner
} from 'lucide-react';

interface RegistrationsProps {
  currentUser: User;
}

export const Registrations: React.FC<RegistrationsProps> = ({ currentUser }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Scroll lock when modal is open
  useEffect(() => {
    const scrollContainer = document.querySelector('.overflow-y-auto.flex-1');
    if (selectedItem) {
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
  }, [selectedItem]);

  // Verificação de Coordenador/Admin
  const isAdmin = currentUser && isCoordinator(currentUser.role);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      // Busca na tabela kv_store fornecida pelo usuário
      const { data: kvData, error } = await supabase
        .from('kv_store_dd37b18a')
        .select('*');

      if (error) throw error;

      // Mapeia os dados transformando o JSONB 'value' no corpo principal do objeto
      // e mantendo a 'key' como ID.
      const mapped = (kvData || []).map(item => ({
        id: item.key,
        ...item.value,
        _raw_key: item.key // Guarda a chave original para deleção
      }));

      setData(mapped);
    } catch (err: any) {
      console.error("Erro ao buscar cadastros no KV Store:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este registro permanente?")) return;
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('kv_store_dd37b18a')
        .delete()
        .eq('key', id);

      if (error) throw error;
      
      setData(prev => prev.filter(item => item.id !== id));
      if (selectedItem?.id === id) setSelectedItem(null);
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredData = data.filter(item => {
    const searchStr = JSON.stringify(item).toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <X size={48} className="mb-4 text-red-400" />
        <p className="font-bold text-lg">Acesso Restrito</p>
        <p className="text-sm">Apenas coordenadores podem gerenciar cadastros externos.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-1 md:p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 py-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">Inscrições e Participantes</h1>
          <p className="text-slate-500 font-medium text-lg italic">Acompanhamento de novos membros e participantes de eventos.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group min-w-[280px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-blue transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Pesquisar registros..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white text-slate-900 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue outline-none placeholder-slate-400 font-medium transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={fetchRegistrations}
            className="p-3.5 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 text-slate-600 shadow-xl shadow-slate-100/50 transition-all active:scale-95 group"
            title="Atualizar"
          >
            <Loader2 size={24} className={`${loading ? "animate-spin text-brand-blue" : "group-hover:rotate-180 transition-transform duration-500"}`} />
          </button>
        </div>
      </header>

      {loading && data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-80 bg-white rounded-[3rem] border border-slate-100 shadow-sm animate-in zoom-in-95">
          <div className="relative mb-6">
            <div className="w-16 h-16 bg-brand-blue/10 rounded-2xl animate-spin duration-[3s]"></div>
            <Loader2 size={32} className="absolute inset-0 m-auto animate-spin text-brand-blue" />
          </div>
          <p className="text-slate-500 font-extrabold uppercase tracking-widest text-xs animate-pulse">Sincronizando registros...</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 bg-slate-50/50 rounded-[3.5rem] border-2 border-dashed border-slate-200 text-center animate-in zoom-in-95">
          <div className="p-6 bg-white rounded-3xl shadow-sm mb-6 text-slate-200">
            <ClipboardList size={64} strokeWidth={1} />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Nenhum registro encontrado</h3>
          <p className="text-slate-500 font-medium mt-2">Os dados da tabela kv_store aparecerão aqui assim que disponíveis.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] shadow-xl shadow-slate-100/50 border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-8 duration-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Key</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identificação</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contato</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-brand-blue/5 transition-all group">
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className="text-[10px] font-black font-mono text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                        {item.id.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="font-extrabold text-slate-800 text-base leading-tight">
                        {item.nome || item.name || item.Nome || item.titulo || "Sem Nome"}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1 opacity-60">
                        {item.assunto || item.observacao || item.data || "Nenhuma observação"}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1.5">
                        {item.email && (
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            <div className="p-1 bg-slate-100 rounded-md"><Mail size={12} className="text-slate-400" /></div>
                            {item.email}
                          </div>
                        )}
                        {(item.whatsapp || item.telefone || item.celular) && (
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            <div className="p-1 bg-slate-100 rounded-md"><Phone size={12} className="text-slate-400" /></div>
                            {item.whatsapp || item.telefone || item.celular}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                        <button 
                          onClick={() => setSelectedItem(item)}
                          className="p-3 bg-white border border-slate-100 shadow-sm text-brand-blue hover:bg-brand-blue hover:text-white rounded-2xl transition-all active:scale-90"
                          title="Ver Detalhes"
                        >
                          <Eye size={20} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="p-3 bg-white border border-slate-100 shadow-sm text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl transition-all active:scale-90"
                          title="Excluir"
                        >
                          {deletingId === item.id ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES (Bento Style) - PORTALED */}
      {createPortal(
        <AnimatePresence>
          {selectedItem && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl"
                onClick={() => setSelectedItem(null)}
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 30 }}
                className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative z-[1010]"
              >
                <div className="px-10 py-10 border-b border-slate-50 flex justify-between items-center bg-slate-900 relative group/reg">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/10 shadow-lg group-hover/reg:rotate-12 duration-500">
                      <Database size={32} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-white tracking-tighter leading-none mb-1">Ficha do Participante</h3>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">ID: {selectedItem.id.slice(0, 12)}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedItem(null)} className="p-4 bg-white/10 text-white/50 hover:text-white rounded-[1.5rem] border border-white/5 backdrop-blur-md transition-all active:scale-90 relative z-10">
                    <X size={24} strokeWidth={3} />
                  </button>
                </div>
                
                <div className="p-10 overflow-y-auto flex-1 hide-scroll">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {Object.entries(selectedItem).map(([key, value]) => {
                      if (key.startsWith('_') || key === 'id') return null;
                      
                      return (
                        <div key={key} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 transition-all hover:bg-white hover:border-brand-blue/20 hover:shadow-xl hover:shadow-slate-100/50 group/item">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2 group-hover/item:text-brand-blue transition-colors">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <div className="text-base text-slate-800 break-words font-black leading-tight">
                            {typeof value === 'object' ? (
                              <pre className="text-[11px] bg-slate-900 text-slate-300 p-5 rounded-[1.5rem] mt-3 overflow-x-auto border-2 border-slate-800 font-mono shadow-inner">
                                {JSON.stringify(value, null, 2)}
                              </pre>
                            ) : (
                              String(value || "---")
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center rounded-b-[3rem]">
                  <button 
                    onClick={() => handleDelete(selectedItem.id)}
                    className="w-full sm:w-auto px-6 py-4 text-rose-500 font-black uppercase tracking-widest hover:bg-rose-50 rounded-2xl text-[10px] transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} /> Remover Inscrição Permanente
                  </button>
                  <button 
                    onClick={() => setSelectedItem(null)}
                    className="w-full sm:w-auto bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-slate-100/50 hover:bg-brand-blue hover:scale-105 active:scale-95 transition-all"
                  >
                    Encerrar Visualização
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