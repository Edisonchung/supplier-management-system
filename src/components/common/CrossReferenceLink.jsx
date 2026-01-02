// src/components/common/CrossReferenceLink.jsx
// Reusable clickable reference component for cross-navigation between entities

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  ShoppingCart, 
  Briefcase, 
  Building2, 
  Users,
  Package,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

// Entity type configurations
const ENTITY_CONFIGS = {
  jobCode: {
    icon: Briefcase,
    color: 'blue',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    route: (id) => `/jobs/${encodeURIComponent(id)}`
  },
  purchaseOrder: {
    icon: ShoppingCart,
    color: 'green',
    bgColor: 'bg-green-50 hover:bg-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    route: (id) => `/purchase-orders?po=${encodeURIComponent(id)}`
  },
  proformaInvoice: {
    icon: FileText,
    color: 'orange',
    bgColor: 'bg-orange-50 hover:bg-orange-100',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    route: (id) => `/procurement?pi=${encodeURIComponent(id)}`
  },
  supplier: {
    icon: Building2,
    color: 'purple',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    route: (id) => `/suppliers?id=${encodeURIComponent(id)}`
  },
  client: {
    icon: Users,
    color: 'indigo',
    bgColor: 'bg-indigo-50 hover:bg-indigo-100',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200',
    route: (id) => `/clients?id=${encodeURIComponent(id)}`
  },
  product: {
    icon: Package,
    color: 'teal',
    bgColor: 'bg-teal-50 hover:bg-teal-100',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-200',
    route: (id) => `/products?id=${encodeURIComponent(id)}`
  }
};

/**
 * CrossReferenceLink - Clickable badge/chip for navigating to related entities
 * 
 * @param {string} type - Entity type: 'jobCode', 'purchaseOrder', 'proformaInvoice', 'supplier', 'client', 'product'
 * @param {string} id - Entity ID or reference code
 * @param {string} label - Display text (optional, defaults to id)
 * @param {string} variant - 'badge', 'chip', 'link', 'button'
 * @param {string} size - 'sm', 'md', 'lg'
 * @param {boolean} showIcon - Whether to show the entity icon
 * @param {boolean} showArrow - Whether to show navigation arrow
 * @param {function} onClick - Custom click handler (optional)
 * @param {string} className - Additional CSS classes
 */
const CrossReferenceLink = ({
  type,
  id,
  label,
  variant = 'badge',
  size = 'sm',
  showIcon = true,
  showArrow = false,
  onClick,
  className = '',
  disabled = false
}) => {
  const navigate = useNavigate();
  
  if (!id || !type) return null;
  
  const config = ENTITY_CONFIGS[type];
  if (!config) {
    console.warn(`CrossReferenceLink: Unknown entity type "${type}"`);
    return null;
  }

  const Icon = config.icon;
  const displayLabel = label || id;

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    if (onClick) {
      onClick(id, type);
    } else {
      navigate(config.route(id));
    }
  };

  // Size classes
  const sizeClasses = {
    sm: {
      container: 'px-2 py-0.5 text-xs gap-1',
      icon: 'w-3 h-3'
    },
    md: {
      container: 'px-3 py-1 text-sm gap-1.5',
      icon: 'w-4 h-4'
    },
    lg: {
      container: 'px-4 py-1.5 text-base gap-2',
      icon: 'w-5 h-5'
    }
  };

  const currentSize = sizeClasses[size] || sizeClasses.sm;

  // Variant styles
  const variantStyles = {
    badge: `
      inline-flex items-center rounded-full border
      ${config.bgColor} ${config.textColor} ${config.borderColor}
      cursor-pointer transition-colors duration-150
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `,
    chip: `
      inline-flex items-center rounded-md border
      ${config.bgColor} ${config.textColor} ${config.borderColor}
      cursor-pointer transition-colors duration-150
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `,
    link: `
      inline-flex items-center gap-1
      ${config.textColor} hover:underline
      cursor-pointer transition-colors duration-150
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `,
    button: `
      inline-flex items-center rounded-lg border-2
      ${config.bgColor} ${config.textColor} ${config.borderColor}
      cursor-pointer transition-all duration-150
      hover:shadow-sm
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `
  };

  return (
    <span
      onClick={handleClick}
      className={`
        ${variantStyles[variant] || variantStyles.badge}
        ${currentSize.container}
        ${className}
      `}
      title={`View ${type.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${displayLabel}`}
    >
      {showIcon && <Icon className={currentSize.icon} />}
      <span className="font-medium truncate max-w-[150px]">{displayLabel}</span>
      {showArrow && <ChevronRight className={`${currentSize.icon} opacity-60`} />}
    </span>
  );
};

/**
 * CrossReferenceList - Display multiple references in a group
 */
export const CrossReferenceList = ({
  type,
  ids = [],
  labels = {},
  variant = 'badge',
  size = 'sm',
  maxDisplay = 3,
  showIcon = true,
  className = ''
}) => {
  if (!ids || ids.length === 0) return null;

  const displayIds = ids.slice(0, maxDisplay);
  const remainingCount = ids.length - maxDisplay;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {displayIds.map((id, index) => (
        <CrossReferenceLink
          key={`${id}-${index}`}
          type={type}
          id={id}
          label={labels[id] || id}
          variant={variant}
          size={size}
          showIcon={showIcon && index === 0}
        />
      ))}
      {remainingCount > 0 && (
        <span className={`
          inline-flex items-center rounded-full
          bg-gray-100 text-gray-600 
          px-2 py-0.5 text-xs
        `}>
          +{remainingCount} more
        </span>
      )}
    </div>
  );
};

/**
 * ProjectCodeDisplay - Special component for displaying project codes from PO items
 * Shows aggregated project codes with navigation
 */
export const ProjectCodeDisplay = ({
  items = [],
  variant = 'badge',
  size = 'sm',
  maxDisplay = 5,
  emptyText = 'No project codes',
  className = ''
}) => {
  // Extract unique project codes from items
  const projectCodes = React.useMemo(() => {
    if (!Array.isArray(items)) return [];
    
    const codes = items
      .map(item => item.projectCode)
      .filter(code => code && code.trim() !== '')
      .map(code => code.toUpperCase());
    
    return [...new Set(codes)];
  }, [items]);

  if (projectCodes.length === 0) {
    return (
      <span className="text-gray-400 text-sm italic">
        {emptyText}
      </span>
    );
  }

  return (
    <CrossReferenceList
      type="jobCode"
      ids={projectCodes}
      variant={variant}
      size={size}
      maxDisplay={maxDisplay}
      showIcon={true}
      className={className}
    />
  );
};

/**
 * LinkedDocumentsSummary - Shows summary of linked documents with counts
 */
export const LinkedDocumentsSummary = ({
  linkedPOs = [],
  linkedPIs = [],
  showLabels = true,
  compact = false,
  className = ''
}) => {
  const navigate = useNavigate();

  if (linkedPOs.length === 0 && linkedPIs.length === 0) {
    return (
      <span className="text-gray-400 text-sm italic">
        No linked documents
      </span>
    );
  }

  const handleViewAll = (type) => {
    // Navigate to the relevant list page
    if (type === 'po') {
      navigate('/purchase-orders');
    } else {
      navigate('/procurement');
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {linkedPOs.length > 0 && (
          <span className="inline-flex items-center gap-1 text-sm text-green-600">
            <ShoppingCart className="w-4 h-4" />
            {linkedPOs.length} PO{linkedPOs.length !== 1 ? 's' : ''}
          </span>
        )}
        {linkedPIs.length > 0 && (
          <span className="inline-flex items-center gap-1 text-sm text-orange-600">
            <FileText className="w-4 h-4" />
            {linkedPIs.length} PI{linkedPIs.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {linkedPOs.length > 0 && (
        <div>
          {showLabels && (
            <span className="text-xs text-gray-500 font-medium block mb-1">
              Purchase Orders ({linkedPOs.length})
            </span>
          )}
          <CrossReferenceList
            type="purchaseOrder"
            ids={linkedPOs}
            variant="chip"
            size="sm"
            maxDisplay={3}
          />
        </div>
      )}
      {linkedPIs.length > 0 && (
        <div>
          {showLabels && (
            <span className="text-xs text-gray-500 font-medium block mb-1">
              Proforma Invoices ({linkedPIs.length})
            </span>
          )}
          <CrossReferenceList
            type="proformaInvoice"
            ids={linkedPIs}
            variant="chip"
            size="sm"
            maxDisplay={3}
          />
        </div>
      )}
    </div>
  );
};

export default CrossReferenceLink;
