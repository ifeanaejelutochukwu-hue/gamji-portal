import React, { useState, useEffect } from 'react';
import type { Session } from '../services/apiClient';
import { api } from '../services/apiClient';
import { Navbar } from './Navbar';
import { 
  BookOpen, 
  Award, 
  Calendar, 
  TrendingUp,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface StudentDashboardProps {
  session: Session;
  onLogout: () => void;
  initialData?: StudentProfile; // kept for compatibility, though largely unused in live mode without server-side props
}

export interface StudentProfile {
  id: string;
  auth_id: string;
  full_name: string;
  reg_number: string;
  program: string;
  year_of_study: number;
  avatar_url?: string;
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
}

interface Payment {
  id: string;
  amount: number;
  purpose: string;
  status: 'paid' | 'pending' | 'overdue';
  created_at: string;
  reference: string;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ session, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Student Profile
        const studentData = await api.students.getProfile(session.user.id);

        if (studentData) {
          setStudent({ ...studentData, email: studentData.email || session.user.email || '' });

          // 2. Fetch Results
          const resultsData = await api.results.listByStudent(studentData.id);

          if (resultsData) {
            setResults(resultsData.map((r: any) => ({
              id: r.id, 
              course_code: r.course_code || r.courses?.code || 'UNK', 
              course_title: r.course_title || r.courses?.title || 'Unknown', 
              score: r.score || r.total, 
              grade: r.grade, 
              semester: '1st', 
              units: r.units || r.courses?.units || 0
            })));
          }

          // 3. Fetch Payments
          const paymentsData = await api.payments.listByStudent(studentData.id);
          if (paymentsData) {
             setPayments(paymentsData.map((p: any) => ({
                id: p.id, 
                amount: p.amount, 
                purpose: p.purpose, 
                status: p.status, 
                created_at: new Date(p.created_at).toLocaleDateString(), 
                reference: p.id.substring(0, 8)
             })));
          }
        } else {
          setFetchError("No student profile found linked to this account.");
        }
      } catch (err: any) {
        console.error("Dashboard fetch error:", err);
        setFetchError("Failed to load dashboard data. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [session]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="animate-spin text-nursing-600 w-8 h-8" /></div>;
  
  if (fetchError || !student) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-lg font-bold text-slate-900 mb-2">Access Error</h2>
        <p className="text-slate-600 mb-6 text-center">{fetchError || "Profile not found."}</p>
        <button onClick={onLogout} className="px-4 py-2 bg-slate-900 text-white rounded-lg">Sign Out</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans animate-fade-in-up">
      <Navbar userEmail={session.user.email || ''} userRole="Student" userName={student.full_name} onLogout={onLogout} />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative group">
          <div className="h-32 bg-gradient-to-r from-nursing-700 to-nursing-900 relative"><div className="absolute inset-0 bg-white/5 pattern-dots"></div></div>
          <div className="px-8 pb-8">
             <div className="relative flex flex-col md:flex-row md:items-end -mt-12 mb-6 gap-6">
               <div className="relative">
                 <div className="w-32 h-32 rounded-full border-4 border-white shadow-md overflow-hidden bg-slate-100 flex items-center justify-center text-4xl font-bold text-nursing-700">
                    {student.full_name.charAt(0)}
                 </div>
                 <div className={`absolute bottom-1 right-1 w-6 h-6 border-2 border-white rounded-full ${student.status === 'active' ? 'bg-nursing-500' : 'bg-red-500'}`}></div>
               </div>
               <div className="flex-1 pb-1">
                 <h1 className="text-3xl font-bold text-slate-900">{student.full_name}</h1>
                 <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-slate-500 mt-1">
                   <span className="font-medium text-nursing-700">{student.reg_number}</span>
                   <span>{student.email}</span>
                 </div>
               </div>
               <div className="flex flex-wrap gap-3">
                 <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-nursing-50 text-nursing-700 border border-nursing-100"><Award className="w-4 h-4 mr-2" />{student.program}</span>
                 <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-slate-100 text-slate-700 border border-slate-200"><Calendar className="w-4 h-4 mr-2" />Year {student.year_of_study}</span>
               </div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50"><h2 className="text-lg font-bold text-slate-900 flex items-center"><BookOpen className="w-5 h-5 mr-2 text-nursing-600" /> Academic Performance</h2></div>
               <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500 uppercase text-xs"><tr><th className="px-6 py-4">Course</th><th className="px-6 py-4">Title</th><th className="px-6 py-4 text-center">Units</th><th className="px-6 py-4 text-center">Score</th><th className="px-6 py-4 text-center">Grade</th></tr></thead><tbody className="divide-y divide-slate-100">{results.map((result) => (<tr key={result.id} className="hover:bg-slate-50"><td className="px-6 py-4 font-medium text-nursing-700">{result.course_code}</td><td className="px-6 py-4">{result.course_title}</td><td className="px-6 py-4 text-center">{result.units}</td><td className="px-6 py-4 text-center font-bold">{result.score}</td><td className="px-6 py-4 text-center"><span className="inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold bg-slate-100 text-slate-700">{result.grade}</span></td></tr>))}
               {results.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No results found yet.</td></tr>}
               </tbody></table></div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-gradient-to-br from-nursing-600 to-nursing-800 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                 <div className="relative z-10"><p className="text-nursing-100 text-sm font-medium mb-1">Total Fees Paid</p><h3 className="text-3xl font-bold tracking-tight">{formatCurrency(payments.reduce((a, b) => a + (b.status === 'paid' ? b.amount : 0), 0))}</h3></div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-4 border-b border-slate-100 bg-slate-50/50"><h3 className="font-bold text-slate-900 text-sm flex items-center"><TrendingUp className="w-4 h-4 mr-2 text-slate-500" /> Recent Transactions</h3></div>
               <div className="divide-y divide-slate-100">{payments.slice(0, 3).map(payment => (<div key={payment.id} className="p-4 flex justify-between items-center"><div><p className="text-sm font-medium text-slate-900">{payment.purpose}</p><p className="text-xs text-slate-500 mt-0.5">{payment.created_at}</p></div><div className="text-right"><p className="text-sm font-bold text-slate-900">{formatCurrency(payment.amount)}</p><span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${payment.status === 'paid' ? 'bg-nursing-100 text-nursing-700' : 'bg-yellow-100 text-yellow-700'}`}>{payment.status}</span></div></div>))}
               {payments.length === 0 && <div className="p-4 text-center text-slate-500 text-sm">No transactions found.</div>}
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};