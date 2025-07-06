import React, { useState } from 'react';
import { 
  ClockIcon, 
  UserIcon, 
  CogIcon,
  ExclamationTriangleIcon,
  FunnelIcon 
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface AuditEntry {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ip_address: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const AuditTrail: React.FC = () => {
  const [filter, setFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7d');

  // Mock audit data - in production, this would come from API
  const auditEntries: AuditEntry[] = [
    {
      id: '1',
      user_id: '1',
      user_name: 'John Doe',
      action: 'LOGIN',
      resource: 'user',
      details: { success: true, method: '2fa' },
      ip_address: '192.168.1.100',
      timestamp: '2024-01-15T14:30:00Z',
      severity: 'low',
    },
    {
      id: '2',
      user_id: '1',
      user_name: 'John Doe',
      action: 'CREATE',
      resource: 'goal',
      details: { goal_title: 'Family Vacation', amount: 150000 },
      ip_address: '192.168.1.100',
      timestamp: '2024-01-15T14:25:00Z',
      severity: 'medium',
    },
    {
      id: '3',
      user_id: '2',
      user_name: 'Jane Doe',
      action: 'PAYMENT',
      resource: 'transaction',
      details: { amount: 5000, method: 'mpesa', goal: 'Emergency Fund' },
      ip_address: '192.168.1.101',
      timestamp: '2024-01-15T14:20:00Z',
      severity: 'medium',
    },
    {
      id: '4',
      user_id: 'unknown',
      user_name: 'Unknown',
      action: 'FAILED_LOGIN',
      resource: 'user',
      details: { email: 'john@example.com', attempts: 3 },
      ip_address: '203.0.113.1',
      timestamp: '2024-01-15T13:45:00Z',
      severity: 'high',
    },
    {
      id: '5',
      user_id: '1',
      user_name: 'John Doe',
      action: 'UPDATE',
      resource: 'goal',
      details: { goal_id: '123', changes: { target_amount: 200000 } },
      ip_address: '192.168.1.100',
      timestamp: '2024-01-15T13:30:00Z',
      severity: 'low',
    },
  ];

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return colors[severity as keyof typeof colors] || colors.low;
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN':
      case 'LOGOUT':
        return <UserIcon className="h-4 w-4" />;
      case 'CREATE':
      case 'UPDATE':
      case 'DELETE':
        return <CogIcon className="h-4 w-4" />;
      case 'FAILED_LOGIN':
      case 'SECURITY_ALERT':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const filteredEntries = auditEntries.filter(entry => {
    if (filter === 'all') return true;
    if (filter === 'security') return ['FAILED_LOGIN', 'SECURITY_ALERT', 'LOGIN'].includes(entry.action);
    if (filter === 'transactions') return entry.resource === 'transaction';
    if (filter === 'goals') return entry.resource === 'goal';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <ClockIcon className="h-5 w-5 mr-2" />
            Audit Trail
          </h2>
          
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <div className="flex items-center">
              <FunnelIcon className="h-4 w-4 text-gray-400 mr-2" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Activities</option>
                <option value="security">Security Events</option>
                <option value="transactions">Transactions</option>
                <option value="goals">Goals</option>
              </select>
            </div>
            
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="1d">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{filteredEntries.length}</div>
            <div className="text-sm text-gray-600">Total Events</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {filteredEntries.filter(e => e.severity === 'low').length}
            </div>
            <div className="text-sm text-green-700">Low Severity</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredEntries.filter(e => ['medium', 'high'].includes(e.severity)).length}
            </div>
            <div className="text-sm text-yellow-700">Medium/High</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {filteredEntries.filter(e => e.severity === 'critical').length}
            </div>
            <div className="text-sm text-red-700">Critical</div>
          </div>
        </div>
      </div>

      {/* Audit Entries */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredEntries.map((entry) => (
            <div key={entry.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full ${getSeverityColor(entry.severity)}`}>
                    {getActionIcon(entry.action)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900">
                        {entry.action.replace('_', ' ')}
                      </p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(entry.severity)}`}>
                        {entry.severity}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">{entry.user_name}</span> performed {entry.action.toLowerCase()} on {entry.resource}
                    </p>
                    
                    {/* Details */}
                    <div className="mt-2 text-xs text-gray-500">
                      <div className="flex flex-wrap gap-4">
                        <span>IP: {entry.ip_address}</span>
                        <span>Time: {format(new Date(entry.timestamp), 'MMM dd, yyyy HH:mm:ss')}</span>
                      </div>
                      
                      {Object.keys(entry.details).length > 0 && (
                        <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                          <strong>Details:</strong> {JSON.stringify(entry.details, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {format(new Date(entry.timestamp), 'HH:mm')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredEntries.length === 0 && (
          <div className="p-6 text-center">
            <p className="text-gray-500">No audit entries found for the selected filters.</p>
          </div>
        )}
      </div>

      {/* Export Options */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Audit Data</h3>
        <div className="flex space-x-4">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
            Export as CSV
          </button>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
            Export as PDF
          </button>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
            Schedule Report
          </button>
        </div>
      </div>
    </div>
  );
};