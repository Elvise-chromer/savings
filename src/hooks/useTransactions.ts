import { useQuery, useMutation, useQueryClient } from 'react-query';
import { transactionsAPI } from '../lib/api';

export interface Transaction {
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

export const useTransactions = (goalId?: string) => {
  const queryClient = useQueryClient();

  const {
    data: transactions = [],
    isLoading,
    error,
    refetch,
  } = useQuery(
    ['transactions', goalId],
    () => transactionsAPI.getTransactions({ goal_id: goalId }).then(res => res.data),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  const createTransactionMutation = useMutation(transactionsAPI.createTransaction, {
    onSuccess: () => {
      queryClient.invalidateQueries('transactions');
      queryClient.invalidateQueries('goals');
    },
  });

  const initiateMpesaPaymentMutation = useMutation(transactionsAPI.initiateMpesaPayment, {
    onSuccess: () => {
      queryClient.invalidateQueries('transactions');
      queryClient.invalidateQueries('goals');
    },
  });

  const createTransaction = async (transactionData: {
    goal_id: string;
    amount: number;
    transaction_type: 'deposit' | 'withdrawal';
    method: 'mpesa' | 'bank' | 'cash';
    description?: string;
    phone_number?: string;
    paybill_number?: string;
    account_number?: string;
  }) => {
    try {
      const response = await createTransactionMutation.mutateAsync(transactionData);
      return response.data;
    } catch (error) {
      console.error('Failed to create transaction:', error);
      throw error;
    }
  };

  const initiateMpesaPayment = async (paymentData: {
    goal_id: string;
    amount: number;
    phone_number: string;
    paybill_number: string;
    account_number: string;
  }) => {
    try {
      const response = await initiateMpesaPaymentMutation.mutateAsync(paymentData);
      return response.data;
    } catch (error) {
      console.error('Failed to initiate M-Pesa payment:', error);
      throw error;
    }
  };

  const getTransactionsByGoal = (goalId: string): Transaction[] => {
    return transactions.filter((transaction: Transaction) => transaction.goal_id === goalId);
  };

  const getRecentTransactions = (limit: number = 10): Transaction[] => {
    return transactions
      .sort((a: Transaction, b: Transaction) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, limit);
  };

  const getTotalDeposits = (): number => {
    return transactions
      .filter((t: Transaction) => t.transaction_type === 'deposit' && t.status === 'completed')
      .reduce((total: number, t: Transaction) => total + t.amount, 0);
  };

  const getTotalWithdrawals = (): number => {
    return transactions
      .filter((t: Transaction) => t.transaction_type === 'withdrawal' && t.status === 'completed')
      .reduce((total: number, t: Transaction) => total + t.amount, 0);
  };

  return {
    transactions,
    isLoading,
    error,
    refetch,
    createTransaction,
    initiateMpesaPayment,
    getTransactionsByGoal,
    getRecentTransactions,
    getTotalDeposits,
    getTotalWithdrawals,
    isCreating: createTransactionMutation.isLoading,
    isInitiatingPayment: initiateMpesaPaymentMutation.isLoading,
  };
};