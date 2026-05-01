import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, TrendingUp, TrendingDown, ArrowLeftRight, 
  PieChart, FileText, Plus, Filter, AlertTriangle, 
  ChevronRight, Wallet, Tag, Briefcase, Calendar,
  MoreHorizontal, Download, Trash2, Edit2, CheckCircle2, XCircle, Clock, X, Save, Loader2
} from 'lucide-react';
import { 
  FinancialAccount, FinancialCategory, FinancialProject, 
  FinancialTransaction, FinancialTransactionType, FinancialTransactionStatus,
  User, UserRole, isCoordinator
} from '../types';
import { supabase } from '../supabaseClient';

interface FinancialPatrimonyProps {
  accounts: FinancialAccount[];
  categories: FinancialCategory[];
  projects: FinancialProject[];
  transactions: FinancialTransaction[];
  currentUser: User;
  onRefresh: () => void;
}

export const FinancialPatrimony: React.FC<FinancialPatrimonyProps> = ({
  accounts,
  categories,
  projects,
  transactions,
  currentUser,
  onRefresh
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'transacoes' | 'contas' | 'projetos' | 'categorias'>('dashboard');
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filter states
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');

  // Form states
  const [transactionForm, setTransactionForm] = useState({
    type: FinancialTransactionType.EXPENSE,
    value: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    categoryId: '',
    accountId: '',
    toAccountId: '',
    projectId: '',
    paymentMethod: 'PIX',
    status: FinancialTransactionStatus.PAID
  });

  const [accountForm, setAccountForm] = useState({
    name: '',
    type: 'Caixa' as any,
    balance: '0'
  });

  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    budgetPlanned: '0'
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    type: 'Saída' as any
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  // Scroll lock when modal is open
  useEffect(() => {
    const scrollContainer = document.querySelector('.overflow-y-auto.flex-1');
    const isAnyModalOpen = isAddingTransaction || isAddingAccount || isAddingProject || isAddingCategory;
    
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
  }, [isAddingTransaction, isAddingAccount, isAddingProject, isAddingCategory]);

  // Permissions
  const isAdmin = isCoordinator(currentUser.role);
  const isTreasurer = currentUser.role === UserRole.TREASURER;
  const isFinancial = isAdmin || isTreasurer || currentUser.role === 'Financeiro';
  const canAdd = isFinancial;
  const canEdit = isAdmin || currentUser.role === 'Financeiro';
  const canApprove = isAdmin;

  // Dashboard Calculations
  const totalBalance = useMemo(() => accounts.reduce((acc, curr) => acc + Number(curr.balance), 0), [accounts]);
  
  const currentMonthTransactions = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return transactions.filter(t => new Date(t.date) >= startOfMonth);
  }, [transactions]);

  const monthlyIncome = useMemo(() => 
    currentMonthTransactions
      .filter(t => t.type === FinancialTransactionType.INCOME && t.status === FinancialTransactionStatus.PAID)
      .reduce((acc, curr) => acc + Number(curr.value), 0)
  , [currentMonthTransactions]);

  const monthlyExpense = useMemo(() => 
    currentMonthTransactions
      .filter(t => t.type === FinancialTransactionType.EXPENSE && t.status === FinancialTransactionStatus.PAID)
      .reduce((acc, curr) => acc + Number(curr.value), 0)
  , [currentMonthTransactions]);

  const monthlyResult = monthlyIncome - monthlyExpense;

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchProject = filterProject === 'all' || t.projectId === filterProject;
      const matchAccount = filterAccount === 'all' || t.accountId === filterAccount || t.toAccountId === filterAccount;
      const matchCategory = filterCategory === 'all' || t.categoryId === filterCategory;
      const matchDateStart = !filterDateStart || new Date(t.date) >= new Date(filterDateStart);
      const matchDateEnd = !filterDateEnd || new Date(t.date) <= new Date(filterDateEnd);
      return matchProject && matchAccount && matchCategory && matchDateStart && matchDateEnd;
    });
  }, [transactions, filterProject, filterAccount, filterCategory, filterDateStart, filterDateEnd]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      // Pega apenas a parte da data (YYYY-MM-DD) caso venha um ISO completo ou timestamp
      const datePart = dateStr.split('T')[0].split(' ')[0];
      const parts = datePart.split('-');
      
      if (parts.length === 3) {
        const [year, month, day] = parts.map(Number);
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('pt-BR');
        }
      }
      
      // Fallback para o comportamento padrão caso o split falhe
      const fallbackDate = new Date(dateStr);
      return isNaN(fallbackDate.getTime()) ? 'Data Inválida' : fallbackDate.toLocaleDateString('pt-BR');
    } catch (e) {
      return 'Data Inválida';
    }
  };

  const resetTransactionForm = () => {
    setTransactionForm({
      type: FinancialTransactionType.EXPENSE,
      value: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      categoryId: '',
      accountId: '',
      toAccountId: '',
      projectId: '',
      paymentMethod: 'PIX',
      status: FinancialTransactionStatus.PAID
    });
    setEditingId(null);
  };

  const handleSaveTransaction = async () => {
    if (!transactionForm.description || !transactionForm.value || !transactionForm.accountId) {
      alert('Preencha os campos obrigatórios (Descrição, Valor e Conta)');
      return;
    }

    setLoading(true);
    try {
      let finalStatus = transactionForm.status;
      
      // Se for tesoureiro e não for admin, o lançamento entra como pendente de aprovação
      if (isTreasurer && !isAdmin && !editingId) {
        finalStatus = FinancialTransactionStatus.PENDING_APPROVAL;
      }

      const payload = {
        type: transactionForm.type,
        value: Number(transactionForm.value),
        date: transactionForm.date,
        description: transactionForm.description,
        category_id: transactionForm.categoryId || null,
        account_id: transactionForm.accountId,
        to_account_id: transactionForm.toAccountId || null,
        project_id: transactionForm.projectId || null,
        payment_method: transactionForm.paymentMethod,
        status: finalStatus
      };

      if (editingId) {
        const { error } = await supabase.from('financial_transactions').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('financial_transactions').insert([payload]);
        if (error) throw error;

        // Atualizar saldo da conta apenas para NOVOS lançamentos pagos
        if (finalStatus === FinancialTransactionStatus.PAID) {
          const account = accounts.find(a => a.id === transactionForm.accountId);
          if (account) {
            let newBalance = Number(account.balance);
            if (transactionForm.type === FinancialTransactionType.INCOME) newBalance += Number(transactionForm.value);
            else if (transactionForm.type === FinancialTransactionType.EXPENSE) newBalance -= Number(transactionForm.value);
            
            await supabase.from('financial_accounts').update({ balance: newBalance }).eq('id', account.id);
          }
        }
      }

      setIsAddingTransaction(false);
      resetTransactionForm();
      onRefresh();
      
      if (isTreasurer && !isAdmin && !editingId) {
        alert('Lançamento enviado para aprovação do coordenador.');
      }
    } catch (e: any) {
      console.error(e);
      alert('Erro ao salvar transação: ' + (e.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditTransaction = (transaction: FinancialTransaction) => {
    setTransactionForm({
      type: transaction.type,
      value: transaction.value.toString(),
      date: transaction.date,
      description: transaction.description,
      categoryId: transaction.categoryId || '',
      accountId: transaction.accountId,
      toAccountId: transaction.toAccountId || '',
      projectId: transaction.projectId || '',
      paymentMethod: transaction.paymentMethod,
      status: transaction.status
    });
    setEditingId(transaction.id);
    setIsAddingTransaction(true);
  };

  const handleDeleteTransaction = async (transaction: FinancialTransaction) => {
    if (!window.confirm('Tem certeza que deseja excluir este lançamento?')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('financial_transactions').delete().eq('id', transaction.id);
      if (error) throw error;

      // Reverter saldo da conta se estava pago
      if (transaction.status === FinancialTransactionStatus.PAID) {
        const account = accounts.find(a => a.id === transaction.accountId);
        if (account) {
          let newBalance = Number(account.balance);
          if (transaction.type === FinancialTransactionType.INCOME) newBalance -= Number(transaction.value);
          else if (transaction.type === FinancialTransactionType.EXPENSE) newBalance += Number(transaction.value);
          
          await supabase.from('financial_accounts').update({ balance: newBalance }).eq('id', account.id);
        }
      }

      onRefresh();
    } catch (e: any) {
      console.error(e);
      alert('Erro ao excluir lançamento: ' + (e.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTransaction = async (transaction: FinancialTransaction) => {
    if (!canApprove) return;
    if (!window.confirm('Deseja aprovar este lançamento? O saldo da conta será atualizado.')) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('financial_transactions')
        .update({ status: FinancialTransactionStatus.PAID })
        .eq('id', transaction.id);
      
      if (error) throw error;

      // Atualizar saldo da conta
      const account = accounts.find(a => a.id === transaction.accountId);
      if (account) {
        let newBalance = Number(account.balance);
        if (transaction.type === FinancialTransactionType.INCOME) newBalance += Number(transaction.value);
        else if (transaction.type === FinancialTransactionType.EXPENSE) newBalance -= Number(transaction.value);
        
        await supabase.from('financial_accounts').update({ balance: newBalance }).eq('id', account.id);
      }

      onRefresh();
    } catch (e: any) {
      console.error(e);
      alert('Erro ao aprovar transação: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAccount = async () => {
    if (!accountForm.name) {
      alert('Por favor, informe o nome da conta');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: accountForm.name,
        type: accountForm.type,
        balance: Number(accountForm.balance) || 0
      };

      if (editingId) {
        const { error } = await supabase.from('financial_accounts').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('financial_accounts').insert([payload]);
        if (error) throw error;
      }
      
      setAccountForm({ name: '', type: 'Caixa', balance: '0' });
      setIsAddingAccount(false);
      setEditingId(null);
      onRefresh();
    } catch (e: any) { 
      console.error(e); 
      alert('Erro ao salvar conta: ' + (e.message || 'Erro desconhecido'));
    } finally { 
      setLoading(false); 
    }
  };

  const handleEditAccount = (account: FinancialAccount) => {
    setAccountForm({
      name: account.name,
      type: account.type,
      balance: account.balance.toString()
    });
    setEditingId(account.id);
    setIsAddingAccount(true);
  };

  const handleSaveProject = async () => {
    if (!projectForm.name) {
      alert('Por favor, informe o nome do projeto');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: projectForm.name,
        description: projectForm.description,
        budget_planned: Number(projectForm.budgetPlanned) || 0
      };

      if (editingId) {
        const { error } = await supabase.from('financial_projects').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('financial_projects').insert([{ ...payload, budget_executed: 0 }]);
        if (error) throw error;
      }

      setProjectForm({ name: '', description: '', budgetPlanned: '0' });
      setIsAddingProject(false);
      setEditingId(null);
      onRefresh();
    } catch (e: any) { 
      console.error(e); 
      alert('Erro ao salvar projeto: ' + (e.message || 'Erro desconhecido'));
    } finally { 
      setLoading(false); 
    }
  };

  const handleEditProject = (project: FinancialProject) => {
    setProjectForm({
      name: project.name,
      description: project.description || '',
      budgetPlanned: project.budgetPlanned.toString()
    });
    setEditingId(project.id);
    setIsAddingProject(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name) {
      alert('Por favor, informe o nome da categoria');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: categoryForm.name,
        type: categoryForm.type
      };

      if (editingId) {
        const { error } = await supabase.from('financial_categories').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('financial_categories').insert([payload]);
        if (error) throw error;
      }

      setCategoryForm({ name: '', type: 'Saída' });
      setIsAddingCategory(false);
      setEditingId(null);
      onRefresh();
    } catch (e: any) { 
      console.error(e); 
      alert('Erro ao salvar categoria: ' + (e.message || 'Erro desconhecido'));
    } finally { 
      setLoading(false); 
    }
  };

  const handleEditCategory = (category: FinancialCategory) => {
    setCategoryForm({
      name: category.name,
      type: category.type
    });
    setEditingId(category.id);
    setIsAddingCategory(true);
  };

  const handleDeleteAccount = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta conta? Isso pode afetar os lançamentos vinculados.')) return;
    try {
      const { error } = await supabase.from('financial_accounts').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (e: any) { alert('Erro ao excluir conta: ' + e.message); }
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este projeto?')) return;
    try {
      const { error } = await supabase.from('financial_projects').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (e: any) { alert('Erro ao excluir projeto: ' + e.message); }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta categoria?')) return;
    try {
      const { error } = await supabase.from('financial_categories').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (e: any) { alert('Erro ao excluir categoria: ' + e.message); }
  };

  const getStatusIcon = (status: FinancialTransactionStatus) => {
    switch (status) {
      case FinancialTransactionStatus.PAID: return <CheckCircle2 size={16} className="text-brand-green" />;
      case FinancialTransactionStatus.CANCELLED: return <XCircle size={16} className="text-red-500" />;
      case FinancialTransactionStatus.PLANNED: return <Clock size={16} className="text-amber-500" />;
      case FinancialTransactionStatus.PENDING_APPROVAL: return <AlertTriangle size={16} className="text-orange-500" />;
    }
  };

  const handleGenerateReport = () => {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      alert('Por favor, permita pop-ups para gerar o relatório.');
      return;
    }

    const now = new Date().toLocaleString('pt-BR');
    
    // Preparar dados das transações (usando as filtradas se estiver na aba de transações, senão todas)
    const reportTransactions = activeSubTab === 'transacoes' ? filteredTransactions : transactions;

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatório Financeiro - Pascom</title>
        <style>
          body { font-family: sans-serif; color: #333; padding: 40px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #007cba; }
          .meta { text-align: right; font-size: 12px; color: #666; }
          h1 { font-size: 20px; margin-bottom: 20px; }
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
          .card { padding: 15px; border: 1px solid #eee; border-radius: 8px; }
          .card-label { font-size: 10px; text-transform: uppercase; color: #999; font-weight: bold; margin-bottom: 5px; }
          .card-value { font-size: 18px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #f8fafc; text-align: left; padding: 12px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
          td { padding: 12px; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
          .text-right { text-align: right; }
          .income { color: #059669; font-weight: bold; }
          .expense { color: #dc2626; font-weight: bold; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">PASCOM - Relatório Financeiro</div>
          <div class="meta">Gerado em: ${now}</div>
        </div>

        <div class="summary">
          <div class="card">
            <div class="card-label">Saldo Total</div>
            <div class="card-value">${formatCurrency(totalBalance)}</div>
          </div>
          <div class="card">
            <div class="card-label">Entradas (Mês)</div>
            <div class="card-value income">${formatCurrency(monthlyIncome)}</div>
          </div>
          <div class="card">
            <div class="card-label">Saídas (Mês)</div>
            <div class="card-value expense">${formatCurrency(monthlyExpense)}</div>
          </div>
        </div>

        <h1>Lançamentos</h1>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Conta</th>
              <th class="text-right">Valor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${reportTransactions.map(t => {
              const cat = categories.find(c => c.id === t.categoryId)?.name || '-';
              const acc = accounts.find(a => a.id === t.accountId)?.name || '-';
              return `
                <tr>
                  <td>${formatDate(t.date)}</td>
                  <td>${t.description}</td>
                  <td>${cat}</td>
                  <td>${acc}</td>
                  <td class="text-right ${t.type === FinancialTransactionType.INCOME ? 'income' : 'expense'}">
                    ${t.type === FinancialTransactionType.EXPENSE ? '-' : ''}${formatCurrency(t.value)}
                  </td>
                  <td>${t.status}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div style="margin-top: 50px; text-align: center; font-size: 10px; color: #999;" class="no-print">
          Pressione Ctrl+P para imprimir este relatório
        </div>

        <script>
          window.onload = () => {
            // Pequeno delay para garantir renderização antes do print
            setTimeout(() => {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    reportWindow.document.write(html);
    reportWindow.document.close();
  };

  const getTransactionTypeColor = (type: FinancialTransactionType) => {
    switch (type) {
      case FinancialTransactionType.INCOME: return 'text-brand-green bg-brand-green/5';
      case FinancialTransactionType.EXPENSE: return 'text-red-600 bg-red-50';
      case FinancialTransactionType.TRANSFER: return 'text-brand-blue bg-brand-blue/5';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="px-4 md:px-8 py-4 md:py-6 bg-white border-b border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Nossos Recursos</h1>
            <p className="text-slate-500 text-sm">Transparência e cuidado com as doações e recursos da nossa comunidade</p>
          </div>
          <div className="flex items-center gap-3">
            {canAdd && (
              <button 
                onClick={() => setIsAddingTransaction(true)}
                className="flex items-center gap-2 bg-brand-blue text-white px-4 py-2.5 rounded-xl font-semibold transition-all shadow-md shadow-brand-blue/10 hover:opacity-90"
              >
                <Plus size={18} />
                Novo Lançamento
              </button>
            )}
            <button 
              onClick={handleGenerateReport}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-slate-50 transition-all"
            >
              <Download size={18} />
              Relatório
            </button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 mt-8 overflow-x-auto hide-scroll">
          {[
            { id: 'dashboard', label: 'Início', icon: PieChart },
            { id: 'transacoes', label: 'Movimentações', icon: ArrowLeftRight },
            { id: 'contas', label: 'Cofres / Contas', icon: Wallet },
            { id: 'projetos', label: 'Nossas Missões', icon: Briefcase },
            { id: 'categorias', label: 'Categorias', icon: Tag },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeSubTab === tab.id 
                  ? 'bg-brand-blue text-white shadow-sm' 
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {activeSubTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-brand-blue/10 text-brand-blue rounded-lg">
                    <Wallet size={20} />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Disponibilidade</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalBalance)}</h3>
                <p className="text-slate-500 text-xs mt-1">Saldo total para o serviço</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-brand-green/10 text-brand-green rounded-lg">
                    <TrendingUp size={20} />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ofertas (Mês)</span>
                </div>
                <h3 className="text-2xl font-bold text-brand-green">{formatCurrency(monthlyIncome)}</h3>
                <p className="text-slate-500 text-xs mt-1">Recursos recebidos no mês</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                    <TrendingDown size={20} />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saídas (Mês)</span>
                </div>
                <h3 className="text-2xl font-bold text-red-600">{formatCurrency(monthlyExpense)}</h3>
                <p className="text-slate-500 text-xs mt-1">Despesas pagas no mês</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
                    <ArrowLeftRight size={20} />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fruto Social</span>
                </div>
                <h3 className={`text-2xl font-bold ${monthlyResult >= 0 ? 'text-brand-green' : 'text-red-600'}`}>
                  {formatCurrency(monthlyResult)}
                </h3>
                <p className="text-slate-500 text-xs mt-1">{monthlyResult >= 0 ? 'Saldo positivo no mês' : 'Saldo negativo no mês'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Accounts List */}
              <div className="lg:col-span-1 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">Saldos por Conta</h2>
                  <button onClick={() => setActiveSubTab('contas')} className="text-brand-blue text-xs font-bold hover:underline">Ver todas</button>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  {accounts.map((account) => (
                    <div key={account.id} className="p-4 border-b border-slate-100 last:border-0 flex items-center justify-between hover:bg-slate-50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                          {account.type === 'Caixa' ? <DollarSign size={18} /> : account.type === 'Banco' ? <Wallet size={18} /> : <TrendingUp size={18} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{account.name}</p>
                          <p className="text-xs text-slate-500">{account.type}</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(account.balance)}</p>
                    </div>
                  ))}
                  {accounts.length === 0 && (
                    <div className="p-8 text-center text-slate-400">
                      <p className="text-sm">Nenhuma conta cadastrada</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Projects Budget */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">Orçamentos de Projetos</h2>
                  <button onClick={() => setActiveSubTab('projetos')} className="text-brand-blue text-xs font-bold hover:underline">Ver todos</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((project) => {
                    const percentage = project.budgetPlanned > 0 ? (project.budgetExecuted / project.budgetPlanned) * 100 : 0;
                    const isOverBudget = percentage > 100;
                    const isNearLimit = percentage > 85 && percentage <= 100;

                    return (
                      <div key={project.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-bold text-slate-900 truncate pr-2">{project.name}</h3>
                          {isOverBudget && <AlertTriangle size={16} className="text-red-500 shrink-0" />}
                          {isNearLimit && <AlertTriangle size={16} className="text-amber-500 shrink-0" />}
                        </div>
                        
                        <div className="flex justify-between text-xs text-slate-500 mb-2">
                          <span>Executado: {formatCurrency(project.budgetExecuted)}</span>
                          <span>Previsto: {formatCurrency(project.budgetPlanned)}</span>
                        </div>
                        
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                          <div 
                            className={`h-full rounded-full transition-all ${isOverBudget ? 'bg-red-500' : isNearLimit ? 'bg-brand-yellow' : 'bg-brand-blue'}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className={`text-xs font-bold ${isOverBudget ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-slate-500'}`}>
                            {percentage.toFixed(1)}% utilizado
                          </span>
                          <button className="text-slate-400 hover:text-slate-600"><ChevronRight size={16} /></button>
                        </div>
                      </div>
                    );
                  })}
                  {projects.length === 0 && (
                    <div className="col-span-2 bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
                      <p className="text-sm">Nenhum projeto ativo</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Últimos Lançamentos</h2>
                <button onClick={() => setActiveSubTab('transacoes')} className="text-brand-blue text-xs font-bold hover:underline">Ver extrato completo</button>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Data</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Descrição</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Categoria</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Conta</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Valor</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.slice(0, 5).map((t) => {
                      const category = categories.find(c => c.id === t.categoryId);
                      const account = accounts.find(a => a.id === t.accountId);
                      return (
                        <tr key={t.id} className="hover:bg-slate-50 transition-all cursor-pointer">
                          <td className="px-6 py-4 text-sm text-slate-600">{formatDate(t.date)}</td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-slate-900">{t.description}</p>
                            {t.projectId && (
                              <p className="text-xs text-slate-400">{projects.find(p => p.id === t.projectId)?.name}</p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                              {category?.name || 'Sem categoria'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{account?.name}</td>
                          <td className="px-6 py-4">
                            <span className={`text-sm font-bold ${t.type === FinancialTransactionType.INCOME ? 'text-brand-green' : t.type === FinancialTransactionType.EXPENSE ? 'text-red-600' : 'text-brand-blue'}`}>
                              {t.type === FinancialTransactionType.EXPENSE ? '-' : ''}{formatCurrency(t.value)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(t.status)}
                              <span className="text-xs font-medium text-slate-600">{t.status}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {transactions.length === 0 && (
                  <div className="p-12 text-center text-slate-400">
                    <ArrowLeftRight size={40} className="mx-auto mb-4 opacity-20" />
                    <p className="text-sm">Nenhum lançamento registrado</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'transacoes' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Projeto</label>
                <select 
                  value={filterProject} 
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-blue/10"
                >
                  <option value="all">Todos os Projetos</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Conta</label>
                <select 
                  value={filterAccount} 
                  onChange={(e) => setFilterAccount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-blue/10"
                >
                  <option value="all">Todas as Contas</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Categoria</label>
                <select 
                  value={filterCategory} 
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-blue/10"
                >
                  <option value="all">Todas as Categorias</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setFilterProject('all');
                    setFilterAccount('all');
                    setFilterCategory('all');
                    setFilterDateStart('');
                    setFilterDateEnd('');
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 transition-all"
                  title="Limpar filtros"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Descrição</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Categoria</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Conta</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Valor</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((t) => {
                    const category = categories.find(c => c.id === t.categoryId);
                    const account = accounts.find(a => a.id === t.accountId);
                    return (
                      <tr key={t.id} className="hover:bg-slate-50 transition-all">
                        <td className="px-6 py-4 text-sm text-slate-600">{formatDate(t.date)}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900">{t.description}</p>
                          {t.projectId && (
                            <p className="text-xs text-slate-400">{projects.find(p => p.id === t.projectId)?.name}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                            {category?.name || 'Sem categoria'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{account?.name}</td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-bold ${t.type === FinancialTransactionType.INCOME ? 'text-brand-green' : t.type === FinancialTransactionType.EXPENSE ? 'text-red-600' : 'text-brand-blue'}`}>
                            {t.type === FinancialTransactionType.EXPENSE ? '-' : ''}{formatCurrency(t.value)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(t.status)}
                            <span className="text-xs font-medium text-slate-600">{t.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canApprove && t.status === FinancialTransactionStatus.PENDING_APPROVAL && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleApproveTransaction(t); }}
                                className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition-all flex items-center gap-1 text-xs font-bold"
                                title="Aprovar Lançamento"
                              >
                                <CheckCircle2 size={16} /> Aprovar
                              </button>
                            )}
                            {canEdit && (
                              <>
                                <button 
                                  onClick={() => handleEditTransaction(t)}
                                  className="p-1.5 text-slate-400 hover:text-brand-blue transition-all"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteTransaction(t)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                            <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-all"><MoreHorizontal size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredTransactions.length === 0 && (
                <div className="p-12 text-center text-slate-400">
                  <p className="text-sm">Nenhum lançamento encontrado com os filtros aplicados</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Other sub-tabs would follow a similar pattern */}
        {activeSubTab === 'contas' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Contas Bancárias e Caixas</h2>
              {canEdit && (
                <button 
                  onClick={() => setIsAddingAccount(true)}
                  className="flex items-center gap-2 bg-brand-blue text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
                >
                  <Plus size={16} /> Nova Conta
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.map(account => (
                <div key={account.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
                      {account.type === 'Caixa' ? <DollarSign size={24} /> : account.type === 'Banco' ? <Wallet size={24} /> : <TrendingUp size={24} />}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{account.type}</p>
                      <p className="text-lg font-bold text-slate-900">{formatCurrency(Number(account.balance))}</p>
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-4">{account.name}</h3>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button className="text-xs font-bold text-brand-blue hover:underline">Ver extrato</button>
                    {canEdit && (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleEditAccount(account)}
                          className="p-1.5 text-slate-400 hover:text-brand-blue transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteAccount(account.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {accounts.length === 0 && (
                <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
                  <p>Nenhuma conta cadastrada</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSubTab === 'projetos' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Projetos e Centros de Custo</h2>
              {canEdit && (
                <button 
                  onClick={() => setIsAddingProject(true)}
                  className="flex items-center gap-2 bg-brand-blue text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
                >
                  <Plus size={16} /> Novo Projeto
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.map(project => {
                const percentage = project.budgetPlanned > 0 ? (project.budgetExecuted / project.budgetPlanned) * 100 : 0;
                return (
                  <div key={project.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">{project.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">{project.description || 'Sem descrição'}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${percentage > 100 ? 'bg-red-100 text-red-600' : 'bg-brand-blue/15 text-brand-blue'}`}>
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${percentage > 100 ? 'bg-red-500' : percentage > 85 ? 'bg-brand-yellow' : 'bg-brand-blue'}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50 rounded-xl">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Executado</p>
                          <p className="text-sm font-bold text-slate-900">{formatCurrency(Number(project.budgetExecuted))}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Previsto</p>
                          <p className="text-sm font-bold text-slate-900">{formatCurrency(Number(project.budgetPlanned))}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                      <button className="text-xs font-bold text-brand-blue hover:underline flex items-center gap-1">
                        <FileText size={14} /> Ver Detalhes
                      </button>
                      {canEdit && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleEditProject(project)}
                            className="p-1.5 text-slate-400 hover:text-brand-blue transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteProject(project.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {projects.length === 0 && (
                <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
                  <p>Nenhum projeto cadastrado</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSubTab === 'categorias' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Categorias Financeiras</h2>
              {canEdit && (
                <button 
                  onClick={() => setIsAddingCategory(true)}
                  className="flex items-center gap-2 bg-brand-blue text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
                >
                  <Plus size={16} /> Nova Categoria
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-brand-green flex items-center gap-2">
                  <TrendingUp size={16} /> Entradas
                </h3>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  {categories.filter(c => c.type === 'Entrada').map(category => (
                    <div key={category.id} className="px-6 py-4 border-b border-slate-100 last:border-0 flex items-center justify-between hover:bg-slate-50 transition-all">
                      <span className="text-sm font-medium text-slate-700">{category.name}</span>
                      {canEdit && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleEditCategory(category)}
                            className="p-1 text-slate-400 hover:text-blue-600"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteCategory(category.id)}
                            className="p-1 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-red-600 flex items-center gap-2">
                  <TrendingDown size={16} /> Saídas
                </h3>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  {categories.filter(c => c.type === 'Saída').map(category => (
                    <div key={category.id} className="px-6 py-4 border-b border-slate-100 last:border-0 flex items-center justify-between hover:bg-slate-50 transition-all">
                      <span className="text-sm font-medium text-slate-700">{category.name}</span>
                      {canEdit && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleEditCategory(category)}
                            className="p-1 text-slate-400 hover:text-blue-600"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteCategory(category.id)}
                            className="p-1 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PORTALED MODALS */}
      {createPortal(
        <AnimatePresence>
          {/* TRANSACTION MODAL */}
          {isAddingTransaction && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl"
                onClick={() => { setIsAddingTransaction(false); resetTransactionForm(); }}
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 30 }}
                className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative z-[1010]"
              >
                <div className="px-10 py-10 border-b border-slate-50 flex justify-between items-center bg-slate-900 relative group/trans">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/10 shadow-lg group-hover/trans:rotate-12 duration-500">
                      <ArrowLeftRight size={32} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-white tracking-tighter leading-none mb-1">{editingId ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Fluxo de Caixa</p>
                    </div>
                  </div>
                  <button onClick={() => { setIsAddingTransaction(false); resetTransactionForm(); }} className="p-4 bg-white/10 text-white/50 hover:text-white rounded-[1.5rem] border border-white/5 backdrop-blur-md transition-all active:scale-90 relative z-10">
                    <X size={24} strokeWidth={3} />
                  </button>
                </div>

                <div className="p-10 overflow-y-auto flex-1 space-y-8 hide-scroll">
                  <div className="flex p-2 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                    <button 
                      onClick={() => setTransactionForm(prev => ({ ...prev, type: FinancialTransactionType.EXPENSE }))}
                      className={`flex-1 py-4 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${transactionForm.type === FinancialTransactionType.EXPENSE ? 'bg-white text-rose-500 shadow-md ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <TrendingDown size={16} /> Saída
                      </div>
                    </button>
                    <button 
                      onClick={() => setTransactionForm(prev => ({ ...prev, type: FinancialTransactionType.INCOME }))}
                      className={`flex-1 py-4 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${transactionForm.type === FinancialTransactionType.INCOME ? 'bg-white text-brand-green shadow-md ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <TrendingUp size={16} /> Entrada
                      </div>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="sm:col-span-2 space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição do Lançamento *</label>
                      <input 
                        type="text" 
                        value={transactionForm.description}
                        onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue font-bold text-sm transition-all" 
                        placeholder="Ex: Oferta das Comunidades" 
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor do Repasse (R$) *</label>
                      <input 
                        type="number" 
                        value={transactionForm.value}
                        onChange={(e) => setTransactionForm(prev => ({ ...prev, value: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue font-bold text-sm transition-all" 
                        placeholder="0,00" 
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data da Operação *</label>
                      <input 
                        type="date" 
                        value={transactionForm.date}
                        onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue font-bold text-sm transition-all" 
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Conta de Origem/Destino *</label>
                      <select 
                        value={transactionForm.accountId}
                        onChange={(e) => setTransactionForm(prev => ({ ...prev, accountId: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue font-bold text-sm appearance-none cursor-pointer"
                      >
                        <option value="">Selecionar...</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria de Fluxo</label>
                      <select 
                        value={transactionForm.categoryId}
                        onChange={(e) => setTransactionForm(prev => ({ ...prev, categoryId: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue font-bold text-sm appearance-none cursor-pointer"
                      >
                        <option value="">Selecionar...</option>
                        {categories.filter(c => c.type === (transactionForm.type === FinancialTransactionType.INCOME ? 'Entrada' : 'Saída')).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Projeto Vinculado</label>
                      <select 
                        value={transactionForm.projectId}
                        onChange={(e) => setTransactionForm(prev => ({ ...prev, projectId: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue font-bold text-sm appearance-none cursor-pointer"
                      >
                        <option value="">Nenhum</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Forma de Pagamento</label>
                      <select 
                        value={transactionForm.paymentMethod}
                        onChange={(e) => setTransactionForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue font-bold text-sm appearance-none cursor-pointer"
                      >
                        <option value="PIX">PIX</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="Cartão de Débito">Cartão de Débito</option>
                        <option value="Transferência">Transferência</option>
                        <option value="Boleto">Boleto</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center rounded-b-[3rem]">
                   <div className="w-full sm:w-auto">
                     {editingId && (
                        <button 
                          onClick={() => handleDeleteTransaction(transactions.find(t => t.id === editingId)!)}
                          className="w-full sm:w-auto px-6 py-4 bg-white text-rose-500 border border-rose-100 hover:bg-rose-50 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
                        >
                          <Trash2 size={16} /> Excluir Lançamento
                        </button>
                     )}
                   </div>
                   <div className="flex gap-4 w-full sm:w-auto">
                      <button 
                        onClick={() => { setIsAddingTransaction(false); resetTransactionForm(); }}
                        className="flex-1 sm:flex-none px-8 py-5 text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest transition-all"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleSaveTransaction}
                        disabled={loading}
                        className="flex-1 sm:flex-none bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-brand-blue hover:scale-105 active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-3"
                      >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Confirmar Movimentação
                      </button>
                   </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* ACCOUNT MODAL */}
          {isAddingAccount && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl"
                onClick={() => { setIsAddingAccount(false); setEditingId(null); }}
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 30 }}
                className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden relative z-[1010] flex flex-col"
              >
                <div className="px-10 py-10 border-b border-slate-50 flex justify-between items-center bg-brand-blue relative group/acc">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="w-14 h-14 bg-white/10 backdrop-blur-md text-white rounded-2xl flex items-center justify-center transition-transform border border-white/10 group-hover/acc:rotate-6 duration-500 shadow-lg">
                      <Wallet size={28} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-1">{editingId ? 'Editar Conta' : 'Nova Conta'}</h3>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Patrimônio Líquido</p>
                    </div>
                  </div>
                  <button onClick={() => { setIsAddingAccount(false); setEditingId(null); }} className="p-4 bg-white/10 text-white/50 hover:text-white rounded-[1.5rem] border border-white/5 backdrop-blur-md transition-all active:scale-90 relative z-10">
                    <X size={20} strokeWidth={3} />
                  </button>
                </div>

                <div className="p-10 space-y-8">
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificação da Conta *</label>
                    <input 
                      type="text" 
                      value={accountForm.name}
                      onChange={(e) => setAccountForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue font-bold text-sm transition-all" 
                      placeholder="Ex: Caixa Sede Paroquial" 
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Custódia *</label>
                    <select 
                      value={accountForm.type}
                      onChange={(e) => setAccountForm(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue font-bold text-sm appearance-none cursor-pointer"
                    >
                      <option value="Caixa">Caixa (Dinheiro Vivo)</option>
                      <option value="Banco">Instituição Bancária</option>
                      <option value="PIX">Chave PIX Dedicada</option>
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Saldo Atualizado (R$)</label>
                    <input 
                      type="number" 
                      value={accountForm.balance}
                      onChange={(e) => setAccountForm(prev => ({ ...prev, balance: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue font-bold text-sm transition-all" 
                      placeholder="0,00" 
                    />
                  </div>
                </div>

                <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex justify-end items-center rounded-b-[3rem]">
                   <button 
                     onClick={handleSaveAccount}
                     disabled={loading}
                     className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                   >
                     {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                     Finalizar Registro
                   </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* PROJECT MODAL */}
          {isAddingProject && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl"
                onClick={() => { setIsAddingProject(false); setEditingId(null); }}
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 30 }}
                className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden relative z-[1010] flex flex-col"
              >
                <div className="px-10 py-10 border-b border-slate-50 flex justify-between items-center bg-brand-yellow relative group/prj">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="w-14 h-14 bg-white/10 backdrop-blur-md text-white rounded-2xl flex items-center justify-center transition-transform border border-white/10 group-hover/prj:rotate-6 duration-500 shadow-lg">
                      <Briefcase size={28} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-1">{editingId ? 'Editar Missão' : 'Nova Missão'}</h3>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Planejamento Estratégico</p>
                    </div>
                  </div>
                  <button onClick={() => { setIsAddingProject(false); setEditingId(null); }} className="p-4 bg-white/10 text-white/50 hover:text-white rounded-[1.5rem] border border-white/5 backdrop-blur-md transition-all active:scale-90 relative z-10">
                    <X size={20} strokeWidth={3} />
                  </button>
                </div>

                <div className="p-10 space-y-8">
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título da Missão *</label>
                    <input 
                      type="text" 
                      value={projectForm.name}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue font-bold text-sm transition-all" 
                      placeholder="Ex: Investimento em Streaming" 
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Objetivo Geral</label>
                    <textarea 
                      value={projectForm.description}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue font-bold text-sm transition-all min-h-[120px] resize-none" 
                      placeholder="Breve descrição dos frutos desta missão..."
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teto Orçamentário (R$)</label>
                    <input 
                      type="number" 
                      value={projectForm.budgetPlanned}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, budgetPlanned: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue font-bold text-sm transition-all" 
                      placeholder="0,00" 
                    />
                  </div>
                </div>

                <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex justify-end items-center rounded-b-[3rem]">
                   <button 
                     onClick={handleSaveProject}
                     disabled={loading}
                     className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                   >
                     {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                     Registrar Missão
                   </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* CATEGORY MODAL */}
          {isAddingCategory && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl"
                onClick={() => { setIsAddingCategory(false); setEditingId(null); }}
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 30 }}
                className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden relative z-[1010] flex flex-col"
              >
                <div className="px-10 py-10 border-b border-slate-50 flex justify-between items-center bg-slate-800 relative group/cat">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="w-14 h-14 bg-white/10 backdrop-blur-md text-white rounded-2xl flex items-center justify-center transition-transform border border-white/10 group-hover/cat:rotate-6 duration-500 shadow-lg">
                      <Tag size={28} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-1">{editingId ? 'Editar Categoria' : 'Nova Categoria'}</h3>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Nomenclatura Financeira</p>
                    </div>
                  </div>
                  <button onClick={() => { setIsAddingCategory(false); setEditingId(null); }} className="p-4 bg-white/10 text-white/50 hover:text-white rounded-[1.5rem] border border-white/5 backdrop-blur-md transition-all active:scale-90 relative z-10">
                    <X size={20} strokeWidth={3} />
                  </button>
                </div>

                <div className="p-10 space-y-8">
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título da Classificação *</label>
                    <input 
                      type="text" 
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue font-bold text-sm transition-all" 
                      placeholder="Ex: Equipamentos de Áudio" 
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Natureza do Fluxo *</label>
                    <select 
                      value={categoryForm.type}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-8 focus:ring-brand-blue/5 focus:border-brand-blue font-bold text-sm appearance-none cursor-pointer"
                    >
                      <option value="Saída">Saída (Despesa Operacional)</option>
                      <option value="Entrada">Entrada (Receita / Oferta)</option>
                    </select>
                  </div>
                </div>

                <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex justify-end items-center rounded-b-[3rem]">
                   <button 
                     onClick={handleSaveCategory}
                     disabled={loading}
                     className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                   >
                     {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                     Salvar Classificação
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
