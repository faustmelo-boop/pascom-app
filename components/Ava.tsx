import React, { useState, useRef, useEffect } from 'react';
import { Course, DocumentItem, User, UserRole, Lesson, isCoordinator } from '../types';
import { supabase } from '../supabaseClient';
import { 
  BookOpen, PlayCircle, Award, ArrowRight, FileText, Download, Upload, 
  Trash2, Search, Filter, Plus, X, Loader2, Save, Edit2, Camera, 
  AlertTriangle, ArrowLeft, Video, CheckCircle, Play, ExternalLink, 
  Youtube, LayoutDashboard, Calendar, MessageSquare, CheckSquare, 
  Menu, ChevronRight, Home, Folder, User as UserIcon, MoreVertical, Link as LinkIcon, MessageCircle, Check, Code, Library, Circle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AvaProps {
  courses: Course[];
  documents: DocumentItem[];
  currentUser: User;
  users: User[];
  onRefresh: () => void;
  onBreadcrumbChange?: (content: React.ReactNode) => void;
}

export const Ava: React.FC<AvaProps> = ({ courses, documents, currentUser, users, onRefresh, onBreadcrumbChange }) => {
  // Navigation State
  const [viewMode, setViewMode] = useState<'dashboard' | 'course' | 'activity' | 'library' | 'forum' | 'forum_topic'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Data State
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Forum State
  const [forumTopics, setForumTopics] = useState<any[]>([]);
  const [currentTopic, setCurrentTopic] = useState<any | null>(null);
  const [forumLoading, setForumLoading] = useState(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [topicFormData, setTopicFormData] = useState({ title: '', content: '' });

  // Course Admin States
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseFormData, setCourseFormData] = useState({ title: '', category: '', thumbnail: '' });
  const [courseLoading, setCourseLoading] = useState(false);
  const courseFileInputRef = useRef<HTMLInputElement>(null);

  // Lesson Admin States
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [lessonFormData, setLessonFormData] = useState({ title: '', description: '', videoUrl: '', duration: '' });
  const [lessonLoading, setLessonLoading] = useState(false);
  
  // Delete Lesson State
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  
  // Document Upload States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Permissions unificada
  const isAdmin = currentUser && isCoordinator(currentUser.role);

  // --- Breadcrumbs logic lifted to header ---
  useEffect(() => {
    if (onBreadcrumbChange) {
      const content = (
        <div className="flex items-center gap-3 text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400">
            <button onClick={navigateToDashboard} className="hover:text-slate-900 transition-colors shrink-0">Portal</button>
            {selectedCourse && (
                <>
                    <ChevronRight size={12} className="text-slate-200 shrink-0" />
                    <button onClick={() => navigateToCourse(selectedCourse)} className="hover:text-slate-900 transition-colors truncate max-w-[120px] md:max-w-[200px] lg:max-w-[400px]">{selectedCourse.title}</button>
                </>
            )}
            {(viewMode === 'forum' || viewMode === 'forum_topic') && (
                 <>
                    <ChevronRight size={12} className="text-slate-200 shrink-0" />
                    <button onClick={() => navigateToForum(selectedCourse!)} className="hover:text-slate-900 transition-colors shrink-0">Mural</button>
                 </>
            )}
            {currentLesson && viewMode === 'activity' && (
                 <>
                    <ChevronRight size={12} className="text-slate-200 shrink-0" />
                    <span className="text-brand-blue truncate max-w-[120px] md:max-w-[200px] lg:max-w-[400px]">{currentLesson.title}</span>
                 </>
            )}
        </div>
      );
      onBreadcrumbChange(content);
    }
  }, [viewMode, selectedCourse, currentLesson, onBreadcrumbChange]);

  // Clean up breadcrumbs on unmount
  useEffect(() => {
    return () => {
        if (onBreadcrumbChange) onBreadcrumbChange(null);
    };
  }, [onBreadcrumbChange]);

  // --- Helpers ---

  const getEmbedUrl = (url: string) => {
    if (!url) return null;
    // Check if it's raw HTML (starts with <)
    if (url.trim().startsWith('<')) {
        return { type: 'html', src: url };
    }

    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch && youtubeMatch[1]) {
        return { type: 'youtube', src: `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=0&rel=0` };
    }
    const vimeoRegex = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch && vimeoMatch[1]) {
        return { type: 'vimeo', src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
    }
    return { type: 'iframe', src: url };
  };

  const getActivityIcon = (lesson: Lesson) => {
      if (lesson.videoUrl && lesson.videoUrl.trim().startsWith('<')) {
          return <div className="bg-purple-600 text-white p-1.5 rounded-md"><Code size={16} /></div>;
      }
      if (lesson.videoUrl && (lesson.videoUrl.includes('youtube') || lesson.videoUrl.includes('vimeo') || lesson.videoUrl.endsWith('.mp4'))) {
          return <div className="bg-brand-blue text-white p-1.5 rounded-md"><Video size={16} /></div>;
      }
      if (lesson.videoUrl && (lesson.videoUrl.endsWith('.pdf') || lesson.videoUrl.endsWith('.doc'))) {
          return <div className="bg-red-500 text-white p-1.5 rounded-md"><FileText size={16} /></div>;
      }
      return <div className="bg-brand-blue/60 text-white p-1.5 rounded-md"><LinkIcon size={16} /></div>;
  };

  const getUserName = (id: string) => {
      const u = users.find(user => user.id === id);
      return u ? u.name : 'Usuário desconhecido';
  };
  
  const getUserAvatar = (id: string) => {
      const u = users.find(user => user.id === id);
      return u ? u.avatar : null;
  };

  // --- Fetch Logic ---

  const fetchLessons = async (courseId: string) => {
    setLessonsLoading(true);
    try {
        // 1. Fetch Lessons
        const { data: lessonsData, error: lessonsError } = await supabase
            .from('lessons')
            .select('*')
            .eq('course_id', courseId)
            .order('created_at', { ascending: true });

        if (lessonsError) throw lessonsError;

        const mappedLessons: Lesson[] = (lessonsData || []).map((l: any) => ({
            id: l.id,
            courseId: l.course_id,
            title: l.title,
            videoUrl: l.video_url,
            duration: l.duration,
            description: l.description
        }));

        setLessons(mappedLessons);

        // 2. Fetch User Progress
        const { data: progressData, error: progressError } = await supabase
            .from('user_progress')
            .select('lesson_id')
            .eq('user_id', currentUser.id);

        if (!progressError && progressData) {
            const completedSet = new Set<string>(progressData.map((p: any) => p.lesson_id));
            setCompletedLessonIds(completedSet);
            
            // Recalculate course progress locally for accurate display
            if (selectedCourse) {
                // Filter progress to only count lessons from THIS course
                const completedCount = mappedLessons.filter(l => completedSet.has(l.id)).length;
                const totalLessons = mappedLessons.length;
                const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
                setSelectedCourse(prev => prev ? ({ ...prev, progress, lessonsCount: totalLessons }) : null);
            }
        }

    } catch (error) {
        console.error("Error fetching lessons or progress:", error);
    } finally {
        setLessonsLoading(false);
    }
  };

  const fetchForumTopics = async (courseId: string) => {
      setForumLoading(true);
      try {
          const { data, error } = await supabase
            .from('forum_posts')
            .select('*')
            .eq('course_id', courseId)
            .order('created_at', { ascending: false });
          
          if (error) {
               if (error.code === 'PGRST116' || error.code === '42P01') {
                  setForumTopics([]);
               } else {
                   throw error;
               }
          } else {
              setForumTopics(data || []);
          }
      } catch (err) {
          console.error("Fetch forum error:", err);
          setForumTopics([]); 
      } finally {
          setForumLoading(false);
      }
  };

  // --- Actions ---

  const toggleLessonCompletion = async (lessonId: string) => {
      const isCompleted = completedLessonIds.has(lessonId);
      const newSet = new Set(completedLessonIds);
      
      // Optimistic Update
      if (isCompleted) {
          newSet.delete(lessonId);
      } else {
          newSet.add(lessonId);
      }
      setCompletedLessonIds(newSet);

      // Recalculate local progress
      if (selectedCourse) {
          const completedCount = lessons.filter(l => newSet.has(l.id)).length;
          const totalLessons = lessons.length;
          const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
          setSelectedCourse(prev => prev ? ({ ...prev, progress }) : null);
      }

      try {
          if (isCompleted) {
              // Remove
              await supabase.from('user_progress').delete().match({ user_id: currentUser.id, lesson_id: lessonId });
          } else {
              // Add
              await supabase.from('user_progress').insert({ user_id: currentUser.id, lesson_id: lessonId });
          }
      } catch (error) {
          console.error("Error toggling completion:", error);
          if (isCompleted) newSet.add(lessonId); else newSet.delete(lessonId);
          setCompletedLessonIds(newSet);
      }
  };

  // --- Navigation Handlers ---

  const navigateToDashboard = () => {
    setViewMode('dashboard');
    setSelectedCourse(null);
    setCurrentLesson(null);
    setIsEditingMode(false);
    onRefresh(); 
  };

  const navigateToCourse = (course: Course) => {
    setSelectedCourse(course);
    fetchLessons(course.id);
    setViewMode('course');
    setCurrentLesson(null);
  };

  const navigateToActivity = (lesson: Lesson) => {
      setCurrentLesson(lesson);
      setViewMode('activity');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToLibrary = () => {
      setViewMode('library');
      setSelectedCourse(null);
      setCurrentLesson(null);
  };

  const navigateToForum = (course: Course) => {
      fetchForumTopics(course.id);
      setViewMode('forum');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToForumTopic = (topic: any) => {
      setCurrentTopic(topic);
      setViewMode('forum_topic');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- CRUD Handlers ---

  // 1. Course
  const handleOpenCourseModal = (course?: Course) => {
      if (course) {
          setEditingCourseId(course.id);
          setCourseFormData({
              title: course.title,
              category: course.category,
              thumbnail: course.thumbnail || ''
          });
      } else {
          setEditingCourseId(null);
          setCourseFormData({ title: '', category: 'Geral', thumbnail: '' });
      }
      setIsCourseModalOpen(true);
  };

  const handleCourseImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const fileExt = file.name.split('.pop').pop();
        const fileName = `course-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;
        
        const reader = new FileReader();
        reader.onloadend = () => setCourseFormData(prev => ({ ...prev, thumbnail: reader.result as string }));
        reader.readAsDataURL(file);

        const { data, error } = await supabase.storage.from('course-images').upload(filePath, file);
        if (!error) {
            const { data: urlData } = supabase.storage.from('course-images').getPublicUrl(filePath);
            setCourseFormData(prev => ({ ...prev, thumbnail: urlData.publicUrl }));
        }
    }
  };

  const handleSaveCourse = async () => {
      if (!courseFormData.title) return;
      setCourseLoading(true);
      try {
          const payload = {
              title: courseFormData.title,
              category: courseFormData.category,
              cover_image: courseFormData.thumbnail
          };

          if (editingCourseId) {
              await supabase.from('courses').update(payload).eq('id', editingCourseId);
          } else {
              await supabase.from('courses').insert([payload]);
          }
          onRefresh();
          setIsCourseModalOpen(false);
      } catch (e: any) {
          alert(`Erro ao salvar curso: ${e.message}`);
      } finally {
          setCourseLoading(false);
      }
  };

  // 2. Lesson
  const handleOpenLessonModal = () => {
      setLessonFormData({ title: '', description: '', videoUrl: '', duration: '' });
      setIsLessonModalOpen(true);
  };

  const handleSaveLesson = async () => {
      if (!selectedCourse || !lessonFormData.title) return;
      setLessonLoading(true);
      try {
          const payload = {
              course_id: selectedCourse.id,
              title: lessonFormData.title,
              description: lessonFormData.description,
              video_url: lessonFormData.videoUrl,
              duration: lessonFormData.duration
          };
          
          const { error } = await supabase.from('lessons').insert([payload]);
          if (error) throw error;

          fetchLessons(selectedCourse.id);
          setIsLessonModalOpen(false);
      } catch (e: any) {
          alert(`Erro ao salvar aula: ${e.message}`);
      } finally {
          setLessonLoading(false);
      }
  };

  const handleDeleteLesson = (lesson: Lesson) => {
      setLessonToDelete(lesson);
  };

  const confirmDeleteLesson = async () => {
      if (!lessonToDelete) return;
      setIsDeleteLoading(true);
      try {
          await supabase.from('lessons').delete().eq('id', lessonToDelete.id);
          if (selectedCourse) fetchLessons(selectedCourse.id);
          setLessonToDelete(null);
      } catch(e) { 
          console.error(e); 
          alert("Erro ao excluir atividade.");
      } finally {
          setIsDeleteLoading(false);
      }
  };

  // 3. Forum Topic
  const handleCreateTopic = async () => {
      if (!selectedCourse || !topicFormData.title || !topicFormData.content) return;
      setForumLoading(true);
      try {
          const { error } = await supabase.from('forum_posts').insert([{
              course_id: selectedCourse.id,
              author_id: currentUser.id,
              title: topicFormData.title,
              content: topicFormData.content
          }]);
          
          if (error) {
              if (error.code === '42P01') alert("Erro: Tabela 'forum_posts' não existe no banco de dados.");
              else throw error;
          } else {
              setTopicFormData({ title: '', content: '' });
              setIsTopicModalOpen(false);
              fetchForumTopics(selectedCourse.id);
          }
      } catch (e: any) {
          alert(`Erro ao criar tópico: ${e.message}`);
      } finally {
          setForumLoading(false);
      }
  };

  // --- Components ---

  const SidebarItem = ({ icon: Icon, label, active, onClick, count }: any) => (
      <button 
        onClick={onClick}
        className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors border-l-4 ${active ? 'bg-brand-blue/5 text-brand-blue border-brand-blue' : 'text-gray-700 hover:bg-gray-50 border-transparent'}`}
      >
          <div className="flex items-center gap-3">
            <Icon size={18} />
            {sidebarOpen && <span>{label}</span>}
          </div>
          {count !== undefined && sidebarOpen && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{count}</span>}
      </button>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            
            <div className="p-6 md:p-12 overflow-y-auto flex-1 hide-scroll scroll-smooth">
                
                {/* --- VIEW: DASHBOARD --- */}
                {viewMode === 'dashboard' && (
                    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 py-6 mb-12">
                            <div className="animate-in slide-in-from-left-8 duration-700">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-14 h-14 bg-brand-blue rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl shadow-brand-blue/30 rotate-3">
                                        <BookOpen size={28} />
                                    </div>
                                    <p className="text-[10px] font-black text-brand-blue uppercase tracking-[0.3em] bg-brand-blue/10 px-4 py-2 rounded-full border border-brand-blue/10">Ambiente de Aprendizagem</p>
                                </div>
                                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">Caminhos de Formação</h1>
                                <p className="text-slate-400 font-medium text-lg italic mt-2">Crescendo juntos no serviço e na fé, {currentUser.name.split(' ')[0]}!</p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 animate-in slide-in-from-right-8 duration-700">
                                {isAdmin && (
                                    <button 
                                        onClick={() => handleOpenCourseModal()} 
                                        className="bg-brand-blue text-white px-8 py-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all shadow-[0_20px_40px_-10px_rgba(59,130,246,0.25)] flex items-center justify-center gap-3 hover:scale-105 active:scale-95 group"
                                    >
                                        <Plus size={18} strokeWidth={3} /> Novo Curso
                                    </button>
                                )}
                            </div>
                        </header>

                        {/* Course List - Bento Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {courses.map(course => (
                                <div key={course.id} className="bg-white rounded-[2.5rem] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.04)] border border-slate-50 overflow-hidden flex flex-col group hover:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] transition-all duration-500 relative">
                                    {isAdmin && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleOpenCourseModal(course); }}
                                            className="absolute top-4 left-4 z-10 bg-white/90 p-4 rounded-2xl text-slate-400 hover:text-brand-blue shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                    )}
                                    <div className="h-56 bg-slate-50 relative overflow-hidden cursor-pointer" onClick={() => navigateToCourse(course)}>
                                        {course.thumbnail ? (
                                            <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-200">
                                                <BookOpen size={64} />
                                            </div>
                                        )}
                                        <div className="absolute top-4 right-4 bg-slate-900/40 backdrop-blur-md text-white px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl">
                                            {course.category}
                                        </div>
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    </div>
                                    <div className="p-8 flex-1 flex flex-col">
                                        <h3 onClick={() => navigateToCourse(course)} className="font-black text-2xl text-slate-800 mb-6 cursor-pointer hover:text-brand-blue transition-colors line-clamp-2 leading-[1.1] tracking-tight">
                                            {course.title}
                                        </h3>
                                        <div className="mt-auto pt-6 border-t border-slate-50">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progresso</span>
                                                <span className="text-sm font-black text-brand-blue">{course.progress}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-3 p-1">
                                                <div className="bg-brand-blue h-1 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(0,124,186,0.3)]" style={{ width: `${course.progress}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- VIEW: COURSE --- */}
                {viewMode === 'course' && selectedCourse && (
                    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 flex flex-col lg:flex-row gap-12">
                        <div className="flex-1 min-w-0">
                            <div className="bg-white p-12 rounded-[3rem] border border-slate-50 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.04)] mb-8 relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-3 bg-brand-blue"></div>
                                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                       <span className="px-5 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">{selectedCourse.category}</span>
                                       <div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
                                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{lessons.length} Atividades</span>
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight leading-[1.05]">{selectedCourse.title}</h1>
                                  </div>
                                  <div className="shrink-0 w-full md:w-auto">
                                     <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col items-center min-w-[140px]">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Conclusão</span>
                                        <span className="text-3xl font-black text-brand-blue tracking-tight">{selectedCourse.progress}%</span>
                                     </div>
                                  </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <motion.div 
                                  whileHover={{ x: 5 }}
                                  className="bg-white rounded-[2rem] border border-slate-50 shadow-sm p-8 hover:shadow-md transition-all cursor-pointer group"
                                  onClick={() => navigateToForum(selectedCourse)}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 bg-brand-blue/10 text-brand-blue rounded-[1.4rem] flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-all shadow-sm">
                                            <MessageSquare size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xl font-black text-slate-800 tracking-tight group-hover:text-brand-blue transition-colors">Partilha e Diálogo</div>
                                            <p className="text-slate-400 text-sm font-medium mt-1">Espaço para conversar, tirar dúvidas e crescer em equipe.</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-xl text-slate-300 group-hover:text-brand-blue group-hover:bg-brand-blue/10 transition-all">
                                          <ChevronRight size={20} />
                                        </div>
                                    </div>
                                </motion.div>

                                <div className="bg-white rounded-[2.5rem] border border-slate-50 shadow-sm overflow-hidden">
                                    <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                          <div className="w-2 h-6 bg-slate-300 rounded-full"></div>
                                          <h2 className="font-black text-slate-800 text-xl tracking-tight">Conteúdo das Aulas</h2>
                                        </div>
                                        {isAdmin && (
                                            <button 
                                                onClick={() => setIsEditingMode(!isEditingMode)}
                                                className={`text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-sm ${isEditingMode ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                            >
                                                {isEditingMode ? <X size={14} strokeWidth={3} /> : <Edit2 size={14} strokeWidth={3} />} 
                                                {isEditingMode ? 'Sair da Edição' : 'Gerenciar'}
                                            </button>
                                        )}
                                    </div>
                                    <div className="divide-y divide-slate-50">
                                        {lessonsLoading ? (
                                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                                <Loader2 size={40} className="animate-spin text-brand-blue/20" />
                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Organizando os encontros...</span>
                                            </div>
                                        ) : lessons.length === 0 ? (
                                            <div className="p-20 text-center text-slate-300 animate-in zoom-in-95">
                                              <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
                                              <p className="font-black uppercase tracking-widest text-xs">Nenhum conteúdo publicado ainda.</p>
                                            </div>
                                        ) : (
                                            <div className="p-4 space-y-2">
                                                {lessons.map((lesson) => {
                                                    const isCompleted = completedLessonIds.has(lesson.id);
                                                    return (
                                                        <div key={lesson.id} className="flex items-center justify-between p-6 hover:bg-slate-50/80 rounded-[1.8rem] transition-all group border-2 border-transparent hover:border-slate-100/50">
                                                            <div className="flex items-center gap-6 flex-1 min-w-0">
                                                                <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${isCompleted ? 'bg-brand-green/10 text-brand-green' : 'bg-white text-slate-400 group-hover:scale-110 transition-transform'}`}>
                                                                  {getActivityIcon(lesson)}
                                                                </div>
                                                                <div className="flex-1 truncate">
                                                                    <button 
                                                                        onClick={() => navigateToActivity(lesson)}
                                                                        className={`font-black text-lg text-left block truncate tracking-tight transition-colors ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800 hover:text-brand-blue'}`}
                                                                    >
                                                                        {lesson.title}
                                                                    </button>
                                                                    <div className="flex items-center gap-4 mt-1">
                                                                      {lesson.description && <span className="text-[10px] font-bold text-slate-400 truncate max-w-[200px]">{lesson.description}</span>}
                                                                      {lesson.duration && <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100/50 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-100">{lesson.duration}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {isEditingMode ? (
                                                                <div className="ml-4 shrink-0 flex items-center gap-2">
                                                                    <button onClick={() => handleDeleteLesson(lesson)} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                                                                </div>
                                                            ) : (
                                                                <div className="ml-4 shrink-0 flex items-center gap-4">
                                                                    <button 
                                                                        onClick={() => toggleLessonCompletion(lesson.id)}
                                                                        className={`w-10 h-10 rounded-2xl border-2 cursor-pointer flex items-center justify-center transition-all shadow-sm ${
                                                                            isCompleted 
                                                                            ? 'bg-brand-green border-brand-green text-white shadow-brand-green/20' 
                                                                            : 'border-slate-100 text-slate-200 hover:border-brand-blue/20 hover:text-brand-blue hover:bg-white'
                                                                        }`}
                                                                    >
                                                                        {isCompleted ? <Check size={20} strokeWidth={4} /> : <div className="w-2 h-2 bg-current rounded-full" />}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {isEditingMode && (
                                            <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex justify-center">
                                                <button onClick={handleOpenLessonModal} className="text-xs font-black text-brand-blue uppercase tracking-widest hover:text-brand-blue/80 transition-all flex items-center gap-2 bg-white px-8 py-4 rounded-[1.4rem] shadow-sm hover:shadow-md hover:scale-105 active:scale-95">
                                                  <Plus size={16} strokeWidth={3} /> Adicionar Aula
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Right Blocks */}
                        <div className="w-full lg:w-96 space-y-8 shrink-0">
                            <div className="bg-white rounded-[3rem] border border-slate-50 shadow-sm overflow-hidden p-8">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-8 text-center">Meu Caminho</h3>
                                <div className="flex flex-col items-center">
                                    <div className="relative w-48 h-48 flex items-center justify-center mb-8">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="96" cy="96" r="84" stroke="#f8fafc" strokeWidth="12" fill="transparent" />
                                            <circle cx="96" cy="96" r="84" stroke="url(#brand-grad)" strokeWidth="12" fill="transparent" strokeDasharray={`${selectedCourse.progress * 5.27} 527`} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                                            <defs>
                                              <linearGradient id="brand-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#007cba" />
                                                <stop offset="100%" stopColor="#6cc04a" />
                                              </linearGradient>
                                            </defs>
                                        </svg>
                                        <div className="absolute flex flex-col items-center">
                                          <span className="text-5xl font-black text-slate-800 tracking-tight leading-none">{selectedCourse.progress}%</span>
                                        </div>
                                    </div>
                                    <p className="text-xs font-bold text-center text-slate-400 leading-relaxed px-4">
                                      Você já dominou <span className="text-slate-900">{lessons.filter(l => completedLessonIds.has(l.id)).length}</span> do total de <span className="text-slate-900">{lessons.length}</span> conteúdos deste curso.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- VIEW: FORUM --- */}
                {viewMode === 'forum' && selectedCourse && (
                    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Mural do Curso</h1>
                                <p className="text-slate-400 text-sm font-medium">Participe das discussões e tire suas dúvidas.</p>
                            </div>
                            <button 
                                onClick={() => setIsTopicModalOpen(true)}
                                className="bg-brand-blue text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-blue/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <Plus size={16} strokeWidth={3} /> Novo Tópico
                            </button>
                        </div>

                        {forumLoading ? (
                             <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 size={40} className="animate-spin text-brand-blue/20" />
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Carregando discussões...</span>
                            </div>
                        ) : forumTopics.length === 0 ? (
                            <div className="text-center py-32 bg-white rounded-[2.5rem] border border-slate-50 shadow-sm animate-in zoom-in-95">
                                <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-white">
                                    <MessageSquare size={40} className="text-slate-200" />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Mural Vazio</h3>
                                <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto">Ninguém iniciou uma conversa ainda. Que tal ser o primeiro?</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {forumTopics.map((topic) => (
                                    <motion.div 
                                        key={topic.id}
                                        whileHover={{ y: -5 }}
                                        className="bg-white rounded-[2.5rem] p-8 border border-slate-50 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.04)] cursor-pointer hover:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] transition-all group"
                                        onClick={() => navigateToForumTopic(topic)}
                                    >
                                        <div className="flex items-start gap-4 mb-6">
                                            <img src={getUserAvatar(topic.author_id) || 'https://via.placeholder.com/40'} alt="Avatar" className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                                            <div>
                                                <h3 className="font-black text-slate-800 text-lg group-hover:text-brand-blue transition-colors leading-tight mb-1">{topic.title}</h3>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{getUserName(topic.author_id)}</span>
                                                    <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{new Date(topic.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">{topic.content}</p>
                                        <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-brand-blue font-black text-[10px] uppercase tracking-widest bg-brand-blue/5 px-4 py-2 rounded-xl">
                                                <MessageCircle size={14} /> {topic.replies_count || 0} Respostas
                                            </div>
                                            <div className="p-2 text-slate-300 group-hover:text-brand-blue transition-colors">
                                                <ArrowRight size={20} />
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* --- VIEW: ACTIVITY (LESSON PLAYER) --- */}
                {viewMode === 'activity' && currentLesson && selectedCourse && (
                    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
                        {/* Header Action */}
                        <div className="flex items-center justify-between mb-8">
                            <button 
                                onClick={() => navigateToCourse(selectedCourse)}
                                className="flex items-center gap-3 text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest transition-all p-2 bg-white rounded-xl shadow-sm border border-slate-50"
                            >
                                <ArrowLeft size={18} /> Voltar ao Curso
                            </button>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atividade {lessons.findIndex(l => l.id === currentLesson.id) + 1} de {lessons.length}</span>
                            </div>
                        </div>

                        {/* Player / Content Area */}
                        <div className="bg-white rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] border border-slate-50 overflow-hidden mb-10">
                            {/* Multimedia Area */}
                            <div className="bg-slate-950 aspect-video relative group flex items-center justify-center">
                                {currentLesson.videoUrl ? (
                                    getEmbedUrl(currentLesson.videoUrl)?.type === 'youtube' || getEmbedUrl(currentLesson.videoUrl)?.type === 'vimeo' || getEmbedUrl(currentLesson.videoUrl)?.type === 'iframe' ? (
                                        <iframe 
                                            src={getEmbedUrl(currentLesson.videoUrl)?.src} 
                                            className="w-full h-full border-none"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                    ) : getEmbedUrl(currentLesson.videoUrl)?.type === 'html' ? (
                                        <div className="w-full h-full overflow-hidden flex items-center justify-center bg-white" dangerouslySetInnerHTML={{ __html: getEmbedUrl(currentLesson.videoUrl)?.src || '' }} />
                                    ) : (
                                        <div className="flex flex-col items-center gap-6 p-8 text-center text-white">
                                            <div className="w-24 h-24 bg-brand-blue/20 rounded-[2.5rem] flex items-center justify-center mb-2 shadow-inner ring-4 ring-white/10">
                                                <ExternalLink size={40} className="text-brand-blue" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black tracking-tight mb-2">Conteúdo Externo</h3>
                                                <p className="text-slate-400 text-sm max-w-xs mx-auto mb-8 font-medium">Esta atividade possui um link externo ou arquivo para visualização.</p>
                                                <a 
                                                    href={currentLesson.videoUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="bg-brand-blue text-white px-10 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-blue/30 hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-3"
                                                >
                                                    Abrir Conteúdo <ArrowRight size={18} strokeWidth={3} />
                                                </a>
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    <div className="flex flex-col items-center gap-4 text-slate-400">
                                        <Video size={64} className="opacity-20" />
                                        <p className="font-black uppercase tracking-widest text-[10px]">Sem mídia disponível</p>
                                    </div>
                                )}
                            </div>

                            {/* Info Area */}
                            <div className="p-12">
                                <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`p-2 rounded-xl ${completedLessonIds.has(currentLesson.id) ? 'bg-brand-green/10 text-brand-green' : 'bg-slate-100 text-slate-400'}`}>
                                                {completedLessonIds.has(currentLesson.id) ? <CheckCircle size={18} /> : <BookOpen size={18} />}
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aula Selecionada</span>
                                        </div>
                                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-4">{currentLesson.title}</h1>
                                        <p className="text-slate-500 text-lg leading-relaxed font-medium">{currentLesson.description || 'Nenhuma descrição fornecida para esta aula.'}</p>
                                    </div>
                                    <div className="shrink-0 w-full md:w-auto">
                                        <button 
                                            onClick={() => toggleLessonCompletion(currentLesson.id)}
                                            className={`w-full md:w-auto px-10 py-5 rounded-[1.8rem] text-xs font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 ${
                                                completedLessonIds.has(currentLesson.id) 
                                                ? 'bg-brand-green text-white shadow-brand-green/20' 
                                                : 'bg-white text-slate-900 border-2 border-slate-100 hover:border-brand-blue/30'
                                            }`}
                                        >
                                            {completedLessonIds.has(currentLesson.id) ? (
                                                <><CheckCircle size={20} strokeWidth={3} /> Aula Concluída</>
                                            ) : (
                                                <><Circle size={20} strokeWidth={3} className="text-slate-200" /> Marcar Concluída</>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Lesson Navigation */}
                                <div className="flex justify-between items-center pt-10 border-t border-slate-50">
                                    {lessons.findIndex(l => l.id === currentLesson.id) > 0 ? (
                                        <button 
                                            onClick={() => navigateToActivity(lessons[lessons.findIndex(l => l.id === currentLesson.id) - 1])}
                                            className="flex items-center gap-3 text-slate-400 hover:text-slate-800 transition-all font-black text-[10px] uppercase tracking-widest group"
                                        >
                                            <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-slate-100 transition-colors"><ArrowLeft size={18} /></div>
                                            Anterior
                                        </button>
                                    ) : <div />}

                                    {lessons.findIndex(l => l.id === currentLesson.id) < lessons.length - 1 ? (
                                        <button 
                                            onClick={() => navigateToActivity(lessons[lessons.findIndex(l => l.id === currentLesson.id) + 1])}
                                            className="flex items-center gap-3 text-brand-blue font-black text-[10px] uppercase tracking-widest group"
                                        >
                                            Próxima Aula
                                            <div className="p-3 bg-brand-blue/10 rounded-xl group-hover:bg-brand-blue group-hover:text-white transition-all"><ArrowRight size={18} strokeWidth={3} /></div>
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => navigateToCourse(selectedCourse)}
                                            className="flex items-center gap-3 text-brand-green font-black text-[10px] uppercase tracking-widest group"
                                        >
                                            Concluir Módulo
                                            <div className="p-3 bg-brand-green/10 rounded-xl group-hover:bg-brand-green group-hover:text-white transition-all"><Check size={18} strokeWidth={3} /></div>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- VIEW: LIBRARY --- */}
                {viewMode === 'library' && (
                    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 pb-32">
                        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 py-6 mb-12">
                            <div className="animate-in slide-in-from-left-8 duration-700">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-14 h-14 bg-brand-blue rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl shadow-brand-blue/30 rotate-3">
                                        <Folder size={28} />
                                    </div>
                                    <p className="text-[10px] font-black text-brand-blue uppercase tracking-[0.3em] bg-brand-blue/10 px-4 py-2 rounded-full border border-brand-blue/10">Repositório Digital</p>
                                </div>
                                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">Biblioteca</h1>
                                <p className="text-slate-400 font-medium text-lg italic mt-2">Acesso a manuais, diretrizes e recursos essenciais.</p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 animate-in slide-in-from-right-8 duration-700">
                                <div className="relative group min-w-[280px]">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-blue transition-all" size={20} />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar documento..." 
                                        className="w-full pl-14 pr-8 py-4 bg-white rounded-[1.8rem] border border-slate-100 shadow-sm outline-none focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue font-bold text-sm transition-all"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </header>

                        {documents.length === 0 ? (
                            <div className="text-center py-32 bg-white rounded-[3rem] border border-slate-50 shadow-sm animate-in zoom-in-95">
                                <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-white">
                                    <Folder size={40} className="text-slate-200" />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Biblioteca Vazia</h3>
                                <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto">Nenhum documento disponível no momento.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {documents.filter(doc => doc.title.toLowerCase().includes(searchTerm.toLowerCase())).map(doc => (
                                    <motion.div 
                                        key={doc.id}
                                        whileHover={{ y: -8 }}
                                        className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_12px_24px_-10px_rgba(0,0,0,0.05)] p-8 group flex flex-col items-center text-center hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.1)] transition-all duration-500 hover:border-brand-blue/20"
                                    >
                                        <div className="w-20 h-20 bg-slate-50 rounded-[1.8rem] flex items-center justify-center mb-6 group-hover:bg-brand-blue/5 transition-all relative overflow-hidden group-hover:scale-110">
                                            <div className="absolute top-0 right-0 w-8 h-8 bg-brand-blue/10 rounded-full blur-xl scale-0 group-hover:scale-150 transition-transform duration-700"></div>
                                            <FileText size={32} className="text-slate-300 group-hover:text-brand-blue transition-colors" />
                                        </div>
                                        <h3 className="font-black text-slate-800 text-base tracking-tight mb-2 line-clamp-2 leading-tight h-12">{doc.title}</h3>
                                        <div className="flex items-center gap-3 mb-8">
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{doc.category || 'Recursos'}</span>
                                            <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">PDF</span>
                                        </div>
                                        <a 
                                            href={doc.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="w-full bg-slate-50 text-slate-900 group-hover:bg-brand-blue group-hover:text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm hover:shadow-lg flex items-center justify-center gap-2"
                                        >
                                            <Download size={14} className="group-hover:translate-y-1 transition-transform" /> Baixar
                                        </a>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* MODALS RE-IMPLEMENTED FOR CONSISTENCY AND BEAUTY */}
        
        {/* Modal: Novo Curso */}
        <AnimatePresence>
            {isCourseModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" 
                        onClick={() => setIsCourseModalOpen(false)} 
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col p-10 ring-1 ring-black/5"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingCourseId ? 'Editar Curso' : 'Criar Novo Curso'}</h3>
                            <button onClick={() => setIsCourseModalOpen(false)} className="p-3 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-xl transition-all active:scale-90"><X size={24} /></button>
                        </div>
                        <div className="space-y-6 flex-1">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Título do Curso</label>
                                <input 
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 outline-none focus:ring-4 focus:ring-brand-blue/10 focus:bg-white font-bold text-slate-800 transition-all"
                                    placeholder="Ex: Formação em Redes Sociais"
                                    value={courseFormData.title}
                                    onChange={(e) => setCourseFormData({...courseFormData, title: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Categoria</label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 outline-none focus:ring-4 focus:ring-brand-blue/10 focus:bg-white font-black text-slate-800 uppercase tracking-widest text-[10px] appearance-none"
                                    value={courseFormData.category}
                                    onChange={(e) => setCourseFormData({...courseFormData, category: e.target.value})}
                                >
                                    <option value="Geral">Geral</option>
                                    <option value="Fotografia">Fotografia</option>
                                    <option value="Design">Design</option>
                                    <option value="Liturgia">Liturgia</option>
                                    <option value="Redes Sociais">Redes Sociais</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Capa do Curso (URL ou Upload)</label>
                                <div className="flex gap-4 items-center">
                                    <div className="flex-1">
                                        <input 
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 outline-none focus:ring-4 focus:ring-brand-blue/10 focus:bg-white font-bold text-slate-800 transition-all text-xs"
                                            placeholder="URL da imagem (pode deixar em branco)"
                                            value={courseFormData.thumbnail}
                                            onChange={(e) => setCourseFormData({...courseFormData, thumbnail: e.target.value})}
                                        />
                                    </div>
                                    <button 
                                        onClick={() => courseFileInputRef.current?.click()}
                                        className="shrink-0 p-5 bg-white border-2 border-slate-100 text-slate-400 hover:text-brand-blue hover:border-brand-blue rounded-2xl shadow-sm transition-all active:scale-95"
                                    >
                                        <Camera size={24} />
                                    </button>
                                    <input type="file" ref={courseFileInputRef} className="hidden" accept="image/*" onChange={handleCourseImageSelect} />
                                </div>
                            </div>
                        </div>
                        <div className="mt-12 flex gap-4">
                            <button 
                                onClick={() => setIsCourseModalOpen(false)} 
                                className="flex-1 bg-slate-100 text-slate-600 py-5 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSaveCourse}
                                disabled={courseLoading || !courseFormData.title}
                                className="flex-1 bg-brand-blue text-white py-5 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest shadow-xl shadow-brand-blue/20 hover:bg-brand-blue/90 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {courseLoading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Salvar Curso</>}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* Modal: Nova Aula */}
        <AnimatePresence>
            {isLessonModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" 
                        onClick={() => setIsLessonModalOpen(false)} 
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col p-10 ring-1 ring-black/5"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Adicionar Aula / Atividade</h3>
                            <button onClick={() => setIsLessonModalOpen(false)} className="p-3 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-xl transition-all active:scale-90"><X size={24} /></button>
                        </div>
                        <div className="space-y-6 flex-1 max-h-[60vh] overflow-y-auto px-1 hide-scroll">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Título da Aula</label>
                                <input 
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 outline-none focus:ring-4 focus:ring-brand-blue/10 focus:bg-white font-bold text-slate-800 transition-all"
                                    placeholder="Ex: Introdução ao Canva"
                                    value={lessonFormData.title}
                                    onChange={(e) => setLessonFormData({...lessonFormData, title: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Link do Vídeo ou Conteúdo (YouTube/Vimeo/Embed)</label>
                                <input 
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 outline-none focus:ring-4 focus:ring-brand-blue/10 focus:bg-white font-bold text-slate-800 transition-all text-xs"
                                    placeholder="Cole a URL ou código <iframe>"
                                    value={lessonFormData.videoUrl}
                                    onChange={(e) => setLessonFormData({...lessonFormData, videoUrl: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Duração</label>
                                    <input 
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 outline-none focus:ring-4 focus:ring-brand-blue/10 focus:bg-white font-bold text-slate-800 transition-all text-xs"
                                        placeholder="Ex: 15 min"
                                        value={lessonFormData.duration}
                                        onChange={(e) => setLessonFormData({...lessonFormData, duration: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Descrição curta</label>
                                <textarea 
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 outline-none focus:ring-4 focus:ring-brand-blue/10 focus:bg-white font-bold text-slate-800 transition-all text-xs resize-none"
                                    placeholder="O que será abordado nesta aula?"
                                    rows={3}
                                    value={lessonFormData.description}
                                    onChange={(e) => setLessonFormData({...lessonFormData, description: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="mt-12 flex gap-4">
                            <button 
                                onClick={() => setIsLessonModalOpen(false)} 
                                className="flex-1 bg-slate-100 text-slate-600 py-5 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSaveLesson}
                                disabled={lessonLoading || !lessonFormData.title}
                                className="flex-1 bg-brand-blue text-white py-5 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest shadow-xl shadow-brand-blue/20 hover:bg-brand-blue/90 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {lessonLoading ? <Loader2 className="animate-spin" size={18} /> : <><Plus size={18} strokeWidth={3} /> Publicar Aula</>}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* Modal: Confirmação de Exclusão (Simplificado) */}
        {lessonToDelete && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setLessonToDelete(null)} />
                <div className="bg-white max-w-sm w-full rounded-[2.5rem] p-10 relative z-10 text-center">
                    <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight mb-4">Excluir atividade?</h3>
                    <p className="text-slate-400 text-sm font-medium mb-10 leading-relaxed px-4">Tem certeza que deseja apagar "{lessonToDelete.title}"? Esta ação não pode ser desfeita.</p>
                    <div className="flex gap-4">
                        <button onClick={() => setLessonToDelete(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest">Não</button>
                        <button onClick={confirmDeleteLesson} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-200">{isDeleteLoading ? '...' : 'Excluir'}</button>
                    </div>
                </div>
             </div>
        )}

        {/* Modal: Novo Tópico Fórum */}
        <AnimatePresence>
            {isTopicModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" 
                        onClick={() => setIsTopicModalOpen(false)} 
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col p-10 ring-1 ring-black/5"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Novo Tópico de Discussão</h3>
                            <button onClick={() => setIsTopicModalOpen(false)} className="p-3 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-xl transition-all active:scale-90"><X size={24} /></button>
                        </div>
                        <div className="space-y-6 flex-1">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Assunto</label>
                                <input 
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 outline-none focus:ring-4 focus:ring-brand-blue/10 focus:bg-white font-bold text-slate-800 transition-all"
                                    placeholder="Ex: Dúvida sobre a ferramenta X"
                                    value={topicFormData.title}
                                    onChange={(e) => setTopicFormData({...topicFormData, title: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Conteúdo</label>
                                <textarea 
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 outline-none focus:ring-4 focus:ring-brand-blue/10 focus:bg-white font-bold text-slate-800 transition-all text-sm resize-none"
                                    placeholder="Escreva sua mensagem aqui..."
                                    rows={5}
                                    value={topicFormData.content}
                                    onChange={(e) => setTopicFormData({...topicFormData, content: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="mt-12 flex gap-4">
                            <button 
                                onClick={() => setIsTopicModalOpen(false)} 
                                className="flex-1 bg-slate-100 text-slate-600 py-5 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleCreateTopic}
                                disabled={forumLoading || !topicFormData.title || !topicFormData.content}
                                className="flex-1 bg-brand-blue text-white py-5 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest shadow-xl shadow-brand-blue/20 hover:bg-brand-blue/90 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {forumLoading ? <Loader2 className="animate-spin" size={18} /> : <><MessageCircle size={18} /> Publicar</>}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};
