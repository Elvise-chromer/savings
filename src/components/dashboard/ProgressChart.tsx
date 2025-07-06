import React from 'react';
import { Goal } from '../../types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ProgressChartProps {
  goals: Goal[];
}

export const ProgressChart: React.FC<ProgressChartProps> = ({ goals }) => {
  if (goals.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No data to display</p>
        <p className="text-sm text-gray-400">Create some goals to see progress charts</p>
      </div>
    );
  }

  // Prepare data for doughnut chart (goal completion)
  const completedGoals = goals.filter(g => g.currentAmount >= g.targetAmount).length;
  const activeGoals = goals.filter(g => g.currentAmount < g.targetAmount).length;

  const doughnutData = {
    labels: ['Completed', 'Active'],
    datasets: [
      {
        data: [completedGoals, activeGoals],
        backgroundColor: ['#10B981', '#6366F1'],
        borderColor: ['#059669', '#4F46E5'],
        borderWidth: 2,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: 'Goals Status',
      },
    },
  };

  // Prepare data for bar chart (savings progress)
  const barData = {
    labels: goals.map(g => g.title.length > 10 ? g.title.substring(0, 10) + '...' : g.title),
    datasets: [
      {
        label: 'Current Amount',
        data: goals.map(g => g.currentAmount),
        backgroundColor: '#6366F1',
        borderColor: '#4F46E5',
        borderWidth: 1,
      },
      {
        label: 'Target Amount',
        data: goals.map(g => g.targetAmount),
        backgroundColor: '#E5E7EB',
        borderColor: '#9CA3AF',
        borderWidth: 1,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: 'Savings Progress',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return 'KES ' + value.toLocaleString();
          },
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="h-64">
        <Doughnut data={doughnutData} options={doughnutOptions} />
      </div>
      <div className="h-64">
        <Bar data={barData} options={barOptions} />
      </div>
    </div>
  );
};