import React, { useEffect, useState } from 'react';
import type { Session } from '../services/apiClient';
import { api } from '../services/apiClient';
import { Navbar } from './Navbar';
import { Button } from './Button';
import { Input } from './Input';
import {
  FileText, CheckCircle, XCircle, Clock, Search, Filter,
  Phone, Mail, Calendar, Users, Plus, Edit2, Trash2,
  X, Loader2, User, LayoutDashboard
} from 'lucide-react';

interface RegistrarDashboardProps { session: Session; onLogout: () => void; }
type TabId = 'overview' | 'admissions' | 'students' | 'profile';

interface AdmissionApplication {
  id: string; full_name: string; email: string; phone: string;
  program: string; status: 'pending' | 'approved' | 'rejected'; submitted_at: string;
}
interface Student {
  id: string; full_name: string; reg_number: string; program: string;
  level: number; status: string; email: string;
}

export const RegistrarDashboard: React.FC<RegistrarDashboardProps> = ({ session, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Student edit modal
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<Student>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [apps, stu] = await Promise.all([
          api.admissions.list(),
          api.students.list(),
        ]);
        if (apps) setApplications(apps);
        if (stu) setStudents(stu as Student[]);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const handleStatusChange = async (id: string, status: 'approved' | 'rejected') => {
    setProcessingId(id);
    try {
      await api.admissions.updateStatus(id, status);
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch (err) { console.error(err); }
    finally { setProcessingId(null); }
  };

  const handleApproveStudent = async (id: string) => {
    try {
      await api.students.update(id, { status: 'active' } as any);
      setStudents(prev => prev.map(s => s.id === id ? { ...s, status: 'active' } : s));
    } catch (err: any) { alert('Failed: ' + err.message); }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent.id) return;
    setSaving(true);
    try {
      await api.students.update(currentStudent.id, currentStudent as any);
      setStudents(prev => prev.map(s => s.id === currentStudent.id ? { ...s, ...currentStudent } as Student : s));
      setIsStudentModalOpen(false);
    } catch (err: any) { alert('Failed: ' + err.message); }
    finally { setSaving(false); }
  };

  const filteredApps = applications.filter(app => {
    const matchFilter = statusFilter === 'all' || app.status === statusFilter;
    const q = searchQuery.toLowerCase();
    return matchFilter && (!q || app.full_name.toLowerCase().includes(q) || app.email.toLowerCase().includes(q) || app.program.toLowerCase().includes(q));
  });

  const filteredStudents = students.filter(s => {
    const q = searchQuery.toLowerCase();
    return !q || s.full_name.toLowerCase().includes(q) || s.reg_number.toLowerCase().includes(q);
  });

  const statusBadge = (status: string) => {
    if (status === 'approved') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" /> Approved</span>;
    if (status === 'rejected') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3" /> Rejected</span>;
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3" /> Pending</span>;
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin w-10 h-10 border-4 border-nursing-200 border-t-nursing-600 rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar userEmail={session.user.email} userRole="Registrar" userName={session.user.full_name}
        onLogout={onLogout} activeTab={activeTab} onTabChange={t => setActiveTab(t as TabId)} />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 capitalize">{activeTab}</h1>
          <p className="text-slate-500 text-sm">Gamji College of Nursing Sciences — Registrar's Office</p>
        </div>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Total Applications', value: applications.length, icon: FileText, color: 'blue' },
                { label: 'Pending Review', value: applications.filter(a => a.status === 'pending').length, icon: Clock, color: 'yellow' },
                { label: 'Active Students', value: students.filter(s => s.status === 'active').length, icon: Users, color: 'green' },
              ].map(({ label, value, icon: Icon, color }, i) => (
                <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className={`p-2.5 bg-${color}-50 rounded-lg`}><Icon className={`w-5 h-5 text-${color}-600`} /></div>
                  <div><p className="text-sm text-slate-500 font-medium">{label}</p><p className="text-2xl font-bold text-slate-900">{value}</p></div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-yellow-500" /> Pending Applications</h3>
                {applications.filter(a => a.status === 'pending').slice(0, 5).map(a => (
                  <div key={a.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                    <div><p className="text-sm font-medium text-slate-900">{a.full_name}</p><p className="text-xs text-slate-400">{a.program}</p></div>
                    <div className="flex gap-2">
                      <button onClick={() => handleStatusChange(a.id, 'approved')} className="p-1.5 bg-green-50 text-green-700 rounded hover:bg-green-100"><CheckCircle className="w-4 h-4" /></button>
                      <button onClick={() => handleStatusChange(a.id, 'rejected')} className="p-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100"><XCircle className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                {applications.filter(a => a.status === 'pending').length === 0 && <p className="text-sm text-slate-400 text-center py-4">No pending applications.</p>}
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-yellow-500" /> Students Pending Activation</h3>
                {students.filter(s => s.status === 'pending').slice(0, 5).map(s => (
                  <div key={s.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                    <div><p className="text-sm font-medium text-slate-900">{s.full_name}</p><p className="text-xs font-mono text-slate-400">{s.reg_number}</p></div>
                    <button onClick={() => handleApproveStudent(s.id)} className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-bold hover:bg-green-100">Activate</button>
                  </div>
                ))}
                {students.filter(s => s.status === 'pending').length === 0 && <p className="text-sm text-slate-400 text-center py-4">No pending students.</p>}
              </div>
            </div>
          </div>
        )}

        {/* ADMISSIONS */}
        {activeTab === 'admissions' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 space-y-3">
              <h2 className="text-lg font-bold text-slate-900">Admission Applications</h2>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input type="text" placeholder="Search by name, email or program..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 w-full rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-nursing-500/20" />
                </div>
                <div className="flex items-center gap-2 w-full md:w-48">
                  <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white focus:outline-none">
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3">Applicant</th><th className="px-6 py-3">Contact</th>
                    <th className="px-6 py-3">Program</th><th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3 text-center">Status</th><th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredApps.map(app => (
                    <tr key={app.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-semibold text-slate-900">{app.full_name}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> {app.email}</div>
                        <div className="flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {app.phone}</div>
                      </td>
                      <td className="px-6 py-4"><span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{app.program}</span></td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{new Date(app.submitted_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-center">{statusBadge(app.status)}</td>
                      <td className="px-6 py-4 text-right">
                        {app.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleStatusChange(app.id, 'approved')} disabled={processingId === app.id}
                              className="p-1.5 bg-green-50 text-green-700 rounded hover:bg-green-100 disabled:opacity-50" title="Approve"><CheckCircle className="w-4 h-4" /></button>
                            <button onClick={() => handleStatusChange(app.id, 'rejected')} disabled={processingId === app.id}
                              className="p-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100 disabled:opacity-50" title="Reject"><XCircle className="w-4 h-4" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredApps.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No applications found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STUDENTS */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-900">Student Records</h2>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search by name or reg number..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 w-full rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-nursing-500/20" />
              </div>
              <p className="text-xs text-slate-400">{filteredStudents.length} of {students.length} students</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3">Student</th><th className="px-6 py-3">Program</th>
                    <th className="px-6 py-3 text-center">Level</th><th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4"><p className="font-semibold text-slate-900">{s.full_name}</p><p className="text-xs font-mono text-slate-400">{s.reg_number}</p></td>
                      <td className="px-6 py-4 text-slate-600">{s.program}</td>
                      <td className="px-6 py-4 text-center text-slate-600">{s.level}L</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.status === 'active' ? 'bg-green-100 text-green-800' :
                          s.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          s.status === 'graduated' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'}`}>{s.status}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 items-center">
                          {s.status === 'pending' && (
                            <button onClick={() => handleApproveStudent(s.id)}
                              className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-bold hover:bg-green-100">Activate</button>
                          )}
                          <button onClick={() => { setCurrentStudent(s); setIsStudentModalOpen(true); }} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No students found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PROFILE */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden max-w-lg">
            <div className="p-5 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-900 flex items-center gap-2"><User className="w-5 h-5" /> My Profile</h3></div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-700">{session.user.full_name.charAt(0)}</div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{session.user.full_name}</h2>
                  <p className="text-slate-500 text-sm">{session.user.email}</p>
                  <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">REGISTRAR</span>
                </div>
              </div>
              {[{ label: 'Full Name', value: session.user.full_name }, { label: 'Email', value: session.user.email },
                { label: 'Role', value: 'College Registrar' }, { label: 'Institution', value: 'Gamji College of Nursing Sciences' }].map((f, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{f.label}</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Edit Student Modal */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-900">Edit Student</h3>
              <button onClick={() => setIsStudentModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveStudent} className="p-6 space-y-4">
              <Input label="Full Name" value={currentStudent.full_name || ''} onChange={e => setCurrentStudent({ ...currentStudent, full_name: e.target.value })} required />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Status</label>
                <select value={currentStudent.status || 'active'} onChange={e => setCurrentStudent({ ...currentStudent, status: e.target.value })}
                  className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-nursing-500/20">
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                  <option value="graduated">Graduated</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Level</label>
                <select value={currentStudent.level || 100} onChange={e => setCurrentStudent({ ...currentStudent, level: parseInt(e.target.value) })}
                  className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-nursing-500/20">
                  <option value={100}>100 Level</option>
                  <option value={200}>200 Level</option>
                  <option value={300}>300 Level</option>
                </select>
              </div>
              <Button type="submit" className="w-full bg-nursing-600 hover:bg-nursing-700" disabled={saving}>
                {saving ? <Loader2 className="animate-spin w-4 h-4" /> : 'Save Changes'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
