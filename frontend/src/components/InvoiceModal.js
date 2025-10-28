import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { FileText, Download, Mail, Plus, Trash2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const InvoiceModal = ({ job, open, onClose }) => {
  const [invoiceData, setInvoiceData] = useState({
    labour_cost: 0,
    parts_cost: 0,
    tuning_cost: 0,
    other_charges: 0,
    gst_rate: 18.0,
    custom_charges: [],
  });
  const [generating, setGenerating] = useState(false);

  const subtotal = invoiceData.labour_cost + invoiceData.parts_cost + invoiceData.tuning_cost + invoiceData.other_charges +
    invoiceData.custom_charges.reduce((sum, charge) => sum + (parseFloat(charge.amount) || 0), 0);
  const gstAmount = subtotal * (invoiceData.gst_rate / 100);
  const grandTotal = subtotal + gstAmount;

  const handleChange = (field, value) => {
    setInvoiceData((prev) => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const handleAddCustomCharge = () => {
    setInvoiceData((prev) => ({
      ...prev,
      custom_charges: [...prev.custom_charges, { description: '', amount: 0 }],
    }));
  };

  const handleCustomChargeChange = (index, field, value) => {
    setInvoiceData((prev) => {
      const newCustomCharges = [...prev.custom_charges];
      newCustomCharges[index][field] = field === 'amount' ? (parseFloat(value) || 0) : value;
      return { ...prev, custom_charges: newCustomCharges };
    });
  };

  const handleRemoveCustomCharge = (index) => {
    setInvoiceData((prev) => ({
      ...prev,
      custom_charges: prev.custom_charges.filter((_, i) => i !== index),
    }));
  };

  const handleGenerateInvoice = async () => {
    setGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/jobs/${job.id}/invoice`,
        invoiceData,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ICD_Invoice_${job.customer_name.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Invoice generated and downloaded!');
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/email/invoice`,
        null,
        {
          params: { job_id: job.id },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success('Invoice email sent!');
    } catch (error) {
      console.error('Error sending email:', error);
      toast.info('Email API not configured.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="invoice-modal">
        <DialogHeader>
          <DialogTitle className="text-2xl text-red-600 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Generate Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Job Summary */}
          <div className="bg-black/30 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Job Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-400">Customer: </span>
                <span className="text-white font-medium">{job.customer_name}</span>
              </div>
              <div>
                <span className="text-gray-400">Contact: </span>
                <span className="text-white font-medium">{job.contact_number}</span>
              </div>
              <div>
                <span className="text-gray-400">Vehicle: </span>
                <span className="text-white font-medium">{job.car_brand} {job.car_model}</span>
              </div>
              <div>
                <span className="text-gray-400">Reg No: </span>
                <span className="text-white font-medium">{job.registration_number}</span>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Invoice Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="labour_cost" className="text-white">Labour Charges (₹)</Label>
                <Input
                  id="labour_cost"
                  type="number"
                  step="0.01"
                  value={invoiceData.labour_cost}
                  onChange={(e) => handleChange('labour_cost', e.target.value)}
                  className="bg-black/50 border-gray-700 text-white"
                  data-testid="labour-cost-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parts_cost" className="text-white">Parts/Materials (₹)</Label>
                <Input
                  id="parts_cost"
                  type="number"
                  step="0.01"
                  value={invoiceData.parts_cost}
                  onChange={(e) => handleChange('parts_cost', e.target.value)}
                  className="bg-black/50 border-gray-700 text-white"
                  data-testid="parts-cost-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tuning_cost" className="text-white">Tuning Charges (₹)</Label>
                <Input
                  id="tuning_cost"
                  type="number"
                  step="0.01"
                  value={invoiceData.tuning_cost}
                  onChange={(e) => handleChange('tuning_cost', e.target.value)}
                  className="bg-black/50 border-gray-700 text-white"
                  data-testid="tuning-cost-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="other_charges" className="text-white">Other Charges (₹)</Label>
                <Input
                  id="other_charges"
                  type="number"
                  step="0.01"
                  value={invoiceData.other_charges}
                  onChange={(e) => handleChange('other_charges', e.target.value)}
                  className="bg-black/50 border-gray-700 text-white"
                  data-testid="other-charges-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gst_rate" className="text-white">GST Rate (%)</Label>
                <Input
                  id="gst_rate"
                  type="number"
                  step="0.01"
                  value={invoiceData.gst_rate}
                  onChange={(e) => handleChange('gst_rate', e.target.value)}
                  className="bg-black/50 border-gray-700 text-white"
                  data-testid="gst-rate-input"
                />
              </div>
            </div>

            {/* Custom Charges */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-white">Custom Charges</Label>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddCustomCharge}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  data-testid="add-custom-charge-button"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Row
                </Button>
              </div>

              {invoiceData.custom_charges.map((charge, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="Description (e.g., ECU Remapping)"
                    value={charge.description}
                    onChange={(e) => handleCustomChargeChange(index, 'description', e.target.value)}
                    className="flex-1 bg-black/50 border-gray-700 text-white"
                    data-testid={`custom-charge-description-${index}`}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    value={charge.amount}
                    onChange={(e) => handleCustomChargeChange(index, 'amount', e.target.value)}
                    className="w-32 bg-black/50 border-gray-700 text-white"
                    data-testid={`custom-charge-amount-${index}`}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveCustomCharge(index)}
                    className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                    data-testid={`remove-custom-charge-${index}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Invoice Summary */}
          <div className="bg-black/50 p-4 rounded-lg border border-red-600/30">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal:</span>
                <span className="text-white font-medium">₹ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">GST ({invoiceData.gst_rate}%):</span>
                <span className="text-white font-medium">₹ {gstAmount.toFixed(2)}</span>
              </div>
              <div className="h-px bg-gray-700 my-2"></div>
              <div className="flex justify-between text-lg">
                <span className="text-red-500 font-bold">GRAND TOTAL:</span>
                <span className="text-red-500 font-bold">₹ {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-700 text-white hover:bg-gray-800"
              data-testid="close-invoice-button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              variant="outline"
              className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
              data-testid="email-invoice-button"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
            <Button
              onClick={handleGenerateInvoice}
              disabled={generating}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              data-testid="generate-invoice-button"
            >
              {generating ? (
                'Generating...'
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceModal;
