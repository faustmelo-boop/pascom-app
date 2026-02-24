import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User, isCoordinator } from '../types';
import { 
  ClipboardList, Search, Trash2, Loader2, 
  Eye, X, Mail, Phone, Database
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
    <div className="max-w-6xl mx-auto p-4 pb-24 lg:pb-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Database className="text-blue-600" size={24} /> Cadastros Externos
          </h2>
          <p className="text-sm text-slate-500 font-medium">Repositório de informações da tabela kv_store_dd37b18a</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar registros..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 pl-10 bg-white border border-slate-300 rounded-xl w-full focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm shadow-sm"
            />
          </div>
          <button 
            onClick={fetchRegistrations}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 shadow-sm transition-all active:scale-95"
            title="Atualizar"
          >
            <Loader2 size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading && data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
          <p className="text-slate-500 animate-pulse font-medium">Consultando banco de dados...</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
          <ClipboardList className="mx-auto text-slate-200 mb-4" size={64} />
          <h3 className="text-lg font-medium text-slate-700">Nenhum registro encontrado</h3>
          <p className="text-slate-500 text-sm mt-1">Os dados da tabela kv_store aparecerão aqui.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identificador (Key)</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome / Identificação</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contato</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        {item.id.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">
                        {item.nome || item.name || item.Nome || item.titulo || "Sem Nome"}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5">
                        {item.assunto || item.observacao || item.data || ""}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {item.email && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Mail size={12} className="text-slate-400" /> {item.email}
                          </div>
                        )}
                        {(item.whatsapp || item.telefone || item.celular) && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Phone size={12} className="text-slate-400" /> {item.whatsapp || item.telefone || item.celular}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setSelectedItem(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver todos os campos"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          {deletingId === item.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
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

      {/* MODAL DE DETALHES (Exibe todo o JSONB) */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-white/20">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                  <Database size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Detalhes do Registro</h3>
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">Key: {selectedItem.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedItem(null)} 
                className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full shadow-sm border border-slate-100 transition-all hover:rotate-90"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(selectedItem).map(([key, value]) => {
                  if (key.startsWith('_') || key === 'id') return null;
                  
                  return (
                    <div key={key} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-hover hover:border-blue-100 group">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1 group-hover:text-blue-500 transition-colors">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <div className="text-sm text-slate-800 break-words font-semibold">
                        {typeof value === 'object' ? (
                          <pre className="text-[10px] bg-white p-2 rounded mt-1 overflow-x-auto border border-slate-100">
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

            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => handleDelete(selectedItem.id)}
                className="px-5 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
              >
                <Trash2 size={16} /> Excluir Registro
              </button>
              <button 
                onClick={() => setSelectedItem(null)}
                className="ml-auto px-8 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};