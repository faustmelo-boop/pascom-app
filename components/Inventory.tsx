import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

  // Scroll lock when modal is open
  useEffect(() => {
    const scrollContainer = document.querySelector('.overflow-y-auto.flex-1');
    const isAnyModalOpen = isModalOpen || deleteId;
    
    if (isAnyModalOpen) {
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
  }, [isModalOpen, deleteId]);

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
    <div className="max-w-7xl mx-auto px-4 pt-1 md:p-8 space-y-8 animate-in fade-in duration-700">
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

      {/* PORTALED MODALS */}
      {createPortal(
        <AnimatePresence>
          {/* Create/Edit Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl"
                onClick={() => setIsModalOpen(false)}
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 30 }}
                className="bg-white rounded-[3rem] w-full max-w-xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] flex flex-col max-h-[90vh] overflow-hidden relative z-[1010]"
              >
                <div className="px-10 py-10 border-b border-slate-50 flex justify-between items-center bg-slate-900 relative group/header">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/10 shadow-lg group-hover/header:rotate-12 duration-500">
                      <Box size={32} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-white tracking-tighter leading-none mb-1">{editingId ? 'Editar Item' : 'Novo Equipamento'}</h3>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Zelo pelo Patrimônio</p>
                    </div>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-4 bg-white/10 text-white/50 hover:text-white rounded-[1.5rem] border border-white/5 backdrop-blur-md transition-all active:scale-90 relative z-10">
                    <X size={24} strokeWidth={3} />
                  </button>
                </div>
                
                <div className="p-10 overflow-y-auto flex-1 space-y-10 hide-scroll">
                    {/* Image Upload */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificação Visual</label>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-64 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 hover:border-brand-blue/30 transition-all overflow-hidden relative group shadow-inner"
                        >
                            {formData.image ? (
                                <>
                                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                        <div className="p-5 bg-white rounded-2xl shadow-xl scale-90 group-hover:scale-100 transition-transform">
                                            <Camera className="text-brand-blue" size={32} />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center space-y-4">
                                    <div className="p-6 bg-white rounded-3xl shadow-sm mx-auto w-fit text-slate-300 group-hover:text-brand-blue transition-colors group-hover:scale-110 duration-500">
                                        <Camera size={40} strokeWidth={1.5} />
                                    </div>
                                    <p className="text-sm text-slate-400 font-bold italic">Toque para selecionar imagem</p>
                                </div>
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
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Equipamento</label>
                          <input 
                              type="text" 
                              value={formData.name}
                              onChange={(e) => setFormData({...formData, name: e.target.value})}
                              className="w-full bg-slate-50 border border-slate-200 px-6 py-5 rounded-[1.5rem] font-bold text-sm focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue outline-none transition-all"
                              placeholder="Ex: Câmera Canon T7i"
                          />
                      </div>

                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição / Especificações</label>
                          <textarea 
                              value={formData.description}
                              onChange={(e) => setFormData({...formData, description: e.target.value})}
                              rows={4}
                              className="w-full bg-slate-50 border border-slate-200 px-6 py-5 rounded-[1.5rem] font-bold text-sm focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue outline-none resize-none transition-all"
                              placeholder="Detalhes técnicos, número de série..."
                          />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                          <div className="space-y-4">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado de Conservação</label>
                              <select 
                                  value={formData.condition}
                                  onChange={(e) => setFormData({...formData, condition: e.target.value as any})}
                                  className="w-full bg-slate-50 border border-slate-200 px-6 py-5 rounded-[1.5rem] font-bold text-sm focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue outline-none transition-all appearance-none cursor-pointer"
                              >
                                  {['Novo', 'Bom', 'Regular', 'Ruim', 'Danificado'].map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                          </div>
                          <div className="space-y-4">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status Operacional</label>
                              <select 
                                  value={formData.status}
                                  onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                                  className="w-full bg-slate-50 border border-slate-200 px-6 py-5 rounded-[1.5rem] font-bold text-sm focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue outline-none transition-all appearance-none cursor-pointer"
                              >
                                  {['Disponível', 'Em Uso', 'Em Manutenção'].map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Custódia do Bem</label>
                          <select 
                              value={formData.holderId}
                              onChange={(e) => setFormData({...formData, holderId: e.target.value})}
                              className="w-full bg-slate-50 border border-slate-200 px-6 py-5 rounded-[1.5rem] font-bold text-sm focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue outline-none transition-all appearance-none cursor-pointer"
                          >
                              <option value="">-- Guardado (Na Sede) --</option>
                              {users.map(u => (
                                  <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                          </select>
                      </div>
                    </div>
                </div>

                <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center rounded-b-[3rem]">
                   <div className="w-full sm:w-auto">
                     {editingId && (
                        <button 
                          onClick={() => setDeleteId(editingId)}
                          className="w-full sm:w-auto px-6 py-4 bg-white text-rose-500 border border-rose-100 hover:bg-rose-50 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
                        >
                          <Trash2 size={16} /> Excluir
                        </button>
                     )}
                   </div>
                   <div className="flex gap-4 w-full sm:w-auto">
                      <button 
                        onClick={() => setIsModalOpen(false)}
                        className="flex-1 sm:flex-none px-8 py-5 text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest transition-all"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 sm:flex-none bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-brand-blue hover:scale-105 active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-3"
                      >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Salvar Item
                      </button>
                   </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteId && (
              <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
                    onClick={() => setDeleteId(null)}
                  />
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-sm w-full text-center relative z-[2010] border border-slate-100"
                  >
                      <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2.2rem] flex items-center justify-center mx-auto mb-8 ring-8 ring-rose-50/50 shadow-inner">
                          <Trash2 size={32} strokeWidth={2.5} />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Excluir Item?</h3>
                      <p className="text-sm text-slate-400 font-bold mb-10 italic leading-relaxed">Esta ação não pode ser desfeita. O histórico deste equipamento será perdido no servidor.</p>
                      
                      <div className="flex flex-col gap-3">
                          <button 
                            onClick={handleDelete}
                            disabled={loading}
                            className="w-full py-5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-rose-500/20 flex items-center justify-center gap-3 active:scale-95"
                          >
                              {loading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                              Confirmar Exclusão
                          </button>
                          <button 
                            onClick={() => setDeleteId(null)} 
                            className="w-full py-5 text-slate-400 hover:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-slate-50"
                            disabled={loading}
                          >
                              Cancelar Operação
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