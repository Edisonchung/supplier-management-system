/**
 * NotionQuotationSync.js
 * Syncs quotations to Notion sales pipeline and tracking databases
 * Part of HiggsFlow Quotation System
 */

import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// Singleton instance
let instance = null;

// Notion database IDs (configured per company/workspace)
const NOTION_CONFIG = {
  quotationsDatabase: process.env.REACT_APP_NOTION_QUOTATIONS_DB,
  salesPipelineDatabase: process.env.REACT_APP_NOTION_PIPELINE_DB,
  apiKey: process.env.REACT_APP_NOTION_API_KEY,
  apiVersion: '2022-06-28'
};

// Status mapping to Notion pipeline stages
const STATUS_TO_PIPELINE = {
  draft: 'Draft',
  pending_approval: 'Review',
  approved: 'Ready to Send',
  sent: 'Proposal Sent',
  accepted: 'Won',
  rejected: 'Lost',
  expired: 'Expired',
  converted: 'Closed Won',
  cancelled: 'Cancelled'
};

class NotionQuotationSync {
  constructor() {
    if (instance) {
      return instance;
    }
    
    this.apiBase = 'https://api.notion.com/v1';
    this.config = NOTION_CONFIG;
    
    instance = this;
  }

  /**
   * Sync quotation to Notion
   * @param {string} quotationId - Quotation ID
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} - Sync result
   */
  async syncQuotationToNotion(quotationId, options = {}) {
    const { forceCreate = false, updatePipeline = true } = options;

    try {
      // Fetch quotation from Firestore
      const quotationRef = doc(db, 'quotations', quotationId);
      const quotationSnap = await getDoc(quotationRef);
      
      if (!quotationSnap.exists()) {
        throw new Error('Quotation not found');
      }

      const quotation = {
        id: quotationSnap.id,
        ...quotationSnap.data()
      };

      // Check if already synced
      if (quotation.notionPageId && !forceCreate) {
        // Update existing page
        return await this.updateNotionPage(quotation);
      } else {
        // Create new page
        return await this.createNotionPage(quotation);
      }
    } catch (error) {
      console.error('Error syncing quotation to Notion:', error);
      throw error;
    }
  }

  /**
   * Create new Notion page for quotation
   */
  async createNotionPage(quotation) {
    const properties = this.buildNotionProperties(quotation);
    
    const response = await this.notionRequest('POST', '/pages', {
      parent: { database_id: this.config.quotationsDatabase },
      properties,
      children: this.buildNotionContent(quotation)
    });

    // Update Firestore with Notion page ID
    const quotationRef = doc(db, 'quotations', quotation.id);
    await updateDoc(quotationRef, {
      notionPageId: response.id,
      notionUrl: response.url,
      notionSyncedAt: serverTimestamp()
    });

    return {
      success: true,
      action: 'created',
      notionPageId: response.id,
      notionUrl: response.url
    };
  }

  /**
   * Update existing Notion page
   */
  async updateNotionPage(quotation) {
    const properties = this.buildNotionProperties(quotation);
    
    const response = await this.notionRequest('PATCH', `/pages/${quotation.notionPageId}`, {
      properties
    });

    // Update sync timestamp
    const quotationRef = doc(db, 'quotations', quotation.id);
    await updateDoc(quotationRef, {
      notionSyncedAt: serverTimestamp()
    });

    return {
      success: true,
      action: 'updated',
      notionPageId: response.id,
      notionUrl: response.url
    };
  }

  /**
   * Build Notion properties from quotation data
   */
  buildNotionProperties(quotation) {
    return {
      // Title
      'Quotation Number': {
        title: [
          {
            text: {
              content: quotation.quotationNumber || 'Untitled'
            }
          }
        ]
      },
      
      // Client
      'Client': {
        rich_text: [
          {
            text: {
              content: quotation.client?.name || ''
            }
          }
        ]
      },
      
      // Client Code
      'Client Code': {
        rich_text: [
          {
            text: {
              content: quotation.client?.code || ''
            }
          }
        ]
      },
      
      // Company
      'Company': {
        select: {
          name: quotation.company?.id || 'FS'
        }
      },
      
      // Status
      'Status': {
        select: {
          name: STATUS_TO_PIPELINE[quotation.status] || 'Draft'
        }
      },
      
      // Amount
      'Amount': {
        number: quotation.totals?.grandTotal || 0
      },
      
      // Currency
      'Currency': {
        select: {
          name: quotation.currency || 'MYR'
        }
      },
      
      // Created Date
      'Created Date': {
        date: {
          start: quotation.createdAt?.toISOString?.() || 
                 new Date(quotation.createdAt).toISOString()
        }
      },
      
      // Valid Until
      ...(quotation.validUntil && {
        'Valid Until': {
          date: {
            start: quotation.validUntil?.toISOString?.() ||
                   new Date(quotation.validUntil).toISOString()
          }
        }
      }),
      
      // Job Code
      ...(quotation.jobCode && {
        'Job Code': {
          rich_text: [
            {
              text: {
                content: quotation.jobCode
              }
            }
          ]
        }
      }),
      
      // Sales Person
      ...(quotation.createdBy?.name && {
        'Sales Person': {
          rich_text: [
            {
              text: {
                content: quotation.createdBy.name
              }
            }
          ]
        }
      }),
      
      // Client Tier
      ...(quotation.client?.tier && {
        'Client Tier': {
          select: {
            name: this.formatTierName(quotation.client.tier)
          }
        }
      }),
      
      // Line Count
      'Line Items': {
        number: quotation.lineCount || 0
      },
      
      // HiggsFlow URL
      'HiggsFlow Link': {
        url: `${process.env.REACT_APP_BASE_URL}/quotations/${quotation.id}`
      }
    };
  }

  /**
   * Build Notion page content
   */
  buildNotionContent(quotation) {
    const blocks = [];

    // Header with key info
    blocks.push({
      type: 'callout',
      callout: {
        rich_text: [
          {
            text: {
              content: `Quotation for ${quotation.client?.name || 'Client'}`
            }
          }
        ],
        icon: { emoji: '📄' },
        color: 'blue_background'
      }
    });

    // Summary table
    blocks.push({
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: 'Summary' } }]
      }
    });

    // Key details as bullet points
    const summaryItems = [
      `**Total Value:** ${quotation.currency} ${(quotation.totals?.grandTotal || 0).toFixed(2)}`,
      `**Client:** ${quotation.client?.name || 'N/A'} (${quotation.client?.tier || 'N/A'})`,
      `**Company:** ${quotation.company?.name || quotation.company?.id || 'N/A'}`,
      `**Status:** ${STATUS_TO_PIPELINE[quotation.status] || quotation.status}`,
      `**Valid Until:** ${this.formatDate(quotation.validUntil)}`,
      quotation.jobCode && `**Job Code:** ${quotation.jobCode}`,
      quotation.paymentTerms && `**Payment Terms:** ${quotation.paymentTerms}`
    ].filter(Boolean);

    for (const item of summaryItems) {
      blocks.push({
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            {
              text: { content: item },
              annotations: { bold: item.includes('**') }
            }
          ]
        }
      });
    }

    // Contacts
    if (quotation.attentionContacts?.length > 0) {
      blocks.push({
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: 'Contacts' } }]
        }
      });

      for (const contact of quotation.attentionContacts) {
        blocks.push({
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                text: { content: `${contact.name}` },
                annotations: { bold: true }
              },
              {
                text: { content: ` - ${contact.email || ''} ${contact.phone || ''}` }
              }
            ]
          }
        });
      }
    }

    // Notes
    if (quotation.notes) {
      blocks.push({
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: 'Notes' } }]
        }
      });
      blocks.push({
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: quotation.notes } }]
        }
      });
    }

    // Divider
    blocks.push({ type: 'divider', divider: {} });

    // Link back to HiggsFlow
    blocks.push({
      type: 'paragraph',
      paragraph: {
        rich_text: [
          { text: { content: '🔗 ' } },
          {
            text: { 
              content: 'View in HiggsFlow',
              link: { url: `${process.env.REACT_APP_BASE_URL}/quotations/${quotation.id}` }
            },
            annotations: { color: 'blue' }
          }
        ]
      }
    });

    return blocks;
  }

  /**
   * Update sales pipeline
   */
  async updateSalesPipeline(quotation) {
    if (!this.config.salesPipelineDatabase) {
      console.log('Sales pipeline database not configured');
      return null;
    }

    const pipelineStage = STATUS_TO_PIPELINE[quotation.status] || 'Draft';
    
    // Check if pipeline entry exists
    const existingEntry = await this.findPipelineEntry(quotation.id);
    
    if (existingEntry) {
      // Update existing
      return await this.notionRequest('PATCH', `/pages/${existingEntry.id}`, {
        properties: {
          'Stage': { select: { name: pipelineStage } },
          'Value': { number: quotation.totals?.grandTotal || 0 },
          'Updated': { date: { start: new Date().toISOString() } }
        }
      });
    } else {
      // Create new pipeline entry
      return await this.notionRequest('POST', '/pages', {
        parent: { database_id: this.config.salesPipelineDatabase },
        properties: {
          'Deal': {
            title: [
              {
                text: {
                  content: `${quotation.quotationNumber} - ${quotation.client?.name || 'Client'}`
                }
              }
            ]
          },
          'Stage': { select: { name: pipelineStage } },
          'Value': { number: quotation.totals?.grandTotal || 0 },
          'Client': { rich_text: [{ text: { content: quotation.client?.name || '' } }] },
          'Company': { select: { name: quotation.company?.id || 'FS' } },
          'Quotation': { rich_text: [{ text: { content: quotation.quotationNumber || '' } }] },
          'Created': { date: { start: new Date().toISOString() } }
        }
      });
    }
  }

  /**
   * Find existing pipeline entry
   */
  async findPipelineEntry(quotationId) {
    const response = await this.notionRequest('POST', `/databases/${this.config.salesPipelineDatabase}/query`, {
      filter: {
        property: 'Quotation ID',
        rich_text: {
          equals: quotationId
        }
      }
    });

    return response.results?.[0] || null;
  }

  /**
   * Sync multiple quotations
   */
  async batchSync(quotationIds, options = {}) {
    const results = [];
    
    for (const id of quotationIds) {
      try {
        const result = await this.syncQuotationToNotion(id, options);
        results.push({ id, ...result });
      } catch (error) {
        results.push({ id, success: false, error: error.message });
      }
      
      // Rate limiting - Notion has 3 requests/second limit
      await this.delay(350);
    }

    return results;
  }

  /**
   * Make Notion API request
   */
  async notionRequest(method, endpoint, body = null) {
    const response = await fetch(`${this.apiBase}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': this.config.apiVersion
      },
      ...(body && { body: JSON.stringify(body) })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Notion API error');
    }

    return response.json();
  }

  /**
   * Format tier name for Notion
   */
  formatTierName(tier) {
    const tierMap = {
      end_user: 'End User',
      contractor: 'Contractor',
      trader: 'Trader',
      si: 'System Integrator',
      partner: 'Partner',
      dealer: 'Dealer'
    };
    return tierMap[tier] || tier;
  }

  /**
   * Format date for display
   */
  formatDate(date) {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Delay helper for rate limiting
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if Notion is configured
   */
  isConfigured() {
    return !!(this.config.apiKey && this.config.quotationsDatabase);
  }
}

// Export singleton
export default new NotionQuotationSync();
export { NotionQuotationSync };
