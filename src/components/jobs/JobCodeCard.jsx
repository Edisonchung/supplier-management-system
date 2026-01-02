// src/components/jobs/JobCodeCard.jsx
// Job Code Card for Grid View Display

import React from 'react';
import {
  Briefcase,
  Package,
  TrendingUp,
  Wrench,
  Beaker,
  Edit,
  Trash2,
  Eye,
  FileText,
  ShoppingCart,
  Calendar,
  Building2,
  ArrowUpRight
} from 'lucide-react';
import { JOB_NATURE_CODES, JOB_STATUSES } from '../../hooks/useJobCodes';
import { LinkedDocumentsSummary } from '../common/CrossReferenceLink';

// Nature code icons
const NATURE_ICONS = {
  P: Package,
  S: TrendingUp,
  SV: Wrench,
  R: Beaker
};

// Format currency
const formatCurrency = (value, currency = 'MYR') => {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
};

// Format date
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

const JobCodeCard = ({ 
  job, 
  onView, 
  onEdit, 
  onDelete,
  compact = false 
}) => {
  const natureConfig = JOB_NATURE_CODES[job.jobNatureCode];
  const statusConfig = JOB_STATUSES[job.status];
  const NatureIcon = NATURE_ICONS[job.jobNatureCode] || Briefcase;

  // Color mappings for Tailwind
  const colorClasses = {
    blue: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-200',
      light: 'bg-blue-50'
    },
    green: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-200',
      light: 'bg-green-50'
    },
    orange: {
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      border: 'border-orange-200',
      light: 'bg-orange-50'
    },
    purple: {
      bg: 'bg-purple-100',
      text: 'text-purple-700',
      border: 'border-purple-200',
      light: 'bg-purple-50'
    },
    gray: {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-200',
      light: 'bg-gray-50'
    },
    yellow: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
      light: 'bg-yellow-50'
    },
    indigo: {
      bg: 'bg-indigo-100',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      light: 'bg-indigo-50'
    },
    red: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-200',
      light: 'bg-red-50'
    }
  };

  const natureColor = colorClasses[natureConfig?.color] || colorClasses.gray;
  const statusColor = colorClasses[statusConfig?.color] || colorClasses.gray;

  if (compact) {
    return (
      <div 
        className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow cursor-pointer"
        onClick={onView}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`p-1.5 rounded ${natureColor.light}`}>
              <NatureIcon className={`w-4 h-4 ${natureColor.text}`} />
            </span>
            <span className="font-semibold text-blue-600">{job.jobCode}</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
            {statusConfig?.label || job.status}
          </span>
        </div>
        {job.title && (
          <p className="text-sm text-gray-600 mt-1 truncate">{job.title}</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Header */}
      <div className={`${natureColor.light} px-4 py-3 border-b ${natureColor.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`p-2 rounded-lg ${natureColor.bg}`}>
              <NatureIcon className={`w-5 h-5 ${natureColor.text}`} />
            </span>
            <div>
              <span className="font-bold text-lg text-gray-900">{job.jobCode}</span>
              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${natureColor.bg} ${natureColor.text}`}>
                {natureConfig?.name || job.jobNatureCode}
              </span>
            </div>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
            {statusConfig?.label || job.status}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Title */}
        {job.title && (
          <div>
            <p className="text-sm font-medium text-gray-900 line-clamp-2">
              {job.title}
            </p>
          </div>
        )}

        {/* Client */}
        {job.clientName && (
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600 truncate">{job.clientName}</span>
          </div>
        )}

        {/* Dates */}
        {job.startDate && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">
              Started: {formatDate(job.startDate)}
            </span>
          </div>
        )}

        {/* Linked Documents */}
        <div className="pt-2 border-t border-gray-100">
          <LinkedDocumentsSummary
            linkedPOs={job.linkedPOs}
            linkedPIs={job.linkedPIs}
            compact={true}
          />
        </div>

        {/* Financial */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
          <div className="text-center p-2 bg-green-50 rounded">
            <p className="text-xs text-gray-500">PO Value</p>
            <p className="text-sm font-semibold text-green-700">
              {formatCurrency(job.totalPOValue, job.currency)}
            </p>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded">
            <p className="text-xs text-gray-500">PI Value</p>
            <p className="text-sm font-semibold text-orange-700">
              {formatCurrency(job.totalPIValue, job.currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Created {formatDate(job.createdAt)}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onView?.(); }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="View details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Cancel"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobCodeCard;
