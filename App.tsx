import React, { useState, useEffect, useCallback } from 'react';
import { Home, Calendar, CheckSquare, Users, GraduationCap, Bell, Search, Menu, Loader2, LogOut, LayoutGrid, X, Box, Palette, Copy, ChevronRight, ClipboardList, DollarSign } from 'lucide-react';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import { 
  User, Post, Task, ScheduleEvent, Course, AppNotification, 
  InventoryItem, DocumentItem, UserRole, isCoordinator,
  FinancialAccount, FinancialCategory, FinancialProject, FinancialTransaction
} from './types';
import { Feed } from './components/Feed';
import { Tasks } from './components/Tasks';
import { Schedules } from './components/Schedules';
import { Ava } from './components/Ava';
import { Agents } from './components/Agents';
import { Inventory } from './components/Inventory';
import { Profile } from './components/Profile';
import { Login } from './components/Login';
import { NotificationsPanel } from './components/NotificationsPanel';
import { Registrations } from './components/Registrations';
import { FinancialPatrimony } from './components/FinancialPatrimony';

type Tab = 'feed' | 'escalas' | 'tarefas' | 'ava' | 'agentes' | 'patrimonio' | 'tesouro' | 'perfil';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  // Application State
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEvent[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [financialCategories, setFinancialCategories] = useState<FinancialCategory[]>([]);
  const [financialProjects, setFinancialProjects] = useState<FinancialProject[]>([]);
  const [financialTransactions, setFinancialTransactions] = useState<FinancialTransaction[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Handle Auth Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Service Worker Registration for Notifications ---
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Usando caminho relativo direto para garantir que o SW seja registrado na mesma origem.
      // Removido o uso de new URL(..., import.meta.url) que causava erro de construção de URL em certos contextos.
      navigator.serviceWorker.register('sw.js', { scope: './' })
        .then((registration) => {
          console.log('Service Worker Registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.error('Service Worker Registration Failed:', error);
        });
    }
  }, []);

  // System Notification Logic
  const requestSystemNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (e) {
        console.warn("Notification permission request failed", e);
      }
    }
  }, []);

  const sendSystemNotification = async (title: string, body: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
      // Prioridade: Service Worker (para mobile/PWA e background)
      if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration('./');
          if (registration && registration.showNotification) {
              await registration.showNotification(title, {
                  body: body,
                  icon: 'https://i.imgur.com/ofoiwCd.png',
                  vibrate: [200, 100, 200],
                  tag: 'pascom-app'
              } as any);
              return;
          }
      }

      // Fallback: API de Notificação Nativa (Desktop)
      new Notification(title, {
        body: body,
        icon: 'https://i.imgur.com/ofoiwCd.png',
        vibrate: [200, 100, 200]
      } as any);
    } catch (e) {
      console.warn('System Notification failed', e);
    }
  };

  const refreshData = useCallback(async () => {
    if (!session) return;
    
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      if (profilesError) throw profilesError;

      const mappedUsers: User[] = (profilesData || []).map((p: any) => ({
        id: p.id,
        name: p.name ? p.name.split(' ').slice(0, 2).join(' ') : 'Sem Nome',
        role: p.role,
        avatar: p.avatar,
        birthday: p.birthday || p.birth_date || p.birthdate || p.data_nascimento || p.nascimento || p.aniversario || '',
        skills: p.skills || []
      }));

      setUsers(mappedUsers);
      const activeUser = mappedUsers.find(u => u.id === session.user.id);
      setCurrentUser(activeUser || null);

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('timestamp', { ascending: false });
      if (postsError) throw postsError;
      setPosts((postsData || []).map((p: any) => ({
        id: p.id,
        authorId: p.author_id,
        content: p.content,
        type: p.type,
        timestamp: new Date(p.timestamp).toLocaleString('pt-BR'), 
        likes: p.likes || 0,
        comments: p.comments || 0,
        image: p.image,
        pollOptions: p.poll_options
      })));

      const { data: tasksData, error: tasksError } = await supabase.from('tasks').select('*');
      if (tasksError) throw tasksError;
      setTasks((tasksData || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        assigneeIds: t.assignee_ids || [],
        dueDate: t.due_date,
        priority: t.priority,
        status: t.status,
        tags: t.tags || []
      })));

      const { data: schedulesData, error: schedulesError } = await supabase
        .from('schedules')
        .select('*')
        .order('date', { ascending: true });
      if (schedulesError) throw schedulesError;
      setSchedules((schedulesData || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        date: s.date,
        time: s.time,
        type: s.type,
        roles: s.roles || [] 
      })));

      const { data: coursesDataRaw } = await supabase.from('courses').select('*');
      const { data: lessonsData } = await supabase.from('lessons').select('id, course_id');
      const { data: userProgressData } = await supabase.from('user_progress').select('lesson_id, user_id');
      setCourses((coursesDataRaw || []).map((c: any) => {
        const courseLessons = (lessonsData || []).filter((l: any) => l.course_id === c.id);
        const completedCount = (userProgressData || []).filter((up: any) => 
          activeUser && up.user_id === activeUser.id && 
          courseLessons.some((l: any) => l.id === up.lesson_id)
        ).length;
        return {
          id: c.id,
          title: c.title,
          category: c.category,
          thumbnail: c.cover_image,
          lessonsCount: courseLessons.length,
          progress: courseLessons.length > 0 ? Math.round((completedCount / courseLessons.length) * 100) : 0
        };
      }));

      const { data: inventoryData } = await supabase.from('inventory').select('*');
      setInventory((inventoryData || []).map((i: any) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        condition: i.condition,
        status: i.status,
        holderId: i.holder_id,
        image: i.image
      })));

      // Financial Data
      const { data: accountsData } = await supabase.from('financial_accounts').select('*');
      setFinancialAccounts(accountsData || []);

      const { data: categoriesData } = await supabase.from('financial_categories').select('*');
      setFinancialCategories(categoriesData || []);

      const { data: projectsData } = await supabase.from('financial_projects').select('*');
      setFinancialProjects((projectsData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        budgetPlanned: p.budget_planned || 0,
        budgetExecuted: p.budget_executed || 0
      })));

      const { data: transactionsData } = await supabase.from('financial_transactions').select('*').order('date', { ascending: false });
      setFinancialTransactions((transactionsData || []).map((t: any) => ({
        id: t.id,
        type: t.type,
        value: t.value,
        date: t.date,
        categoryId: t.category_id,
        accountId: t.account_id,
        toAccountId: t.to_account_id,
        projectId: t.project_id,
        paymentMethod: t.payment_method,
        description: t.description,
        status: t.status,
        createdAt: t.created_at
      })));

      const { data: notifData } = await supabase.from('notifications')
        .select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(50);
      setNotifications((notifData || []).map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        type: n.type,
        title: n.title,
        content: n.content,
        isRead: n.is_read,
        createdAt: n.created_at,
        relatedId: n.related_id
      })));
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [session]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const playNotificationSound = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.3);
            osc.stop(ctx.currentTime + 0.3);
        } catch (e) { console.error("Audio failed", e); }
    };

    const channel = supabase.channel('app-realtime-sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, (p) => {
         const newNotif: AppNotification = { id: p.new.id, userId: p.new.user_id, type: p.new.type, title: p.new.title, content: p.new.content, isRead: p.new.is_read, createdAt: p.new.created_at, relatedId: p.new.related_id };
         setNotifications(prev => [newNotif, ...prev]);
         playNotificationSound();
         sendSystemNotification(newNotif.title, newNotif.content);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => refreshData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id, refreshData]);

  useEffect(() => { if (session) refreshData().finally(() => setLoading(false)); }, [session, refreshData]);

  const handleLogout = async () => { await supabase.auth.signOut(); setSession(null); setUsers([]); setCurrentUser(null); };

  const handleMarkAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const handleMarkAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', session?.user.id);
  };

  const handleClearAll = async () => {
    setNotifications([]);
    await supabase.from('notifications').delete().eq('user_id', session?.user.id);
  };

  if (!session) return <Login />;

  // Unificação da lógica de Coordenador e admin
  const isUserCoordinator = currentUser && isCoordinator(currentUser.role);

  const renderContent = () => {
    if (loading) return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <Loader2 size={40} className="animate-spin mb-4 text-blue-600" />
        <p className="font-medium animate-pulse">Sincronizando Pascom...</p>
      </div>
    );
    if (!currentUser) return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
         <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
             <Users size={48} className="text-slate-300 mb-4" />
             <h3 className="text-xl font-bold text-slate-700">Perfil não encontrado</h3>
             <button onClick={handleLogout} className="mt-6 text-blue-600 font-semibold hover:underline">Sair</button>
         </div>
      </div>
    );

    switch (activeTab) {
      case 'feed': return <Feed posts={posts} users={users} currentUser={currentUser} onRefresh={refreshData} />;
      case 'tarefas': return <Tasks tasks={tasks} users={users} currentUser={currentUser} onRefresh={refreshData} />;
      case 'escalas': return <Schedules schedules={schedules} users={users} currentUser={currentUser} onRefresh={refreshData} />;
      case 'ava': return <Ava courses={courses} documents={documents} currentUser={currentUser} users={users} onRefresh={refreshData} />;
      case 'agentes': return <Agents users={users} currentUser={currentUser} onRefresh={refreshData} />;
      case 'patrimonio': return <Inventory items={inventory} users={users} currentUser={currentUser} onRefresh={refreshData} />;
      case 'tesouro': return (
        <FinancialPatrimony 
          accounts={financialAccounts}
          categories={financialCategories}
          projects={financialProjects}
          transactions={financialTransactions}
          currentUser={currentUser}
          onRefresh={refreshData}
        />
      );
      case 'perfil': return <Profile user={currentUser} email={session.user.email} tasks={tasks} schedules={schedules} posts={posts} onUpdate={refreshData} />;
      default: return <Feed posts={posts} users={users} currentUser={currentUser} onRefresh={refreshData} />;
    }
  };

  const NavItem = ({ tab, icon: Icon, label }: { tab: Tab; icon: React.ElementType; label: string }) => {
    const isActive = activeTab === tab;
    return (
      <button
        onClick={() => { setActiveTab(tab); setMobileMenuOpen(false); }}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left group ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
      >
        <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} />
        <span className="font-medium text-sm">{label}</span>
      </button>
    );
  };

  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden relative font-sans text-slate-900">
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-2xl flex flex-col border-r border-slate-100">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
               <img src="https://i.imgur.com/ofoiwCd.png" alt="Logo" className="h-10 w-auto" />
               <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 p-1"><X size={20} /></button>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Principal</p>
              <NavItem tab="feed" icon={LayoutGrid} label="Mural" />
              <NavItem tab="escalas" icon={Calendar} label="Escalas" />
              <NavItem tab="tarefas" icon={CheckSquare} label="Tarefas" />
              <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-6">Gestão</p>
              <NavItem tab="ava" icon={GraduationCap} label="Formação" />
              <NavItem tab="agentes" icon={Users} label="Agentes" />
              <NavItem tab="patrimonio" icon={Box} label="Patrimônio" />
              {(isUserCoordinator || (currentUser && currentUser.role === UserRole.TREASURER)) && (
                <NavItem tab="tesouro" icon={DollarSign} label="Tesouro" />
              )}
            </nav>
          </aside>
        </div>
      )}

      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200 h-full shrink-0 z-40">
        <div className="p-8 pb-4">
          <img src="https://i.imgur.com/ofoiwCd.png" alt="Logo" className="h-12 w-auto" />
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Principal</p>
          <NavItem tab="feed" icon={LayoutGrid} label="Mural" />
          <NavItem tab="escalas" icon={Calendar} label="Escalas" />
          <NavItem tab="tarefas" icon={CheckSquare} label="Tarefas" />
          <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-8">Gestão</p>
          <NavItem tab="ava" icon={GraduationCap} label="Formação" />
          <NavItem tab="agentes" icon={Users} label="Agentes" />
          <NavItem tab="patrimonio" icon={Box} label="Patrimônio" />
          {(isUserCoordinator || (currentUser && currentUser.role === UserRole.TREASURER)) && (
            <NavItem tab="tesouro" icon={DollarSign} label="Tesouro" />
          )}
        </nav>
        {currentUser && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/30">
             <div className="rounded-xl p-3 flex items-center gap-3 mb-2 cursor-pointer hover:bg-white transition-all" onClick={() => setActiveTab('perfil')}>
                <img src={currentUser.avatar} alt="Me" className="w-10 h-10 rounded-full object-cover shadow-sm" />
                <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-slate-900 truncate">{currentUser.name}</p>
                    <p className="text-xs text-blue-600 truncate font-medium">{currentUser.role}</p>
                </div>
             </div>
             <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-red-600 py-2 rounded-lg text-sm font-medium transition-colors"><LogOut size={16} /> Sair</button>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col h-full min-w-0 relative overflow-hidden bg-slate-50">
        <NotificationsPanel notifications={notifications} isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} onMarkAsRead={handleMarkAsRead} onMarkAllAsRead={handleMarkAllAsRead} onClearAll={handleClearAll} onRequestSystemPermissions={requestSystemNotificationPermission} />
        <header className="md:hidden bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 shrink-0 flex justify-between items-center z-30 sticky top-0">
           <button onClick={() => setMobileMenuOpen(true)} className="text-slate-700 p-2"><Menu size={24} /></button>
           <img src="https://i.imgur.com/ofoiwCd.png" alt="Pascom" className="h-8 w-auto" />
           <button onClick={() => setNotificationsOpen(true)} className="relative p-2"><Bell size={22} /> {notifications.filter(n => !n.isRead).length > 0 && <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}</button>
        </header>
        <header className="hidden md:flex justify-between items-center px-8 py-5 shrink-0 bg-slate-50/90 backdrop-blur-sm z-30 sticky top-0">
           <div className="flex-1 max-w-lg relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input type="text" placeholder="Pesquisar..." className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 shadow-sm outline-none transition-all" />
           </div>
           <button onClick={() => setNotificationsOpen(true)} className="relative p-2.5 rounded-full bg-white border border-slate-200 ml-4"><Bell size={20} /> {notifications.filter(n => !n.isRead).length > 0 && <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full"></span>}</button>
        </header>
        <div className="flex-1 overflow-y-auto p-0 md:px-2 hide-scroll">{renderContent()}</div>
      </main>
    </div>
  );
}

export default App;