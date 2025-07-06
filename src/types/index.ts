export interface User {
  id: string;
  name: string;
  email: string;
  role: 'parent' | 'child';
  avatar?: string;
  createdAt: Date;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  category: 'education' | 'vacation' | 'emergency' | 'toys' | 'electronics' | 'other';
  priority: 'low' | 'medium' | 'high';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  goalId: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  method: 'mpesa' | 'bank' | 'cash';
  description: string;
  mpesaReference?: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
}

export interface PaymentRequest {
  amount: number;
  goalId: string;
  phoneNumber: string;
  paybillNumber: string;
  accountNumber: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}