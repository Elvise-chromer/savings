import { useQuery } from 'react-query';
import { analyticsAPI } from '../lib/api';

export interface SavingsAnalytics {
  total_savings: number;
  total_target: number;
  overall_progress: number;
  active_goals: number;
  completed_goals: number;
  monthly_savings_rate: number;
  monthly_trends: Array<{
    month: string;
    amount: number;
  }>;
  category_breakdown: Array<{
    category: string;
    current_amount: number;
    target_amount: number;
    percentage: number;
  }>;
}

export interface GoalProgressAnalytics {
  goal_id: string;
  goal_title: string;
  current_amount: number;
  target_amount: number;
  progress_percentage: number;
  days_remaining: number;
  daily_required_savings: number;
  daily_average_savings: number;
  predicted_completion_date: string;
  is_on_track: boolean;
  velocity_trend: string;
}

export interface SpendingAnalytics {
  period_days: number;
  total_deposits: number;
  total_withdrawals: number;
  net_savings: number;
  average_transaction_size: number;
  transaction_count: number;
  method_breakdown: Record<string, { count: number; total: number }>;
  peak_saving_day: number;
}

export const useAnalytics = () => {
  const {
    data: savingsOverview,
    isLoading: isLoadingSavings,
    error: savingsError,
  } = useQuery<SavingsAnalytics>(
    'savings-overview',
    () => analyticsAPI.getSavingsOverview().then(res => res.data),
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  const {
    data: goalProgress,
    isLoading: isLoadingProgress,
    error: progressError,
  } = useQuery<GoalProgressAnalytics[]>(
    'goal-progress',
    () => analyticsAPI.getGoalProgress().then(res => res.data),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const {
    data: spendingPatterns,
    isLoading: isLoadingSpending,
    error: spendingError,
  } = useQuery<SpendingAnalytics>(
    'spending-patterns',
    () => analyticsAPI.getSpendingPatterns().then(res => res.data),
    {
      staleTime: 15 * 60 * 1000, // 15 minutes
    }
  );

  const {
    data: familyComparison,
    isLoading: isLoadingFamily,
    error: familyError,
  } = useQuery(
    'family-comparison',
    () => analyticsAPI.getFamilyComparison().then(res => res.data),
    {
      staleTime: 30 * 60 * 1000, // 30 minutes
    }
  );

  const isLoading = isLoadingSavings || isLoadingProgress || isLoadingSpending || isLoadingFamily;
  const hasError = savingsError || progressError || spendingError || familyError;

  return {
    savingsOverview,
    goalProgress,
    spendingPatterns,
    familyComparison,
    isLoading,
    hasError,
    isLoadingSavings,
    isLoadingProgress,
    isLoadingSpending,
    isLoadingFamily,
  };
};