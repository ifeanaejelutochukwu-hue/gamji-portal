import React, { useState, useEffect, useRef } from 'react';
import type { Session } from '../services/apiClient';
import { api } from '../services/apiClient';
import { Navbar } from './Navbar';
import {
  BookOpen, Award, TrendingUp, Loader2, AlertCircle,
  CreditCard, User, LayoutDashboard, Clock, CheckCircle,
  XCircle, Printer, DollarSign, X
} from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';

interface StudentDashboardProps { session: Session; onLogout: () => void; }

export interface StudentProfile {
  id: string; auth_id: string; full_name: string; reg_number: string;
  program: string; year_of_study: number; level: number;
  status: 'active' | 'graduated' | 'suspended' | 'pending'; email: string;
}
interface Result {
  id: string; course_code: string; course_title: string; score: number;
  grade: string; units: number; ca_score?: number; exam_score?: number;
}
interface Payment {
  id: string; amount: number; purpose: string;
  status: 'paid' | 'pending' | 'overdue'; created_at: string; reference: string;
}
interface Course { id: string; code: string; title: string; units: number; level: number; semester: string; }
type TabId = 'overview' | 'courses' | 'results' | 'payments' | 'profile';

const FEE_TYPES = [
  { label: 'Tuition Fees', amount: 120000 },
  { label: 'Accommodation Fee', amount: 25000 },
  { label: 'Laboratory Practical Fee', amount: 15000 },
  { label: 'Examination Fee', amount: 10000 },
  { label: 'Medical Fee', amount: 5000 },
];

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ session, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showPayModal, setShowPayModal] = useState(false);
  const [payFeeType, setPayFeeType] = useState(FEE_TYPES[0].label);
  const [payAmount, setPayAmount] = useState(String(FEE_TYPES[0].amount));
  const [payLoading, setPayLoading] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const studentData = await api.students.getProfile(session.user.id);
        if (!studentData) { setFetchError('No student profile found.'); return; }
        setStudent({ ...studentData, email: studentData.email || session.user.email || '' });
        const [res, pay, crs] = await Promise.all([
          api.results.listByStudent(studentData.id).catch(() => []),
          api.payments.listByStudent(studentData.id).catch(() => []),
          api.courses.list().catch(() => []),
        ]);
        setResults((res || []).map((r: any) => ({
          id: r.id, course_code: r.course_code || r.courses?.code || 'N/A',
          course_title: r.course_title || r.courses?.title || 'Unknown Course',
          score: r.score ?? r.total ?? 0, grade: r.grade,
          units: r.units || r.courses?.units || 0,
          ca_score: r.ca_score, exam_score: r.exam_score,
        })));
        setPayments((pay || []).map((p: any) => ({
          id: p.id, amount: p.amount, purpose: p.purpose, status: p.status,
          created_at: new Date(p.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }),
          reference: p.reference || p.id.substring(0, 8).toUpperCase(),
        })));
        // Filter courses by student's level
        const levelCourses = (crs || []).filter((c: any) => c.level === studentData.level);
        setCourses(levelCourses);
      } catch (err: any) {
        setFetchError('Failed to load dashboard. Please refresh or contact support.');
      } finally { setLoading(false); }
    };
    fetchData();
  }, [session]);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(n);

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((a, b) => a + b.amount, 0);
  const totalPending = payments.filter(p => p.status !== 'paid').reduce((a, b) => a + b.amount, 0);
  const totalUnits = courses.reduce((a, b) => a + b.units, 0);

  const computeGPA = () => {
    if (!results.length) return '—';
    const gp: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, F: 0 };
    const pts = results.reduce((s, r) => s + (gp[r.grade] ?? 0) * r.units, 0);
    const un = results.reduce((s, r) => s + r.units, 0);
    return un ? (pts / un).toFixed(2) : '—';
  };

  const gradeColor = (g: string) => {
    switch (g) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-orange-100 text-orange-800';
      default:  return 'bg-red-100 text-red-800';
    }
  };

  const statusIcon = (s: string) => {
    if (s === 'paid')    return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (s === 'overdue') return <XCircle className="w-4 h-4 text-red-600" />;
    return <Clock className="w-4 h-4 text-yellow-600" />;
  };

  const handleFeeTypeChange = (label: string) => {
    setPayFeeType(label);
    const found = FEE_TYPES.find(f => f.label === label);
    if (found) setPayAmount(String(found.amount));
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayLoading(true);
    // In a real system this would integrate with Paystack/Flutterwave.
    // For now we simulate a successful payment and show success.
    await new Promise(r => setTimeout(r, 1500));
    setPayLoading(false);
    setPaySuccess(true);
    setTimeout(() => { setShowPayModal(false); setPaySuccess(false); }, 3000);
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Student Slip — ${student?.reg_number}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; font-size: 13px; color: #000; }
        h1 { font-size: 18px; text-align: center; margin-bottom: 4px; }
        .sub { text-align: center; color: #555; margin-bottom: 20px; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
        th { background: #f0f0f0; font-weight: bold; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; }
        .info-item { border: 1px solid #ddd; padding: 8px 12px; border-radius: 4px; }
        .label { font-size: 10px; color: #888; text-transform: uppercase; }
        .value { font-weight: bold; font-size: 13px; }
        .footer { margin-top: 40px; font-size: 11px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 12px; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="animate-spin text-nursing-600 w-10 h-10" />
    </div>
  );

  if (fetchError || !student) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <AlertCircle className="w-14 h-14 text-red-400 mb-4" />
      <h2 className="text-lg font-bold text-slate-900 mb-2">Access Error</h2>
      <p className="text-slate-600 mb-6 text-center max-w-sm">{fetchError || 'Profile not found.'}</p>
      <button onClick={onLogout} className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium">Sign Out</button>
    </div>
  );

  if (student.status === 'pending') return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar userEmail={session.user.email} userRole="Student" userName={student.full_name} onLogout={onLogout} />
      <div className="max-w-lg mx-auto mt-20 p-8 bg-white rounded-2xl shadow-sm border border-slate-200 text-center space-y-4">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8 text-yellow-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Account Pending Approval</h2>
        <p className="text-slate-600 text-sm">Your registration has been received. Your registration number:</p>
        <div className="py-3 px-6 bg-nursing-50 rounded-xl border border-nursing-100">
          <p className="text-2xl font-bold text-nursing-700 tracking-wide">{student.reg_number}</p>
          <p className="text-xs text-nursing-500 mt-1">Save this for your records</p>
        </div>
        <p className="text-slate-500 text-sm">The Registrar will activate your account shortly.</p>
        <button onClick={onLogout} className="text-sm text-nursing-600 hover:underline font-medium">Sign Out</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar
        userEmail={session.user.email} userRole="Student" userName={student.full_name}
        onLogout={onLogout} activeTab={activeTab} onTabChange={t => setActiveTab(t as TabId)}
      />

      {/* Profile header */}
      <div className="bg-gradient-to-r from-nursing-700 to-nursing-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold border-2 border-white/40 flex-shrink-0">
              {student.full_name.charAt(0)}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{student.full_name}</h1>
              <div className="flex flex-wrap gap-2 mt-1 text-nursing-100 text-sm">
                <span className="font-mono font-medium">{student.reg_number}</span>
                <span>•</span><span>{student.program}</span>
                <span>•</span><span>Year {student.year_of_study} | {student.level}L</span>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-center bg-white/10 rounded-xl px-4 py-2">
                <p className="text-xl font-bold">{computeGPA()}</p>
                <p className="text-xs text-nursing-200">GPA</p>
              </div>
              <div className="text-center bg-white/10 rounded-xl px-4 py-2">
                <p className="text-xl font-bold">{courses.length}</p>
                <p className="text-xs text-nursing-200">Courses</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'GPA', value: computeGPA(), color: 'text-nursing-600' },
                { label: 'Courses', value: courses.length, color: 'text-blue-600' },
                { label: 'Fees Paid', value: formatCurrency(totalPaid), color: 'text-green-600' },
                { label: 'Outstanding', value: formatCurrency(totalPending), color: totalPending > 0 ? 'text-red-600' : 'text-slate-600' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                  <p className="text-sm text-slate-500 font-medium">{s.label}</p>
                  <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2"><BookOpen className="w-5 h-5 text-nursing-600" /> My Courses ({student.level}L)</h3>
                  <button onClick={() => setActiveTab('courses')} className="text-xs text-nursing-600 hover:underline">View all</button>
                </div>
                {courses.length === 0
                  ? <div className="p-6 text-center text-slate-400 text-sm">No courses for your level yet.</div>
                  : <div className="divide-y divide-slate-50">{courses.slice(0, 4).map(c => (
                      <div key={c.id} className="px-5 py-3 flex justify-between items-center">
                        <div><span className="font-bold text-nursing-700 text-sm">{c.code}</span><span className="text-slate-500 text-sm ml-2">{c.title}</span></div>
                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-medium">{c.units} units</span>
                      </div>
                    ))}</div>
                }
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-nursing-600" /> Recent Transactions</h3>
                  <button onClick={() => setActiveTab('payments')} className="text-xs text-nursing-600 hover:underline">View all</button>
                </div>
                {payments.length === 0
                  ? <div className="p-6 text-center text-slate-400 text-sm">No payment records yet.</div>
                  : <div className="divide-y divide-slate-50">{payments.slice(0, 3).map(p => (
                      <div key={p.id} className="px-5 py-3 flex justify-between items-center">
                        <div className="flex items-center gap-2">{statusIcon(p.status)}<div><p className="text-sm font-medium text-slate-900">{p.purpose}</p><p className="text-xs text-slate-400">{p.created_at}</p></div></div>
                        <span className="font-bold text-slate-800 text-sm">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}</div>
                }
              </div>
            </div>
          </div>
        )}

        {/* COURSES TAB */}
        {activeTab === 'courses' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{student.level} Level Courses</h2>
                <p className="text-sm text-slate-500">{courses.length} courses · {totalUnits} total units</p>
              </div>
              <Button onClick={handlePrint} variant="outline" className="gap-2">
                <Printer className="w-4 h-4" /> Print Student Slip
              </Button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              {courses.length === 0
                ? <div className="p-12 text-center"><BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" /><p className="text-slate-500">No courses assigned to your level yet.</p><p className="text-slate-400 text-sm mt-1">Contact the Registrar if you believe this is an error.</p></div>
                : <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-xs"><tr>
                      <th className="px-6 py-3 font-medium">Code</th>
                      <th className="px-6 py-3 font-medium">Course Title</th>
                      <th className="px-6 py-3 font-medium text-center">Units</th>
                      <th className="px-6 py-3 font-medium">Semester</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {courses.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-bold text-nursing-700">{c.code}</td>
                          <td className="px-6 py-4 text-slate-800 font-medium">{c.title}</td>
                          <td className="px-6 py-4 text-center"><span className="bg-nursing-50 text-nursing-700 px-2 py-0.5 rounded text-xs font-bold">{c.units}</span></td>
                          <td className="px-6 py-4 text-slate-500">{c.semester} Semester</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                      <tr><td colSpan={2} className="px-6 py-3 font-bold text-slate-700 text-right">Total Units</td>
                      <td className="px-6 py-3 text-center font-bold text-nursing-700 text-base">{totalUnits}</td>
                      <td /></tr>
                    </tfoot>
                  </table>
              }
            </div>
          </div>
        )}

        {/* RESULTS TAB */}
        {activeTab === 'results' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><BookOpen className="w-5 h-5 text-nursing-600" /> Academic Results</h3>
              <div className="flex items-center gap-2 text-sm"><span className="text-slate-500">GPA:</span><span className="font-bold text-nursing-700">{computeGPA()}</span></div>
            </div>
            {results.length === 0
              ? <div className="p-12 text-center"><BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" /><p className="text-slate-500">No results published yet.</p><p className="text-slate-400 text-sm mt-1">Results will appear here after your lecturer uploads them.</p></div>
              : <div className="overflow-x-auto"><table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-xs"><tr>
                    <th className="px-6 py-3">Code</th><th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3 text-center">Units</th><th className="px-6 py-3 text-center">CA /30</th>
                    <th className="px-6 py-3 text-center">Exam /70</th><th className="px-6 py-3 text-center">Total</th>
                    <th className="px-6 py-3 text-center">Grade</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-bold text-nursing-700">{r.course_code}</td>
                        <td className="px-6 py-4 text-slate-800">{r.course_title}</td>
                        <td className="px-6 py-4 text-center text-slate-600">{r.units}</td>
                        <td className="px-6 py-4 text-center text-slate-600">{r.ca_score ?? '—'}</td>
                        <td className="px-6 py-4 text-center text-slate-600">{r.exam_score ?? '—'}</td>
                        <td className="px-6 py-4 text-center font-bold text-slate-800">{r.score}</td>
                        <td className="px-6 py-4 text-center"><span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${gradeColor(r.grade)}`}>{r.grade}</span></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50/50">
                    <tr><td colSpan={6} className="px-6 py-3 text-right text-sm font-bold text-slate-700">GPA</td>
                    <td className="px-6 py-3 text-center"><span className="font-bold text-nursing-700 text-base">{computeGPA()}</span></td></tr>
                  </tfoot>
                </table></div>
            }
          </div>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Payments</h2>
              <Button onClick={() => setShowPayModal(true)} className="bg-nursing-600 hover:bg-nursing-700 gap-2">
                <DollarSign className="w-4 h-4" /> Pay Fees
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-xl p-5 border border-green-100"><p className="text-sm text-green-700 font-medium">Total Paid</p><p className="text-2xl font-bold text-green-800 mt-1">{formatCurrency(totalPaid)}</p></div>
              <div className="bg-yellow-50 rounded-xl p-5 border border-yellow-100"><p className="text-sm text-yellow-700 font-medium">Outstanding</p><p className="text-2xl font-bold text-yellow-800 mt-1">{formatCurrency(totalPending)}</p></div>
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200"><p className="text-sm text-slate-600 font-medium">Transactions</p><p className="text-2xl font-bold text-slate-800 mt-1">{payments.length}</p></div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50"><h3 className="font-bold text-slate-900 flex items-center gap-2"><CreditCard className="w-5 h-5 text-nursing-600" /> Payment History</h3></div>
              {payments.length === 0
                ? <div className="p-12 text-center"><CreditCard className="w-12 h-12 text-slate-200 mx-auto mb-3" /><p className="text-slate-500">No payment records yet.</p><p className="text-slate-400 text-sm mt-1">Click "Pay Fees" to make your first payment.</p></div>
                : <div className="overflow-x-auto"><table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-xs"><tr>
                      <th className="px-6 py-3">Date</th><th className="px-6 py-3">Purpose</th>
                      <th className="px-6 py-3">Reference</th><th className="px-6 py-3 text-right">Amount</th>
                      <th className="px-6 py-3 text-center">Status</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-slate-500 text-xs">{p.created_at}</td>
                          <td className="px-6 py-4 font-medium text-slate-900">{p.purpose}</td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">{p.reference}</td>
                          <td className="px-6 py-4 font-bold text-slate-800 text-right">{formatCurrency(p.amount)}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${p.status === 'paid' ? 'bg-green-100 text-green-800' : p.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {statusIcon(p.status)} {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
              }
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50"><h3 className="font-bold text-slate-900 flex items-center gap-2"><User className="w-5 h-5 text-nursing-600" /> My Profile</h3></div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-5 pb-5 border-b border-slate-100">
                <div className="w-20 h-20 rounded-full bg-nursing-100 flex items-center justify-center text-3xl font-bold text-nursing-700">{student.full_name.charAt(0)}</div>
                <div><h2 className="text-xl font-bold text-slate-900">{student.full_name}</h2>
                <p className="text-nursing-600 font-mono font-medium">{student.reg_number}</p>
                <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">ACTIVE</span></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[{ label: 'Email', value: student.email }, { label: 'Program', value: student.program },
                  { label: 'Year of Study', value: `Year ${student.year_of_study}` }, { label: 'Level', value: `${student.level} Level` }].map((f, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{f.label}</p>
                    <p className="text-slate-800 font-semibold mt-1">{f.value}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 text-center pt-2 border-t border-slate-100">To update your profile, contact the Registrar.</p>
            </div>
          </div>
        )}
      </main>

      {/* PAY FEES MODAL */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2"><DollarSign className="w-5 h-5 text-nursing-600" /> Pay School Fees</h3>
              <button onClick={() => setShowPayModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            {paySuccess ? (
              <div className="p-8 text-center space-y-3">
                <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
                <h3 className="font-bold text-green-900 text-lg">Payment Initiated!</h3>
                <p className="text-sm text-slate-600">Your payment request has been recorded. The Bursar will confirm it shortly.</p>
              </div>
            ) : (
              <form onSubmit={handlePaySubmit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Fee Type</label>
                  <select value={payFeeType} onChange={e => handleFeeTypeChange(e.target.value)}
                    className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-nursing-500/20 focus:border-nursing-500">
                    {FEE_TYPES.map(f => <option key={f.label} value={f.label}>{f.label} — {formatCurrency(f.amount)}</option>)}
                    <option value="Other">Other</option>
                  </select>
                </div>
                <Input label="Amount (₦)" type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} required />
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-700"><strong>Note:</strong> After submitting, the Bursar will verify your payment and update your records. Bring your receipt to the Bursar's office for same-day processing.</p>
                </div>
                <Button type="submit" className="w-full bg-nursing-600 hover:bg-nursing-700" isLoading={payLoading}>
                  Submit Payment Request
                </Button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* HIDDEN PRINT TEMPLATE */}
      <div className="hidden">
        <div ref={printRef}>
          <h1>Gamji College of Nursing Sciences</h1>
          <p className="sub">Student Course Registration Slip — {new Date().getFullYear()}/{new Date().getFullYear() + 1} Academic Session</p>
          <div className="info-grid">
            <div className="info-item"><div className="label">Student Name</div><div className="value">{student.full_name}</div></div>
            <div className="info-item"><div className="label">Reg. Number</div><div className="value">{student.reg_number}</div></div>
            <div className="info-item"><div className="label">Program</div><div className="value">{student.program}</div></div>
            <div className="info-item"><div className="label">Level</div><div className="value">{student.level} Level — Year {student.year_of_study}</div></div>
          </div>
          <table>
            <thead><tr><th>S/N</th><th>Course Code</th><th>Course Title</th><th>Units</th><th>Semester</th></tr></thead>
            <tbody>
              {courses.map((c, i) => (
                <tr key={c.id}><td>{i + 1}</td><td>{c.code}</td><td>{c.title}</td><td>{c.units}</td><td>{c.semester}</td></tr>
              ))}
              <tr><td colSpan={3}><strong>Total Units</strong></td><td><strong>{totalUnits}</strong></td><td></td></tr>
            </tbody>
          </table>
          <br />
          <table>
            <thead><tr><th colSpan={3}>Student Declaration</th></tr></thead>
            <tbody>
              <tr><td colSpan={3} style={{ padding: '12px', color: '#555', fontSize: '11px' }}>
                I, {student.full_name} ({student.reg_number}), hereby confirm that the courses listed above are the courses I am registered for in the {new Date().getFullYear()}/{new Date().getFullYear() + 1} academic session.
              </td></tr>
              <tr>
                <td style={{ padding: '20px 12px', minWidth: '180px' }}>Student Signature: ________________</td>
                <td style={{ padding: '20px 12px', minWidth: '180px' }}>Date: ________________</td>
                <td style={{ padding: '20px 12px', minWidth: '180px' }}>Registrar Stamp: ________________</td>
              </tr>
            </tbody>
          </table>
          <div className="footer">
            Printed on {new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} &nbsp;|&nbsp;
            Gamji College of Nursing Sciences, Sokoto &nbsp;|&nbsp; This slip is only valid when stamped by the Registrar
          </div>
        </div>
      </div>
    </div>
  );
};
