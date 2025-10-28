import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { X, Camera, FileText } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const JobDetailsModal = ({ job, open, onClose, onUpdate, isManager }) => {
  const [notes, setNotes] = useState(job.notes || '');
  const [status, setStatus] = useState(job.status);
  const [updating, setUpdating] = useState(false);

  const handleUpdateNotes = async () => {
    if (notes === job.notes) {
      toast.info('No changes to save');
      return;
    }

    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API}/jobs/${job.id}`,
        { notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Notes updated!');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error('Failed to update notes');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API}/jobs/${job.id}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Status updated to ${newStatus}`);
      setStatus(newStatus);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('photo', file);

      await axios.post(`${API}/jobs/${job.id}/photos`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Photo uploaded!');
      onUpdate();
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUpdating(false);
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="job-details-modal">
        <DialogHeader>
          <DialogTitle className="text-2xl text-red-600 flex items-center justify-between">
            <span>Job Details</span>
            <span className={`status-badge ${getStatusClass(status)}`}>{status}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Customer & Vehicle Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm text-gray-400 mb-1">Customer Name</h3>
              <p className="text-lg font-semibold">{job.customer_name}</p>
            </div>
            <div>
              <h3 className="text-sm text-gray-400 mb-1">Contact Number</h3>
              <p className="text-lg font-semibold">{job.contact_number}</p>
            </div>
            <div>
              <h3 className="text-sm text-gray-400 mb-1">Vehicle</h3>
              <p className="text-lg font-semibold">{job.car_brand} {job.car_model} ({job.year})</p>
            </div>
            <div>
              <h3 className="text-sm text-gray-400 mb-1">Registration Number</h3>
              <p className="text-lg font-semibold">{job.registration_number}</p>
            </div>
            {job.vin && (
              <div>
                <h3 className="text-sm text-gray-400 mb-1">VIN</h3>
                <p className="text-lg font-semibold">{job.vin}</p>
              </div>
            )}
            {job.kms && (
              <div>
                <h3 className="text-sm text-gray-400 mb-1">Odometer (KMs)</h3>
                <p className="text-lg font-semibold">{job.kms.toLocaleString()}</p>
              </div>
            )}
            <div>
              <h3 className="text-sm text-gray-400 mb-1">Entry Date</h3>
              <p className="text-lg font-semibold">{new Date(job.entry_date).toLocaleDateString()}</p>
            </div>
            <div>
              <h3 className="text-sm text-gray-400 mb-1">Estimated Delivery</h3>
              <p className="text-lg font-semibold">{new Date(job.estimated_delivery).toLocaleDateString()}</p>
            </div>
            <div>
              <h3 className="text-sm text-gray-400 mb-1">Assigned Mechanic</h3>
              <p className="text-lg font-semibold">{job.assigned_mechanic}</p>
            </div>
            {job.completion_date && (
              <div>
                <h3 className="text-sm text-gray-400 mb-1">Completion Date</h3>
                <p className="text-lg font-semibold text-green-500">
                  {new Date(job.completion_date).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Work Description */}
          <div>
            <h3 className="text-sm text-gray-400 mb-2">Work Description</h3>
            <div className="bg-black/30 p-4 rounded-lg">
              <p className="text-white">{job.work_description}</p>
            </div>
          </div>

          {/* Photos */}
          {job.photos && job.photos.length > 0 && (
            <div>
              <h3 className="text-sm text-gray-400 mb-2">Photos</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {job.photos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Job photo ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border border-gray-700"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Upload Photo */}
          <div>
            <Label htmlFor="photo-upload" className="text-white mb-2 flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Add Photo
            </Label>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              data-testid="photo-upload-input"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('photo-upload').click()}
              disabled={updating}
              className="border-gray-700 text-white hover:bg-gray-800"
              data-testid="upload-photo-button"
            >
              <Camera className="w-4 h-4 mr-2" />
              Choose Photo
            </Button>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-white mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add job notes..."
              rows={4}
              className="bg-black/50 border-gray-700 text-white"
              data-testid="notes-textarea"
            />
          </div>

          {/* Status Update (Manager only) */}
          {isManager && (
            <div>
              <Label className="text-white mb-2">Update Status</Label>
              <Select value={status} onValueChange={handleUpdateStatus}>
                <SelectTrigger className="bg-black/50 border-gray-700 text-white" data-testid="status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-700 text-white hover:bg-gray-800"
              data-testid="close-button"
            >
              Close
            </Button>
            <Button
              onClick={handleUpdateNotes}
              disabled={updating || notes === job.notes}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              data-testid="save-notes-button"
            >
              {updating ? 'Saving...' : 'Save Notes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobDetailsModal;
