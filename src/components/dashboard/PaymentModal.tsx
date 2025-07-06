import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { 
  XIcon, 
  CreditCardIcon, 
  SmartphoneIcon,
  CheckCircleIcon 
} from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
}

interface PaymentModalProps {
  goals: Goal[];
  selectedGoalId?: string;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ 
  goals, 
  selectedGoalId, 
  onClose 
}) => {
  const { initiateMpesaPayment } = useData();
  const [amount, setAmount] = useState('');
  const [goalId, setGoalId] = useState(selectedGoalId || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paybillNumber, setPaybillNumber] = useState('522522');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!goalId || !amount || !phoneNumber || !accountNumber) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await initiateMpesaPayment({
        goal_id: goalId,
        amount: parseFloat(amount),
        phone_number: phoneNumber,
        paybill_number: paybillNumber,
        account_number: accountNumber,
      });

      setSuccess(true);
      
      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Payment failed:', error);
      setError('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6 text-center">
          <div className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Successful!</h3>
          <p className="text-gray-600 mb-4">
            Your payment of {formatCurrency(parseFloat(amount))} has been processed successfully.
          </p>
          <p className="text-sm text-gray-500">
            You'll receive an SMS confirmation shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <CreditCardIcon className="h-5 w-5 mr-2" />
            Make Payment
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-1">
              Select Goal *
            </label>
            <select
              id="goal"
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Choose a goal...</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title} - {formatCurrency(goal.target_amount - goal.current_amount)} remaining
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount (KES) *
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              step="0.01"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter amount"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center">
              <SmartphoneIcon className="h-4 w-4 mr-2" />
              M-Pesa Payment Details
            </h4>
            
            <div className="space-y-3">
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-blue-800 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="254712345678"
                />
              </div>

              <div>
                <label htmlFor="paybillNumber" className="block text-sm font-medium text-blue-800 mb-1">
                  Paybill Number
                </label>
                <input
                  type="text"
                  id="paybillNumber"
                  value={paybillNumber}
                  onChange={(e) => setPaybillNumber(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="522522"
                />
              </div>

              <div>
                <label htmlFor="accountNumber" className="block text-sm font-medium text-blue-800 mb-1">
                  Account Number *
                </label>
                <input
                  type="text"
                  id="accountNumber"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your account number"
                />
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              <strong>Payment Process:</strong> After clicking "Process Payment", you'll receive an M-Pesa prompt on your phone. Enter your M-Pesa PIN to complete the transaction.
            </p>
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Processing...' : 'Process Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};