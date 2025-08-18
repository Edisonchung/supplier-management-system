// src/components/analytics/MetricCard.jsx

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const MetricCard = ({ title, value, change, icon: Icon, color = "blue", isLoading = false }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="p-3 bg-gray-200 rounded-full">
            <div className="h-6 w-6 bg-gray-300 rounded"></div>
          </div>
        </div>
        <div className="flex items-center mt-2">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {change !== undefined && (
        <div className="flex items-center mt-3">
          {change > 0 ? (
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
          ) : change < 0 ? (
            <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
          ) : (
            <div className="h-4 w-4 mr-1" />
          )}
          <span className={`text-sm font-medium ${
            change > 0 
              ? 'text-green-600' 
              : change < 0 
                ? 'text-red-600' 
                : 'text-gray-600'
          }`}>
            {change !== 0 && Math.abs(change)}
            {change !== 0 && '%'} 
            {change > 0 && ' increase'}
            {change < 0 && ' decrease'}
            {change === 0 && 'No change'} from last month
          </span>
        </div>
      )}
    </div>
  );
};

export default MetricCard;
