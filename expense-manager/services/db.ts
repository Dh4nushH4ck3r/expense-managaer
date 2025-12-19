import Dexie, { type Table } from 'dexie';
import { Expense, Loan, LoanPayment, Delivery, FuelLog } from '../types';

class LocalTrackDatabase extends Dexie {
  expenses!: Table<Expense, number>;
  loans!: Table<Loan, number>;
  loanPayments!: Table<LoanPayment, number>;
  deliveries!: Table<Delivery, number>;
  fuelLogs!: Table<FuelLog, number>;

  constructor() {
    super('LocalTrackDB');
    (this as any).version(1).stores({
      expenses: '++id, date, type, category, isPetrol',
      loans: '++id, status, type',
      loanPayments: '++id, loanId, date',
      deliveries: '++id, date',
      fuelLogs: '++id, date, expenseId'
    });
  }
}

export const db = new LocalTrackDatabase();