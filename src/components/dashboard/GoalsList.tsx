import React from 'react';
import { 
  CreditCardIcon, 
  CalendarIcon, 
  FlagIcon 
} from 'lucide-react';
import { format } from 'date-fns';

interface Goal {
  id: string;
  title: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  category: string;
  priority: string;
  status: string;
}

interface GoalsListProps {
  goals: Goal[];
  onMakePayment: (goalId: string) => void;
}

export const GoalsList: React.FC<GoalsListProps> = ({ goals, onMakePayment }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      education: 'bg-blue-100 text-blue-800',
      vacation: 'bg-green-100 text-green-800',
      emergency: 'bg-red-100 text-red-800',
      toys: 'bg-purple-100 text-purple-800',
      electronics: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'text-red-600',
      medium: 'text-yellow-600',
      low: 'text-green-600',
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  if (goals.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <FlagIcon className="h-6 w-6 text-gray-400" />
        </div>
        <p className="text-gray-500 font-medium">No goals created yet</p>
        <p className="text-sm text-gray-400 mt-1">Start by creating your first savings goal!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {goals.map((goal) => {
        const progress = getProgressPercentage(goal.current_amount, goal.target_amount);
        
        return (
          <div key={goal.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{goal.title}</h3>
                {goal.description && (
                  <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                )}
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(goal.category)}`}>
                  {goal.category}
                </span>
                <FlagIcon className={`h-4 w-4 ${getPriorityColor(goal.priority)}`} />
              </div>
            </div>
            
            <div className="mb-3">
              <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
                <span>{formatCurrency(goal.current_amount)} of {formatCurrency(goal.target_amount)}</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center text-sm text-gray-500">
                <CalendarIcon className="h-4 w-4 mr-1" />
                Due: {format(new Date(goal.target_date), 'MMM dd, yyyy')}
              </div>
              <button
                onClick={() => onMakePayment(goal.id)}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <CreditCardIcon className="h-4 w-4 mr-1" />
                Pay
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};