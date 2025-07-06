import React from 'react';
import { 
  ShieldCheckIcon, 
  KeyIcon, 
  ExclamationTriangleIcon,
  ClockIcon,
  DevicePhoneMobileIcon 
} from '@heroicons/react/24/outline';

export const SecurityDashboard: React.FC = () => {
  const securityMetrics = {
    lastLogin: '2024-01-15 14:30:00',
    loginAttempts: 0,
    twoFactorEnabled: false,
    securityScore: 75,
    recentActivity: [
      { action: 'Login', timestamp: '2024-01-15 14:30:00', ip: '192.168.1.1', status: 'success' },
      { action: 'Goal Created', timestamp: '2024-01-15 14:25:00', ip: '192.168.1.1', status: 'success' },
      { action: 'Payment', timestamp: '2024-01-15 14:20:00', ip: '192.168.1.1', status: 'success' },
    ]
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ShieldCheckIcon className="h-5 w-5 mr-2" />
          Security Overview
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSecurityScoreColor(securityMetrics.securityScore)}`}>
              Security Score: {securityMetrics.securityScore}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Overall account security</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{securityMetrics.loginAttempts}</div>
            <p className="text-xs text-gray-500">Failed login attempts (24h)</p>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold ${securityMetrics.twoFactorEnabled ? 'text-green-600' : 'text-red-600'}`}>
              {securityMetrics.twoFactorEnabled ? 'ON' : 'OFF'}
            </div>
            <p className="text-xs text-gray-500">Two-factor authentication</p>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center">
              <DevicePhoneMobileIcon className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
                <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
              </div>
            </div>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
              {securityMetrics.twoFactorEnabled ? 'Disable' : 'Enable'}
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center">
              <KeyIcon className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <h4 className="font-medium text-gray-900">Change Password</h4>
                <p className="text-sm text-gray-500">Update your account password</p>
              </div>
            </div>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
              Change
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ClockIcon className="h-5 w-5 mr-2" />
          Recent Security Activity
        </h3>
        
        <div className="space-y-3">
          {securityMetrics.recentActivity.map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-3 ${
                  activity.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <div>
                  <p className="font-medium text-gray-900">{activity.action}</p>
                  <p className="text-sm text-gray-500">IP: {activity.ip}</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">{activity.timestamp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Security Recommendations */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
          Security Recommendations
        </h3>
        
        <ul className="space-y-2 text-sm text-yellow-700">
          {!securityMetrics.twoFactorEnabled && (
            <li>• Enable two-factor authentication for better security</li>
          )}
          <li>• Use a strong, unique password for your account</li>
          <li>• Regularly review your account activity</li>
          <li>• Never share your login credentials with others</li>
        </ul>
      </div>
    </div>
  );
};