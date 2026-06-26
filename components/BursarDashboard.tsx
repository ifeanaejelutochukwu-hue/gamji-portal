import React, { useEffect, useState, useRef } from 'react';
import type { Session } from '../services/apiClient';
import { api } from '../services/apiClient';
import { Navbar } from './Navbar';
import { Input } from './Input';
import { Button } from './Button';
import {
  Wallet, CheckCircle, Clock, Search, Filter, AlertCircle,
  TrendingUp, Plus, X, Printer, User, LayoutDashboard
} from 'lucide-react';

interface BursarDashboardProps { session: Session; onLogout: () => void; }
type TabId = 'overview' | 'payments' | 'profile';

interface StudentBasic { full_name: string; reg_number: string; }
interface Payment {
  id: string; amount: number; purpose: string;
  status: 'paid' | 'pending' | 'overdue';
  created_at: string; student_id: string;
  reference?: string; students?: StudentBasic;
}
interface StudentOption { id: string; full_name: string; reg_number: string; }

const FEE_PURPOSES = [
  'Tuition Fees', 'Accommodation Fee', 'Laboratory Practical Fee',
  'Examination Fee', 'Medical Fee', 'Library Fee', 'ID Card Fee', 'Other',
];

export const BursarDashboard: React.FC<BursarDashboardProps> = ({ session, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // New payment modal
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newStudentId, setNewStudentId] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newPurpose, setNewPurpose] = useState(FEE_PURPOSES[0]);
  const [newStatus, setNewStatus] = useState<'paid'|'pending'>('paid');
  const [addLoading, setAddLoading] = useState(false);

  // Receipt print ref
  const receiptRef = useRef<HTMLDivElement>(null);
  const [printPayment, setPrintPayment] = useState<Payment | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [pay, stu] = await Promise.all([
          api.payments.list(),
          api.students.list(),
        ]);
        if (pay) setPayments(pay as Payment[]);
        if (stu) setStudents(stu.filter((s: any) => s.status === 'active').map((s: any) => ({
          id: s.id, full_name: s.full_name, reg_number: s.reg_number,
        })));
      } catch (err) {
        console.error(err);
      } finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const markAsPaid = async (id: string) => {
    setProcessingId(id);
    try {
      await api.payments.verify(id, 'paid');
      setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'paid' } : p));
    } catch (err) { console.error(err); } finally { setProcessingId(null); }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentId) { alert('Please select a student.'); return; }
    setAddLoading(true);
    try {
      const created = await api.payments.create(newStudentId, parseFloat(newAmount), newPurpose, newStatus);
      const student = students.find(s => s.id === newStudentId);
      setPayments(prev => [{ ...created as any, students: student ? { full_name: student.full_name, reg_number: student.reg_number } : undefined }, ...prev]);
      setShowAddPayment(false);
      setNewStudentId(''); setNewAmount(''); setNewPurpose(FEE_PURPOSES[0]); setNewStatus('paid');
    } catch (err: any) {
      alert('Failed to record payment: ' + err.message);
    } finally { setAddLoading(false); }
  };

  const handlePrintReceipt = (payment: Payment) => {
    setPrintPayment(payment);
    setTimeout(() => {
      const content = receiptRef.current;
      if (!content) return;
      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(`<html><head><title>Payment Receipt</title>
        <style>
          body{font-family:Arial,sans-serif;padding:40px;max-width:500px;margin:0 auto;}
          h2{text-align:center;margin-bottom:4px;}
          .sub{text-align:center;color:#555;font-size:12px;margin-bottom:24px;}
          table{width:100%;border-collapse:collapse;}
          td{padding:8px 4px;border-bottom:1px solid #eee;font-size:13px;}
          td:first-child{color:#555;width:40%;}
          td:last-child{font-weight:bold;}
          .status-paid{color:#16a34a;font-weight:bold;}
          .footer{margin-top:40px;text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px;}
          @media print{body{padding:20px;}}
        </style></head><body>${content.innerHTML}</body></html>`);
      win.document.close();
      setTimeout(() => { win.print(); win.close(); }, 300);
    }, 100);
  };

  const filteredPayments = payments.filter(p => {
    const matchFilter = statusFilter === 'all' || p.status === statusFilter;
    const name = p.students?.full_name?.toLowerCase() || '';
    const reg = p.students?.reg_number?.toLowerCase() || '';
    const purpose = p.purpose.toLowerCase();
    const q = searchQuery.toLowerCase();
    return matchFilter && (!q || name.includes(q) || reg.includes(q) || purpose.includes(q));
  });

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(n);
  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const pendingRevenue = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const overdueRevenue = payments.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount, 0);

  const statusBadge = (status: string) => {
    if (status === 'paid') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" /> Paid</span>;
    if (status === 'overdue') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800"><AlertCircle className="w-3 h-3" /> Overdue</span>;
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3" /> Pending</span>;
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin w-10 h-10 border-4 border-nursing-200 border-t-nursing-600 rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar userEmail={session.user.email} userRole="Bursar" userName={session.user.full_name}
        onLogout={onLogout} activeTab={activeTab} onTabChange={t => setActiveTab(t as TabId)} />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Page header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 capitalize">{activeTab}</h1>
            <p className="text-slate-500 text-sm">Gamji College of Nursing Sciences — Bursar's Office</p>
          </div>
          {activeTab === 'payments' && (
            <Button onClick={() => setShowAddPayment(true)} className="bg-nursing-600 hover:bg-nursing-700 gap-2">
              <Plus className="w-4 h-4" /> Record Payment
            </Button>
          )}
        </div>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-xl p-5 border border-green-100 flex items-center gap-4">
                <div className="p-2.5 bg-green-100 rounded-lg"><Wallet className="w-5 h-5 text-green-700" /></div>
                <div><p className="text-sm text-green-700 font-medium">Total Collected</p><p className="text-2xl font-bold text-green-900">{formatCurrency(totalRevenue)}</p></div>
              </div>
              <div className="bg-yellow-50 rounded-xl p-5 border border-yellow-100 flex items-center gap-4">
                <div className="p-2.5 bg-yellow-100 rounded-lg"><Clock className="w-5 h-5 text-yellow-700" /></div>
                <div><p className="text-sm text-yellow-700 font-medium">Pending</p><p className="text-2xl font-bold text-yellow-900">{formatCurrency(pendingRevenue)}</p></div>
              </div>
              <div className="bg-red-50 rounded-xl p-5 border border-red-100 flex items-center gap-4">
                <div className="p-2.5 bg-red-100 rounded-lg"><AlertCircle className="w-5 h-5 text-red-700" /></div>
                <div><p className="text-sm text-red-700 font-medium">Overdue</p><p className="text-2xl font-bold text-red-900">{formatCurrency(overdueRevenue)}</p></div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-nursing-600" /> Recent Transactions</h3>
              <div className="space-y-3">
                {payments.slice(0, 8).map(p => (
                  <div key={p.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{p.students?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-slate-400">{p.purpose} · {new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800 text-sm">{formatCurrency(p.amount)}</p>
                      {statusBadge(p.status)}
                    </div>
                  </div>
                ))}
                {payments.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No payment records yet.</p>}
              </div>
            </div>
          </div>
        )}

        {/* PAYMENTS */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input type="text" placeholder="Search student, reg number or purpose..."
                    className="pl-9 h-10 w-full rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-nursing-500/20 focus:border-nursing-500"
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <div className="flex items-center gap-2 w-full md:w-48">
                  <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white focus:outline-none">
                    <option value="all">All Statuses</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-400">{filteredPayments.length} of {payments.length} records</p>
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
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map(payment => (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-slate-500 text-xs">{new Date(payment.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{payment.students?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-slate-400">{payment.students?.reg_number}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{payment.purpose}</td>
                      <td className="px-6 py-4 font-bold text-slate-800 text-right">{formatCurrency(payment.amount)}</td>
                      <td className="px-6 py-4 text-center">{statusBadge(payment.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handlePrintReceipt(payment)}
                            className="p-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded hover:bg-slate-100 transition" title="Print receipt">
                            <Printer className="w-4 h-4" />
                          </button>
                          {payment.status !== 'paid' && (
                            <button onClick={() => markAsPaid(payment.id)} disabled={processingId === payment.id}
                              className="px-3 py-1.5 bg-nursing-600 text-white rounded text-xs font-medium hover:bg-nursing-700 disabled:opacity-50">
                              {processingId === payment.id ? 'Processing...' : 'Mark Paid'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPayments.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No payments found.</td></tr>
                  )}
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
                <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-2xl font-bold text-amber-700">{session.user.full_name.charAt(0)}</div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{session.user.full_name}</h2>
                  <p className="text-slate-500 text-sm">{session.user.email}</p>
                  <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">BURSAR</span>
                </div>
              </div>
              {[{ label: 'Full Name', value: session.user.full_name }, { label: 'Email', value: session.user.email },
                { label: 'Role', value: 'College Bursar' }, { label: 'Institution', value: 'Gamji College of Nursing Sciences' }].map((f, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{f.label}</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Add Payment Modal */}
      {showAddPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-900">Record New Payment</h3>
              <button onClick={() => setShowAddPayment(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddPayment} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Student</label>
                <select required value={newStudentId} onChange={e => setNewStudentId(e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-nursing-500/20 focus:border-nursing-500">
                  <option value="">-- Select Student --</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.reg_number})</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Fee Purpose</label>
                <select value={newPurpose} onChange={e => setNewPurpose(e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-nursing-500/20 focus:border-nursing-500">
                  {FEE_PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <Input label="Amount (₦)" type="number" placeholder="e.g. 120000" value={newAmount} onChange={e => setNewAmount(e.target.value)} required />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Status</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value as any)}
                  className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-nursing-500/20 focus:border-nursing-500">
                  <option value="paid">Paid — Payment received</option>
                  <option value="pending">Pending — Awaiting payment</option>
                </select>
              </div>
              <Button type="submit" className="w-full bg-nursing-600 hover:bg-nursing-700" disabled={addLoading}>
                {addLoading ? 'Recording...' : 'Record Payment'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Hidden receipt template */}
      <div className="hidden">
        <div ref={receiptRef}>
          {printPayment && (<>
            <h2>Gamji College of Nursing Sciences</h2>
            <p className="sub">Official Payment Receipt</p>
            <table>
              <tbody>
                <tr><td>Receipt No.</td><td>{printPayment.reference || printPayment.id.slice(0,8).toUpperCase()}</td></tr>
                <tr><td>Student Name</td><td>{printPayment.students?.full_name || '—'}</td></tr>
                <tr><td>Reg. Number</td><td>{printPayment.students?.reg_number || '—'}</td></tr>
                <tr><td>Purpose</td><td>{printPayment.purpose}</td></tr>
                <tr><td>Amount</td><td>{formatCurrency(printPayment.amount)}</td></tr>
                <tr><td>Status</td><td className="status-paid">{printPayment.status.toUpperCase()}</td></tr>
                <tr><td>Date</td><td>{new Date(printPayment.created_at).toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
                <tr><td>Processed by</td><td>{session.user.full_name} (Bursar)</td></tr>
              </tbody>
            </table>
            <p style={{ marginTop: '30px', fontSize: '11px' }}>Bursar Signature: _____________________</p>
            <p style={{ fontSize: '11px', marginTop: '8px' }}>Official Stamp: _____________________</p>
            <div className="footer">This receipt is valid only when stamped by the College Bursar · Gamji College of Nursing Sciences, Sokoto</div>
          </>)}
        </div>
      </div>
    </div>
  );
};
