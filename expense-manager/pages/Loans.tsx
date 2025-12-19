import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { Loan, LoanType, LoanPayment } from '../types';
import { format, differenceInDays } from 'date-fns';
import { Plus, ChevronRight, User, Banknote, History, CheckCircle, CreditCard, CalendarClock, ArrowUpRight } from 'lucide-react';

const LoansPage: React.FC = () => {
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);
  
  const loans = useLiveQuery(() => db.loans.toArray());
  const selectedLoan = useLiveQuery(
    () => selectedLoanId ? db.loans.get(selectedLoanId) : Promise.resolve(undefined),
    [selectedLoanId]
  );
  const payments = useLiveQuery(
    () => selectedLoanId ? db.loanPayments.where('loanId').equals(selectedLoanId).reverse().sortBy('date') : Promise.resolve([]),
    [selectedLoanId]
  );

  // Advanced Loan Logic
  const calculateLoanStats = (loan: Loan, payments: LoanPayment[] = []) => {
    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
    let interestAccrued = 0;
    
    // Simple Interest Calculation: Principal * Rate * (Days / 365)
    // Only applies if rate > 0 and type implies interest
    if (loan.rate && loan.rate > 0 && loan.type !== LoanType.FRIEND_INTEREST_FREE) {
        const days = differenceInDays(new Date(), new Date(loan.startDate));
        if (days > 0) {
            interestAccrued = (loan.principal * (loan.rate / 100) * days) / 365;
        }
    }

    const totalDue = loan.principal + interestAccrued;
    const outstanding = totalDue - totalPaid;
    // Prevent division by zero and cap progress at 100 visually
    const progress = totalDue > 0 ? Math.min(100, (totalPaid / totalDue) * 100) : 0;

    return { totalPaid, interestAccrued, totalDue, outstanding, progress };
  };

  const handleCreateLoan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await db.loans.add({
        name: formData.get('name') as string,
        type: formData.get('type') as LoanType,
        principal: parseFloat(formData.get('principal') as string),
        rate: parseFloat(formData.get('rate') as string) || 0,
        startDate: formData.get('startDate') as string,
        status: 'Active'
    });
    setView('list');
  };

  const handleAddPayment = async (amount: number) => {
    if (!selectedLoanId) return;
    await db.loanPayments.add({
        loanId: selectedLoanId,
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: amount,
        type: 'Payment'
    });
  };

  const closeLoan = async () => {
      if (selectedLoanId && window.confirm("Mark this loan as Closed?")) {
          await db.loans.update(selectedLoanId, { status: 'Closed' });
      }
  };

  if (view === 'create') {
    return (
        <div className="bg-white dark:bg-surface rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-bold mb-6">New Loan Record</h2>
            <form onSubmit={handleCreateLoan} className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Person / Bank Name</label>
                    <input name="name" required className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none focus:border-primary" placeholder="e.g. HDFC or John Doe" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                    <select name="type" className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none focus:border-primary">
                        {Object.values(LoanType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Principal (₹)</label>
                        <input name="principal" type="number" required className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none focus:border-primary" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Interest Rate (% p.a.)</label>
                        <input name="rate" type="number" step="0.1" className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none focus:border-primary" placeholder="0" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                    <input name="startDate" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none focus:border-primary" />
                </div>
                <div className="flex gap-3 mt-6">
                    <button type="button" onClick={() => setView('list')} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold">Cancel</button>
                    <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-xl font-bold">Save Loan</button>
                </div>
            </form>
        </div>
    );
  }

  if (view === 'detail' && selectedLoan) {
      const stats = calculateLoanStats(selectedLoan, payments);
      return (
        <div className="space-y-6 animate-in fade-in pb-20">
            <button onClick={() => setView('list')} className="text-primary text-sm font-medium flex items-center mb-2">← Back to Loans</button>
            
            <div className="bg-gradient-to-br from-gray-800 to-black rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-400 text-xs mb-1 uppercase tracking-wide font-bold">{selectedLoan.type}</p>
                            <h2 className="text-2xl font-bold">{selectedLoan.name}</h2>
                        </div>
                        {selectedLoan.status === 'Active' ? (
                            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">Active</span>
                        ) : (
                            <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">Closed</span>
                        )}
                    </div>
                    
                    <div className="mt-8">
                        <p className="text-gray-400 text-sm">Outstanding Balance</p>
                        <p className="text-4xl font-bold mt-1 tracking-tight">₹{Math.max(0, stats.outstanding).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-6">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Paid: {stats.progress.toFixed(0)}%</span>
                            <span>Total Due: ₹{stats.totalDue.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                            <div className="bg-success h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: `${stats.progress}%` }}></div>
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 p-10 opacity-5"><Banknote size={150} /></div>
            </div>

            {/* Breakdown Equation */}
            <div className="bg-white dark:bg-surface p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Balance Breakdown</h3>
                <div className="flex items-center justify-between text-sm">
                    <div className="text-center">
                        <p className="text-gray-400 text-xs">Principal</p>
                        <p className="font-bold">₹{selectedLoan.principal.toLocaleString()}</p>
                    </div>
                    <Plus size={12} className="text-gray-400" />
                    <div className="text-center">
                        <p className="text-gray-400 text-xs">Interest</p>
                        <p className="font-bold text-orange-500">₹{stats.interestAccrued.toFixed(0)}</p>
                    </div>
                    <ArrowUpRight size={12} className="text-gray-400 rotate-90" /> {/* Represents Minus */}
                    <div className="text-center">
                        <p className="text-gray-400 text-xs">Paid</p>
                        <p className="font-bold text-green-500">₹{stats.totalPaid.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            {selectedLoan.status === 'Active' && (
                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => {
                            const amt = prompt("Enter Payment Amount:");
                            if (amt && !isNaN(parseFloat(amt))) handleAddPayment(parseFloat(amt));
                        }}
                        className="bg-primary/10 hover:bg-primary/20 p-4 rounded-xl font-bold text-primary flex flex-col items-center justify-center gap-2 transition-colors"
                    >
                        <Banknote size={24} />
                        Add Payment
                    </button>
                    <button 
                         onClick={closeLoan}
                        className="bg-green-50 dark:bg-green-900/20 hover:bg-green-100 p-4 rounded-xl font-bold text-green-600 dark:text-green-400 flex flex-col items-center justify-center gap-2 transition-colors"
                    >
                        <CheckCircle size={24} />
                        Close Loan
                    </button>
                </div>
            )}

            {/* History */}
            <div className="bg-white/80 dark:bg-surface/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                    <History size={18} /> Payment History
                </h3>
                <div className="space-y-3">
                    {payments?.length === 0 && <p className="text-gray-400 text-center py-4 text-sm">No payments recorded yet.</p>}
                    {payments?.map(p => (
                        <div key={p.id} className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                            <div>
                                <p className="font-medium text-gray-800 dark:text-gray-200">Payment</p>
                                <p className="text-xs text-gray-500">{format(new Date(p.date), 'dd MMM yyyy')}</p>
                            </div>
                            <span className="font-bold text-success">- ₹{p.amount.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="space-y-4 pb-20">
      {loans?.length === 0 ? (
           <div className="text-center py-12">
               <div className="bg-blue-50 dark:bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                   <CreditCard size={32} className="text-blue-500" />
               </div>
               <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">No active loans</h3>
               <p className="text-gray-500 text-sm mt-1">Track money you owe or lent to friends.</p>
           </div>
      ) : (
          loans?.map(loan => {
             const { outstanding, progress } = calculateLoanStats(loan); 
             return (
              <div 
                key={loan.id} 
                onClick={() => { setSelectedLoanId(loan.id!); setView('detail'); }}
                className="bg-white/80 dark:bg-surface/80 backdrop-blur-sm p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 active:scale-[0.98] transition-all flex justify-between items-center relative overflow-hidden"
              >
                  {/* Subtle Progress Background on Card */}
                  <div className="absolute bottom-0 left-0 h-1 bg-green-500/30" style={{ width: `${progress}%` }}></div>
                  
                  <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${loan.type.includes('Given') ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          <User size={24} />
                      </div>
                      <div>
                          <h3 className="font-bold text-gray-800 dark:text-white text-lg">{loan.name}</h3>
                          <p className="text-xs text-gray-500">{loan.type.split(' ')[0]}</p>
                      </div>
                  </div>
                  <div className="text-right">
                      <p className="font-bold text-gray-800 dark:text-gray-200">₹{loan.principal.toLocaleString()}</p>
                      <p className={`text-xs font-bold mt-1 ${loan.status === 'Active' ? 'text-primary' : 'text-success'}`}>{loan.status}</p>
                  </div>
              </div>
          )})
      )}

      <button
        onClick={() => setView('create')}
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-blue-500/40 flex items-center justify-center active:scale-90 transition-transform z-30"
      >
        <Plus size={28} />
      </button>
    </div>
  );
};

export default LoansPage;