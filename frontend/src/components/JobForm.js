import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CAR_BRANDS = [
  'Hyundai', 'Suzuki', 'Maruti', 'Honda', 'Toyota', 'Mahindra', 
  'Tata', 'Ford', 'VW', 'Skoda', 'Renault', 'Nissan', 'Chevrolet',
  'Kia', 'MG', 'Jeep', 'BMW', 'Mercedes', 'Audi', 'Other'
];

const JobForm = ({ onSuccess, onCancel, initialData = null }) => {
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    contact_number: '',
    car_brand: '',
    car_model: '',
    year: new Date().getFullYear(),
    registration_number: '',
    vin: '',
    kms: '',
    entry_date: new Date().toISOString().split('T')[0],
    assigned_mechanic: '',
    work_description: '',
    estimated_delivery: '',
    invoice_amount: '',
  });

  useEffect(() => {
    fetchMechanics();
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const fetchMechanics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/mechanics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMechanics(response.data);
    } catch (error) {
      console.error('Error fetching mechanics:', error);
      toast.error('Failed to load mechanics');
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        year: parseInt(formData.year),
        kms: formData.kms ? parseInt(formData.kms) : null,
        invoice_amount: formData.invoice_amount ? parseFloat(formData.invoice_amount) : null,
      };

      await axios.post(`${API}/jobs`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success('Job created successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error creating job:', error);
      toast.error(error.response?.data?.detail || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="job-form">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Info */}
        <div className="space-y-2">
          <Label htmlFor="customer_name" className="text-white">Customer Name *</Label>
          <Input
            id="customer_name"
            value={formData.customer_name}
            onChange={(e) => handleChange('customer_name', e.target.value)}
            required
            className="bg-black/50 border-gray-700 text-white"
            data-testid="customer-name-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_number" className="text-white">WhatsApp Number *</Label>
          <Input
            id="contact_number"
            value={formData.contact_number}
            onChange={(e) => handleChange('contact_number', e.target.value)}
            required
            placeholder="+91XXXXXXXXXX"
            className="bg-black/50 border-gray-700 text-white"
            data-testid="contact-number-input"
          />
        </div>

        {/* Vehicle Info */}
        <div className="space-y-2">
          <Label htmlFor="car_brand" className="text-white">Car Brand *</Label>
          <Select value={formData.car_brand} onValueChange={(value) => handleChange('car_brand', value)}>
            <SelectTrigger className="bg-black/50 border-gray-700 text-white" data-testid="car-brand-select">
              <SelectValue placeholder="Select brand" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {CAR_BRANDS.map((brand) => (
                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="car_model" className="text-white">Car Model *</Label>
          <Input
            id="car_model"
            value={formData.car_model}
            onChange={(e) => handleChange('car_model', e.target.value)}
            required
            placeholder="e.g., Creta 1.5 CRDi"
            className="bg-black/50 border-gray-700 text-white"
            data-testid="car-model-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="year" className="text-white">Year *</Label>
          <Input
            id="year"
            type="number"
            value={formData.year}
            onChange={(e) => handleChange('year', e.target.value)}
            required
            min="1980"
            max={new Date().getFullYear() + 1}
            className="bg-black/50 border-gray-700 text-white"
            data-testid="year-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="registration_number" className="text-white">Registration Number *</Label>
          <Input
            id="registration_number"
            value={formData.registration_number}
            onChange={(e) => handleChange('registration_number', e.target.value.toUpperCase())}
            required
            placeholder="TN-10-AB-1234"
            className="bg-black/50 border-gray-700 text-white"
            data-testid="registration-number-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="vin" className="text-white">VIN (Optional)</Label>
          <Input
            id="vin"
            value={formData.vin}
            onChange={(e) => handleChange('vin', e.target.value.toUpperCase())}
            placeholder="Vehicle Identification Number"
            className="bg-black/50 border-gray-700 text-white"
            data-testid="vin-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="kms" className="text-white">Odometer (KMs)</Label>
          <Input
            id="kms"
            type="number"
            value={formData.kms}
            onChange={(e) => handleChange('kms', e.target.value)}
            placeholder="Current KMs"
            className="bg-black/50 border-gray-700 text-white"
            data-testid="kms-input"
          />
        </div>

        {/* Job Details */}
        <div className="space-y-2">
          <Label htmlFor="entry_date" className="text-white">Entry Date *</Label>
          <Input
            id="entry_date"
            type="date"
            value={formData.entry_date}
            onChange={(e) => handleChange('entry_date', e.target.value)}
            required
            className="bg-black/50 border-gray-700 text-white"
            data-testid="entry-date-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="estimated_delivery" className="text-white">Estimated Delivery *</Label>
          <Input
            id="estimated_delivery"
            type="date"
            value={formData.estimated_delivery}
            onChange={(e) => handleChange('estimated_delivery', e.target.value)}
            required
            className="bg-black/50 border-gray-700 text-white"
            data-testid="estimated-delivery-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="assigned_mechanic" className="text-white">Assign Mechanic *</Label>
          <Select value={formData.assigned_mechanic} onValueChange={(value) => handleChange('assigned_mechanic', value)}>
            <SelectTrigger className="bg-black/50 border-gray-700 text-white" data-testid="mechanic-select">
              <SelectValue placeholder="Select mechanic" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {mechanics.map((mechanic) => (
                <SelectItem key={mechanic.id} value={mechanic.username}>
                  {mechanic.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoice_amount" className="text-white">Invoice Amount (₹)</Label>
          <Input
            id="invoice_amount"
            type="number"
            step="0.01"
            value={formData.invoice_amount}
            onChange={(e) => handleChange('invoice_amount', e.target.value)}
            placeholder="Optional"
            className="bg-black/50 border-gray-700 text-white"
            data-testid="invoice-amount-input"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="work_description" className="text-white">Work Description *</Label>
        <Textarea
          id="work_description"
          value={formData.work_description}
          onChange={(e) => handleChange('work_description', e.target.value)}
          required
          placeholder="e.g., Stage 1 ECU Remap + EGR Delete + DPF Removal"
          rows={4}
          className="bg-black/50 border-gray-700 text-white"
          data-testid="work-description-input"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 border-gray-700 text-white hover:bg-gray-800"
          data-testid="cancel-button"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          data-testid="submit-button"
        >
          {loading ? 'Creating...' : 'Create Job'}
        </Button>
      </div>
    </form>
  );
};

export default JobForm;
