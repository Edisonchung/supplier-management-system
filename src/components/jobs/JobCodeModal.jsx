// src/components/jobs/JobCodeModal.jsx
// Modal for Creating and Editing Job Codes

import React, { useState, useEffect } from 'react';
import {
  X,
  Briefcase,
  Package,
  TrendingUp,
  Wrench,
  Beaker,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Building2,
  Calendar,
  DollarSign
} from 'lucide-react';
import useJobCodes, { 
  COMPANY_PREFIXES, 
  JOB_NATURE_CODES, 
  JOB_STATUSES 
} from '../../hooks/useJobCodes';
import jobCodeService from '../../services/JobCodeService';
import { useClients } from '../../hooks/useClients';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, Lock } from 'lucide-react';

// Nature code icons
const NATURE_ICONS = {
  P: Package,
  S: TrendingUp,
  SV: Wrench,
  R: Beaker
};

const JobCodeModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  editingJob = null 
}) => {
  const { clients = [] } = useClients?.() || {};
  const { user } = useAuth();
  const [linkedRecordsCount, setLinkedRecordsCount] = useState(null);
  const [loadingLinkedCount, setLoadingLinkedCount] = useState(false);
  
  // Check if this is a CRM-sourced job code
  const isCRMSourced = editingJob?.source === 'crm';
  
  // Validate job code format
  const validateJobCode = (jobCode) => {
    const parsed = jobCodeService.parseJobCode(jobCode);
    const errors = [];
    
    if (!parsed.companyPrefix) {
      errors.push('Missing company prefix');
    } else if (!COMPANY_PREFIXES[parsed.companyPrefix]) {
      errors.push(`Invalid company prefix: ${parsed.companyPrefix}`);
    }
    
    if (!parsed.jobNatureCode) {
      errors.push('Missing job nature code');
    } else if (!JOB_NATURE_CODES[parsed.jobNatureCode]) {
      errors.push(`Invalid job nature code: ${parsed.jobNatureCode}`);
    }
    
    if (!parsed.runningNumber || parsed.runningNumber <= 0) {
      errors.push('Missing or invalid running number');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };
  
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [generatedCode, setGeneratedCode] = useState('');

  const [formData, setFormData] = useState({
    jobCode: '',
    companyPrefix: 'FS',
    jobNatureCode: 'S',
    title: '',
    description: '',
    clientId: '',
    clientName: '',
    status: 'draft',
    quotedValue: 0,
    currency: 'MYR',
    startDate: '',
    expectedEndDate: ''
  });

  // Load linked records count when editing
  useEffect(() => {
    if (editingJob && isOpen) {
      const loadLinkedCount = async () => {
        setLoadingLinkedCount(true);
        try {
          const counts = await jobCodeService.getLinkedRecordsCount(editingJob.id || editingJob.jobCode);
          // Also include linkedPOs and linkedPIs from the job code itself
          const finalCounts = {
            ...counts,
            purchaseOrders: counts.purchaseOrders + (editingJob.linkedPOs?.length || 0),
            proformaInvoices: counts.proformaInvoices + (editingJob.linkedPIs?.length || 0)
          };
          setLinkedRecordsCount(finalCounts);
        } catch (error) {
          console.error('Error loading linked records count:', error);
          // Fallback to job code's own linked arrays
          setLinkedRecordsCount({
            costingEntries: 0,
            approvalQueue: 0,
            purchaseOrders: editingJob.linkedPOs?.length || 0,
            proformaInvoices: editingJob.linkedPIs?.length || 0
          });
        } finally {
          setLoadingLinkedCount(false);
        }
      };
      loadLinkedCount();
    } else {
      setLinkedRecordsCount(null);
    }
  }, [editingJob, isOpen]);
  
  // Initialize form when editing
  useEffect(() => {
    if (editingJob) {
      setFormData({
        jobCode: editingJob.id || editingJob.jobCode || '',
        companyPrefix: editingJob.companyPrefix || 'FS',
        jobNatureCode: editingJob.jobNatureCode || 'S',
        title: editingJob.title || '',
        description: editingJob.description || '',
        clientId: editingJob.clientId || '',
        clientName: editingJob.clientName || '',
        status: editingJob.status || 'draft',
        quotedValue: editingJob.quotedValue || 0,
        currency: editingJob.currency || 'MYR',
        startDate: editingJob.startDate || '',
        expectedEndDate: editingJob.expectedEndDate || ''
      });
      setGeneratedCode('');
    } else {
      // Reset form for new job
      setFormData({
        jobCode: '',
        companyPrefix: 'FS',
        jobNatureCode: 'S',
        title: '',
        description: '',
        clientId: '',
        clientName: '',
        status: 'draft',
        quotedValue: 0,
        currency: 'MYR',
        startDate: '',
        expectedEndDate: ''
      });
      setGeneratedCode('');
    }
    setValidationErrors([]);
  }, [editingJob, isOpen]);

  // Generate next job code
  const handleGenerateCode = async () => {
    setGenerating(true);
    try {
      const code = await jobCodeService.generateJobCode(formData.companyPrefix, formData.jobNatureCode);
      setGeneratedCode(code);
      setFormData(prev => ({ ...prev, jobCode: code }));
    } catch (err) {
      console.error('Error generating code:', err);
      setValidationErrors([{ field: 'jobCode', message: 'Failed to generate job code. Please try again.' }]);
    } finally {
      setGenerating(false);
    }
  };

  // Handle input changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear generated code if prefix or nature changes
    if (field === 'companyPrefix' || field === 'jobNatureCode') {
      setGeneratedCode('');
      setFormData(prev => ({ ...prev, jobCode: '' }));
    }
    
    // Update client name when client ID changes
    if (field === 'clientId') {
      const client = clients.find(c => c.id === value);
      setFormData(prev => ({
        ...prev,
        clientId: value,
        clientName: client?.name || ''
      }));
    }
    
    // Clear related validation errors
    setValidationErrors(prev => prev.filter(e => e.field !== field));
  };

  // Validate form
  const validate = () => {
    const errors = [];
    
    if (!formData.jobCode) {
      errors.push({ field: 'jobCode', message: 'Job code is required. Click "Generate" to create one.' });
    }
    
    if (formData.jobCode) {
      const validation = validateJobCode(formData.jobCode);
      if (!validation.isValid) {
        errors.push({ field: 'jobCode', message: validation.errors.join(', ') });
      }
    }
    
    if (!formData.title.trim()) {
      errors.push({ field: 'title', message: 'Title is required' });
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Handle save
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent editing CRM-sourced job codes
    if (isCRMSourced) {
      setValidationErrors([{ 
        field: 'general', 
        message: 'Cannot edit CRM-synced job codes. Please update in your CRM system.' 
      }]);
      return;
    }
    
    if (!validate()) return;
    
    setLoading(true);
    try {
      await onSave(formData);
    } catch (err) {
      console.error('Error saving job:', err);
      setValidationErrors([{ field: 'general', message: err.message }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const NatureIcon = NATURE_ICONS[formData.jobNatureCode] || Briefcase;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {editingJob ? 'Edit Job Code' : 'Create Job Code'}
              </h2>
              <p className="text-blue-100 text-sm">
                JCCS-compliant job tracking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* General Errors */}
            {validationErrors.filter(e => e.field === 'general').map((error, i) => (
              <div key={i} className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error.message}</span>
              </div>
            ))}
            
            {/* Linked Records Warning */}
            {editingJob && linkedRecordsCount && !isCRMSourced && (
              (linkedRecordsCount.costingEntries > 0 || 
               linkedRecordsCount.approvalQueue > 0 || 
               linkedRecordsCount.purchaseOrders > 0 || 
               linkedRecordsCount.proformaInvoices > 0) && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Changing this job code will affect linked records:</p>
                    <ul className="mt-1 text-xs list-disc list-inside space-y-0.5">
                      {linkedRecordsCount.purchaseOrders > 0 && (
                        <li>{linkedRecordsCount.purchaseOrders} linked Purchase Order(s)</li>
                      )}
                      {linkedRecordsCount.proformaInvoices > 0 && (
                        <li>{linkedRecordsCount.proformaInvoices} linked Proforma Invoice(s)</li>
                      )}
                      {linkedRecordsCount.costingEntries > 0 && (
                        <li>{linkedRecordsCount.costingEntries} costing entr{linkedRecordsCount.costingEntries === 1 ? 'y' : 'ies'}</li>
                      )}
                      {linkedRecordsCount.approvalQueue > 0 && (
                        <li>{linkedRecordsCount.approvalQueue} approval queue entr{linkedRecordsCount.approvalQueue === 1 ? 'y' : 'ies'}</li>
                      )}
                    </ul>
                    <p className="mt-2 text-xs font-medium">These references will be updated automatically.</p>
                  </div>
                </div>
              )
            )}

            {/* Job Code Generation */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Job Code Configuration
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Company Prefix */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Prefix *
                  </label>
                  <select
                    value={formData.companyPrefix}
                    onChange={(e) => handleChange('companyPrefix', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={editingJob}
                  >
                    {Object.entries(COMPANY_PREFIXES).map(([code, config]) => (
                      <option key={code} value={code}>
                        {code} - {config.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Job Nature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Type *
                  </label>
                  <select
                    value={formData.jobNatureCode}
                    onChange={(e) => handleChange('jobNatureCode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={editingJob}
                  >
                    {Object.entries(JOB_NATURE_CODES).map(([code, config]) => (
                      <option key={code} value={code}>
                        {code} - {config.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Generated Code Display */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Code
                  {isCRMSourced && (
                    <span className="ml-2 text-xs text-orange-600 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      CRM-synced
                    </span>
                  )}
                </label>
                {isCRMSourced && (
                  <div className="mb-2 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-orange-800">
                      <p className="font-medium">This job code is synced from CRM</p>
                      <p className="text-xs mt-1">Job code cannot be edited here. Please update it in your CRM system.</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={formData.jobCode}
                      onChange={(e) => handleChange('jobCode', e.target.value.toUpperCase())}
                      placeholder="Click Generate or enter manually"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-lg ${
                        validationErrors.some(e => e.field === 'jobCode') 
                          ? 'border-red-300 bg-red-50' 
                          : isCRMSourced
                          ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                          : 'border-gray-300'
                      }`}
                      disabled={isCRMSourced}
                    />
                    {formData.jobCode && !isCRMSourced && (
                      <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500" />
                    )}
                  </div>
                  {!editingJob && (
                    <button
                      type="button"
                      onClick={handleGenerateCode}
                      disabled={generating}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                    >
                      {generating ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Generate
                    </button>
                  )}
                </div>
                {validationErrors.filter(e => e.field === 'jobCode').map((error, i) => (
                  <p key={i} className="text-red-500 text-sm mt-1">{error.message}</p>
                ))}
                <p className="text-xs text-gray-500 mt-1">
                  Format: {formData.companyPrefix}-{formData.jobNatureCode}[Number]
                </p>
              </div>

              {/* Job Type Description */}
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200">
                <div className={`p-2 rounded-lg bg-${JOB_NATURE_CODES[formData.jobNatureCode]?.color || 'gray'}-100`}>
                  <NatureIcon className={`w-5 h-5 text-${JOB_NATURE_CODES[formData.jobNatureCode]?.color || 'gray'}-600`} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {JOB_NATURE_CODES[formData.jobNatureCode]?.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {JOB_NATURE_CODES[formData.jobNatureCode]?.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Job Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Job Details</h3>
              
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title / Description *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g., RTG Spare Parts Supply for PTP"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.some(e => e.field === 'title') 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                />
                {validationErrors.filter(e => e.field === 'title').map((error, i) => (
                  <p key={i} className="text-red-500 text-sm mt-1">{error.message}</p>
                ))}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Additional notes about this job..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Client */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Client
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) => handleChange('clientId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select client (optional)</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status and Dates */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(JOB_STATUSES).map(([value, config]) => (
                      <option key={value} value={value}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Expected End
                  </label>
                  <input
                    type="date"
                    value={formData.expectedEndDate}
                    onChange={(e) => handleChange('expectedEndDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Quoted Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Quoted Value
                  </label>
                  <input
                    type="number"
                    value={formData.quotedValue}
                    onChange={(e) => handleChange('quotedValue', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => handleChange('currency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MYR">MYR - Malaysian Ringgit</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="SGD">SGD - Singapore Dollar</option>
                    <option value="CNY">CNY - Chinese Yuan</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isCRMSourced}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {editingJob ? 'Update Job' : 'Create Job'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobCodeModal;
