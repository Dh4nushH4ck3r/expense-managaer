import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { AppSettings, ExpenseType, Category, Expense } from '../types';
import { 
  format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  startOfYear, endOfYear, addDays, subDays, addWeeks, subWeeks, 
  addMonths, subMonths, addYears, subYears
} from 'date-fns';
import { 
  Plus, Trash2, Edit2, Fuel, TrendingUp, TrendingDown, 
  Calendar, ChevronLeft, ChevronRight, PieChart as PieIcon,
  Search, Calculator, Utensils, ShoppingBag, Tv, Receipt, Car, 
  Package, Banknote, Sandwich, CircleDollarSign, MoreHorizontal
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface Props {
  settings: AppSettings;
}

type ViewMode = 'day' | 'week' | 'month' | 'year';

const ExpensesPage: React.FC<Props> = ({ settings }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Advanced Filtering State
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Form State
  const initialFormState = {
    date: format(new Date(), 'yyyy-MM-dd'),
    type: ExpenseType.EXPENSE,
    category: Category.FOOD,
    amount: '',
    description: '',
    litres: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // --- Date Logic ---
  const dateRange = useMemo(() => {
    const today = currentDate;
    let start: Date, end: Date;

    switch (viewMode) {
      case 'day': start = today; end = today; break;
      case 'week': start = startOfWeek(today, { weekStartsOn: 1 }); end = endOfWeek(today, { weekStartsOn: 1 }); break;
      case 'month': start = startOfMonth(today); end = endOfMonth(today); break;
      case 'year': start = startOfYear(today); end = endOfYear(today); break;
    }
    return { 
      startStr: format(start, 'yyyy-MM-dd'), 
      endStr: format(end, 'yyyy-MM-dd'),
      originalStart: start,
      originalEnd: end 
    };
  }, [viewMode, currentDate]);

  // --- Queries ---
  const expenses = useLiveQuery(async () => {
    return await db.expenses
      .where('date')
      .between(dateRange.startStr, dateRange.endStr, true, true)
      .reverse()
      .toArray();
  }, [dateRange]);

  // --- Analytics ---
  const totalIncome = expenses?.filter(e => e.type === ExpenseType.INCOME).reduce((acc, curr) => acc + curr.amount, 0) || 0;
  const totalExpense = expenses?.filter(e => e.type === ExpenseType.EXPENSE).reduce((acc, curr) => acc + curr.amount, 0) || 0;
  const balance = totalIncome - totalExpense;

  const chartData = expenses
    ?.filter(e => e.type === ExpenseType.EXPENSE)
    .reduce((acc: any[], curr) => {
        const existing = acc.find(item => item.name === curr.category);
        if (existing) {
            existing.value += curr.amount;
        } else {
            acc.push({ name: curr.category, value: curr.amount });
        }
        return acc;
    }, [])
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

  // --- Helpers ---
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case Category.FOOD: return <Utensils size={18} />;
      case Category.SHOPPING: return <ShoppingBag size={18} />;
      case Category.ENTERTAINMENT: return <Tv size={18} />;
      case Category.BILLS: return <Receipt size={18} />;
      case Category.TRANSPORT: return <Car size={18} />;
      case Category.DELIVERY: return <Package size={18} />;
      case Category.SALARY: return <Banknote size={18} />;
      case Category.BAKERY: return <Sandwich size={18} />;
      case Category.LOANS: return <CircleDollarSign size={18} />;
      case Category.OTHER_INCOME: return <TrendingUp size={18} />;
      default: return <MoreHorizontal size={18} />;
    }
  };

  const getCategoryColor = (category: string, type: ExpenseType) => {
    if (type === ExpenseType.INCOME) return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300';
    switch (category) {
        case Category.FOOD: return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300';
        case Category.TRANSPORT: return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
        case Category.BILLS: return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300';
        case Category.SHOPPING: return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300';
        default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300';
    }
  };

  // --- Handlers ---
  const handleDateNav = (dir: 'prev' | 'next') => {
    const fn = dir === 'prev' ? 
      (viewMode === 'day' ? subDays : viewMode === 'week' ? subWeeks : viewMode === 'month' ? subMonths : subYears) :
      (viewMode === 'day' ? addDays : viewMode === 'week' ? addWeeks : viewMode === 'month' ? addMonths : addYears);
    setCurrentDate(fn(currentDate, 1));
  };

  const handleEdit = (expense: Expense) => {
    setFormData({
        date: expense.date,
        type: expense.type,
        category: expense.category as Category,
        amount: expense.amount.toString(),
        description: expense.description,
        litres: expense.litres?.toString() || ''
    });
    setEditingId(expense.id || null);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this transaction?')) {
      await db.expenses.delete(id);
      const fuelLog = await db.fuelLogs.where('expenseId').equals(id).first();
      if (fuelLog?.id) await db.fuelLogs.delete(fuelLog.id);
    }
  };

  // --- Petrol Logic Refinement ---
  const handleAmountChange = (val: string) => {
    const newAmount = val;
    let newLitres = formData.litres;
    if (formData.category === Category.TRANSPORT && settings.petrolRate > 0 && val) {
        const numAmount = parseFloat(val);
        if (!isNaN(numAmount)) {
            newLitres = (numAmount / settings.petrolRate).toFixed(2);
        }
    }
    setFormData({ ...formData, amount: newAmount, litres: newLitres });
  };

  const handleLitresChange = (val: string) => {
    const newLitres = val;
    let newAmount = formData.amount;
    if (formData.category === Category.TRANSPORT && settings.petrolRate > 0 && val) {
        const numLitres = parseFloat(val);
        if (!isNaN(numLitres)) {
            newAmount = (numLitres * settings.petrolRate).toFixed(0);
        }
    }
    setFormData({ ...formData, litres: newLitres, amount: newAmount });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(formData.amount);
    const litresVal = parseFloat(formData.litres);
    
    const isPetrol = formData.category === Category.TRANSPORT && litresVal > 0;

    const payload: Expense = {
        date: formData.date,
        type: formData.type,
        category: formData.category,
        amount: amountVal,
        description: formData.description,
        isPetrol: isPetrol,
        litres: isPetrol ? litresVal : undefined
    };

    if (editingId) {
        await db.expenses.update(editingId, payload);
        const log = await db.fuelLogs.where('expenseId').equals(editingId).first();
        if (log) {
            if (isPetrol) {
                await db.fuelLogs.update(log.id!, { date: payload.date, litres: litresVal, cost: amountVal });
            } else {
                await db.fuelLogs.delete(log.id!);
            }
        } else if (isPetrol) {
            await db.fuelLogs.add({ date: payload.date, litres: litresVal, cost: amountVal, expenseId: editingId });
        }
    } else {
        const id = await db.expenses.add(payload);
        if (isPetrol) {
            await db.fuelLogs.add({ date: payload.date, litres: litresVal, cost: amountVal, expenseId: id });
        }
    }

    setIsFormOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
  };

  const getDateLabel = () => {
    if (viewMode === 'day') return format(currentDate, 'dd MMM yyyy');
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy');
    if (viewMode === 'year') return format(currentDate, 'yyyy');
    return `${format(dateRange.originalStart, 'd MMM')} - ${format(dateRange.originalEnd, 'd MMM')}`;
  };

  return (
    <div className="space-y-6 relative">
      
      {/* Ambient Background Effects */}
      <div className="absolute top-10 right-0 -z-10 w-64 h-64 bg-primary/20 rounded-full blur-[80px] mix-blend-multiply dark:mix-blend-screen opacity-50"></div>
      <div className="absolute top-60 left-0 -z-10 w-52 h-52 bg-purple-500/20 rounded-full blur-[80px] mix-blend-multiply dark:mix-blend-screen opacity-50"></div>

      {/* Date Navigation */}
      <div className="bg-white/40 dark:bg-surface/40 backdrop-blur-xl p-1.5 rounded-2xl shadow-sm border border-white/40 dark:border-white/5 flex flex-col gap-3 sticky top-0 z-20">
         <div className="grid grid-cols-4 gap-1 bg-gray-200/40 dark:bg-black/20 p-1 rounded-xl">
            {(['day', 'week', 'month', 'year'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${
                  viewMode === mode 
                  ? 'bg-white dark:bg-surface shadow-sm text-primary scale-[1.02]' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-white/5'
                }`}
              >
                {mode}
              </button>
            ))}
         </div>
         <div className="flex items-center justify-between px-2 pb-1">
            <button onClick={() => handleDateNav('prev')} className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-full text-gray-700 dark:text-gray-200 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
              <Calendar size={16} className="text-primary mb-0.5" />
              <span>{getDateLabel()}</span>
            </div>
            <button onClick={() => handleDateNav('next')} className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-full text-gray-700 dark:text-gray-200 transition-colors">
              <ChevronRight size={20} />
            </button>
         </div>
      </div>

      {/* Balance Card - Premium Design (Offline Safe) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1e3a8a] to-[#0f172a] dark:from-[#172554] dark:to-[#020617] rounded-[2rem] p-7 text-white shadow-2xl shadow-blue-900/20 border border-white/10 group">
        {/* Decorative Gradients instead of external image */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
            <p className="text-blue-200 text-sm font-medium tracking-wide">Net Balance</p>
            <div className="w-10 h-6 rounded-md bg-white/10 flex items-center justify-center border border-white/10">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500 opacity-80 blur-[2px]"></div>
            </div>
          </div>
          <h2 className="text-4xl font-bold tracking-tight mb-8">₹{balance.toLocaleString('en-IN')}</h2>
          
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
                 <div className="p-1 rounded-full bg-emerald-500/20"><TrendingUp size={10} /></div>
                 Income
              </div>
              <p className="font-bold text-lg tracking-wide">₹{totalIncome.toLocaleString()}</p>
            </div>
            <div className="space-y-1 text-right">
              <div className="flex items-center justify-end gap-2 text-rose-300 text-xs font-semibold uppercase tracking-wider">
                 Expense
                 <div className="p-1 rounded-full bg-rose-500/20"><TrendingDown size={10} /></div>
              </div>
              <p className="font-bold text-lg tracking-wide">₹{totalExpense.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData && chartData.length > 0 && (
          <div className="bg-white/50 dark:bg-surface/50 backdrop-blur-xl p-5 rounded-[2rem] shadow-sm border border-white/60 dark:border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm flex items-center gap-2">
                  <PieIcon size={16} className="text-primary" /> Spending Breakdown
                </h3>
              </div>
              <div className="flex items-center h-40">
                  <div className="flex-1 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={60}
                                paddingAngle={5}
                                dataKey="value"
                                cornerRadius={4}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                ))}
                            </Pie>
                            <RechartsTooltip 
                              formatter={(value: number) => `₹${value}`}
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', background: 'rgba(255, 255, 255, 0.95)', padding: '8px 12px' }}
                              itemStyle={{ color: '#0f172a', fontWeight: 600, fontSize: '13px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2.5 w-36 text-xs pl-2">
                      {chartData.slice(0, 4).map((d, i) => (
                          <div key={i} className="flex items-center justify-between w-full group cursor-default">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm transition-transform group-hover:scale-110" style={{ background: COLORS[i] }}></div>
                                <span className="truncate text-gray-600 dark:text-gray-400 font-medium">{d.name}</span>
                              </div>
                              <span className="font-bold text-gray-800 dark:text-gray-200">{(d.value / totalExpense * 100).toFixed(0)}%</span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* Transactions */}
      <div className="pb-24">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white tracking-tight">Transactions</h3>
            <span className="text-[10px] font-bold text-gray-500 bg-gray-200/50 dark:bg-white/5 border border-white/20 px-2 py-1 rounded-full backdrop-blur-md">
              {expenses?.length || 0} ITEMS
            </span>
          </div>

          <div className="space-y-3">
              {expenses?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[2rem] bg-white/20 dark:bg-surface/20">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-3 text-gray-300 dark:text-gray-600">
                        <Search size={28} />
                      </div>
                      <p className="text-sm font-semibold">No transactions found</p>
                      <p className="text-xs mt-1 text-gray-400">Change date or add new</p>
                  </div>
              ) : (
                  expenses?.map(expense => (
                      <div 
                        key={expense.id} 
                        className="bg-white/60 dark:bg-surface/40 backdrop-blur-md p-4 rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-white/50 dark:border-white/5 flex items-center justify-between group hover:-translate-y-0.5 transition-all duration-300 hover:shadow-lg hover:bg-white/80 dark:hover:bg-surface/60"
                      >
                          <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105 ${getCategoryColor(expense.category, expense.type)}`}>
                                  {getCategoryIcon(expense.category)}
                              </div>
                              <div className="flex flex-col gap-0.5">
                                  <p className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight">{expense.category}</p>
                                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    <span>{format(parseISO(expense.date), 'dd MMM')}</span>
                                    {expense.litres && (
                                      <>
                                        <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                                        <span className="flex items-center gap-0.5 text-orange-500 dark:text-orange-400"><Fuel size={10} /> {expense.litres.toFixed(1)} L</span>
                                      </>
                                    )}
                                    {expense.description && (
                                      <>
                                        <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                                        <span className="truncate max-w-[100px]">{expense.description}</span>
                                      </>
                                    )}
                                  </div>
                              </div>
                          </div>
                          <div className="text-right flex flex-col items-end">
                              <p className={`font-bold text-base tracking-tight ${expense.type === ExpenseType.INCOME ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                                  {expense.type === ExpenseType.INCOME ? '+' : '-'}₹{expense.amount.toFixed(0)}
                              </p>
                              <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                                 <button onClick={() => handleEdit(expense)} className="text-primary hover:text-blue-700 p-1.5 bg-blue-50 dark:bg-blue-500/20 rounded-lg transition-colors"><Edit2 size={12} /></button>
                                 <button onClick={() => handleDelete(expense.id!) } className="text-red-500 hover:text-red-700 p-1.5 bg-red-50 dark:bg-red-500/20 rounded-lg transition-colors"><Trash2 size={12} /></button>
                              </div>
                          </div>
                      </div>
                  ))
              )}
          </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => { setFormData(initialFormState); setEditingId(null); setIsFormOpen(true); }}
        className="fixed bottom-24 right-5 w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-[1.25rem] shadow-xl shadow-indigo-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 z-30 border border-white/20 group"
      >
        <Plus size={32} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white/95 dark:bg-surface/95 backdrop-blur-xl w-full max-w-md rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 border border-white/20 dark:border-gray-700 ring-1 ring-black/5">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{editingId ? 'Edit' : 'New'} Transaction</h2>
                  <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 hover:text-gray-600 transition-colors"><Trash2 size={20} className="rotate-45" /></button>
                </div>
                
                <form onSubmit={handleFormSubmit} className="space-y-5">
                    {/* Type Toggle */}
                    <div className="flex gap-2 p-1.5 bg-gray-100 dark:bg-black/40 rounded-2xl">
                        <button type="button" onClick={() => setFormData({...formData, type: ExpenseType.EXPENSE})} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${formData.type === ExpenseType.EXPENSE ? 'bg-white dark:bg-surface shadow-md text-rose-500 scale-[1.02]' : 'text-gray-500 dark:text-gray-400'}`}>Expense</button>
                        <button type="button" onClick={() => setFormData({...formData, type: ExpenseType.INCOME})} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${formData.type === ExpenseType.INCOME ? 'bg-white dark:bg-surface shadow-md text-emerald-500 scale-[1.02]' : 'text-gray-500 dark:text-gray-400'}`}>Income</button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Date</label>
                          <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border-none ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-primary/50 outline-none font-medium transition-all" />
                      </div>
                      <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Category</label>
                          <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as Category})} className="w-full p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border-none ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-primary/50 outline-none font-medium transition-all appearance-none">
                              {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                      </div>
                    </div>

                    {/* Petrol Logic */}
                    {formData.category === Category.TRANSPORT && (
                         <div className="bg-orange-50/80 dark:bg-orange-900/10 p-5 rounded-3xl border border-orange-100 dark:border-orange-900/20 relative overflow-hidden group">
                             <div className="absolute -right-4 -top-4 text-orange-200 dark:text-orange-900/20 opacity-20 transform rotate-12 group-hover:rotate-0 transition-transform duration-500"><Calculator size={100} /></div>
                             <div className="flex items-center gap-2 mb-4 relative z-10">
                                <div className="p-1.5 bg-orange-100 dark:bg-orange-500/20 rounded-lg text-orange-600 dark:text-orange-400"><Fuel size={16} /></div>
                                <span className="text-xs font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wide">Fuel Calculator</span>
                                <span className="ml-auto text-[10px] bg-white/80 dark:bg-black/30 px-2 py-1 rounded-md text-gray-500 font-mono">Rate: ₹{settings.petrolRate}</span>
                             </div>
                             <div className="grid grid-cols-2 gap-4 relative z-10">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Amount (₹)</label>
                                    <input type="number" step="1" value={formData.amount} onChange={e => handleAmountChange(e.target.value)} className="w-full p-3 rounded-xl bg-white dark:bg-black/20 border-none outline-none focus:ring-2 focus:ring-orange-400 font-bold text-lg text-gray-800 dark:text-gray-100 shadow-sm" placeholder="0" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Litres (L)</label>
                                    <input type="number" step="0.01" value={formData.litres} onChange={e => handleLitresChange(e.target.value)} className="w-full p-3 rounded-xl bg-white dark:bg-black/20 border-none outline-none focus:ring-2 focus:ring-orange-400 font-bold text-lg text-gray-800 dark:text-gray-100 shadow-sm" placeholder="0" />
                                </div>
                             </div>
                        </div>
                    )}
                    
                    {formData.category !== Category.TRANSPORT && (
                         <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Amount (₹)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">₹</span>
                                <input type="number" step="1" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full p-4 pl-8 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border-none ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-primary/50 outline-none transition-all text-3xl font-bold text-gray-800 dark:text-white tracking-tight placeholder-gray-300" placeholder="0" />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Description</label>
                        <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border-none ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-primary/50 outline-none font-medium transition-all" placeholder={formData.category === Category.TRANSPORT ? "e.g. Petrol at Shell" : "What is this for?"} />
                    </div>

                    <div className="flex gap-3 mt-6 pt-4">
                        <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-bold transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 text-sm">Cancel</button>
                        <button type="submit" className="flex-1 py-4 bg-primary hover:bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] text-sm">Save Transaction</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesPage;