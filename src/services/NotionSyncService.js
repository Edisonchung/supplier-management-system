/**
 * NotionSyncService.js
 * 
 * Syncs costing entries from Notion "Job Costing Entries" database to HiggsFlow
 * Notion Database ID: 0b32f27d-2653-414c-85f1-ec590f1b0191
 */

import { serverTimestamp } from 'firebase/firestore';
import costingService from './CostingService';

// ============================================================================
// NOTION DATABASE CONFIGURATION
// ============================================================================

const NOTION_CONFIG = {
  // The database we created
  costingEntriesDbId: '0b32f27d-2653-414c-85f1-ec590f1b0191',
  costingEntriesDbUrl: 'https://www.notion.so/96c2c0cf70e645f39f881e03c076fb2c',
  
  // Property mappings (Notion property names to HiggsFlow fields)
  propertyMappings: {
    'Entry Name': 'entryName',
    'Job Code': 'jobCode',
    'Date': 'date',
    'Category': 'category',
    'Cost Type': 'costType',
    'Vendor': 'vendor',
    'Invoice No': 'invoiceNo',
    'Description': 'description',
    'Amount RM': 'amount',
    'Company': 'companyPrefix',
    'Receipt': 'attachments',
    'Entry Status': 'entryStatus',
    'Submitted By': 'submittedBy',
    'HiggsFlow ID': 'higgsFlowId',
    'Approval Status': 'approvalStatus',
    'Rejection Reason': 'rejectionReason'
  },
  
  // Category mappings (Notion select values to category codes)
  categoryMappings: {
    'A - Mechanical': 'A',
    'B - Instrumentation': 'B',
    'C - Electrical Control': 'C',
    'D - Labour': 'D',
    'E - Freight Transport': 'E',
    'F - Travelling': 'F',
    'G - Entertainment': 'G',
    'H - Miscellaneous': 'H'
  },
  
  // Cost type mappings
  costTypeMappings: {
    'PRE-Cost Budget': 'pre',
    'POST-Cost Actual': 'post'
  },
  
  // Company prefix mappings
  companyMappings: {
    'FS': 'FS',
    'FSE': 'FSE',
    'FSP': 'FSP',
    'BWS': 'BWS',
    'BWE': 'BWE',
    'EMIT': 'EMIT',
    'EMIA': 'EMIA',
    'FTS': 'FTS',
    'IHS': 'IHS'
  }
};

// ============================================================================
// NOTION SYNC SERVICE
// ============================================================================

class NotionSyncService {
  constructor() {
    this.config = NOTION_CONFIG;
    this.lastSyncTime = null;
  }
  
  // --------------------------------------------------------------------------
  // MAIN SYNC METHODS
  // --------------------------------------------------------------------------
  
  /**
   * Sync all submitted entries from Notion to HiggsFlow
   * Called periodically or manually
   */
  async syncFromNotion(notionApiClient) {
    try {
      console.log('Starting Notion sync...');
      
      // Query Notion for entries with status = "Submitted" and not yet synced
      const entries = await this.fetchSubmittedEntries(notionApiClient);
      console.log(`Found ${entries.length} entries to sync`);
      
      const results = {
        synced: 0,
        errors: [],
        skipped: 0
      };
      
      for (const notionEntry of entries) {
        try {
          // Check if already synced
          if (notionEntry.properties['HiggsFlow ID']?.rich_text?.[0]?.plain_text) {
            results.skipped++;
            continue;
          }
          
          // Transform and create in HiggsFlow
          const entryData = this.transformNotionEntry(notionEntry);
          
          // Validate required fields
          if (!entryData.jobCode) {
            results.errors.push({
              notionId: notionEntry.id,
              error: 'Missing job code'
            });
            continue;
          }
          
          // Create entry in HiggsFlow
          const entryId = await costingService.createEntry({
            ...entryData,
            sourceType: 'notion',
            notionPageId: notionEntry.id,
            notionDatabaseId: this.config.costingEntriesDbId
          }, true); // Submit for approval immediately
          
          // Update Notion entry with HiggsFlow ID and sync status
          await this.updateNotionEntry(notionApiClient, notionEntry.id, {
            'HiggsFlow ID': entryId,
            'Entry Status': 'Synced',
            'Approval Status': 'Pending'
          });
          
          results.synced++;
          
        } catch (error) {
          console.error('Error syncing entry:', notionEntry.id, error);
          results.errors.push({
            notionId: notionEntry.id,
            error: error.message
          });
        }
      }
      
      this.lastSyncTime = new Date();
      console.log('Notion sync complete:', results);
      
      return results;
      
    } catch (error) {
      console.error('Notion sync failed:', error);
      throw error;
    }
  }
  
  /**
   * Fetch submitted entries from Notion
   */
  async fetchSubmittedEntries(notionApiClient) {
    try {
      const response = await notionApiClient.databases.query({
        database_id: this.config.costingEntriesDbId,
        filter: {
          and: [
            {
              property: 'Entry Status',
              select: {
                equals: 'Submitted'
              }
            },
            {
              or: [
                {
                  property: 'HiggsFlow ID',
                  rich_text: {
                    is_empty: true
                  }
                },
                {
                  property: 'HiggsFlow ID',
                  rich_text: {
                    equals: ''
                  }
                }
              ]
            }
          ]
        },
        sorts: [
          {
            property: 'Date',
            direction: 'ascending'
          }
        ]
      });
      
      return response.results;
      
    } catch (error) {
      console.error('Error fetching Notion entries:', error);
      throw error;
    }
  }
  
  /**
   * Transform Notion entry to HiggsFlow format
   */
  transformNotionEntry(notionEntry) {
    const props = notionEntry.properties;
    
    // Extract values from Notion properties
    const jobCode = this.extractText(props['Job Code']);
    const category = this.config.categoryMappings[
      props['Category']?.select?.name
    ] || 'H';
    const costType = this.config.costTypeMappings[
      props['Cost Type']?.select?.name
    ] || 'post';
    
    // Extract date
    let date = null;
    if (props['Date']?.date?.start) {
      date = props['Date'].date.start;
    }
    
    // Extract attachments (receipts)
    const attachments = [];
    if (props['Receipt']?.files) {
      for (const file of props['Receipt'].files) {
        attachments.push({
          fileName: file.name,
          fileUrl: file.file?.url || file.external?.url,
          notionFileUrl: file.file?.url || file.external?.url,
          uploadedAt: new Date().toISOString(),
          source: 'notion'
        });
      }
    }
    
    // Get company prefix
    let companyPrefix = props['Company']?.select?.name || null;
    if (!companyPrefix && jobCode) {
      // Extract from job code
      const match = jobCode.match(/^([A-Z]+)-/);
      companyPrefix = match ? match[1] : null;
    }
    
    return {
      jobCode,
      date,
      category,
      costType,
      vendor: this.extractText(props['Vendor']),
      invoiceNo: this.extractText(props['Invoice No']),
      description: this.extractText(props['Description']),
      amount: props['Amount RM']?.number || 0,
      companyPrefix,
      attachments,
      
      // These will be set from context
      createdBy: 'notion-sync',
      createdByName: this.extractPersonName(props['Submitted By']),
      createdByEmail: '',
      branchId: null,
      branchName: '',
      companyId: null,
      
      notes: `Synced from Notion on ${new Date().toISOString()}`
    };
  }
  
  /**
   * Update Notion entry (after sync or approval)
   */
  async updateNotionEntry(notionApiClient, pageId, updates) {
    try {
      const properties = {};
      
      if (updates['HiggsFlow ID'] !== undefined) {
        properties['HiggsFlow ID'] = {
          rich_text: [{
            type: 'text',
            text: { content: updates['HiggsFlow ID'] || '' }
          }]
        };
      }
      
      if (updates['Entry Status'] !== undefined) {
        properties['Entry Status'] = {
          select: { name: updates['Entry Status'] }
        };
      }
      
      if (updates['Approval Status'] !== undefined) {
        properties['Approval Status'] = {
          select: { name: updates['Approval Status'] }
        };
      }
      
      if (updates['Rejection Reason'] !== undefined) {
        properties['Rejection Reason'] = {
          rich_text: [{
            type: 'text',
            text: { content: updates['Rejection Reason'] || '' }
          }]
        };
      }
      
      await notionApiClient.pages.update({
        page_id: pageId,
        properties
      });
      
      return true;
      
    } catch (error) {
      console.error('Error updating Notion entry:', error);
      throw error;
    }
  }
  
  /**
   * Update entry approval status in Notion (called after approval/rejection)
   */
  async updateEntryApprovalStatus(notionPageId, status, reason = null) {
    // This method will be called by CostingService
    // Need to get Notion client from somewhere - may need to pass it or use stored token
    console.log(`Would update Notion entry ${notionPageId} to status: ${status}`);
    
    // For now, log the update - actual implementation depends on how Notion client is managed
    // In production, you might:
    // 1. Store Notion OAuth token per user/company
    // 2. Use a server-side function to update Notion
    // 3. Use Notion MCP integration
  }
  
  // --------------------------------------------------------------------------
  // UTILITY METHODS
  // --------------------------------------------------------------------------
  
  /**
   * Extract plain text from Notion rich_text property
   */
  extractText(property) {
    if (!property) return '';
    
    // Rich text array
    if (property.rich_text) {
      return property.rich_text.map(rt => rt.plain_text).join('');
    }
    
    // Title array
    if (property.title) {
      return property.title.map(t => t.plain_text).join('');
    }
    
    return '';
  }
  
  /**
   * Extract person name from Notion people property
   */
  extractPersonName(property) {
    if (!property?.people?.length) return 'Unknown';
    
    const person = property.people[0];
    return person.name || person.person?.email || 'Unknown';
  }
  
  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      lastSyncTime: this.lastSyncTime,
      databaseId: this.config.costingEntriesDbId,
      databaseUrl: this.config.costingEntriesDbUrl
    };
  }
  
  /**
   * Manual sync trigger (for UI button)
   */
  async triggerManualSync(notionApiClient) {
    return this.syncFromNotion(notionApiClient);
  }
}

// ============================================================================
// NOTION MCP INTEGRATION (For Claude/MCP-based sync)
// ============================================================================

/**
 * Sync using Notion MCP tools (called from HiggsFlow MCP integration)
 * This is an alternative to API-based sync
 */
export async function syncViaNotionMCP(mcpClient) {
  const notionSyncService = new NotionSyncService();
  
  // Search for submitted entries using MCP
  const searchResult = await mcpClient.tools.notion.search({
    query: 'Entry Status Submitted',
    data_source_url: `collection://${NOTION_CONFIG.costingEntriesDbId}`
  });
  
  // Process results...
  // This is a simplified version - full implementation would parse MCP results
  
  return searchResult;
}

// Export singleton instance
const notionSyncService = new NotionSyncService();
export default notionSyncService;
export { NotionSyncService, NOTION_CONFIG };
