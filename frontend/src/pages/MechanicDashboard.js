import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { LogOut, CheckCircle, Wrench } from 'lucide-react';
import JobDetailsModal from '../components/JobDetailsModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MechanicDashboard = ({ user, onLogout }) => {
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({ active: 0, completed: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobDetails, setShowJobDetails] = useState(false);

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      const [jobsResponse, statsResponse] = await Promise.all([
        axios.get(`${API}/jobs`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/stats`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      
      setJobs(jobsResponse.data);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    // Refresh every 30 seconds
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleStartJob = async (jobId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API}/jobs/${jobId}`,
        { status: 'In Progress' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Job started!');
      fetchJobs();
    } catch (error) {
      console.error('Error starting job:', error);
      toast.error('Failed to start job');
    }
  };

  const handleMarkDone = async (jobId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API}/jobs/${jobId}`,
        { status: 'Done', confirm_complete: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Job marked as done!');
      fetchJobs();
    } catch (error) {
      console.error('Error marking job done:', error);
      toast.error('Failed to mark job done');
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

  const activeJobs = jobs.filter((j) => j.status === 'Pending' || j.status === 'In Progress');
  const completedJobs = jobs.filter((j) => j.status === 'Done' || j.status === 'Delivered');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6" data-testid="mechanic-dashboard">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="https://customer-assets.emergentagent.com/job_carservice-manager/artifacts/9uvmesio_final%20sign%20white.png" 
            alt="ICD Tuning Logo" 
            className="w-12 h-12 object-contain"
          />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white" style={{ fontFamily: 'Exo 2' }}>
              ICD TUNING
            </h1>
            <p className="text-gray-400 text-xs md:text-sm">Mechanic Dashboard</p>
          </div>
        </div>
        <Button
          onClick={onLogout}
          variant="outline"
          size="sm"
          className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
          data-testid="logout-button"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>

      {/* Welcome */}
      <div className="glass rounded-xl p-4 md:p-6 mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
          Welcome, {user.full_name}
        </h2>
        <p className="text-gray-400 text-sm">Here are your assigned jobs</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="glass rounded-xl p-4 md:p-6 text-center" data-testid="active-jobs-stat">
          <div className="text-3xl md:text-4xl font-bold text-yellow-500 mb-2">{stats.active}</div>
          <div className="text-gray-400 text-xs md:text-sm">Active Jobs</div>
        </div>
        <div className="glass rounded-xl p-4 md:p-6 text-center" data-testid="completed-jobs-stat">
          <div className="text-3xl md:text-4xl font-bold text-green-500 mb-2">{stats.completed}</div>
          <div className="text-gray-400 text-xs md:text-sm">Completed</div>
        </div>
        <div className="glass rounded-xl p-4 md:p-6 text-center" data-testid="total-jobs-stat">
          <div className="text-3xl md:text-4xl font-bold text-blue-500 mb-2">{stats.total}</div>
          <div className="text-gray-400 text-xs md:text-sm">Total Assigned</div>
        </div>
      </div>

      {/* Active Jobs */}
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-red-600 mb-4">Active Jobs</h2>
        {activeJobs.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center" data-testid="no-active-jobs">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No active jobs at the moment.</p>
            <p className="text-gray-500 text-sm mt-2">Great work! All caught up.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeJobs.map((job) => (
              <div
                key={job.id}
                className="glass rounded-xl p-4 md:p-6 card-hover border-l-4 border-red-600 cursor-pointer"
                onClick={() => {
                  setSelectedJob(job);
                  setShowJobDetails(true);
                }}
                data-testid={`active-job-card-${job.id}`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg md:text-xl font-bold text-white">{job.customer_name}</h3>
                      <span className={`status-badge ${getStatusClass(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-gray-300 font-medium">
                      {job.car_brand} {job.car_model} ({job.year})
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-sm">
                      <div>
                        <span className="text-gray-500">Reg No: </span>
                        <span className="text-white font-medium">{job.registration_number}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Contact: </span>
                        <span className="text-white font-medium">{job.contact_number}</span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-gray-500">Delivery: </span>
                        <span className="text-white font-medium">
                          {new Date(job.estimated_delivery).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-black/30 rounded-lg">
                      <p className="text-gray-400 text-xs md:text-sm font-semibold mb-1">Work Description</p>
                      <p className="text-white text-sm">{job.work_description}</p>
                    </div>
                  </div>
                  <div className="flex md:flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                    {job.status === 'Pending' && (
                      <Button
                        onClick={() => handleStartJob(job.id)}
                        className="flex-1 md:flex-none bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                        data-testid={`start-job-button-${job.id}`}
                      >
                        Start Job
                      </Button>
                    )}
                    {job.status === 'In Progress' && (
                      <Button
                        onClick={() => handleMarkDone(job.id)}
                        className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white font-semibold"
                        data-testid={`mark-done-button-${job.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark as Done
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        setSelectedJob(job);
                        setShowJobDetails(true);
                      }}
                      variant="outline"
                      className="flex-1 md:flex-none border-gray-700 text-white hover:bg-gray-800"
                      data-testid={`add-notes-button-${job.id}`}
                    >
                      Add Notes
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Jobs */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-green-600 mb-4">Completed Jobs</h2>
        {completedJobs.length === 0 ? (
          <div className="glass rounded-xl p-6 text-center">
            <p className="text-gray-500">No completed jobs yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {completedJobs.map((job) => (
              <div
                key={job.id}
                className="glass rounded-xl p-4 md:p-6 border-l-4 border-green-600 cursor-pointer hover:bg-black/30 transition-colors"
                onClick={() => {
                  setSelectedJob(job);
                  setShowJobDetails(true);
                }}
                data-testid={`completed-job-card-${job.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-white">{job.customer_name}</h3>
                      <span className={`status-badge ${getStatusClass(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-gray-300">
                      {job.car_brand} {job.car_model} ({job.year})
                    </p>
                    <div className="text-sm text-gray-400 mt-2">
                      <span>Reg No: </span>
                      <span className="text-white">{job.registration_number}</span>
                      {job.completion_date && (
                        <span className="ml-4">
                          <span>Completed: </span>
                          <span className="text-white">
                            {new Date(job.completion_date).toLocaleDateString()}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>
            ))}
          </div>
        )}
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
          isManager={false}
        />
      )}
    </div>
  );
};

export default MechanicDashboard;
