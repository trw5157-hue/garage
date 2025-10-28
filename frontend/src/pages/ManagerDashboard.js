import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { LogOut, Plus, Search, FileText, MessageCircle, Download, Wrench } from 'lucide-react';
import JobForm from '../components/JobForm';
import JobDetailsModal from '../components/JobDetailsModal';
import InvoiceModal from '../components/InvoiceModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ManagerDashboard = ({ user, onLogout }) => {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [showJobForm, setShowJobForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceJob, setInvoiceJob] = useState(null);

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setJobs(response.data);
      setFilteredJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    let filtered = jobs;

    // Apply status filter
    if (statusFilter && statusFilter !== 'All Status') {
      filtered = filtered.filter((job) => job.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.customer_name.toLowerCase().includes(query) ||
          job.car_brand.toLowerCase().includes(query) ||
          job.car_model.toLowerCase().includes(query) ||
          job.registration_number.toLowerCase().includes(query)
      );
    }

    setFilteredJobs(filtered);
  }, [searchQuery, statusFilter, jobs]);

  const handleSendWhatsApp = async (job) => {
    try {
      const token = localStorage.getItem('token');
      const message = `Hi ${job.customer_name}, your ${job.car_brand} ${job.car_model} service is completed and ready for delivery. - ICD Tuning, Chennai`;
      
      await axios.post(
        `${API}/notifications/whatsapp`,
        { job_id: job.id, message },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('WhatsApp confirmation sent!');
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      toast.info('WhatsApp API not configured. Message logged.');
    }
  };

  const handleGenerateInvoice = (job) => {
    setInvoiceJob(job);
    setShowInvoice(true);
  };

  const handleExportSheets = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/export/google-sheets`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success(response.data.message);
        
        // If sheet URL is provided, offer to open it
        if (response.data.sheet_url) {
          setTimeout(() => {
            const openSheet = window.confirm('Export successful! Would you like to open the Google Sheet?');
            if (openSheet) {
              window.open(response.data.sheet_url, '_blank');
            }
          }, 500);
        }
      } else {
        toast.error(response.data.message || 'Export failed');
        
        // Show setup guide if needed
        if (response.data.setup_guide) {
          toast.info('Check GOOGLE_SHEETS_SETUP_GUIDE.md for integration instructions');
        }
      }
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Failed to export to Google Sheets');
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pending':
        return 'status-pending';
      case 'In Progress':
        return 'status-in-progress';
      case 'Done':
        return 'status-done';
      case 'Delivered':
        return 'status-delivered';
      default:
        return 'status-pending';
    }
  };

  const handleViewJob = (job) => {
    setSelectedJob(job);
    setShowJobDetails(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" data-testid="manager-dashboard">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img 
            src="https://customer-assets.emergentagent.com/job_carservice-manager/artifacts/9uvmesio_final%20sign%20white.png" 
            alt="ICD Tuning Logo" 
            className="w-16 h-16 object-contain"
          />
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Exo 2' }}>
              ICD TUNING
            </h1>
            <p className="text-gray-400 text-sm">Manager Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white">Welcome, {user.full_name}</span>
          <Button
            onClick={onLogout}
            variant="outline"
            className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
            data-testid="logout-button"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass rounded-xl p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search by customer, car, or registration..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-black/50 border-gray-700 text-white placeholder:text-gray-500 w-full"
              data-testid="search-input"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48 bg-black/50 border-gray-700 text-white" data-testid="status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="All Status">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Done">Done</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2 w-full md:w-auto">
            <Button
              onClick={handleExportSheets}
              variant="outline"
              className="flex-1 md:flex-none border-gray-700 text-white hover:bg-gray-800"
              data-testid="export-sheets-button"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>

            <Dialog open={showJobForm} onOpenChange={setShowJobForm}>
              <DialogTrigger asChild>
                <Button
                  className="flex-1 md:flex-none bg-red-600 hover:bg-red-700 text-white"
                  data-testid="add-job-button"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Job
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-red-600">Add New Job</DialogTitle>
                </DialogHeader>
                <JobForm
                  onSuccess={() => {
                    setShowJobForm(false);
                    fetchJobs();
                  }}
                  onCancel={() => setShowJobForm(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            All Jobs ({filteredJobs.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" data-testid="jobs-table">
            <thead>
              <tr className="border-t border-b border-gray-800 bg-black/30">
                <th className="text-left p-4 text-gray-400 font-semibold">Customer</th>
                <th className="text-left p-4 text-gray-400 font-semibold">Vehicle</th>
                <th className="text-left p-4 text-gray-400 font-semibold">Reg No.</th>
                <th className="text-left p-4 text-gray-400 font-semibold">Mechanic</th>
                <th className="text-left p-4 text-gray-400 font-semibold">Status</th>
                <th className="text-left p-4 text-gray-400 font-semibold">Delivery</th>
                <th className="text-left p-4 text-gray-400 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-8 text-gray-500">
                    No jobs found
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-gray-800 hover:bg-black/30 transition-colors cursor-pointer"
                    onClick={() => handleViewJob(job)}
                    data-testid={`job-row-${job.id}`}
                  >
                    <td className="p-4">
                      <div className="text-white font-medium">{job.customer_name}</div>
                      <div className="text-gray-400 text-sm">{job.contact_number}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-white">{job.car_brand} {job.car_model}</div>
                      <div className="text-gray-400 text-sm">{job.year}</div>
                    </td>
                    <td className="p-4 text-white">{job.registration_number}</td>
                    <td className="p-4 text-white">{job.assigned_mechanic}</td>
                    <td className="p-4">
                      <span className={`status-badge ${getStatusClass(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="p-4 text-white">
                      {new Date(job.estimated_delivery).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        {job.status === 'Done' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleSendWhatsApp(job)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                              data-testid={`whatsapp-button-${job.id}`}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleGenerateInvoice(job)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              data-testid={`invoice-button-${job.id}`}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          open={showJobDetails}
          onClose={() => {
            setShowJobDetails(false);
            setSelectedJob(null);
          }}
          onUpdate={fetchJobs}
          isManager={true}
        />
      )}

      {/* Invoice Modal */}
      {invoiceJob && (
        <InvoiceModal
          job={invoiceJob}
          open={showInvoice}
          onClose={() => {
            setShowInvoice(false);
            setInvoiceJob(null);
          }}
        />
      )}
    </div>
  );
};

export default ManagerDashboard;
