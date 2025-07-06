import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { goalsAPI, transactionsAPI } from '../lib/api';

interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  category: string;
  priority: string;
  status: string;
  progress_percentage: number;
  days_remaining: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

interface Transaction {
  id: string;
  user_id: string;
  goal_id: string;
  amount: number;
  transaction_type: 'deposit' | 'withdrawal';
  method: 'mpesa' | 'bank' | 'cash';
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  reference_number?: string;
  mpesa_reference?: string;
  phone_number?: string;
  transaction_fee: number;
  created_at: string;
  processed_at?: string;
}

interface DataContextType {
  goals: Goal[];
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  createGoal: (goalData: any) => Promise<boolean>;
  updateGoal: (goalId: string, updates: any) => Promise<boolean>;
  deleteGoal: (goalId: string) => Promise<boolean>;
  createTransaction: (transactionData: any) => Promise<boolean>;
  initiateMpesaPayment: (paymentData: any) => Promise<any>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshData();
    }
  }, [isAuthenticated, user]);

  const refreshData = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // For demo purposes, use mock data if API fails
      try {
        const [goalsResponse, transactionsResponse] = await Promise.all([
          goalsAPI.getGoals(),
          transactionsAPI.getTransactions(),
        ]);
        
        setGoals(goalsResponse.data);
        setTransactions(transactionsResponse.data);
      } catch (apiError) {
        console.warn('API not available, using mock data');
        
        // Mock data for demo
        const mockGoals: Goal[] = [
          {
            id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            user_id: user?.id || '',
            title: 'Family Vacation',
            description: 'Trip to the coast for the whole family',
            target_amount: 150000,
            current_amount: 45000,
            target_date: '2024-12-31',
            category: 'vacation',
            priority: 'high',
            status: 'active',
            progress_percentage: 30,
            days_remaining: 200,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            user_id: user?.id || '',
            title: 'Emergency Fund',
            description: 'Family emergency savings',
            target_amount: 200000,
            current_amount: 80000,
            target_date: '2024-06-30',
            category: 'emergency',
            priority: 'high',
            status: 'active',
            progress_percentage: 40,
            days_remaining: 100,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];

        const mockTransactions: Transaction[] = [
          {
            id: '1',
            user_id: user?.id || '',
            goal_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            amount: 5000,
            transaction_type: 'deposit',
            method: 'mpesa',
            status: 'completed',
            description: 'Monthly savings',
            mpesa_reference: 'MP240115001',
            phone_number: '254712345678',
            transaction_fee: 0,
            created_at: new Date().toISOString(),
            processed_at: new Date().toISOString(),
          },
        ];

        setGoals(mockGoals);
        setTransactions(mockTransactions);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async (goalData: any): Promise<boolean> => {
    try {
      const response = await goalsAPI.createGoal(goalData);
      await refreshData();
      return true;
    } catch (error) {
      console.error('Failed to create goal:', error);
      
      // Fallback to local state for demo
      const newGoal: Goal = {
        id: Date.now().toString(),
        user_id: user?.id || '',
        title: goalData.title,
        description: goalData.description,
        target_amount: goalData.target_amount,
        current_amount: 0,
        target_date: goalData.target_date,
        category: goalData.category,
        priority: goalData.priority || 'medium',
        status: 'active',
        progress_percentage: 0,
        days_remaining: Math.ceil((new Date(goalData.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      setGoals(prev => [...prev, newGoal]);
      return true;
    }
  };

  const updateGoal = async (goalId: string, updates: any): Promise<boolean> => {
    try {
      await goalsAPI.updateGoal(goalId, updates);
      await refreshData();
      return true;
    } catch (error) {
      console.error('Failed to update goal:', error);
      
      // Fallback to local state for demo
      setGoals(prev => prev.map(goal => 
        goal.id === goalId 
          ? { ...goal, ...updates, updated_at: new Date().toISOString() }
          : goal
      ));
      return true;
    }
  };

  const deleteGoal = async (goalId: string): Promise<boolean> => {
    try {
      await goalsAPI.deleteGoal(goalId);
      await refreshData();
      return true;
    } catch (error) {
      console.error('Failed to delete goal:', error);
      
      // Fallback to local state for demo
      setGoals(prev => prev.filter(goal => goal.id !== goalId));
      return true;
    }
  };

  const createTransaction = async (transactionData: any): Promise<boolean> => {
    try {
      await transactionsAPI.createTransaction(transactionData);
      await refreshData();
      return true;
    } catch (error) {
      console.error('Failed to create transaction:', error);
      
      // Fallback to local state for demo
      const newTransaction: Transaction = {
        id: Date.now().toString(),
        user_id: user?.id || '',
        goal_id: transactionData.goal_id,
        amount: transactionData.amount,
        transaction_type: transactionData.transaction_type,
        method: transactionData.method,
        status: 'completed',
        description: transactionData.description,
        mpesa_reference: `MP${Date.now()}`,
        phone_number: transactionData.phone_number,
        transaction_fee: 0,
        created_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
      };
      
      setTransactions(prev => [...prev, newTransaction]);
      
      // Update goal amount
      if (transactionData.transaction_type === 'deposit') {
        setGoals(prev => prev.map(goal => 
          goal.id === transactionData.goal_id
            ? { 
                ...goal, 
                current_amount: goal.current_amount + transactionData.amount,
                progress_percentage: Math.min(((goal.current_amount + transactionData.amount) / goal.target_amount) * 100, 100),
                updated_at: new Date().toISOString()
              }
            : goal
        ));
      }
      
      return true;
    }
  };

  const initiateMpesaPayment = async (paymentData: any): Promise<any> => {
    try {
      const response = await transactionsAPI.initiateMpesaPayment(paymentData);
      await refreshData();
      return response.data;
    } catch (error) {
      console.error('Failed to initiate M-Pesa payment:', error);
      
      // Simulate successful payment for demo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const transactionData = {
        goal_id: paymentData.goal_id,
        amount: paymentData.amount,
        transaction_type: 'deposit' as const,
        method: 'mpesa' as const,
        description: `M-Pesa payment via ${paymentData.paybill_number}`,
        phone_number: paymentData.phone_number,
      };
      
      await createTransaction(transactionData);
      
      return {
        message: 'Payment initiated successfully',
        transaction_id: Date.now().toString(),
        checkout_request_id: `CR${Date.now()}`,
      };
    }
  };

  return (
    <DataContext.Provider value={{
      goals,
      transactions,
      loading,
      error,
      refreshData,
      createGoal,
      updateGoal,
      deleteGoal,
      createTransaction,
      initiateMpesaPayment,
    }}>
      {children}
    </DataContext.Provider>
  );
};