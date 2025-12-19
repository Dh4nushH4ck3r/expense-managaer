import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { AppSettings, Delivery } from '../types';
import { format, subDays, addDays } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Fuel, Banknote, Gauge, TrendingUp, AlertCircle, Percent } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface Props {
  settings: AppSettings;
}

const DeliveryPage: React.FC<Props> = ({ settings }) => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isFormOpen, setIsFormOpen] = useState(false);

  const deliveryData = useLiveQuery(
    () => db.deliveries.where('date').equals(selectedDate).first(),
    [selectedDate]
  );
  
  const fuelFilledToday = useLiveQuery(
    async () => {
        const logs = await db.fuelLogs.where('date').equals(selectedDate).toArray();
        return logs.reduce((sum, log) => sum + log.litres, 0);
    },
    [selectedDate]
  );

  const stats = useLiveQuery(async () => {
    // Last 7 days stats for chart
    const end = new Date(selectedDate);
    const result = [];
    
    for (let i = 6; i >= 0; i--) {
        const dStr = format(subDays(end, i), 'yyyy-MM-dd');
        const d = await db.deliveries.where('date').equals(dStr).first();
        const earnings = d ? (d.cashEarnings + d.onlineEarnings) : 0;
        const expenses = d ? (d.foodExpense + d.maintenanceExpense + d.otherExpense) : 0;
        result.push({
            name: format(new Date(dStr), 'dd/MM'),
            earnings: earnings,
            expenses: expenses,
            profit: earnings - expenses,
            rawDate: dStr
        });
    }
    return result;
  }, [selectedDate]);

  // Derived Calculations
  const kmDriven = deliveryData?.kmDriven || 0;
  // Prevent division by zero if mileage is missing (default 1 to avoid NaN)
  const safeMileage = settings.mileage > 0 ? settings.mileage : 1;
  const petrolUsedLiters = kmDriven / safeMileage;
  const petrolCostToday = petrolUsedLiters * settings.petrolRate;
  
  const totalEarnings = (deliveryData?.cashEarnings || 0) + (deliveryData?.onlineEarnings || 0);
  const totalExpenses = (deliveryData?.foodExpense || 0) + (deliveryData?.maintenanceExpense || 0) + (deliveryData?.otherExpense || 0);
  const netProfit = totalEarnings - totalExpenses; 

  // Advanced Metrics
  const earningsPerKm = kmDriven > 0 ? (totalEarnings / kmDriven) : 0;
  const profitMargin = totalEarnings > 0 ? (netProfit / totalEarnings) * 100 : 0;
  const costPerKm = kmDriven > 0 ? (totalExpenses / kmDriven) : 0;

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload: Delivery = {
        date: selectedDate,
        kmDriven: parseFloat(formData.get('kmDriven') as string) || 0,
        cashEarnings: parseFloat(formData.get('cashEarnings') as string) || 0,
        onlineEarnings: parseFloat(formData.get('onlineEarnings') as string) || 0,
        foodExpense: parseFloat(formData.get('foodExpense') as string) || 0,
        maintenanceExpense: parseFloat(formData.get('maintenanceExpense') as string) || 0,
        otherExpense: parseFloat(formData.get('otherExpense') as string) || 0
    };

    const existing = await db.deliveries.where('date').equals(selectedDate).first();
    if (existing?.id) {
        await db.deliveries.update(existing.id, payload);
    } else {
        await db.deliveries.add(payload);
    }
    setIsFormOpen(false);
  };

  const changeDate = (days: number) => {
    const newDate = addDays(new Date(selectedDate), days);
    setSelectedDate(format(newDate, 'yyyy-MM-dd'));
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Date Navigator */}
      <div className="flex items-center justify-between bg-white/80 dark:bg-surface/80 backdrop-blur-md p-3 rounded-2xl shadow-sm sticky top-0 z-20">
        <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ChevronLeft size={20} /></button>
        <div className="flex items-center gap-2 font-bold text-lg">
            <Calendar size={18} className="text-primary" />
            {format(new Date(selectedDate), 'EEE, dd MMM')}
        </div>
        <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ChevronRight size={20} /></button>
      </div>

      {/* Main KPI Card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-6 text-white shadow-lg shadow-blue-900/20">
          <div className="flex justify-between items-start mb-6">
              <div>
                  <p className="text-blue-200 text-sm font-medium">Net Profit</p>
                  <h1 className="text-4xl font-bold mt-1">₹{netProfit.toFixed(0)}</h1>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-2 rounded-lg">
                  <Banknote size={24} className="text-blue-100" />
              </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
              <div>
                  <p className="text-blue-200 text-xs">Total Earnings</p>
                  <p className="font-bold text-lg">₹{totalEarnings}</p>
              </div>
              <div className="text-right">
                  <p className="text-blue-200 text-xs">Direct Expenses</p>
                  <p className="font-bold text-lg">- ₹{totalExpenses}</p>
              </div>
          </div>
      </div>

      {/* Advanced Efficiency Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
         <div className="bg-white dark:bg-surface p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
             <div className="flex items-center gap-2 mb-2 text-gray-500 text-xs font-bold uppercase">
                <Gauge size={14} /> Earnings/KM
             </div>
             <p className="text-2xl font-bold text-gray-800 dark:text-white">
                ₹{earningsPerKm.toFixed(1)}
             </p>
         </div>
         <div className="bg-white dark:bg-surface p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
             <div className="flex items-center gap-2 mb-2 text-gray-500 text-xs font-bold uppercase">
                <Percent size={14} /> Profit Margin
             </div>
             <p className={`text-2xl font-bold ${profitMargin >= 50 ? 'text-green-500' : 'text-orange-500'}`}>
                {profitMargin.toFixed(0)}%
             </p>
         </div>
         <div className="bg-white dark:bg-surface p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
             <div className="flex items-center gap-2 mb-2 text-gray-500 text-xs font-bold uppercase">
                <AlertCircle size={14} /> Cost / KM
             </div>
             <p className="text-2xl font-bold text-red-500">
                ₹{costPerKm.toFixed(1)}
             </p>
         </div>
         <div className="bg-white dark:bg-surface p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
             <div className="flex items-center gap-2 mb-2 text-gray-500 text-xs font-bold uppercase">
                <Fuel size={14} /> Fuel Cost
             </div>
             <p className="text-2xl font-bold text-orange-500">
                ₹{petrolCostToday.toFixed(0)}
             </p>
             <p className="text-[10px] text-gray-400">Est. {settings.mileage}km/l</p>
         </div>
      </div>

      {/* Analytics Chart */}
      <div className="bg-white dark:bg-surface p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-64">
          <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide flex items-center gap-2"><TrendingUp size={14} /> Last 7 Days Overview</p>
          <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats || []} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                  <Tooltip 
                    cursor={{fill: '#f1f5f9', opacity: 0.4}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', background: 'rgba(255, 255, 255, 0.9)'}}
                    itemStyle={{fontSize: '12px', fontWeight: 'bold'}}
                  />
                  <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                  <Bar dataKey="earnings" name="Earnings" fill="#3b82f6" stackId="a" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
          </ResponsiveContainer>
      </div>

      {/* Edit Form */}
      <div className="bg-white dark:bg-surface rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold flex items-center gap-2"><Gauge size={18} /> Daily Log</h3>
              <button 
                onClick={() => setIsFormOpen(!isFormOpen)}
                className="text-primary text-sm font-bold bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full"
              >
                  {isFormOpen ? 'Close' : 'Edit'}
              </button>
          </div>
          
          {isFormOpen ? (
              <form onSubmit={handleSave} className="space-y-4 animate-in fade-in">
                   <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500">KM Driven</label>
                            <input name="kmDriven" type="number" step="0.1" defaultValue={deliveryData?.kmDriven} className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg border-none focus:ring-2 focus:ring-primary/20 font-bold" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Other Exp.</label>
                            <input name="otherExpense" type="number" defaultValue={deliveryData?.otherExpense} className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg border-none focus:ring-2 focus:ring-primary/20 font-bold" />
                        </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-green-600 font-bold">Cash Earnings</label>
                            <input name="cashEarnings" type="number" defaultValue={deliveryData?.cashEarnings} className="w-full p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg border-none focus:ring-2 focus:ring-green-500/20 font-bold text-green-700 dark:text-green-400" />
                        </div>
                        <div>
                            <label className="text-xs text-green-600 font-bold">Online Earnings</label>
                            <input name="onlineEarnings" type="number" defaultValue={deliveryData?.onlineEarnings} className="w-full p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg border-none focus:ring-2 focus:ring-green-500/20 font-bold text-green-700 dark:text-green-400" />
                        </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-red-500 font-bold">Food Exp.</label>
                            <input name="foodExpense" type="number" defaultValue={deliveryData?.foodExpense} className="w-full p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg border-none focus:ring-2 focus:ring-red-500/20 font-bold text-red-700 dark:text-red-400" />
                        </div>
                        <div>
                            <label className="text-xs text-red-500 font-bold">Maint. Exp.</label>
                            <input name="maintenanceExpense" type="number" defaultValue={deliveryData?.maintenanceExpense} className="w-full p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg border-none focus:ring-2 focus:ring-red-500/20 font-bold text-red-700 dark:text-red-400" />
                        </div>
                   </div>
                   <button type="submit" className="w-full py-3 bg-primary text-white rounded-xl font-bold mt-2 shadow-lg shadow-blue-500/30">Update Daily Log</button>
              </form>
          ) : (
              <div className="grid grid-cols-2 gap-4 text-sm" onClick={() => setIsFormOpen(true)}>
                  <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                      <span className="text-gray-500">KM Driven</span>
                      <span className="font-bold">{kmDriven} km</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                      <span className="text-gray-500">Cash</span>
                      <span className="font-bold text-success">+{deliveryData?.cashEarnings || 0}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                      <span className="text-gray-500">Online</span>
                      <span className="font-bold text-success">+{deliveryData?.onlineEarnings || 0}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                      <span className="text-gray-500">Total Exp</span>
                      <span className="font-bold text-danger">-{totalExpenses}</span>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default DeliveryPage;