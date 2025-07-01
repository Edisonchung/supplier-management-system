import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = "blue", 
  trend, 
  format = "number", 
  subtitle, 
  priority = "normal" 
}) => {
  const formatValue = (val) => {
    if (format === "currency") return `$${val.toLocaleString()}`;
    return val.toLocaleString();
  };

  const getColorClasses = (colorName) => {
    const colors = {
      blue: {
        bg: 'from-blue-500 to-blue-600',
        icon: 'bg-blue-100 text-blue-600',
        trend: 'text-blue-600'
      },
      green: {
        bg: 'from-green-500 to-green-600',
        icon: 'bg-green-100 text-green-600',
        trend: 'text-green-600'
      },
      purple: {
        bg: 'from-purple-500 to-purple-600',
        icon: 'bg-purple-100 text-purple-600',
        trend: 'text-purple-600'
      },
      yellow: {
        bg: 'from-yellow-500 to-yellow-600',
        icon: 'bg-yellow-100 text-yellow-600',
        trend: 'text-yellow-600'
      },
      red: {
        bg: 'from-red-500 to-red-600',
        icon: 'bg-red-100 text-red-600',
        trend: 'text-red-600'
      },
      orange: {
        bg: 'from-orange-500 to-orange-600',
        icon: 'bg-orange-100 text-orange-600',
        trend: 'text-orange-600'
      }
    };
    return colors[colorName] || colors.blue;
  };

  const colorClasses = getColorClasses(color);
  const isHighPriority = priority === "high";

  return (
    <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 ${
      isHighPriority ? 'ring-2 ring-red-200 ring-opacity-50' : ''
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            {isHighPriority && (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
          </div>
          
          <div className="flex items-baseline gap-2 mb-3">
            <p className="text-3xl font-bold text-gray-900">{formatValue(value)}</p>
            {trend && (
              <div className={`flex items-center text-sm font-medium ${
                trend > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend > 0 ? (
                  <TrendingUp size={16} className="mr-1" />
                ) : (
                  <TrendingDown size={16} className="mr-1" />
                )}
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>

          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
        
        <div className="ml-4">
          <div className={`w-14 h-14 ${colorClasses.icon} rounded-xl flex items-center justify-center shadow-sm`}>
            <Icon className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Progress bar for visual appeal */}
      <div className="mt-4">
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div 
            className={`bg-gradient-to-r ${colorClasses.bg} h-1 rounded-full transition-all duration-1000 ease-out`}
            style={{ width: `${Math.min((value / 100) * 100, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
