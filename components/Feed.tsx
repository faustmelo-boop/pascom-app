import React, { useState, useRef } from 'react';
import { Post, User, UserRole } from '../types';
import { supabase } from '../supabaseClient';
import { Plus, Trash2, Loader2, X, Image as ImageIcon, BarChart2, Megaphone, HeartHandshake, BookOpen, Camera, Send, AlertTriangle, Bold, Italic, Strikethrough, List, MoreVertical, Smile } from 'lucide-react';

interface FeedProps {
  posts: Post[];
  users: User[];
  currentUser: User;
  onRefresh: () => void;
}

// --- Helper: Render Markdown-like Text ---
const renderStyledText = (text: string) => {
  if (!text) return null;

  const lines = text.split('\n');
  
  // Helper to process inline styles
  const formatInline = (str: string, keyPrefix: string) => {
    // Split by markers: **bold**, *italic*, ~~strike~~
    // Regex splits and captures delimiters to allow mapping
    const parts = str.split(/(\*\*.*?\*\*|\*.*?\*|~~.*?~~)/g);

    return parts.map((part, index) => {
      const key = `${keyPrefix}-${index}`;
      
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return <strong key={key} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
        return <em key={key} className="italic text-slate-800">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
        return <s key={key} className="text-slate-400 line-through">{part.slice(2, -2)}</s>;
      }
      return <span key={key}>{part}</span>;
    });
  };

  return lines.map((line, i) => {
    // Handle Lists
    if (line.trim().startsWith('- ')) {
      return (
        <div key={i} className="flex items-start gap-2 ml-1 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0"></span>
          <p className="text-slate-700 leading-relaxed">{formatInline(line.substring(2), `line-${i}`)}</p>
        </div>
      );
    }
    // Handle Empty Lines (Paragraph breaks)
    if (line.trim() === '') {
      return <div key={i} className="h-3"></div>;
    }
    // Normal Paragraph
    return (
      <p key={i} className="text-slate-700 mb-1 leading-relaxed whitespace-pre-wrap">
        {formatInline(line, `line-${i}`)}
      </p>
    );
  });
};

// Separate component to handle Post logic cleanly
const PostCard: React.FC<{ 
    post: Post; 
    users: User[]; 
    currentUser: User; 
    onRefresh: () => void;
    onRequestDelete: (post: Post) => void; 
}> = ({ post, users, currentUser, onRefresh, onRequestDelete }) => {
  const author = users.find((u) => u.id === post.authorId);
  const [voteLoading, setVoteLoading] = useState(false);
  
  // Robust Admin Check
  const isAdmin = currentUser && (
    currentUser.role === UserRole.ADMIN || 
    (currentUser.role as string) === 'admin' || 
    (currentUser.role as string) === 'Admin' ||
    (typeof currentUser.role === 'string' && (currentUser.role as string).toLowerCase().includes('coorden'))
  );

  const isAuthor = post.authorId === currentUser.id;
  const canDelete = isAuthor || isAdmin;
  
  const handleVote = async (optionId: string) => {
    if (!post.pollOptions || voteLoading) return;
    setVoteLoading(true);

    try {
      const newOptions = post.pollOptions.map(opt => 
        opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
      );

      const { error } = await supabase
        .from('posts')
        .update({ poll_options: newOptions })
        .eq('id', post.id);

      if (error) throw error;
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setVoteLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-5 animate-fade-in hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img
            src={author?.avatar || 'https://via.placeholder.com/40'}
            alt={author?.name}
            className="w-10 h-10 rounded-full object-cover border border-slate-100 shadow-sm"
          />
          <div>
            <h3 className="font-bold text-slate-900 text-sm">{author?.name || 'Desconhecido'}</h3>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>{post.timestamp}</span>
              <span className="w-0.5 h-0.5 bg-slate-400 rounded-full"></span>
              <span className={`uppercase tracking-wider font-bold text-[10px] px-1.5 py-0.5 rounded ${
                post.type === 'aviso' ? 'bg-red-50 text-red-600' :
                post.type === 'enquete' ? 'bg-purple-50 text-purple-600' :
                'bg-blue-50 text-blue-600'
              }`}>
                {post.type}
              </span>
            </div>
          </div>
        </div>
        
        {canDelete && (
            <button 
                onClick={() => onRequestDelete(post)} 
                className="text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg p-2 transition-all"
                title="Excluir publicação"
            >
                <Trash2 size={16} />
            </button>
        )}
      </div>

      {/* Content with Rich Text Rendering */}
      <div className="mb-4 text-sm sm:text-base">
        {renderStyledText(post.content)}
      </div>

      {post.image && (
        <div className="mb-4 rounded-xl overflow-hidden border border-slate-100 shadow-sm">
             <img src={post.image} alt="Post content" className="w-full max-h-[500px] object-cover" />
        </div>
      )}

      {/* Poll Logic */}
      {post.type === 'enquete' && post.pollOptions && (
        <div className="space-y-3 mb-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
          {post.pollOptions.map((opt) => {
            const totalVotes = post.pollOptions!.reduce((acc, curr) => acc + curr.votes, 0);
            const percent = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
            return (
              <div key={opt.id} onClick={() => handleVote(opt.id)} className="relative group cursor-pointer">
                <div className="absolute top-0 left-0 h-full bg-blue-100/50 rounded-lg transition-all duration-700 ease-out" style={{ width: `${percent}%` }}></div>
                <div className="relative p-3 border border-blue-100 rounded-lg flex justify-between items-center z-10 hover:border-blue-300 transition-colors bg-white/50 backdrop-blur-[1px]">
                  <span className="text-sm font-medium text-slate-700">{opt.text}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600">{percent}%</span>
                    <span className="text-xs text-slate-400">({opt.votes})</span>
                  </div>
                </div>
              </div>
            );
          })}
          <p className="text-xs text-right text-slate-400 font-medium mt-1">Total de votos: {post.pollOptions.reduce((acc, c) => acc + c.votes, 0)}</p>
        </div>
      )}
    </div>
  );
};

export const Feed: React.FC<FeedProps> = ({ posts, users, currentUser, onRefresh }) => {
  // New Post State
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostType, setNewPostType] = useState<'aviso' | 'pedido' | 'cobertura' | 'enquete' | 'formacao'>('aviso');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Todos');

  // Delete State
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Image Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null); // Ref for focusing the post input
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const filteredPosts = activeFilter === 'Todos' 
    ? posts 
    : posts.filter(p => p.type.toLowerCase() === activeFilter.toLowerCase().slice(0, -1));

  const handleAddPollOption = () => {
    setPollOptions([...pollOptions, '']);
  }

  const handlePollOptionChange = (idx: number, val: string) => {
    const newOpts = [...pollOptions];
    newOpts[idx] = val;
    setPollOptions(newOpts);
  }

  const handleRemovePollOption = (idx: number) => {
    if (pollOptions.length <= 2) return;
    setPollOptions(pollOptions.filter((_, i) => i !== idx));
  }

  // Handle Image Selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (file.size > 5 * 1024 * 1024) {
            alert("A imagem deve ter no máximo 5MB.");
            return;
        }
        setSelectedImage(file);
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
        if (newPostType === 'aviso') setNewPostType('cobertura');
    }
  };

  const removeImage = () => {
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFormatText = (format: 'bold' | 'italic' | 'strike' | 'list') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = newPostContent;
    
    let prefix = '';
    let suffix = '';

    switch(format) {
      case 'bold': prefix = '**'; suffix = '**'; break;
      case 'italic': prefix = '*'; suffix = '*'; break;
      case 'strike': prefix = '~~'; suffix = '~~'; break;
      case 'list': prefix = '\n- '; suffix = ''; break;
    }

    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    const newText = `${before}${prefix}${selection}${suffix}${after}`;
    
    setNewPostContent(newText);

    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = end + prefix.length + (format === 'list' ? 0 : suffix.length > 0 && selection.length === 0 ? -suffix.length : 0);
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleSubmit = async () => {
    if (!newPostContent.trim() && !selectedImage) return;
    setIsSubmitting(true);

    try {
        let imageUrl = null;
        if (selectedImage) {
            const fileExt = selectedImage.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;
            const { error: uploadError } = await supabase.storage.from('post-images').upload(filePath, selectedImage);
            if (uploadError) {
                if ((uploadError as any).statusCode === '404' || (uploadError as any).error === 'Bucket not found') {
                    alert("Erro: Bucket 'post-images' não encontrado no Supabase.");
                    setIsSubmitting(false);
                    return;
                }
                throw uploadError;
            }
            const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(filePath);
            imageUrl = urlData.publicUrl;
        }

        // Initialize payload with common fields
        const payload: any = {
            author_id: currentUser.id,
            content: newPostContent,
            type: newPostType,
            likes: 0,
            comments: 0,
            image: imageUrl
        };

        // Only add poll_options if type is 'enquete' to avoid schema errors if column is missing for simple posts
        if (newPostType === 'enquete') {
            const optionsPayload = pollOptions.filter(o => o.trim() !== '').map((text, idx) => ({
                id: `opt-${Date.now()}-${idx}`,
                text,
                votes: 0
            }));
            payload.poll_options = optionsPayload;
        }

        const { error } = await supabase.from('posts').insert([payload]);
        if (error) throw error;

        setNewPostContent('');
        setNewPostType('aviso');
        setPollOptions(['', '']);
        removeImage();
        onRefresh();
    } catch (e: any) {
        alert(`Erro ao criar publicação: ${e.message}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    setIsDeleting(true);
    
    try {
        // 1. Tentar remover dependências manualmente (Comentários e Likes)
        await Promise.allSettled([
            supabase.from('comments').delete().eq('post_id', postToDelete.id),
            supabase.from('post_likes').delete().eq('post_id', postToDelete.id)
        ]);

        // 2. Excluir o Post
        const { error } = await supabase.from('posts').delete().eq('id', postToDelete.id);
        
        if (error) {
            console.error("Erro ao deletar post:", error);
            if (error.code === '23503') { // Foreign Key Violation
                 alert("Não foi possível excluir: Existem comentários ou curtidas vinculados. Contate o administrador.");
            } else if (error.code === '42501') { // RLS Policy Violation
                 alert("Permissão negada: Você não tem permissão para excluir este post.");
            } else {
                 alert(`Erro ao excluir: ${error.message}`);
            }
            setPostToDelete(null);
            return; 
        }

        // 3. Limpar Imagem do Storage (Apenas se o post foi deletado com sucesso)
        if (postToDelete.image) {
            try {
                const fileName = postToDelete.image.split('/').pop();
                if (fileName && fileName.includes('.')) {
                    await supabase.storage.from('post-images').remove([fileName]);
                }
            } catch (imgError) {
                console.warn("Post deletado, mas falha ao remover imagem:", imgError);
            }
        }
        
        onRefresh();
        setPostToDelete(null);
    } catch(e: any) { 
        console.error("Erro crítico:", e); 
        alert(`Erro inesperado: ${e.message}`);
    } finally {
        setIsDeleting(false);
    }
  };

  const POST_TYPES = [
    { id: 'aviso', label: 'Aviso', icon: Megaphone, color: 'text-red-500', hoverBg: 'hover:bg-red-50', activeBg: 'bg-red-100 ring-red-200' },
    { id: 'cobertura', label: 'Mídia', icon: ImageIcon, color: 'text-green-500', hoverBg: 'hover:bg-green-50', activeBg: 'bg-green-100 ring-green-200' },
    { id: 'enquete', label: 'Enquete', icon: BarChart2, color: 'text-purple-500', hoverBg: 'hover:bg-purple-50', activeBg: 'bg-purple-100 ring-purple-200' },
    { id: 'pedido', label: 'Pedido', icon: HeartHandshake, color: 'text-yellow-500', hoverBg: 'hover:bg-yellow-50', activeBg: 'bg-yellow-100 ring-yellow-200' },
    { id: 'formacao', label: 'Formação', icon: BookOpen, color: 'text-blue-500', hoverBg: 'hover:bg-blue-50', activeBg: 'bg-blue-100 ring-blue-200' },
  ];

  return (
    <div className="max-w-3xl mx-auto p-4 pb-20 lg:pb-8">
      {/* Main Feed Column */}
      <div className="space-y-6">
        
        {/* Modern Create Post Input */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6 group hover:shadow-md transition-all duration-300 relative z-10">
          <div className="p-5 pb-2">
            <div className="flex gap-4 items-start">
              <img src={currentUser.avatar} alt="Me" className="w-11 h-11 rounded-full object-cover hidden sm:block border-2 border-white shadow-sm shrink-0" />
              <div className="flex-1 w-full relative">
                  
                  <textarea
                      ref={textareaRef}
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder={`O que há de novo, ${currentUser.name.split(' ')[0]}?`}
                      className="w-full bg-transparent text-slate-800 placeholder:text-slate-400 text-base resize-none focus:outline-none min-h-[80px] py-2"
                  />
                  
                  {/* Image Preview Area */}
                  {imagePreview && (
                      <div className="relative mt-3 mb-2 inline-block group/img">
                          <img src={imagePreview} alt="Preview" className="h-48 w-auto rounded-xl object-cover border border-slate-200 shadow-sm" />
                          <button onClick={removeImage} className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors shadow-sm"><X size={14} /></button>
                      </div>
                  )}

                  {/* Poll Area */}
                  {newPostType === 'enquete' && (
                      <div className="mt-2 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60 animate-fade-in relative">
                          <button onClick={() => setNewPostType('aviso')} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 p-1"><X size={14}/></button>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Opções da Enquete</p>
                          {pollOptions.map((opt, idx) => (
                              <div key={idx} className="flex gap-2 items-center">
                                  <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                                  <input type="text" value={opt} onChange={(e) => handlePollOptionChange(idx, e.target.value)} placeholder={`Opção ${idx + 1}`} className="flex-1 text-sm p-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-sm" />
                                  {pollOptions.length > 2 && <button onClick={() => handleRemovePollOption(idx)} className="text-slate-400 hover:text-red-500 p-1.5"><X size={16} /></button>}
                              </div>
                          ))}
                          <button onClick={handleAddPollOption} className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 mt-2 px-1"><Plus size={14} /> Adicionar Opção</button>
                      </div>
                  )}
              </div>
            </div>
          </div>

          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />

          {/* Action Bar / Footer */}
          <div className="bg-slate-50/50 border-t border-slate-100 p-3 px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
             <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto hide-scroll">
                
                {/* Rich Text Tools */}
                <div className="flex items-center gap-0.5 mr-3 pr-3 border-r border-slate-200">
                    <button onClick={() => handleFormatText('bold')} title="Negrito" className="p-2 hover:bg-slate-200/60 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"><Bold size={18} /></button>
                    <button onClick={() => handleFormatText('italic')} title="Itálico" className="p-2 hover:bg-slate-200/60 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"><Italic size={18} /></button>
                    <button onClick={() => handleFormatText('list')} title="Lista" className="p-2 hover:bg-slate-200/60 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"><List size={18} /></button>
                </div>

                {/* Media & Type Tools */}
                <button 
                    onClick={() => fileInputRef.current?.click()} 
                    title="Adicionar Foto" 
                    className={`p-2 rounded-lg transition-all flex items-center justify-center mr-1 ${selectedImage ? 'bg-green-100 text-green-600 ring-2 ring-green-200' : 'text-slate-500 hover:bg-slate-200/60 hover:text-green-600'}`}
                >
                    <Camera size={20} />
                </button>

                {POST_TYPES.slice(2).map((type) => ( /* Show Enquete, Pedido, Formacao */
                      <button key={type.id} onClick={() => setNewPostType(type.id as any)} title={type.label} className={`p-2 rounded-lg transition-all flex items-center justify-center ${newPostType === type.id ? type.activeBg + ' ' + type.color + ' ring-2' : 'text-slate-500 ' + type.hoverBg}`}>
                          <type.icon size={20} />
                      </button>
                ))}
             </div>

             <div className="flex items-center gap-3 w-full sm:w-auto">
                 {/* Current Type Indicator (Mobile/Desktop) */}
                 <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md hidden sm:inline-block ${POST_TYPES.find(t => t.id === newPostType)?.color} bg-slate-100`}>
                    {POST_TYPES.find(t => t.id === newPostType)?.label}
                 </span>
                 <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || (!newPostContent.trim() && !selectedImage)} 
                    className="w-full sm:w-auto bg-slate-900 text-white py-2 px-6 rounded-xl hover:bg-slate-800 active:scale-95 transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-200"
                >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} 
                    <span className="sm:hidden md:inline">Publicar</span>
                 </button>
             </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scroll">
            {['Todos', 'Avisos', 'Pedidos', 'Enquetes', 'Coberturas'].map((filter, idx) => (
                <button key={idx} onClick={() => setActiveFilter(filter)} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeFilter === filter ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>
                    {filter}
                </button>
            ))}
        </div>

        {filteredPosts.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Megaphone size={24} className="text-slate-300" />
                </div>
                <p>Nenhuma publicação encontrada no Mural.</p>
            </div>
        ) : (
            filteredPosts.map((post) => (
            <PostCard 
                key={post.id} 
                post={post} 
                users={users} 
                currentUser={currentUser} 
                onRefresh={onRefresh} 
                onRequestDelete={(p) => setPostToDelete(p)}
            />
            ))
        )}
      </div>

      {/* CONFIRM DELETE MODAL */}
      {postToDelete && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
                  <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Excluir Publicação?</h3>
                  <p className="text-sm text-slate-500 mb-6 leading-relaxed">Esta ação não pode ser desfeita. A publicação será removida permanentemente do feed.</p>
                  
                  <div className="flex gap-3">
                      <button 
                        onClick={() => setPostToDelete(null)} 
                        className="flex-1 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
                        disabled={isDeleting}
                      >
                          Cancelar
                      </button>
                      <button 
                        onClick={handleConfirmDelete}
                        disabled={isDeleting}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-red-200 flex items-center justify-center gap-2"
                      >
                          {isDeleting && <Loader2 size={18} className="animate-spin" />}
                          Excluir
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};