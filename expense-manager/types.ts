export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  petrolRate: number;
  mileage: number;
  tankCapacity: number;
  theme: ThemeMode;
}

export enum ExpenseType {
  INCOME = 'Income',
  EXPENSE = 'Expense'
}

export enum Category {
  SALARY = 'Salary',
  DELIVERY = 'Delivery',
  OTHER_INCOME = 'Other Income',
  FOOD = 'Food',
  TRANSPORT = 'Transport',
  SHOPPING = 'Shopping',
  BILLS = 'Bills',
  LOANS = 'Loans',
  ENTERTAINMENT = 'Entertainment',
  BAKERY = 'Bakery',
  OTHERS = 'Others'
}

export interface Expense {
  id?: number;
  date: string; // ISO Date string YYYY-MM-DD
  type: ExpenseType;
  category: string;
  amount: number;
  description: string;
  isPetrol?: boolean;
  litres?: number;
}

export enum LoanType {
  TAKEN_INTEREST = 'Taken (Interest)',
  GIVEN_INTEREST = 'Given (Interest)',
  FRIEND_INTEREST_FREE = 'Friend (Interest Free)'
}

export interface Loan {
  id?: number;
  name: string;
  type: LoanType;
  principal: number;
  rate?: number; // Annual interest rate %
  startDate: string;
  status: 'Active' | 'Closed';
}

export interface LoanPayment {
  id?: number;
  loanId: number;
  date: string;
  amount: number;
  type: 'Payment' | 'Received'; // Payment made by user or received by user
}

export interface Delivery {
  id?: number;
  date: string;
  kmDriven: number;
  cashEarnings: number;
  onlineEarnings: number;
  foodExpense: number;
  maintenanceExpense: number;
  otherExpense: number; // calculated from expenses module logic if needed, or manual
}

export interface FuelLog {
  id?: number;
  date: string;
  litres: number;
  cost: number;
  expenseId?: number;
}
