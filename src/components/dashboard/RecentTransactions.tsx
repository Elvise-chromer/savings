import React from 'react';
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  ClockIcon 
} from 'lucide-react';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  goal_id: string;
  amount: number;
  transaction_type: 'deposit' | 'withdrawal';
  method: 'mpesa' | 'bank' | 'cash';
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  mpesa_reference?: string;
  created_at: string;
}

interface Goal {
  id: string;
  title: string;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
  goals: Goal[];
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ 
  transactions, 
  goals 
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getGoalTitle = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    return goal?.title || 'Unknown Goal';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'mpesa':
        return '📱';
      case 'bank':
        return '🏦';
      case 'cash':
        return '💵';
      default:
        return '💳';
    }
  };

  const recentTransactions = transactions
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <ClockIcon className="h-5 w-5 mr-2" />
        Recent Transactions
      </h2>
      
      {recentTransactions.length === 0 ? (
        <div className="text-center py-8">
          <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <ClockIcon className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No transactions yet</p>
          <p className="text-sm text-gray-400 mt-1">Start making deposits to see transaction history</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recentTransactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-full ${
                  transaction.transaction_type === 'deposit' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {transaction.transaction_type === 'deposit' ? (
                    <ArrowDownIcon className="h-5 w-5 text-green-600" />
                  ) : (
                    <ArrowUpIcon className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {transaction.transaction_type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                  </p>
                  <p className="text-sm text-gray-600">{getGoalTitle(transaction.goal_id)}</p>
                  {transaction.description && (
                    <p className="text-xs text-gray-500">{transaction.description}</p>
                  )}
                  {transaction.mpesa_reference && (
                    <p className="text-xs text-gray-500">Ref: {transaction.mpesa_reference}</p>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <p className={`font-semibold ${
                  transaction.transaction_type === 'deposit' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.transaction_type === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs">{getMethodIcon(transaction.method)}</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                    {transaction.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {format(new Date(transaction.created_at), 'MMM dd, HH:mm')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};