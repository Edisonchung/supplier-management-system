// Team Data Backup & Sync System
// Add this as src/utils/teamDataManager.js

export class TeamDataManager {
  constructor() {
    this.backupKey = 'higgsflow_team_backup';
    this.lastSyncKey = 'higgsflow_last_sync';
  }

  // Create complete data backup
  createBackup() {
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      data: {
        suppliers: JSON.parse(localStorage.getItem('suppliers') || '[]'),
        products: JSON.parse(localStorage.getItem('products') || '[]'),
        purchaseOrders: JSON.parse(localStorage.getItem('purchaseOrders') || '[]'),
        proformaInvoices: JSON.parse(localStorage.getItem('proformaInvoices') || '[]'),
        clientInvoices: JSON.parse(localStorage.getItem('clientInvoices') || '[]'),
        users: JSON.parse(localStorage.getItem('users') || '[]'),
        activities: JSON.parse(localStorage.getItem('team_activities') || '[]')
      },
      user: JSON.parse(localStorage.getItem('higgsflow_user') || 'null')
    };
    
    localStorage.setItem(this.backupKey, JSON.stringify(backup));
    localStorage.setItem(this.lastSyncKey, backup.timestamp);
    
    return backup;
  }

  // Restore from backup
  restoreBackup(backupData) {
    try {
      const backup = typeof backupData === 'string' ? JSON.parse(backupData) : backupData;
      
      // Restore all data
      Object.entries(backup.data).forEach(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value));
      });
      
      localStorage.setItem(this.lastSyncKey, backup.timestamp);
      
      return { success: true, message: 'Data restored successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to restore data: ' + error.message };
    }
  }

  // Export data for sharing between team members
  exportTeamData() {
    const backup = this.createBackup();
    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `higgsflow-team-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return backup;
  }

  // Import team data
  importTeamData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          const result = this.restoreBackup(data);
          resolve(result);
        } catch (error) {
          reject(new Error('Invalid file format'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // Get backup info
  getBackupInfo() {
    const backup = localStorage.getItem(this.backupKey);
    const lastSync = localStorage.getItem(this.lastSyncKey);
    
    if (!backup) {
      return { hasBackup: false };
    }
    
    try {
      const backupData = JSON.parse(backup);
      return {
        hasBackup: true,
        timestamp: backupData.timestamp,
        lastSync: lastSync,
        dataSize: Object.values(backupData.data).reduce((total, arr) => total + arr.length, 0)
      };
    } catch {
      return { hasBackup: false };
    }
  }

  // Auto-backup every hour
  startAutoBackup() {
    this.createBackup(); // Create initial backup
    
    setInterval(() => {
      this.createBackup();
      console.log('📦 Auto-backup created:', new Date().toLocaleTimeString());
    }, 60 * 60 * 1000); // Every hour
  }

  // Generate team data report
  generateDataReport() {
    const data = {
      suppliers: JSON.parse(localStorage.getItem('suppliers') || '[]'),
      products: JSON.parse(localStorage.getItem('products') || '[]'),
      purchaseOrders: JSON.parse(localStorage.getItem('purchaseOrders') || '[]'),
      proformaInvoices: JSON.parse(localStorage.getItem('proformaInvoices') || '[]'),
      clientInvoices: JSON.parse(localStorage.getItem('clientInvoices') || '[]')
    };

    return {
      totalSuppliers: data.suppliers.length,
      activeSuppliers: data.suppliers.filter(s => s.status === 'active').length,
      totalProducts: data.products.length,
      lowStockProducts: data.products.filter(p => p.stock < 10).length,
      totalPurchaseOrders: data.purchaseOrders.length,
      draftPOs: data.purchaseOrders.filter(po => po.status === 'draft').length,
      totalProformaInvoices: data.proformaInvoices.length,
      pendingPIs: data.proformaInvoices.filter(pi => pi.status === 'pending').length,
      totalClientInvoices: data.clientInvoices.length,
      unpaidInvoices: data.clientInvoices.filter(ci => ci.paymentStatus === 'pending').length,
      lastActivity: localStorage.getItem(this.lastSyncKey) || 'Never'
    };
  }
}

// React Component for Team Data Management
import React, { useState, useEffect } from 'react';
import { Download, Upload, RefreshCw, Database, Users } from 'lucide-react';

export function TeamDataControl() {
  const [dataManager] = useState(() => new TeamDataManager());
  const [backupInfo, setBackupInfo] = useState(null);
  const [dataReport, setDataReport] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadDataInfo();
    // Start auto-backup
    dataManager.startAutoBackup();
  }, [dataManager]);

  const loadDataInfo = () => {
    setBackupInfo(dataManager.getBackupInfo());
    setDataReport(dataManager.generateDataReport());
  };

  const handleExport = () => {
    dataManager.exportTeamData();
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const result = await dataManager.importTeamData(file);
      if (result.success) {
        alert('✅ Team data imported successfully! Page will refresh.');
        window.location.reload();
      } else {
        alert('❌ Import failed: ' + result.message);
      }
    } catch (error) {
      alert('❌ Import error: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackup = () => {
    dataManager.createBackup();
    loadDataInfo();
    alert('✅ Manual backup created successfully!');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Team Data Management</h3>
      </div>

      {/* Data Overview */}
      {dataReport && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{dataReport.totalSuppliers}</div>
            <div className="text-sm text-gray-600">Suppliers</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{dataReport.totalProducts}</div>
            <div className="text-sm text-gray-600">Products</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{dataReport.totalPurchaseOrders}</div>
            <div className="text-sm text-gray-600">Purchase Orders</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{dataReport.totalProformaInvoices}</div>
            <div className="text-sm text-gray-600">PIs</div>
          </div>
        </div>
      )}

      {/* Backup Info */}
      {backupInfo && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            Last Backup: {backupInfo.lastSync ? new Date(backupInfo.lastSync).toLocaleString() : 'Never'}
          </div>
          {backupInfo.hasBackup && (
            <div className="text-sm text-gray-600">
              Data Records: {backupInfo.dataSize}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Team Data
        </button>
        
        <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
          <Upload className="w-4 h-4" />
          Import Team Data
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
            disabled={isProcessing}
          />
        </label>
        
        <button
          onClick={handleBackup}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Manual Backup
        </button>
      </div>

      {isProcessing && (
        <div className="mt-4 text-center text-gray-600">
          Processing... Please wait.
        </div>
      )}
    </div>
  );
}
