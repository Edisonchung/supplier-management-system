/**
 * CostingEntryForm.jsx
 * 
 * Form for creating/editing costing entries
 * Mobile-friendly design for field staff
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Send, 
  Camera, 
  Upload, 
  Trash2,
  DollarSign,
  Calendar,
  FileText,
  Building2,
  User,
  AlertCircle
} from 'lucide-react';
import { COST_CATEGORIES, COST_TYPES, APPROVAL_STATUSES } from '../services/CostingService';

// ============================================================================
// COSTING ENTRY FORM
// ============================================================================

const CostingEntryForm = ({
  jobCode,
  entry = null, // Existing entry for editing
  onSave,
  onSubmit, // Submit for approval
  onClose,
  approvers = [], // Available approvers for selection
  currentUser,
  companyPrefix = null
}) => {
  const isEditing = !!entry;
  const canEdit = !entry || [APPROVAL_STATUSES.draft, APPROVAL_STATUSES.rejected].includes(entry.approvalStatus);
  
  // Form state
  const [formData, setFormData] = useState({
    costType: entry?.costType || 'post',
    category: entry?.category || 'H',
    date: entry?.date || new Date().toISOString().split('T')[0],
    vendor: entry?.vendor || '',
    invoiceNo: entry?.invoiceNo || '',
    description: entry?.description || '',
    quantity: entry?.quantity || 1,
    unit: entry?.unit || 'sum',
    unitRate: entry?.unitRate || '',
    amount: entry?.amount || '',
    amountPaid: entry?.amountPaid || 0,
    paymentDate: entry?.paymentDate || '',
    notes: entry?.notes || '',
    assignedApproverId: entry?.assignedApproverId || '',
    assignedApproverName: entry?.assignedApproverName || ''
  });
  
  const [attachments, setAttachments] = useState(entry?.attachments || []);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Auto-calculate amount from quantity × unitRate
  useEffect(() => {
    if (formData.quantity && formData.unitRate) {
      const amount = formData.quantity * parseFloat(formData.unitRate);
      setFormData(prev => ({ ...prev, amount: amount.toFixed(2) }));
    }
  }, [formData.quantity, formData.unitRate]);
  
  // Handle input changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is modified
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };
  
  // Handle approver selection
  const handleApproverChange = (approverId) => {
    const approver = approvers.find(a => a.id === approverId);
    setFormData(prev => ({
      ...prev,
      assignedApproverId: approverId,
      assignedApproverName: approver?.userName || ''
    }));
  };
  
  // Handle file upload
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      // In real implementation, upload to Firebase Storage
      // For now, create preview
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [...prev, {
          fileName: file.name,
          fileUrl: reader.result, // This would be the storage URL in production
          uploadedAt: new Date().toISOString(),
          source: 'upload'
        }]);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Remove attachment
  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  // Validate form
  const validate = () => {
    const newErrors = {};
    
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Save as draft
  const handleSave = async () => {
    if (!validate()) return;
    
    setSaving(true);
    try {
      await onSave({
        ...formData,
        amount: parseFloat(formData.amount),
        unitRate: parseFloat(formData.unitRate) || parseFloat(formData.amount),
        amountPaid: parseFloat(formData.amountPaid) || 0,
        attachments
      }, false);
      onClose();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setSaving(false);
    }
  };
  
  // Submit for approval
  const handleSubmit = async () => {
    if (!validate()) return;
    
    setSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        amount: parseFloat(formData.amount),
        unitRate: parseFloat(formData.unitRate) || parseFloat(formData.amount),
        amountPaid: parseFloat(formData.amountPaid) || 0,
        attachments
      });
      onClose();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-start justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEditing ? 'Edit Cost Entry' : 'New Cost Entry'}
            </h2>
            <p className="text-sm text-gray-500">
              Job Code: <span className="font-mono text-blue-600">{jobCode}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Rejection warning */}
        {entry?.approvalStatus === APPROVAL_STATUSES.rejected && (
          <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Entry Rejected</p>
              <p className="text-sm">{entry.rejectionReason}</p>
            </div>
          </div>
        )}
        
        {/* Form */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Cost Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cost Type
            </label>
            <div className="flex gap-2">
              {Object.entries(COST_TYPES).map(([key, type]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleChange('costType', key)}
                  disabled={!canEdit}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    formData.costType === key
                      ? key === 'pre' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-green-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {type.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              disabled={!canEdit}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.category ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {Object.entries(COST_CATEGORIES).map(([code, cat]) => (
                <option key={code} value={code}>
                  {code} - {cat.name}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-500">{errors.category}</p>
            )}
          </div>
          
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                disabled={!canEdit}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
            </div>
          </div>
          
          {/* Vendor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Vendor / Supplier
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={formData.vendor}
                onChange={(e) => handleChange('vendor', e.target.value)}
                disabled={!canEdit}
                placeholder="e.g., MH Hardware Sdn Bhd"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          {/* Invoice Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Invoice / Receipt No
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={formData.invoiceNo}
                onChange={(e) => handleChange('invoiceNo', e.target.value)}
                disabled={!canEdit}
                placeholder="e.g., INV-2025-001"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={!canEdit}
              rows={2}
              placeholder="Brief description of the expense..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>
          
          {/* Amount Section */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Qty
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', parseFloat(e.target.value) || 1)}
                disabled={!canEdit}
                min="1"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Unit
              </label>
              <select
                value={formData.unit}
                onChange={(e) => handleChange('unit', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="sum">Sum</option>
                <option value="pcs">Pcs</option>
                <option value="set">Set</option>
                <option value="lot">Lot</option>
                <option value="day">Day</option>
                <option value="trip">Trip</option>
                <option value="km">KM</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Unit Rate
              </label>
              <input
                type="number"
                value={formData.unitRate}
                onChange={(e) => handleChange('unitRate', e.target.value)}
                disabled={!canEdit}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          {/* Total Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Total Amount (RM) *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                disabled={!canEdit}
                min="0"
                step="0.01"
                placeholder="0.00"
                className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-medium ${
                  errors.amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-sm text-red-500">{errors.amount}</p>
            )}
          </div>
          
          {/* Payment Tracking */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount Paid
              </label>
              <input
                type="number"
                value={formData.amountPaid}
                onChange={(e) => handleChange('amountPaid', e.target.value)}
                disabled={!canEdit}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Date
              </label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => handleChange('paymentDate', e.target.value)}
                disabled={!canEdit}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Receipt / Attachments
            </label>
            
            {/* Attachment list */}
            {attachments.length > 0 && (
              <div className="mb-2 space-y-2">
                {attachments.map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <span className="text-sm truncate flex-1">{file.fileName}</span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Upload buttons */}
            {canEdit && (
              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                  <Camera className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-500">Take Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <label className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                  <Upload className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-500">Upload File</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    multiple
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
          
          {/* Approver Selection */}
          {approvers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assign Approver (Optional)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={formData.assignedApproverId}
                  onChange={(e) => handleApproverChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Any Approver</option>
                  {approvers.map(approver => (
                    <option key={approver.id} value={approver.id}>
                      {approver.userName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          
          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              disabled={!canEdit}
              rows={2}
              placeholder="Any additional notes..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>
          
          {/* Error message */}
          {errors.submit && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
              {errors.submit}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          
          {canEdit && (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CostingEntryForm;
