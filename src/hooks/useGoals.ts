import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { goalsAPI } from '../lib/api';

export interface Goal {
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

export const useGoals = () => {
  const queryClient = useQueryClient();

  const {
    data: goals = [],
    isLoading,
    error,
    refetch,
  } = useQuery('goals', () => goalsAPI.getGoals().then(res => res.data), {
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createGoalMutation = useMutation(goalsAPI.createGoal, {
    onSuccess: () => {
      queryClient.invalidateQueries('goals');
    },
  });

  const updateGoalMutation = useMutation(
    ({ goalId, updates }: { goalId: string; updates: any }) =>
      goalsAPI.updateGoal(goalId, updates),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('goals');
      },
    }
  );

  const deleteGoalMutation = useMutation(goalsAPI.deleteGoal, {
    onSuccess: () => {
      queryClient.invalidateQueries('goals');
    },
  });

  const createGoal = async (goalData: {
    title: string;
    description?: string;
    target_amount: number;
    target_date: string;
    category: string;
    priority?: string;
  }) => {
    try {
      await createGoalMutation.mutateAsync(goalData);
      return true;
    } catch (error) {
      console.error('Failed to create goal:', error);
      return false;
    }
  };

  const updateGoal = async (goalId: string, updates: any) => {
    try {
      await updateGoalMutation.mutateAsync({ goalId, updates });
      return true;
    } catch (error) {
      console.error('Failed to update goal:', error);
      return false;
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      await deleteGoalMutation.mutateAsync(goalId);
      return true;
    } catch (error) {
      console.error('Failed to delete goal:', error);
      return false;
    }
  };

  const getGoalById = (goalId: string): Goal | undefined => {
    return goals.find((goal: Goal) => goal.id === goalId);
  };

  const getActiveGoals = (): Goal[] => {
    return goals.filter((goal: Goal) => goal.status === 'active');
  };

  const getCompletedGoals = (): Goal[] => {
    return goals.filter((goal: Goal) => goal.status === 'completed');
  };

  const getTotalSavings = (): number => {
    return goals.reduce((total: number, goal: Goal) => total + goal.current_amount, 0);
  };

  const getTotalTarget = (): number => {
    return goals.reduce((total: number, goal: Goal) => total + goal.target_amount, 0);
  };

  return {
    goals,
    isLoading,
    error,
    refetch,
    createGoal,
    updateGoal,
    deleteGoal,
    getGoalById,
    getActiveGoals,
    getCompletedGoals,
    getTotalSavings,
    getTotalTarget,
    isCreating: createGoalMutation.isLoading,
    isUpdating: updateGoalMutation.isLoading,
    isDeleting: deleteGoalMutation.isLoading,
  };
};