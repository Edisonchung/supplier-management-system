// HiggsFlow Quotation System - Component Exports
// Version 1.0.0

// Main Components
export { default as QuotationDashboard } from './QuotationDashboard';
export { default as QuotationCreate } from './QuotationCreate';
export { default as QuotationDetail } from './QuotationDetail';
export { default as QuotationEdit } from './QuotationEdit';

// Description Components
export { default as DescriptionEditor } from './description/DescriptionEditor';
export { default as AIDescriptionGenerator } from './description/AIDescriptionGenerator';
export { default as DescriptionHistory } from './description/DescriptionHistory';

// Pricing Components
export { default as DiscountCalculator } from './pricing/DiscountCalculator';
export { default as PriceBookLookup } from './pricing/PriceBookLookup';
export { default as NettPriceEntry } from './pricing/NettPriceEntry';
export { default as MarketEstimate } from './pricing/MarketEstimate';
export { default as TierMarkupDisplay } from './pricing/TierMarkupDisplay';

// Form Components
export { default as ContactSelector } from './forms/ContactSelector';
export { default as ProductSearchModal } from './forms/ProductSearchModal';
export { default as QuotationLineForm } from './forms/QuotationLineForm';

// PDF Components
export { default as PDFConfigPanel } from './pdf/PDFConfigPanel';
export { default as PDFExport } from './pdf/PDFExport';
export { default as LetterheadPreview } from './pdf/LetterheadPreview';

// Shipping Components
export { default as ShippingCalculator } from './shipping/ShippingCalculator';

// Workflow Components
export { default as DummyQuoteGenerator } from './workflow/DummyQuoteGenerator';
export { default as ApprovalWorkflow } from './workflow/ApprovalWorkflow';
export { default as QuotationHistory } from './workflow/QuotationHistory';
export { default as ConvertToPO } from './workflow/ConvertToPO';

// Cross-Reference Components
export { default as JobCodeLink } from './crossref/JobCodeLink';
export { default as PIReference } from './crossref/PIReference';
export { default as POReference } from './crossref/POReference';
