import React, { useState, useEffect } from 'react';
import type { Session } from '../services/apiClient';
import { api } from '../services/apiClient';
import { Navbar } from './Navbar';
import {
  BookOpen, Award, Calendar, TrendingUp, Loader2, AlertCircle,
  CreditCard, User, LayoutDashboard, Clock, CheckCircle, XCircle
} from 'lucide-react';

interface StudentDashboardProps {
  session: Session;
  onLogout: () => void;
}

export interface StudentProfile {
  id: string;
  auth_id: string;
  full_name: string;
  reg_number: string;
  program: string;
  year_of_study: number;
  level: number;
  status: 'active' | 'graduated' | 'suspended' | 'pending';
  email: string;
}

interface Result {
  id: string;
  course_code: string;
  course_title: string;
  score: number;
  grade: string;
  semester: string;
  units: number;
  ca_score?: number;
  exam_score?: number;
}

interface Payment {
  id: string;
  amount: number;
  purpose: string;
  status: 'paid' | 'pending' | 'overdue';
  created_at: string;
  reference: string;
}

type TabId = 'overview' | 'results' | 'payments' | 'profile';

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ session, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const studentData = await api.students.getProfile(session.user.id);
        if (!studentData) { setFetchError('No student profile found.'); return; }

        setStudent({ ...studentData, email: studentData.email || session.user.email || '' });

        const [resultsData, paymentsData] = await Promise.all([
          api.results.listByStudent(studentData.id).catch(() => []),
          api.payments.listByStudent(studentData.id).catch(() => []),
        ]);

        setResults((resultsData || []).map((r: any) => ({
          id: r.id,
          course_code: r.course_code || r.courses?.code || 'N/A',
          course_title: r.course_title || r.courses?.title || 'Unknown Course',
          score: r.score ?? r.total ?? 0,
          grade: r.grade,
          semester: r.semester || '1st',
          units: r.units || r.courses?.units || 0,
          ca_score: r.ca_score,
          exam_score: r.exam_score,
        })));

        setPayments((paymentsData || []).map((p: any) => ({
          id: p.id,
          amount: p.amount,
          purpose: p.purpose,
          status: p.status,
          created_at: new Date(p.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }),
          reference: p.reference || p.id.substring(0, 8).toUpperCase(),
        })));
      } catch (err: any) {
        setFetchError('Failed to load dashboard. Please refresh or contact support.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [session]);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(n);

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((a, b) => a + b.amount, 0);
  const totalPending = payments.filter(p => p.status !== 'paid').reduce((a, b) => a + b.amount, 0);

  const computeGPA = () => {
    if (!results.length) return '—';
    const gpMap: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, F: 0 };
    const totalPoints = results.reduce((sum, r) => sum + (gpMap[r.grade] ?? 0) * r.units, 0);
    const totalUnits = results.reduce((sum, r) => sum + r.units, 0);
    if (!totalUnits) return '—';
    return (totalPoints / totalUnits).toFixed(2);
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-orange-100 text-orange-800';
      default:  return 'bg-red-100 text-red-800';
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':    return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'overdue': return <XCircle className="w-4 h-4 text-red-600" />;
      default:        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
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

  // Pending account notice
  if (student.status === 'pending') return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar userEmail={session.user.email} userRole="Student" userName={student.full_name} onLogout={onLogout} />
      <div className="max-w-lg mx-auto mt-20 p-8 bg-white rounded-2xl shadow-sm border border-slate-200 text-center space-y-4">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8 text-yellow-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Account Pending Approval</h2>
        <p className="text-slate-600 text-sm leading-relaxed">
          Your registration has been received. Your assigned registration number is:
        </p>
        <div className="py-3 px-6 bg-nursing-50 rounded-xl border border-nursing-100">
          <p className="text-2xl font-bold text-nursing-700 tracking-wide">{student.reg_number}</p>
          <p className="text-xs text-nursing-500 mt-1">Save this number for your records</p>
        </div>
        <p className="text-slate-500 text-sm">
          The Registrar will activate your account shortly. You will be able to log in once activated.
        </p>
        <button onClick={onLogout} className="text-sm text-nursing-600 hover:underline font-medium">Sign Out</button>
      </div>
    </div>
  );

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'overview',  label: 'Overview',  icon: LayoutDashboard },
    { id: 'results',   label: 'Results',   icon: BookOpen },
    { id: 'payments',  label: 'Payments',  icon: CreditCard },
    { id: 'profile',   label: 'Profile',   icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar userEmail={session.user.email} userRole="Student" userName={student.full_name} onLogout={onLogout} />

      {/* Profile header */}
      <div className="bg-gradient-to-r from-nursing-700 to-nursing-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold border-2 border-white/40 flex-shrink-0">
              {student.full_name.charAt(0)}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{student.full_name}</h1>
              <div className="flex flex-wrap gap-3 mt-1.5 text-nursing-100 text-sm">
                <span className="font-mono font-medium">{student.reg_number}</span>
                <span>•</span>
                <span>{student.program}</span>
                <span>•</span>
                <span>Year {student.year_of_study} | Level {student.level}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-center bg-white/10 rounded-xl px-4 py-2">
                <p className="text-xl font-bold">{computeGPA()}</p>
                <p className="text-xs text-nursing-200">GPA</p>
              </div>
              <div className="text-center bg-white/10 rounded-xl px-4 py-2">
                <p className="text-xl font-bold">{results.length}</p>
                <p className="text-xs text-nursing-200">Courses</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto pb-0">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === t.id
                    ? 'border-white text-white'
                    : 'border-transparent text-nursing-200 hover:text-white'
                }`}>
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'GPA', value: computeGPA(), sub: 'Current semester', color: 'nursing' },
                { label: 'Courses', value: results.length, sub: 'Enrolled', color: 'blue' },
                { label: 'Fees Paid', value: formatCurrency(totalPaid), sub: 'Total', color: 'green' },
                { label: 'Outstanding', value: formatCurrency(totalPending), sub: 'Balance due', color: totalPending > 0 ? 'red' : 'slate' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                  <p className="text-sm text-slate-500 font-medium">{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 text-${s.color}-600`}>{s.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Recent results */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><BookOpen className="w-5 h-5 text-nursing-600" /> Recent Results</h3>
                <button onClick={() => setActiveTab('results')} className="text-xs text-nursing-600 font-medium hover:underline">View all</button>
              </div>
              {results.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">No results published yet.</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {results.slice(0, 4).map(r => (
                    <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-slate-900 text-sm">{r.course_code}</span>
                        <span className="text-slate-400 text-sm ml-2">{r.course_title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-700">{r.score}%</span>
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${getGradeColor(r.grade)}`}>{r.grade}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent payments */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-nursing-600" /> Recent Transactions</h3>
                <button onClick={() => setActiveTab('payments')} className="text-xs text-nursing-600 font-medium hover:underline">View all</button>
              </div>
              {payments.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">No payment records yet.</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {payments.slice(0, 3).map(p => (
                    <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getPaymentStatusIcon(p.status)}
                        <div>
                          <p className="text-sm font-medium text-slate-900">{p.purpose}</p>
                          <p className="text-xs text-slate-400">{p.created_at}</p>
                        </div>
                      </div>
                      <span className="font-bold text-slate-800 text-sm">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── RESULTS TAB ── */}
        {activeTab === 'results' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><BookOpen className="w-5 h-5 text-nursing-600" /> Academic Results</h3>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">GPA:</span>
                <span className="font-bold text-nursing-700">{computeGPA()}</span>
              </div>
            </div>
            {results.length === 0 ? (
              <div className="p-12 text-center">
                <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No results published yet</p>
                <p className="text-slate-400 text-sm mt-1">Your lecturer will upload results after examinations.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                    <tr>
                      <th className="px-6 py-3 font-medium">Course Code</th>
                      <th className="px-6 py-3 font-medium">Title</th>
                      <th className="px-6 py-3 font-medium text-center">Units</th>
                      <th className="px-6 py-3 font-medium text-center">CA (30)</th>
                      <th className="px-6 py-3 font-medium text-center">Exam (70)</th>
                      <th className="px-6 py-3 font-medium text-center">Total</th>
                      <th className="px-6 py-3 font-medium text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-bold text-nursing-700">{r.course_code}</td>
                        <td className="px-6 py-4 text-slate-800">{r.course_title}</td>
                        <td className="px-6 py-4 text-center text-slate-600">{r.units}</td>
                        <td className="px-6 py-4 text-center text-slate-600">{r.ca_score ?? '—'}</td>
                        <td className="px-6 py-4 text-center text-slate-600">{r.exam_score ?? '—'}</td>
                        <td className="px-6 py-4 text-center font-bold text-slate-800">{r.score}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${getGradeColor(r.grade)}`}>{r.grade}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50/50">
                    <tr>
                      <td colSpan={6} className="px-6 py-3 text-right text-sm font-bold text-slate-700">GPA</td>
                      <td className="px-6 py-3 text-center">
                        <span className="font-bold text-nursing-700 text-base">{computeGPA()}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── PAYMENTS TAB ── */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                <p className="text-sm text-green-700 font-medium">Total Paid</p>
                <p className="text-2xl font-bold text-green-800 mt-1">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-5 border border-yellow-100">
                <p className="text-sm text-yellow-700 font-medium">Outstanding</p>
                <p className="text-2xl font-bold text-yellow-800 mt-1">{formatCurrency(totalPending)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <p className="text-sm text-slate-600 font-medium">Transactions</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{payments.length}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><CreditCard className="w-5 h-5 text-nursing-600" /> Payment History</h3>
              </div>
              {payments.length === 0 ? (
                <div className="p-12 text-center">
                  <CreditCard className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No payment records yet</p>
                  <p className="text-slate-400 text-sm mt-1">Payment records will appear here once processed by the Bursar.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                      <tr>
                        <th className="px-6 py-3 font-medium">Date</th>
                        <th className="px-6 py-3 font-medium">Purpose</th>
                        <th className="px-6 py-3 font-medium">Reference</th>
                        <th className="px-6 py-3 font-medium text-right">Amount</th>
                        <th className="px-6 py-3 font-medium text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-slate-500 text-xs">{p.created_at}</td>
                          <td className="px-6 py-4 font-medium text-slate-900">{p.purpose}</td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">{p.reference}</td>
                          <td className="px-6 py-4 font-bold text-slate-800 text-right">{formatCurrency(p.amount)}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                              p.status === 'paid' ? 'bg-green-100 text-green-800' :
                              p.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {getPaymentStatusIcon(p.status)}
                              {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><User className="w-5 h-5 text-nursing-600" /> My Profile</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-5 pb-5 border-b border-slate-100">
                <div className="w-20 h-20 rounded-full bg-nursing-100 flex items-center justify-center text-3xl font-bold text-nursing-700">
                  {student.full_name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{student.full_name}</h2>
                  <p className="text-nursing-600 font-mono font-medium">{student.reg_number}</p>
                  <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                  }`}>{student.status.toUpperCase()}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Email', value: student.email, icon: '✉️' },
                  { label: 'Program', value: student.program, icon: '🎓' },
                  { label: 'Year of Study', value: `Year ${student.year_of_study}`, icon: '📅' },
                  { label: 'Level', value: `${student.level} Level`, icon: '📊' },
                ].map((f, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{f.label}</p>
                    <p className="text-slate-800 font-semibold mt-1">{f.icon} {f.value}</p>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-400 text-center">
                  To update your profile information, please contact the Registrar.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
