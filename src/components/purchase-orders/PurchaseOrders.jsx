// src/components/purchase-orders/PurchaseOrders.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { purchaseOrderService } from '../../services/purchaseOrderService';
import AIExtractionService from '../../services/ai/AIExtractionService';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Search, 
  Plus, 
  FileText, 
  Calendar,
  DollarSign,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  Upload,
  Loader2,
  Eye,
  Edit,
  Trash2,
  Download,
  Send,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import POModal from './POModal';
import { toast } from 'react-hot-toast';

const PurchaseOrders = () => {
  const { user } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPO, setCurrentPO] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  // Load purchase orders
  useEffect(() => {
    loadPurchaseOrders();
  }, [user]);

  const loadPurchaseOrders = async () => {
    if (!user) return;
    
    try {
      const data = await purchaseOrderService.getAll();
      setPurchaseOrders(data);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload with proper data mapping
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('Processing file:', file.name);
    setLoading(true);
    setUploadError(null);

    try {
      const result = await AIExtractionService.extractFromFile(file);
      console.log('Extraction result:', result);

      if (result.success && result.data) {
        console.log('Extracted data structure:', result.data);
        console.log('Document type:', result.data.documentType);
        
        // Create POModal-compatible structure based on document type
        let modalData;
        
        if (result.data.documentType === 'client_purchase_order') {
          modalData = {
            // Map extracted fields to what POModal expects
            orderNumber: result.data.poNumber || '',
            client: result.data.client?.name || '',
            clientName: result.data.client?.name || '',
            
            // Handle dates
            orderDate: result.data.orderDate || new Date().toISOString().split('T')[0],
            deliveryDate: result.data.deliveryDate || new Date().toISOString().split('T')[0],
            
            // Terms
            paymentTerms: result.data.paymentTerms || '30 days',
            deliveryTerms: result.data.deliveryTerms || 'FOB',
            
            // Items array - ensure it matches POModal's expected structure
            items: (result.data.items || []).map(item => ({
              partNumber: item.partNumber || '',
              description: item.description || '',
              quantity: item.quantity || 0,
              unitPrice: item.unitPrice || 0,
              totalPrice: item.totalPrice || (item.quantity * item.unitPrice) || 0,
              uom: item.uom || 'PCS',
              deliveryDate: item.deliveryDate || result.data.deliveryDate || '',
              // Include supplier matches if available
              supplierMatches: item.supplierMatches || []
            })),
            
            // Totals
            subtotal: result.data.subtotal || 
                      (result.data.items || []).reduce((sum, item) => sum + (item.totalPrice || 0), 0),
            tax: result.data.tax || 0,
            total: result.data.totalAmount || result.data.total || 0,
            
            // Status
            status: 'draft',
            
            // Additional extracted data
            extractedData: result.data,
            prNumbers: result.data.prNumbers || [],
            
            // Sourcing plan if available
            sourcingPlan: result.data.sourcingPlan,
            
            // Client details
            clientDetails: {
              name: result.data.client?.name || '',
              registration: result.data.client?.registration || '',
              address: result.data.client?.address || '',
              shipTo: result.data.client?.shipTo || ''
            }
          };
          
          console.log('Modal data prepared for client PO:', modalData);
          
          // Set the modal data and open it
          setCurrentPO(modalData);
          setModalOpen(true);
          
          // Show success message with sourcing plan summary
          if (result.data.sourcingPlan) {
            const plan = result.data.sourcingPlan;
            toast.success(
              `Successfully extracted PO: ${modalData.orderNumber}\n` +
              `${plan.matchedItems} of ${plan.totalItems} items have supplier matches`,
              { duration: 5000 }
            );
          } else {
            toast.success(`Successfully extracted PO: ${modalData.orderNumber}`);
          }
          
        } else if (result.data.documentType === 'supplier_proforma') {
          // Handle supplier PI differently
          toast.info('Supplier Proforma Invoice detected. This feature is coming soon.');
          console.log('Supplier PI data:', result.data);
          
        } else {
          toast.warning('Unknown document type. Please check the extraction results.');
          console.log('Unknown document data:', result.data);
        }
        
      } else {
        throw new Error(result.error || 'Extraction failed');
      }
    } catch (error) {
      console.error('Extraction failed:', error);
      setUploadError(error.message);
      toast.error('Failed to extract PO: ' + error.message);
    } finally {
      setLoading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // Handle manual PO creation
  const handleCreatePO = () => {
    setCurrentPO({
      orderNumber: `PO-${Date.now().toString().slice(-6)}`,
      client: '',
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: new Date().toISOString().split('T')[0],
      paymentTerms: '30 days',
      deliveryTerms: 'FOB',
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      status: 'draft'
    });
    setModalOpen(true);
  };

  // Handle PO save
  const handleSavePO = async (poData) => {
    try {
      if (poData.id) {
        await purchaseOrderService.update(poData.id, poData);
        toast.success('Purchase order updated successfully');
      } else {
        await purchaseOrderService.create(poData);
        toast.success('Purchase order created successfully');
      }
      loadPurchaseOrders();
      setModalOpen(false);
    } catch (error) {
      console.error('Error saving PO:', error);
      toast.error('Failed to save purchase order');
    }
  };

  // Handle PO deletion
  const handleDeletePO = async (poId) => {
    if (!window.confirm('Are you sure you want to delete this purchase order?')) {
      return;
    }

    try {
      await purchaseOrderService.delete(poId);
      toast.success('Purchase order deleted successfully');
      loadPurchaseOrders();
    } catch (error) {
      console.error('Error deleting PO:', error);
      toast.error('Failed to delete purchase order');
    }
  };

  // Filter purchase orders
  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = 
      po.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.client?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    total: purchaseOrders.length,
    draft: purchaseOrders.filter(po => po.status === 'draft').length,
    sent: purchaseOrders.filter(po => po.status === 'sent').length,
    confirmed: purchaseOrders.filter(po => po.status === 'confirmed').length,
    totalValue: purchaseOrders.reduce((sum, po) => sum + (po.total || 0), 0)
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { variant: 'secondary', icon: Clock },
      sent: { variant: 'default', icon: Send },
      confirmed: { variant: 'success', icon: CheckCircle },
      cancelled: { variant: 'destructive', icon: X }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Purchase Orders</h2>
          <p className="text-muted-foreground">
            Manage your purchase orders and track their status
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload PO
          </Button>
          <Button onClick={handleCreatePO}>
            <Plus className="h-4 w-4 mr-2" />
            Create PO
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Upload Error */}
      {uploadError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{uploadError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total POs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              RM {stats.totalValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search PO number or client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
          <CardDescription>
            A list of all purchase orders with their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPOs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No purchase orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPOs.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.orderNumber}</TableCell>
                    <TableCell>{po.client || po.clientName}</TableCell>
                    <TableCell>
                      {po.orderDate ? format(new Date(po.orderDate), 'dd MMM yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      {po.deliveryDate ? format(new Date(po.deliveryDate), 'dd MMM yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        {po.items?.length || 0}
                      </div>
                    </TableCell>
                    <TableCell>RM {(po.total || 0).toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(po.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCurrentPO(po);
                            setModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCurrentPO(po);
                            setModalOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePO(po.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* PO Modal */}
      <POModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        purchaseOrder={currentPO}
        onSave={handleSavePO}
      />
    </div>
  );
};

export default PurchaseOrders;
