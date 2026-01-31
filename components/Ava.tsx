import React, { useState, useRef, useEffect } from 'react';
import { Course, DocumentItem, User, UserRole, Lesson } from '../types';
import { supabase } from '../supabaseClient';
import { 
  BookOpen, PlayCircle, Award, ArrowRight, FileText, Download, Upload, 
  Trash2, Search, Filter, Plus, X, Loader2, Save, Edit2, Camera, 
  AlertTriangle, ArrowLeft, Video, CheckCircle, Play, ExternalLink, 
  Youtube, LayoutDashboard, Calendar, MessageSquare, CheckSquare, 
  Menu, ChevronRight, Home, Folder, User as UserIcon, MoreVertical, Link as LinkIcon, MessageCircle, Check, Code
} from 'lucide-react';

interface AvaProps {
  courses: Course[];
  documents: DocumentItem[];
  currentUser: User;
  users: User[];
  onRefresh: () => void;
}

export const Ava: React.FC<AvaProps> = ({ courses, documents, currentUser, users, onRefresh }) => {
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

  // Permissions
  const isAdmin = currentUser && (
    currentUser.role === UserRole.ADMIN || 
    (currentUser.role as string) === 'admin' || 
    (currentUser.role as string) === 'Admin' ||
    (typeof currentUser.role === 'string' && (currentUser.role as string).toLowerCase().includes('coorden'))
  );

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
          return <div className="bg-blue-600 text-white p-1.5 rounded-md"><Video size={16} /></div>;
      }
      if (lesson.videoUrl && (lesson.videoUrl.endsWith('.pdf') || lesson.videoUrl.endsWith('.doc'))) {
          return <div className="bg-red-500 text-white p-1.5 rounded-md"><FileText size={16} /></div>;
      }
      return <div className="bg-blue-400 text-white p-1.5 rounded-md"><LinkIcon size={16} /></div>;
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
        const fileExt = file.name.split('.').pop();
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
        className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors border-l-4 ${active ? 'bg-blue-50 text-blue-700 border-blue-600' : 'text-gray-700 hover:bg-gray-50 border-transparent'}`}
      >
          <div className="flex items-center gap-3">
            <Icon size={18} />
            {sidebarOpen && <span>{label}</span>}
          </div>
          {count !== undefined && sidebarOpen && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{count}</span>}
      </button>
  );

  return (
    <div className="flex flex-col md:flex-row h-full min-h-[calc(100vh-80px)] bg-[#f2f2f2]">
        
        {/* LMS Sidebar */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white border-r border-gray-300 flex-col transition-all duration-300 hidden md:flex shrink-0 shadow-sm z-20`}>
            <div className="p-4 flex items-center justify-between h-16 border-b border-gray-100">
                {sidebarOpen && <span className="font-bold text-lg text-gray-800 tracking-tight">AVA Pascom</span>}
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded">
                    <Menu size={20} />
                </button>
            </div>
            <nav className="flex-1 py-4 space-y-1">
                <SidebarItem icon={LayoutDashboard} label="Painel" active={viewMode === 'dashboard'} onClick={navigateToDashboard} />
                <SidebarItem icon={Home} label="Meus Cursos" active={viewMode === 'course' || viewMode === 'activity' || viewMode.startsWith('forum')} onClick={() => navigateToDashboard()} />
                <SidebarItem icon={Calendar} label="Calendário" active={false} onClick={() => {}} />
                <SidebarItem icon={Folder} label="Arquivos Privados" active={viewMode === 'library'} onClick={navigateToLibrary} />
                
                <div className="my-4 border-t border-gray-100 mx-4"></div>
                
                {sidebarOpen && courses.length > 0 && (
                    <div className="px-4 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wide">Meus Cursos</div>
                )}
                {sidebarOpen && courses.slice(0, 5).map(c => (
                    <button key={c.id} onClick={() => navigateToCourse(c)} className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 truncate flex items-center gap-2 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0"></div>
                        <span className="truncate">{c.title}</span>
                    </button>
                ))}
            </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            
            {/* Breadcrumbs */}
            <div className="bg-white border-b border-gray-300 p-4 flex items-center gap-2 text-sm text-gray-600 h-14 shadow-sm z-10">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden mr-2 text-gray-500"><Menu size={20}/></button>
                <button onClick={navigateToDashboard} className="hover:text-blue-600 hover:underline">Painel</button>
                {selectedCourse && (
                    <>
                        <ChevronRight size={14} className="text-gray-400" />
                        <span className="text-gray-400 text-xs uppercase font-bold tracking-wider hidden sm:inline">Cursos</span>
                        <ChevronRight size={14} className="text-gray-400 hidden sm:inline" />
                        <button onClick={() => navigateToCourse(selectedCourse)} className="hover:text-blue-600 hover:underline truncate max-w-[150px] font-medium text-gray-800">{selectedCourse.title}</button>
                    </>
                )}
                {(viewMode === 'forum' || viewMode === 'forum_topic') && (
                     <>
                        <ChevronRight size={14} className="text-gray-400" />
                        <button onClick={() => navigateToForum(selectedCourse!)} className="hover:text-blue-600 hover:underline font-medium text-gray-800">Fórum de Avisos</button>
                     </>
                )}
                {viewMode === 'forum_topic' && currentTopic && (
                     <>
                        <ChevronRight size={14} className="text-gray-400" />
                        <span className="truncate max-w-[150px]">{currentTopic.title}</span>
                     </>
                )}
                {currentLesson && viewMode === 'activity' && (
                     <>
                        <ChevronRight size={14} className="text-gray-400" />
                        <span className="font-semibold text-gray-500 truncate max-w-[200px]">{currentLesson.title}</span>
                     </>
                )}
            </div>

            <div className="p-4 md:p-8 overflow-y-auto flex-1 scroll-smooth">
                
                {/* --- VIEW: DASHBOARD --- */}
                {viewMode === 'dashboard' && (
                    <div className="max-w-6xl mx-auto animate-fade-in">
                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">Olá, {currentUser.name.split(' ')[0]}!</h1>
                                <p className="text-gray-500 text-sm mt-1">Bem-vindo de volta ao seu ambiente de aprendizado.</p>
                            </div>
                            {isAdmin && (
                                <button 
                                    onClick={() => handleOpenCourseModal()} 
                                    className="text-sm bg-blue-600 text-white px-4 py-2 rounded shadow-sm hover:bg-blue-700 transition flex items-center gap-2"
                                >
                                    <Plus size={16} /> Criar Novo Curso
                                </button>
                            )}
                        </div>
                        {/* Course List... (same as before) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {courses.map(course => (
                                <div key={course.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col group hover:shadow-md transition-all relative">
                                    {isAdmin && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleOpenCourseModal(course); }}
                                            className="absolute top-2 left-2 z-10 bg-white/90 p-1.5 rounded-full text-gray-600 hover:text-blue-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                    )}
                                    <div className="h-36 bg-gray-100 relative overflow-hidden group-hover:opacity-90 transition-opacity cursor-pointer" onClick={() => navigateToCourse(course)}>
                                        {course.thumbnail ? (
                                            <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-300">
                                                <BookOpen size={48} />
                                            </div>
                                        )}
                                        <div className="absolute top-0 right-0 bg-black/50 text-white px-3 py-1 text-[10px] font-bold uppercase rounded-bl-lg backdrop-blur-sm">
                                            {course.category}
                                        </div>
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col">
                                        <h3 onClick={() => navigateToCourse(course)} className="font-bold text-lg text-blue-900 mb-2 cursor-pointer hover:underline line-clamp-2 leading-tight">
                                            {course.title}
                                        </h3>
                                        <div className="mt-auto">
                                            <div className="flex justify-between text-xs text-gray-500 mb-1 font-medium">
                                                <span>Progresso</span>
                                                <span>{course.progress}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${course.progress}%` }}></div>
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
                    <div className="max-w-6xl mx-auto animate-fade-in flex flex-col lg:flex-row gap-6">
                        <div className="flex-1 min-w-0">
                            <div className="bg-white p-6 rounded-t-lg border border-gray-200 shadow-sm mb-6 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2 mt-2">{selectedCourse.title}</h1>
                                <div className="flex items-center gap-4 text-sm text-gray-500 mt-4 pb-2 border-b border-gray-100">
                                    <span className="flex items-center gap-1"><Home size={14} /> Painel</span>
                                    <span>/</span>
                                    <span>Meus Cursos</span>
                                    <span>/</span>
                                    <span className="text-gray-800 font-medium">{selectedCourse.category}</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                                    <div className="flex items-start gap-4 mb-2 cursor-pointer" onClick={() => navigateToForum(selectedCourse)}>
                                        <div className="bg-yellow-500 text-white p-2 rounded-md shrink-0">
                                            <MessageSquare size={20} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-blue-900 hover:underline text-lg">Fórum de Avisos</div>
                                            <p className="text-gray-500 text-sm mt-1">Notícias e avisos gerais sobre o curso.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center rounded-t-lg">
                                        <h2 className="font-bold text-gray-800 text-lg">Conteúdo do Curso</h2>
                                        {isAdmin && (
                                            <button 
                                                onClick={() => setIsEditingMode(!isEditingMode)}
                                                className={`text-xs px-3 py-1.5 rounded flex items-center gap-1 transition-colors ${isEditingMode ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                            >
                                                {isEditingMode ? <X size={12} /> : <Edit2 size={12} />} 
                                                {isEditingMode ? 'Desativar edição' : 'Ativar edição'}
                                            </button>
                                        )}
                                    </div>
                                    <div className="divide-y divide-gray-100">
                                        {lessonsLoading ? (
                                            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" /></div>
                                        ) : lessons.length === 0 ? (
                                            <div className="p-8 text-center text-gray-400 italic">Nenhum conteúdo disponível.</div>
                                        ) : (
                                            <div className="p-0">
                                                {lessons.map((lesson) => {
                                                    const isCompleted = completedLessonIds.has(lesson.id);
                                                    return (
                                                        <div key={lesson.id} className="flex items-start justify-between p-4 hover:bg-gray-50 transition-colors group border-b last:border-0 border-gray-50">
                                                            <div className="flex items-start gap-4 flex-1">
                                                                <div className="mt-1 shrink-0">{getActivityIcon(lesson)}</div>
                                                                <div className="flex-1">
                                                                    <button 
                                                                        onClick={() => navigateToActivity(lesson)}
                                                                        className="font-medium text-gray-800 hover:text-blue-600 hover:underline text-left block text-base mb-1"
                                                                    >
                                                                        {lesson.title}
                                                                    </button>
                                                                    {lesson.description && <div className="text-sm text-gray-500 mb-2">{lesson.description}</div>}
                                                                    {lesson.duration && <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">{lesson.duration}</span>}
                                                                </div>
                                                            </div>
                                                            {isEditingMode ? (
                                                                <div className="ml-4 shrink-0 flex items-center gap-2">
                                                                    <button onClick={() => handleDeleteLesson(lesson)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                                                                </div>
                                                            ) : (
                                                                <div className="ml-4 shrink-0 flex flex-col items-center gap-1">
                                                                    <button 
                                                                        onClick={() => toggleLessonCompletion(lesson.id)}
                                                                        className={`w-6 h-6 rounded border-2 cursor-pointer flex items-center justify-center transition-all ${
                                                                            isCompleted 
                                                                            ? 'bg-blue-600 border-blue-600 text-white' 
                                                                            : 'border-dashed border-gray-300 hover:border-solid hover:border-blue-500 hover:bg-blue-50'
                                                                        }`}
                                                                        title={isCompleted ? "Marcar como não feito" : "Marcar como feito"}
                                                                    >
                                                                        {isCompleted && <Check size={14} strokeWidth={3} />}
                                                                    </button>
                                                                    <span className={`text-[9px] uppercase font-bold ${isCompleted ? 'text-blue-600' : 'text-gray-300'}`}>
                                                                        {isCompleted ? 'Feito' : 'Pendente'}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {isEditingMode && (
                                            <div className="p-4 bg-blue-50 border-t border-gray-100 flex justify-end">
                                                <button onClick={handleOpenLessonModal} className="text-sm text-blue-600 hover:underline flex items-center gap-1 font-medium"><Plus size={16} /> Adicionar uma atividade</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Right Blocks */}
                        <div className="w-full lg:w-80 space-y-6 shrink-0">
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 font-bold text-gray-800 text-sm">Status</div>
                                <div className="p-5 flex flex-col items-center">
                                    <div className="relative w-28 h-28 flex items-center justify-center mb-3">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="56" cy="56" r="48" stroke="#f3f4f6" strokeWidth="8" fill="transparent" />
                                            <circle cx="56" cy="56" r="48" stroke="#2563eb" strokeWidth="8" fill="transparent" strokeDasharray={`${selectedCourse.progress * 3.01} 301`} strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute flex flex-col items-center"><span className="text-2xl font-bold text-gray-800">{selectedCourse.progress}%</span></div>
                                    </div>
                                    <p className="text-xs text-center text-gray-500">
                                        {lessons.filter(l => completedLessonIds.has(l.id)).length} de {lessons.length} atividades concluídas.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- VIEW: FORUM LIST --- */}
                {viewMode === 'forum' && selectedCourse && (
                    <div className="max-w-6xl mx-auto animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-2xl font-bold text-gray-800">Fórum de Avisos</h1>
                            {isAdmin && (
                                <button 
                                    onClick={() => setIsTopicModalOpen(true)}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center gap-2"
                                >
                                    <Plus size={16} /> Novo Tópico
                                </button>
                            )}
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-50 border-b border-gray-200 flex px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                <div className="flex-1">Tópico</div>
                                <div className="w-48 hidden md:block">Iniciado por</div>
                                <div className="w-32 hidden md:block text-right">Data</div>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {forumLoading ? (
                                    <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-gray-400" /></div>
                                ) : forumTopics.length === 0 ? (
                                    <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                                        <MessageCircle size={48} className="mb-2 opacity-20" />
                                        <p>Nenhum tópico de discussão ainda.</p>
                                    </div>
                                ) : (
                                    forumTopics.map((topic) => (
                                        <div key={topic.id} className="flex px-6 py-4 hover:bg-blue-50/50 transition-colors cursor-pointer group" onClick={() => navigateToForumTopic(topic)}>
                                            <div className="flex-1">
                                                <h3 className="text-sm font-bold text-blue-900 group-hover:underline mb-1">{topic.title}</h3>
                                                <p className="text-xs text-gray-500 md:hidden">Por {getUserName(topic.author_id)} • {new Date(topic.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <div className="w-48 hidden md:flex items-center gap-2">
                                                <img src={getUserAvatar(topic.author_id) || "https://via.placeholder.com/32"} className="w-6 h-6 rounded-full" alt="" />
                                                <span className="text-sm text-gray-700 truncate">{getUserName(topic.author_id)}</span>
                                            </div>
                                            <div className="w-32 hidden md:block text-right text-sm text-gray-500">
                                                {new Date(topic.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- VIEW: FORUM TOPIC DETAIL --- */}
                {viewMode === 'forum_topic' && currentTopic && (
                    <div className="max-w-4xl mx-auto animate-fade-in">
                        <button onClick={() => navigateToForum(selectedCourse!)} className="mb-4 text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1">
                            <ArrowLeft size={14} /> Voltar ao Fórum
                        </button>
                        
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-4">
                            <h1 className="text-2xl font-bold text-gray-900 mb-4">{currentTopic.title}</h1>
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                                <img src={getUserAvatar(currentTopic.author_id) || "https://via.placeholder.com/40"} className="w-10 h-10 rounded-full border border-gray-200" alt="" />
                                <div>
                                    <div className="font-bold text-gray-800 text-sm">{getUserName(currentTopic.author_id)}</div>
                                    <div className="text-xs text-gray-500">{new Date(currentTopic.created_at).toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">
                                {currentTopic.content}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- VIEW: ACTIVITY --- */}
                {viewMode === 'activity' && currentLesson && (
                    <div className="max-w-5xl mx-auto animate-fade-in">
                        <div className="mb-4">
                             <button onClick={() => selectedCourse && navigateToCourse(selectedCourse)} className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1">
                                <ArrowLeft size={14} /> Voltar para {selectedCourse?.title}
                             </button>
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                            <div className="p-6 border-b border-gray-200 bg-white">
                                <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                                    {getActivityIcon(currentLesson)}
                                    <span className="uppercase tracking-wider font-bold text-xs">Atividade</span>
                                </div>
                                <h1 className="text-2xl font-bold text-gray-900">{currentLesson.title}</h1>
                                {currentLesson.description && <p className="text-gray-600 mt-2">{currentLesson.description}</p>}
                            </div>
                            <div className="flex-1 bg-gray-100 p-4 md:p-8 flex items-center justify-center">
                                {(() => {
                                    const embed = getEmbedUrl(currentLesson.videoUrl);
                                    if (embed?.type === 'html') {
                                        return (
                                            <div className="w-full max-w-4xl bg-white rounded shadow-lg overflow-hidden p-2">
                                                <div className="w-full" dangerouslySetInnerHTML={{ __html: embed.src }} />
                                            </div>
                                        );
                                    } else if (embed?.type === 'youtube' || embed?.type === 'vimeo') {
                                        return (
                                            <div className="w-full max-w-4xl aspect-video bg-black rounded shadow-lg overflow-hidden">
                                                <iframe src={embed.src} title={currentLesson.title} className="w-full h-full border-0" allowFullScreen></iframe>
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div className="text-center p-12 bg-white rounded-lg border border-gray-200 shadow-sm max-w-lg w-full">
                                                <FileText size={32} className="mx-auto text-blue-500 mb-4" />
                                                <h3 className="text-lg font-bold text-gray-800 mb-2">Material Externo</h3>
                                                <p className="text-gray-500 mb-6 text-sm px-4">Este conteúdo é um documento ou link externo.</p>
                                                <a href={currentLesson.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium shadow-sm">
                                                    <ExternalLink size={18} /> Abrir Recurso
                                                </a>
                                            </div>
                                        );
                                    }
                                })()}
                            </div>
                        </div>
                    </div>
                )}
                
                {/* --- VIEW: LIBRARY --- */}
                {viewMode === 'library' && (
                    <div className="max-w-5xl mx-auto animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                             <h1 className="text-2xl font-bold text-gray-800">Arquivos Privados</h1>
                             <button onClick={() => setIsUploadModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                                <Upload size={16} /> Enviar
                            </button>
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
                             <Folder size={48} className="mx-auto mb-2 opacity-20" />
                             <p>Gestão de arquivos.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* --- MODAL: CREATE COURSE --- */}
        {isCourseModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-gray-800">{editingCourseId ? 'Editar Curso' : 'Novo Curso'}</h3>
                        <button onClick={() => setIsCourseModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Título do Curso</label>
                            <input type="text" value={courseFormData.title} onChange={(e) => setCourseFormData({...courseFormData, title: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-100 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                            <select value={courseFormData.category} onChange={(e) => setCourseFormData({...courseFormData, category: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-100 outline-none">
                                <option value="Geral">Geral</option><option value="Liturgia">Liturgia</option><option value="Técnica">Técnica</option><option value="Espiritualidade">Espiritualidade</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Capa do Curso</label>
                            <div onClick={() => courseFileInputRef.current?.click()} className="w-full h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 overflow-hidden relative">
                                {courseFormData.thumbnail ? <img src={courseFormData.thumbnail} className="w-full h-full object-cover" alt="Cover" /> : <div className="text-center text-gray-400"><Camera size={24} className="mx-auto mb-1" /><span className="text-xs">Clique para enviar imagem</span></div>}
                            </div>
                            <input type="file" ref={courseFileInputRef} className="hidden" accept="image/*" onChange={handleCourseImageSelect} />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <button onClick={() => setIsCourseModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium">Cancelar</button>
                        <button onClick={handleSaveCourse} disabled={courseLoading} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 flex items-center gap-2">{courseLoading && <Loader2 size={14} className="animate-spin" />} Salvar</button>
                    </div>
                </div>
            </div>
        )}

        {/* --- MODAL: CREATE TOPIC --- */}
        {isTopicModalOpen && (
            <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-gray-800">Novo Tópico de Discussão</h3>
                        <button onClick={() => setIsTopicModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assunto</label>
                            <input type="text" value={topicFormData.title} onChange={(e) => setTopicFormData({...topicFormData, title: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Título do aviso..." />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
                            <textarea value={topicFormData.content} onChange={(e) => setTopicFormData({...topicFormData, content: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-100 outline-none h-32 resize-none" placeholder="Escreva sua mensagem..."></textarea>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <button onClick={() => setIsTopicModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium">Cancelar</button>
                        <button onClick={handleCreateTopic} disabled={forumLoading} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                             {forumLoading && <Loader2 size={14} className="animate-spin" />} Publicar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- MODAL: ADD LESSON --- */}
        {isLessonModalOpen && (
            <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-gray-800">Novo Recurso/Atividade</h3>
                        <button onClick={() => setIsLessonModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                            <input type="text" value={lessonFormData.title} onChange={(e) => setLessonFormData({...lessonFormData, title: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-100 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Link (YouTube/PDF/Doc) ou Código HTML (Embed)</label>
                            <input type="text" value={lessonFormData.videoUrl} onChange={(e) => setLessonFormData({...lessonFormData, videoUrl: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-100 outline-none" placeholder="https://... ou <iframe..." />
                            <p className="text-xs text-gray-400 mt-1">Para incorporar conteúdo (Google Forms, Genially, etc), cole o código HTML começando com &lt;.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Duração (opcional)</label>
                                <input type="text" value={lessonFormData.duration} onChange={(e) => setLessonFormData({...lessonFormData, duration: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Ex: 10 min" />
                             </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                            <textarea value={lessonFormData.description} onChange={(e) => setLessonFormData({...lessonFormData, description: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-100 outline-none" rows={3}></textarea>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <button onClick={() => setIsLessonModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium">Cancelar</button>
                        <button onClick={handleSaveLesson} disabled={lessonLoading} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                             {lessonLoading && <Loader2 size={14} className="animate-spin" />} Adicionar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- MODAL: DELETE LESSON CONFIRMATION --- */}
        {lessonToDelete && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full text-center">
                    <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Atividade?</h3>
                    <p className="text-sm text-gray-600 mb-6">Você tem certeza que deseja remover <b>"{lessonToDelete.title}"</b>? Esta ação não pode ser desfeita.</p>
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setLessonToDelete(null)} 
                            className="flex-1 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                            disabled={isDeleteLoading}
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={confirmDeleteLesson}
                            disabled={isDeleteLoading}
                            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                            {isDeleteLoading && <Loader2 size={16} className="animate-spin" />}
                            Excluir
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- MODAL UPLOAD FILE (Library) --- */}
        {isUploadModalOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
                    <h3 className="font-bold text-lg mb-4">Enviar Arquivo Privado</h3>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 hover:bg-gray-100 cursor-pointer">
                        <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Clique para selecionar</p>
                        <input type="file" className="hidden" />
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <button onClick={() => setIsUploadModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium">Cancelar</button>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};