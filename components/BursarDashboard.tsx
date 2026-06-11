import React, { useEffect, useState } from 'react';
import type { Session } from '../services/apiClient';
import { api } from '../services/apiClient';
import { Navbar } from './Navbar';
import { 
  Wallet,
  CheckCircle, 
  Clock, 
  Search, 
  Filter, 
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { Button } from './Button';

interface BursarDashboardProps {
  session: Session;
  onLogout: () => void;
}

// Define the shape of joined data from Supabase
interface Student {
  full_name: string;
  reg_number: string;
}

interface Payment {
  id: string;
  amount: number;
  purpose: string;
  status: 'paid' | 'pending' | 'overdue';
  created_at: string;
  student_id: string;
  students?: Student;
}

export const BursarDashboard: React.FC<BursarDashboardProps> = ({ session, onLogout }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await api.payments.list();

      if (data) {
        setPayments(data);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (id: string) => {
    setProcessingId(id);
    try {
      await api.payments.verify(id, 'paid');
      setPayments(prev => prev.map(p => 
        p.id === id ? { ...p, status: 'paid' } : p
      ));
    } catch (err) {
      console.error("Failed to update payment status", err);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredPayments = payments.filter(p => {
    const matchesFilter = statusFilter === 'all' || p.status === statusFilter;
    const studentName = p.students?.full_name?.toLowerCase() || '';
    const regNum = p.students?.reg_number?.toLowerCase() || '';
    const purpose = p.purpose.toLowerCase();
    const query = searchQuery.toLowerCase();
    
    return matchesFilter && (studentName.includes(query) || regNum.includes(query) || purpose.includes(query));
  });

  const totalRevenue = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
    
  const pendingRevenue = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Paid</span>;
      case 'overdue':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" /> Overdue</span>;
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
        userRole="Bursar"
        userName={session.user.full_name || "Bursar Office"}
        onLogout={onLogout}
      />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Revenue</p>
              <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalRevenue)}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Pending Collections</p>
              <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(pendingRevenue)}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Transactions</p>
              <h3 className="text-2xl font-bold text-slate-900">{payments.length}</h3>
            </div>
          </div>
        </div>

        {/* Payment Management Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-900">Student Payments</h2>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student, Reg No, or purpose..."
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
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 font-medium">Student Details</th>
                  <th className="px-6 py-3 font-medium">Payment Purpose</th>
                  <th className="px-6 py-3 font-medium">Amount</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium text-center">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{payment.students?.full_name || 'Unknown Student'}</div>
                      <div className="text-xs text-slate-500">{payment.students?.reg_number}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {payment.purpose}
                    </td>
                    <td className="px-6 py-4 text-slate-900 font-bold">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {payment.status !== 'paid' ? (
                        <button 
                          onClick={() => markAsPaid(payment.id)}
                          disabled={processingId === payment.id}
                          className="px-3 py-1.5 bg-nursing-600 text-white rounded-md text-xs font-medium hover:bg-nursing-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                          {processingId === payment.id ? 'Processing...' : 'Mark as Paid'}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <p>No payments found matching your criteria.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredPayments.map((payment) => (
              <div key={payment.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-slate-900">{payment.students?.full_name}</h3>
                    <p className="text-xs text-slate-500">{payment.students?.reg_number}</p>
                  </div>
                  <span className="font-bold text-slate-900">{formatCurrency(payment.amount)}</span>
                </div>
                
                <div className="text-sm text-slate-700">
                  <p>{payment.purpose}</p>
                  <p className="text-xs text-slate-500 mt-1">{new Date(payment.created_at).toLocaleDateString()}</p>
                </div>

                <div className="flex justify-between items-center pt-2">
                   {getStatusBadge(payment.status)}
                   
                   {payment.status !== 'paid' && (
                      <Button 
                        variant="primary" 
                        className="h-8 text-xs px-3"
                        onClick={() => markAsPaid(payment.id)}
                        disabled={processingId === payment.id}
                      >
                        Mark Paid
                      </Button>
                   )}
                </div>
              </div>
            ))}
            {filteredPayments.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                <p>No payments found.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};