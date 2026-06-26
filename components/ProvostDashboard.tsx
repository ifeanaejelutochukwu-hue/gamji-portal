import React, { useState, useEffect } from 'react';
import type { Session } from '../services/apiClient';
import { api } from '../services/apiClient';
import { Navbar } from './Navbar';
import {
  Users, Shield, BookOpen, CreditCard, FileText,
  TrendingUp, LayoutDashboard, CheckCircle, XCircle,
  Clock, Loader2, AlertCircle, User, BarChart3,
  GraduationCap, Phone, Mail
} from 'lucide-react';
import { Button } from './Button';

interface ProvostDashboardProps {
  session: Session;
  onLogout: () => void;
}

type TabId = 'overview' | 'students' | 'staff' | 'finance' | 'admissions' | 'profile';

interface Analytics {
  total_active_students: number;
  total_staff: number;
  total_courses: number;
  pending_admissions: number;
  total_revenue_paid: number;
  submitted_results: number;
}

export const ProvostDashboard: React.FC<ProvostDashboardProps> = ({ session, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [ana, stu, stf, pay, adm] = await Promise.all([
          api.analytics.getSummary().catch(() => null),
          api.students.list().catch(() => []),
          api.staff.list().catch(() => []),
          api.payments.list().catch(() => []),
          api.admissions.list().catch(() => []),
        ]);
        if (ana) setAnalytics(ana);
        setStudents(stu || []);
        setStaff(stf || []);
        setPayments(pay || []);
        setAdmissions(adm || []);
      } catch (err) {
        console.error('Provost data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleAdmissionStatus = async (id: string, status: 'approved' | 'rejected') => {
    setProcessingId(id);
    try {
      await api.admissions.updateStatus(id, status);
      setAdmissions(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch (err) {
      alert('Failed to update admission status.');
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(n || 0);

  const SIDEBAR_ITEMS: { id: TabId; icon: React.ElementType; label: string }[] = [
    { id: 'overview',   icon: LayoutDashboard, label: 'Executive Overview' },
    { id: 'students',   icon: GraduationCap,   label: 'Students' },
    { id: 'staff',      icon: Shield,           label: 'Staff' },
    { id: 'finance',    icon: CreditCard,       label: 'Finance' },
    { id: 'admissions', icon: FileText,         label: 'Admissions' },
    { id: 'profile',    icon: User,             label: 'My Profile' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        userEmail={session.user.email}
        userRole="Provost"
        userName={session.user.full_name}
        onLogout={onLogout}
        activeTab={activeTab}
        onTabChange={t => setActiveTab(t as TabId)}
      />

      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        {/* Sidebar */}
        <aside className="w-64 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-shrink-0 h-fit hidden md:block">
          <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-700 to-slate-900">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Provost Office</p>
            <p className="text-sm font-semibold text-white mt-0.5">{session.user.full_name}</p>
          </div>
          <nav className="flex flex-col py-2">
            {SIDEBAR_ITEMS.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-r-2 ${
                  activeTab === id
                    ? 'bg-slate-50 text-slate-900 border-slate-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800 border-transparent'
                }`}>
                <Icon className={`w-5 h-5 ${activeTab === id ? 'text-slate-700' : 'text-slate-400'}`} />
                {label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-slate-100">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wide">Read-Only Mode</p>
              <p className="text-[10px] text-blue-600 mt-0.5">Executive view — contact Admin for changes</p>
            </div>
          </div>
        </aside>

        {/* Mobile tabs */}
        <div className="md:hidden w-full mb-4 overflow-x-auto flex gap-2 pb-2">
          {SIDEBAR_ITEMS.map(({ id, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`px-3 py-2 rounded-full text-xs font-bold whitespace-nowrap ${
                activeTab === id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'
              }`}>{label}</button>
          ))}
        </div>

        <div className="flex-1 space-y-6 min-w-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {SIDEBAR_ITEMS.find(s => s.id === activeTab)?.label}
            </h1>
            <p className="text-slate-500 text-sm">Gamji College of Nursing Sciences — Executive Dashboard</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-slate-600" /></div>
          ) : (
            <>

              {/* OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { label: 'Active Students', value: analytics?.total_active_students ?? students.filter(s=>s.status==='active').length, icon: GraduationCap, color: 'blue', sub: 'Currently enrolled' },
                      { label: 'Total Staff', value: analytics?.total_staff ?? staff.length, icon: Shield, color: 'purple', sub: 'All departments' },
                      { label: 'Courses', value: analytics?.total_courses ?? 0, icon: BookOpen, color: 'orange', sub: 'Across all levels' },
                      { label: 'Pending Admissions', value: analytics?.pending_admissions ?? admissions.filter(a=>a.status==='pending').length, icon: FileText, color: 'yellow', sub: 'Awaiting review' },
                      { label: 'Total Revenue', value: formatCurrency(analytics?.total_revenue_paid ?? 0), icon: CreditCard, color: 'green', sub: 'Confirmed payments' },
                      { label: 'Results Submitted', value: analytics?.submitted_results ?? 0, icon: BarChart3, color: 'slate', sub: 'By lecturers' },
                    ].map((stat, i) => (
                      <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-start gap-4 hover:shadow-md transition-shadow">
                        <div className={`p-2.5 rounded-lg bg-${stat.color}-50 flex-shrink-0`}>
                          <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">{stat.label}</p>
                          <p className="text-xl font-bold text-slate-900 mt-0.5">{stat.value}</p>
                          <p className="text-xs text-slate-400">{stat.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Enrollment breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-blue-600" /> Student Status Breakdown
                      </h3>
                      <div className="space-y-3">
                        {(['active','pending','suspended','graduated'] as const).map(status => {
                          const count = students.filter(s => s.status === status).length;
                          const pct = students.length ? Math.round((count / students.length) * 100) : 0;
                          const colors: Record<string, string> = { active: 'bg-green-500', pending: 'bg-yellow-400', suspended: 'bg-red-500', graduated: 'bg-blue-500' };
                          return (
                            <div key={status}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="capitalize text-slate-700 font-medium">{status}</span>
                                <span className="text-slate-500">{count} ({pct}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2">
                                <div className={`${colors[status]} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-600" /> Staff by Department
                      </h3>
                      <div className="space-y-3">
                        {(['Lecturer','Admin','Registrar','Bursar','Provost'] as const).map(role => {
                          const count = staff.filter((s: any) => s.role === role).length;
                          return count > 0 ? (
                            <div key={role} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                              <span className="text-sm text-slate-700 font-medium">{role}</span>
                              <span className="text-sm font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{count}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STUDENTS — read only */}
              {activeTab === 'students' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900">All Students ({students.length})</h3>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">Read-only view</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                        <tr>
                          <th className="px-6 py-3">Name / Reg #</th>
                          <th className="px-6 py-3">Program</th>
                          <th className="px-6 py-3 text-center">Level</th>
                          <th className="px-6 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {students.map((s: any) => (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-900">{s.full_name}</p>
                              <p className="text-xs text-slate-500 font-mono">{s.reg_number}</p>
                            </td>
                            <td className="px-6 py-4 text-slate-600">{s.program}</td>
                            <td className="px-6 py-4 text-center text-slate-600">{s.level}L</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                s.status === 'active' ? 'bg-green-100 text-green-800' :
                                s.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                s.status === 'graduated' ? 'bg-blue-100 text-blue-800' :
                                'bg-red-100 text-red-800'}`}>{s.status}</span>
                            </td>
                          </tr>
                        ))}
                        {students.length === 0 && <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400">No students found.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* STAFF — read only */}
              {activeTab === 'staff' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900">All Staff ({staff.length})</h3>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">Read-only view</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                        <tr>
                          <th className="px-6 py-3">Name</th>
                          <th className="px-6 py-3">Role</th>
                          <th className="px-6 py-3">Email</th>
                          <th className="px-6 py-3">Phone</th>
                          <th className="px-6 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {staff.map((s: any) => (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-semibold text-slate-900">{s.full_name}</td>
                            <td className="px-6 py-4"><span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-medium">{s.role}</span></td>
                            <td className="px-6 py-4 text-slate-500 text-xs">{s.email}</td>
                            <td className="px-6 py-4 text-slate-500 text-xs">{s.phone || '—'}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center gap-1 text-xs font-medium ${s.status === 'active' ? 'text-green-700' : 'text-orange-600'}`}>
                                <span className={`w-2 h-2 rounded-full ${s.status === 'active' ? 'bg-green-500' : 'bg-orange-400'}`} />{s.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {staff.length === 0 && <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">No staff found.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* FINANCE — read only */}
              {activeTab === 'finance' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                      <p className="text-sm text-green-700 font-medium">Total Collected</p>
                      <p className="text-2xl font-bold text-green-800 mt-1">{formatCurrency(payments.filter((p:any)=>p.status==='paid').reduce((s:number,p:any)=>s+p.amount,0))}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-xl p-5 border border-yellow-100">
                      <p className="text-sm text-yellow-700 font-medium">Pending</p>
                      <p className="text-2xl font-bold text-yellow-800 mt-1">{formatCurrency(payments.filter((p:any)=>p.status==='pending').reduce((s:number,p:any)=>s+p.amount,0))}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                      <p className="text-sm text-slate-600 font-medium">Total Transactions</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{payments.length}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <h3 className="font-bold text-slate-900">Payment Records</h3>
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">Read-only view</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                          <tr>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Student</th>
                            <th className="px-6 py-3">Purpose</th>
                            <th className="px-6 py-3 text-right">Amount</th>
                            <th className="px-6 py-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {payments.map((p: any) => (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4 text-slate-500 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                              <td className="px-6 py-4">
                                <p className="font-medium text-slate-900">{p.students?.full_name || p.student_name || '—'}</p>
                                <p className="text-xs text-slate-400">{p.students?.reg_number || ''}</p>
                              </td>
                              <td className="px-6 py-4 text-slate-600">{p.purpose}</td>
                              <td className="px-6 py-4 font-bold text-slate-800 text-right">{formatCurrency(p.amount)}</td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${p.status==='paid'?'bg-green-100 text-green-800':p.status==='overdue'?'bg-red-100 text-red-800':'bg-yellow-100 text-yellow-800'}`}>
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {payments.length === 0 && <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">No payment records.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ADMISSIONS — Provost can approve/reject */}
              {activeTab === 'admissions' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { label: 'Total Applications', value: admissions.length, color: 'blue' },
                      { label: 'Pending Review', value: admissions.filter((a:any)=>a.status==='pending').length, color: 'yellow' },
                      { label: 'Approved', value: admissions.filter((a:any)=>a.status==='approved').length, color: 'green' },
                    ].map((s,i) => (
                      <div key={i} className={`bg-${s.color}-50 rounded-xl p-5 border border-${s.color}-100`}>
                        <p className={`text-sm text-${s.color}-700 font-medium`}>{s.label}</p>
                        <p className={`text-2xl font-bold text-${s.color}-800 mt-1`}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                      <h3 className="font-bold text-slate-900">Admission Applications</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                          <tr>
                            <th className="px-6 py-3">Applicant</th>
                            <th className="px-6 py-3">Contact</th>
                            <th className="px-6 py-3">Program</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3 text-center">Status</th>
                            <th className="px-6 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {admissions.map((a: any) => (
                            <tr key={a.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4 font-semibold text-slate-900">{a.full_name}</td>
                              <td className="px-6 py-4 text-xs text-slate-500">
                                <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> {a.email}</div>
                                <div className="flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {a.phone}</div>
                              </td>
                              <td className="px-6 py-4"><span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{a.program}</span></td>
                              <td className="px-6 py-4 text-slate-500 text-xs">{new Date(a.submitted_at).toLocaleDateString()}</td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                                  a.status==='approved'?'bg-green-100 text-green-800':
                                  a.status==='rejected'?'bg-red-100 text-red-800':
                                  'bg-yellow-100 text-yellow-800'}`}>
                                  {a.status==='approved'?<CheckCircle className="w-3 h-3"/>:a.status==='rejected'?<XCircle className="w-3 h-3"/>:<Clock className="w-3 h-3"/>}
                                  {a.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {a.status === 'pending' && (
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => handleAdmissionStatus(a.id,'approved')} disabled={processingId===a.id}
                                      className="p-1.5 bg-green-50 text-green-700 rounded hover:bg-green-100 disabled:opacity-50" title="Approve">
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleAdmissionStatus(a.id,'rejected')} disabled={processingId===a.id}
                                      className="p-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100 disabled:opacity-50" title="Reject">
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                          {admissions.length === 0 && <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400">No applications found.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* PROFILE */}
              {activeTab === 'profile' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden max-w-lg">
                  <div className="p-5 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><User className="w-5 h-5" /> My Profile</h3>
                  </div>
                  <div className="p-6 space-y-5">
                    <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
                      <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-700">
                        {session.user.full_name.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">{session.user.full_name}</h2>
                        <p className="text-slate-500 text-sm">{session.user.email}</p>
                        <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700">PROVOST</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Full Name</p>
                        <p className="font-semibold text-slate-800 mt-1">{session.user.full_name}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Email</p>
                        <p className="font-semibold text-slate-800 mt-1">{session.user.email}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Role</p>
                        <p className="font-semibold text-slate-800 mt-1">College Provost</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Institution</p>
                        <p className="font-semibold text-slate-800 mt-1">Gamji College of Nursing Sciences</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 text-center">To update your profile information, contact the System Administrator.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
