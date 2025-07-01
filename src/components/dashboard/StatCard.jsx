import { TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color = "blue", trend, format = "number" }) => {
  const formatValue = (val) => {
    if (format === "currency") return `$${val.toLocaleString()}`;
    return val.toLocaleString();
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{formatValue(value)}</p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span className="ml-1">{Math.abs(trend)}% from last month</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 bg-${color}-100 rounded-lg flex items-center justify-center`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
