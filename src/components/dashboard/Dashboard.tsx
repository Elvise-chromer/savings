import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { DashboardStats } from './DashboardStats';
import { GoalsList } from './GoalsList';
import { ProgressChart } from './ProgressChart';
import { RecentTransactions } from './RecentTransactions';
import { PaymentModal } from './PaymentModal';
import { CreateGoalModal } from './CreateGoalModal';
import { PlusIcon, CreditCardIcon, BarChartIcon as ChartBarIcon, BanknoteIcon as BanknotesIcon, RefreshCcwIcon } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { goals, transactions, loading, refreshData } = useData();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');

  const userGoals = goals.filter(goal => goal.user_id === user?.id);
  const totalSavings = userGoals.reduce((sum, goal) => sum + goal.current_amount, 0);
  const activeGoals = userGoals.filter(goal => goal.status === 'active');
  const completedGoals = userGoals.filter(goal => goal.status === 'completed');
  const userTransactions = transactions.filter(t => t.user_id === user?.id);

  const handleMakePayment = (goalId: string) => {
    setSelectedGoalId(goalId);
    setShowPaymentModal(true);
  };

  const handleRefresh = async () => {
    await refreshData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user?.name}!</h1>
            <p className="text-indigo-100 mt-1">
              Track your family's savings progress and achieve your goals together.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              title="Refresh data"
            >
              <RefreshCcwIcon className="h-5 w-5" />
            </button>
            <BanknotesIcon className="h-12 w-12 text-indigo-200" />
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <DashboardStats 
        totalSavings={totalSavings}
        activeGoals={activeGoals.length}
        completedGoals={completedGoals.length}
        recentTransactions={userTransactions.length}
      />

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => setShowCreateGoalModal(true)}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-lg hover:shadow-xl"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create New Goal
        </button>
        <button
          onClick={() => setShowPaymentModal(true)}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-lg hover:shadow-xl"
        >
          <CreditCardIcon className="h-5 w-5 mr-2" />
          Make Payment
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Progress Overview
          </h2>
          <ProgressChart goals={userGoals} />
        </div>
        
        {/* Goals List */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Goals</h2>
          <GoalsList 
            goals={userGoals} 
            onMakePayment={handleMakePayment}
          />
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <RecentTransactions 
          transactions={userTransactions} 
          goals={userGoals} 
        />
      </div>

      {/* Modals */}
      {showPaymentModal && (
        <PaymentModal
          goals={userGoals}
          selectedGoalId={selectedGoalId}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedGoalId('');
          }}
        />
      )}

      {showCreateGoalModal && (
        <CreateGoalModal
          onClose={() => setShowCreateGoalModal(false)}
        />
      )}
    </div>
  );
};