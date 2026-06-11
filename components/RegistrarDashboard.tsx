import React, { useEffect, useState } from 'react';
import type { Session } from '../services/apiClient';
import { api } from '../services/apiClient';
import { Navbar } from './Navbar';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  Phone,
  Mail,
  Calendar
} from 'lucide-react';
import { Button } from './Button';

interface RegistrarDashboardProps {
  session: Session;
  onLogout: () => void;
}

interface AdmissionApplication {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  program: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  avatar_url?: string;
}

export const RegistrarDashboard: React.FC<RegistrarDashboardProps> = ({ session, onLogout }) => {
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const data = await api.admissions.list();

      if (data) {
        setApplications(data);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'approved' | 'rejected') => {
    setProcessingId(id);
    try {
      await api.admissions.updateStatus(id, newStatus);
      setApplications(prev => prev.map(app => 
        app.id === id ? { ...app, status: newStatus } : app
      ));
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesFilter = statusFilter === 'all' || app.status === statusFilter;
    const matchesSearch = 
      app.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.program.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Pending</span>;
    }
  };

  if (loading) {
     return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center animate-pulse">
                <div className="h-12 w-12 bg-nursing-200 rounded-full mb-4"></div>
                <div className="h-4 w-48 bg-slate-200 rounded"></div>
            </div>
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar 
        userEmail={session.user.email || ''} 
        userRole="Registrar"
        userName={session.user.full_name || "Registrar Admin"}
        onLogout={onLogout}
      />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Applications</p>
              <h3 className="text-2xl font-bold text-slate-900">{applications.length}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Pending Review</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {applications.filter(a => a.status === 'pending').length}
              </h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Approved Students</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {applications.filter(a => a.status === 'approved').length}
              </h3>
            </div>
          </div>
        </div>

        {/* Applications Management */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-900">Admission Applications</h2>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, email or program..."
                  className="pl-10 h-10 w-full rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-nursing-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-full md:w-64 flex items-center gap-2">
                <Filter className="w-5 h-5 text-slate-400" />
                <select 
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-nursing-500 bg-white"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 font-medium">Applicant</th>
                  <th className="px-6 py-3 font-medium">Contact Info</th>
                  <th className="px-6 py-3 font-medium">Program</th>
                  <th className="px-6 py-3 font-medium">Date Submitted</th>
                  <th className="px-6 py-3 font-medium text-center">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{app.full_name}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex flex-col text-xs gap-1">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3"/> {app.email}</span>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> {app.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                        {app.program}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(app.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(app.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {app.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleStatusChange(app.id, 'approved')}
                            disabled={processingId === app.id}
                            className="p-1.5 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors disabled:opacity-50"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleStatusChange(app.id, 'rejected')}
                            disabled={processingId === app.id}
                            className="p-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredApplications.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <p>No admission applications found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards (visible only on small screens) */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredApplications.map((app) => (
              <div key={app.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-slate-900">{app.full_name}</h3>
                    <p className="text-sm text-slate-500">{app.program}</p>
                  </div>
                  {getStatusBadge(app.status)}
                </div>
                
                <div className="text-sm text-slate-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {app.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {app.phone}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {new Date(app.submitted_at).toLocaleDateString()}
                  </div>
                </div>

                {app.status === 'pending' && (
                  <div className="flex gap-3 pt-2">
                     <Button 
                       variant="primary" 
                       className="flex-1 h-9 text-xs bg-green-600 hover:bg-green-700"
                       onClick={() => handleStatusChange(app.id, 'approved')}
                       disabled={processingId === app.id}
                     >
                       Approve
                     </Button>
                     <Button 
                       variant="outline" 
                       className="flex-1 h-9 text-xs text-red-600 border-red-200 hover:bg-red-50"
                       onClick={() => handleStatusChange(app.id, 'rejected')}
                       disabled={processingId === app.id}
                     >
                       Reject
                     </Button>
                  </div>
                )}
              </div>
            ))}
            {filteredApplications.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                <p>No admission applications found.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};