import React from 'react';
import { 
  BanknotesIcon, 
  TargetIcon, 
  CheckCircleIcon, 
  ClockIcon 
} from '@heroicons/react/24/outline';

interface DashboardStatsProps {
  totalSavings: number;
  activeGoals: number;
  completedGoals: number;
  recentTransactions: number;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  totalSavings,
  activeGoals,
  completedGoals,
  recentTransactions,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const stats = [
    {
      name: 'Total Savings',
      value: formatCurrency(totalSavings),
      icon: BanknotesIcon,
      color: 'bg-green-500',
      change: '+12%',
      changeType: 'increase',
    },
    {
      name: 'Active Goals',
      value: activeGoals.toString(),
      icon: TargetIcon,
      color: 'bg-blue-500',
      change: '+2',
      changeType: 'increase',
    },
    {
      name: 'Completed Goals',
      value: completedGoals.toString(),
      icon: CheckCircleIcon,
      color: 'bg-green-500',
      change: '+1',
      changeType: 'increase',
    },
    {
      name: 'Recent Transactions',
      value: recentTransactions.toString(),
      icon: ClockIcon,
      color: 'bg-purple-500',
      change: '+5',
      changeType: 'increase',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat) => (
        <div key={stat.name} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className={`${stat.color} p-3 rounded-full`}>
              <stat.icon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{stat.name}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className={`text-sm font-medium ${
              stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
            }`}>
              {stat.change}
            </span>
            <span className="text-sm text-gray-500 ml-2">from last month</span>
          </div>
        </div>
      ))}
    </div>
  );
};