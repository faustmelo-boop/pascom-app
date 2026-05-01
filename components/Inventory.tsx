import React, { useState, useRef } from 'react';
import { InventoryItem, User, UserRole } from '../types';
import { supabase } from '../supabaseClient';
import { Box, Plus, Search, Filter, Camera, Trash2, Edit2, X, Save, Loader2, AlertTriangle, CheckCircle2, AlertCircle, Wrench, User as UserIcon } from 'lucide-react';

interface InventoryProps {
  items: InventoryItem[];
  users: User[];
  currentUser: User;
  onRefresh: () => void;
}

export const Inventory: React.FC<InventoryProps> = ({ items, users, currentUser, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    condition: InventoryItem['condition'];
    status: InventoryItem['status'];
    holderId: string;
    image: string | null;
  }>({
    name: '',
    description: '',
    condition: 'Bom',
    status: 'Disponível',
    holderId: '',
    image: null
  });

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Admin Check
  const isAdmin = currentUser && (
    currentUser.role === UserRole.ADMIN || 
    (currentUser.role as string) === 'admin' || 
    (currentUser.role as string) === 'Admin' ||
    (typeof currentUser.role === 'string' && (currentUser.role as string).toLowerCase().includes('coorden'))
  );

  // Handlers
  const handleOpenModal = (item?: InventoryItem) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        name: item.name,
        description: item.description || '',
        condition: item.condition,
        status: item.status,
        holderId: item.holderId || '',
        image: item.image || null
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        condition: 'Bom',
        status: 'Disponível',
        holderId: '',
        image: null
      });
    }
    setSelectedImageFile(null);
    setIsModalOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImageFile(file);
      // Create local preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formData.name) return;
    setLoading(true);

    try {
      let imageUrl = formData.image;

      // Handle Image Upload if a new file is selected
      if (selectedImageFile) {
        const fileExt = selectedImageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('inventory-images') 
          .upload(filePath, selectedImageFile);

        if (uploadError) {
             // Fallback: If bucket missing, warn but continue without image
             // Checks for various Supabase error codes related to missing buckets or resources
             if ((uploadError as any).error === 'Bucket not found' || (uploadError as any).statusCode === '404' || (uploadError as any).message?.includes('not found')) {
                 alert("Aviso: O bucket 'inventory-images' não existe no Supabase.\nO item será salvo sem a foto.\n\nPara habilitar fotos: Crie um bucket público chamado 'inventory-images' no Storage do Supabase.");
                 imageUrl = null; // Proceed with saving item, just without the image URL
             } else {
                 throw uploadError; // Stop execution for other errors
             }
        } else {
            const { data: urlData } = supabase.storage.from('inventory-images').getPublicUrl(filePath);
            imageUrl = urlData.publicUrl;
        }
      }

      // If imageUrl is still the base64 preview (upload failed or skipped), clear it so we don't save huge strings to DB
      if (imageUrl && imageUrl.startsWith('data:')) {
          imageUrl = null;
      }

      const payload = {
        name: formData.name,
        description: formData.description,
        condition: formData.condition,
        status: formData.status,
        holder_id: formData.holderId || null,
        image: imageUrl
      };

      if (editingId) {
        const { error } = await supabase.from('inventory').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('inventory').insert([payload]);
        if (error) throw error;
      }

      onRefresh();
      setIsModalOpen(false);
    } catch (error: any) {
      alert(`Erro ao salvar item: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('inventory').delete().eq('id', deleteId);
      if (error) throw error;
      onRefresh();
      setDeleteId(null);
    } catch (error: any) {
      alert(`Erro ao excluir: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper for status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Disponível': return 'bg-brand-green/10 text-brand-green border-brand-green/20';
      case 'Em Uso': return 'bg-brand-blue/10 text-brand-blue border-brand-blue/10';
      case 'Em Manutenção': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getConditionIcon = (condition: string) => {
    switch(condition) {
        case 'Novo': return <CheckCircle2 size={14} className="text-brand-green" />;
        case 'Bom': return <CheckCircle2 size={14} className="text-brand-blue" />;
        case 'Regular': return <AlertCircle size={14} className="text-brand-yellow" />;
        case 'Ruim': return <AlertTriangle size={14} className="text-orange-500" />;
        case 'Danificado': return <Wrench size={14} className="text-red-500" />;
        default: return null;
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'Todos' || item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">Zelo pelo Patrimônio</h1>
          <p className="text-slate-500 font-medium text-lg italic">Cuidando dos bens que servem à nossa missão evangelizadora.</p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => handleOpenModal()}
            className="bg-brand-blue text-white px-6 py-3.5 rounded-3xl font-extrabold transition-all shadow-xl shadow-brand-blue/10 flex items-center gap-2 hover:opacity-90 active:scale-95"
          >
            <Plus size={20} /> Novo Item
          </button>
        )}
      </header>

      {/* Filters & Search */}
      <div className="flex flex-col xl:flex-row gap-6 items-center bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex-1 w-full relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-blue transition-colors" size={20} />
            <input 
                type="text" 
                placeholder="O que você está procurando?" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white text-slate-900 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue outline-none placeholder-slate-400 font-medium transition-all shadow-sm"
            />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 xl:pb-0 hide-scroll w-full xl:w-auto">
            <Filter size={20} className="text-slate-400 shrink-0 mr-2" />
            {['Todos', 'Disponível', 'Em Uso', 'Em Manutenção'].map(status => (
                <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${
                        filterStatus === status 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105' 
                        : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    {status}
                </button>
            ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
        {filteredItems.map(item => {
            const holder = users.find(u => u.id === item.holderId);
            const statusColor = getStatusColor(item.status);
            
            return (
                <div key={item.id} className="bento-card border-slate-100 bg-white flex flex-col group overflow-hidden shadow-sm hover:border-brand-blue/20 transition-all cursor-default">
                    {/* Image Area - Aspect ratio fixed */}
                    <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden rounded-[2rem] mb-6">
                        {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-200">
                                <Box size={64} strokeWidth={1.5} />
                            </div>
                        )}
                        
                        <div className={`absolute top-4 left-4 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md border backdrop-blur-md ${statusColor}`}>
                            {item.status}
                        </div>

                        {/* Admin Actions Overlay */}
                        {isAdmin && (
                            <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                <button onClick={() => handleOpenModal(item)} className="p-3 bg-white/90 backdrop-blur-sm rounded-2xl text-slate-700 hover:text-brand-blue shadow-xl transition-all hover:scale-110 active:scale-95">
                                    <Edit2 size={18} />
                                </button>
                                <button onClick={() => setDeleteId(item.id)} className="p-3 bg-white/90 backdrop-blur-sm rounded-2xl text-slate-700 hover:text-rose-600 shadow-xl transition-all hover:scale-110 active:scale-95">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight group-hover:text-brand-blue transition-colors">{item.name}</h3>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-4">
                             <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                {getConditionIcon(item.condition)}
                                <span>{item.condition}</span>
                             </div>
                        </div>

                        <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6 line-clamp-2">
                          {item.description || 'Nenhuma especificação técnica disponível para este equipamento.'}
                        </p>

                        <div className="mt-auto pt-6 border-t border-slate-50">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Aos Cuidados de</p>
                            <div className="flex items-center gap-3 bg-slate-50/50 p-2 rounded-2xl border border-slate-100/50 ring-4 ring-transparent group-hover:ring-slate-50 transition-all">
                                {holder ? (
                                    <>
                                        <div className="relative">
                                          <img src={holder.avatar} alt={holder.name} className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-sm" />
                                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-brand-green rounded-full border-2 border-white"></div>
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-sm font-extrabold text-slate-800 leading-none mb-1">{holder.name}</span>
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Membro Pascom</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-inner">
                                            <UserIcon size={18} className="opacity-40" />
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-sm font-extrabold text-slate-300 italic leading-none mb-1">Armazenado</span>
                                          <span className="text-[10px] font-bold text-slate-200 uppercase tracking-tighter">Sede Paroquial</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )
        })}
      </div>

      {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center p-20 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200 text-center animate-in zoom-in-95">
              <div className="p-6 bg-white rounded-3xl shadow-sm mb-6 text-slate-200">
                <Box size={64} strokeWidth={1} />
              </div>
              <p className="text-xl font-extrabold text-slate-900 tracking-tight">Nenhum equipamento encontrado</p>
              <p className="text-slate-500 font-medium mt-2">Tente buscar por termos mais genéricos ou mude os filtros.</p>
          </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-800">{editingId ? 'Editar Item' : 'Novo Equipamento'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {/* Image Upload */}
                <div className="flex flex-col items-center justify-center mb-4">
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-48 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors overflow-hidden relative group"
                    >
                        {formData.image ? (
                            <>
                                <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="text-white" size={32} />
                                </div>
                            </>
                        ) : (
                            <>
                                <Camera className="text-gray-400 mb-2" size={32} />
                                <span className="text-sm text-gray-500 font-medium">Adicionar Foto</span>
                            </>
                        )}
                    </div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleImageSelect}
                    />
                </div>

                {/* Fields */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Equipamento</label>
                    <input 
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue outline-none placeholder-gray-500"
                        placeholder="Ex: Câmera Canon T7i"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                    <textarea 
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue outline-none resize-none placeholder-gray-500"
                        placeholder="Detalhes, número de série, acessórios inclusos..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Estado de Conservação</label>
                        <select 
                            value={formData.condition}
                            onChange={(e) => setFormData({...formData, condition: e.target.value as any})}
                            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue outline-none"
                        >
                            {['Novo', 'Bom', 'Regular', 'Ruim', 'Danificado'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status Atual</label>
                        <select 
                            value={formData.status}
                            onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue outline-none"
                        >
                            {['Disponível', 'Em Uso', 'Em Manutenção'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quem está cuidando deste bem?</label>
                    <select 
                        value={formData.holderId}
                        onChange={(e) => setFormData({...formData, holderId: e.target.value})}
                        className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue outline-none"
                    >
                        <option value="">-- Guardado (Na Sede) --</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end rounded-b-2xl">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-2 bg-brand-blue text-white font-medium rounded-lg hover:opacity-90 transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full text-center">
                  <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Item?</h3>
                  <p className="text-sm text-gray-600 mb-6">Esta ação não pode ser desfeita. O histórico deste equipamento será perdido.</p>
                  
                  <div className="flex gap-3">
                      <button 
                        onClick={() => setDeleteId(null)} 
                        className="flex-1 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                        disabled={loading}
                      >
                          Cancelar
                      </button>
                      <button 
                        onClick={handleDelete}
                        disabled={loading}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
                      >
                          {loading && <Loader2 size={16} className="animate-spin" />}
                          Excluir
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};