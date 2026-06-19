import React, { useState, useEffect } from 'react';
import type { Session } from '../services/apiClient';
import { api } from '../services/apiClient';
import { Navbar } from './Navbar';
import { 
  Users, 
  Shield, 
  CreditCard, 
  GraduationCap, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  X,
  Save,
  Mail,
  Phone,
  LayoutDashboard,
  FileText,
  BarChart3,
  Download,
  BookOpen,
  TrendingUp,
  AlertCircle,
  Loader2,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';

interface AdminDashboardProps {
  session: Session;
  onLogout: () => void;
  role?: 'Admin' | 'Provost';
}

type TabId = 'overview' | 'staff' | 'students' | 'courses' | 'payments' | 'reports';

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'Admin' | 'Lecturer' | 'Registrar' | 'Bursar' | 'Provost';
  status: 'active' | 'leave';
}

interface Student {
  id: string;
  full_name: string;
  reg_number: string;
  program: string;
  level: number;
  status: 'active' | 'suspended' | 'graduated';
  email: string;
}

interface Course {
  id: string;
  code: string;
  title: string;
  units: number;
  level: number;
  semester: string;
}

interface Payment {
  id: string;
  student_name: string;
  amount: number;
  purpose: string;
  created_at: string;
  status: 'paid' | 'pending';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ session, onLogout, role = 'Admin' }) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);

  // Data State
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [studentList, setStudentList] = useState<Student[]>([]);
  const [coursesList, setCoursesList] = useState<Course[]>([]);
  const [paymentsList, setPaymentsList] = useState<Payment[]>([]);

  // Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [currentStaff, setCurrentStaff] = useState<Partial<StaffMember>>({});
  
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [currentCourse, setCurrentCourse] = useState<Partial<Course>>({});

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<Student>>({});

  const [saving, setSaving] = useState(false);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Staff
        const staffData = await api.staff.list();
        if (staffData) setStaffList(staffData as StaffMember[]);

        // 2. Fetch Students
        const studentsData = await api.students.list();
        if (studentsData) setStudentList(studentsData as Student[]);

        // 3. Fetch Courses
        const coursesData = await api.courses.list();
        if (coursesData) setCoursesList(coursesData as Course[]);

        // 4. Fetch Payments
        const paymentsData = await api.payments.list();

        if (paymentsData) {
           setPaymentsList(paymentsData.map((p: any) => ({
             id: p.id,
             student_name: p.student_name || p.students?.full_name || 'Unknown',
             amount: p.amount,
             purpose: p.purpose,
             created_at: p.created_at,
             status: p.status
           })));
        }

      } catch (err) {
        console.error("Error fetching admin data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- Staff Handlers ---
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...currentStaff, updated_at: new Date() };
      if (!payload.id) {
        const data = await api.staff.create(payload);
        setStaffList(prev => [data as StaffMember, ...prev]);
      } else {
        await api.staff.update(payload.id, payload);
        setStaffList(prev => prev.map(s => s.id === payload.id ? { ...s, ...payload } as StaffMember : s));
      }
      setIsStaffModalOpen(false);
    } catch (e) { alert("Error saving staff member. Check permissions."); } finally { setSaving(false); }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Delete this staff member?')) return;
    try {
      await api.staff.delete(id);
      setStaffList(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      alert("Failed to delete. They might be linked to courses.");
    }
  };

  // --- Student Handlers ---
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...currentStudent } as any;
      if (!payload.id) {
        const data = await api.students.create(payload);
        setStudentList(prev => [data as Student, ...prev]);
      } else {
        await api.students.update(payload.id, payload);
        setStudentList(prev => prev.map(s => s.id === payload.id ? { ...s, ...payload } as Student : s));
      }
      setIsStudentModalOpen(false);
    } catch (e: any) {
      alert("Error saving student: " + (e?.message || 'Unknown error'));
    } finally { setSaving(false); }
  };

  const handleApproveStudent = async (id: string) => {
    try {
      await api.students.update(id, { status: 'active' } as any);
      setStudentList(prev => prev.map(s => s.id === id ? { ...s, status: 'active' } : s));
    } catch (err: any) {
      alert("Failed to approve: " + (err?.message || 'Unknown error'));
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('Delete this student record?')) return;
    try {
      await api.students.delete(id);
      setStudentList(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      alert("Failed to delete. Check for existing records.");
    }
  };

  // --- Course Handlers ---
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...currentCourse };
      if (!payload.id) {
        const data = await api.courses.create(payload);
        setCoursesList(prev => [data as Course, ...prev]);
      } else {
        await api.courses.update(payload.id, payload);
        setCoursesList(prev => prev.map(c => c.id === payload.id ? { ...c, ...payload } as Course : c));
      }
      setIsCourseModalOpen(false);
    } catch (e) { alert("Error saving course."); } finally { setSaving(false); }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Delete this course?')) return;
    try {
      await api.courses.delete(id);
      setCoursesList(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert("Failed to delete course.");
    }
  };

  // --- Payment Handlers ---
  const togglePaymentStatus = async (id: string, currentStatus: string) => {
    const newStatus: 'paid' | 'pending' = currentStatus === 'paid' ? 'pending' : 'paid';
    try {
      await api.payments.verify(id, newStatus);
      setPaymentsList(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    } catch (err) {
      alert("Failed to update payment status.");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const SidebarItem = ({ id, icon: Icon, label }: { id: TabId, icon: React.ElementType, label: string }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-200 border-r-2
        ${activeTab === id 
          ? 'bg-nursing-50 text-nursing-700 border-nursing-600' 
          : 'text-slate-600 hover:bg-slate-50 hover:text-nursing-600 border-transparent'
        }`}
    >
      <Icon className={`w-5 h-5 ${activeTab === id ? 'text-nursing-600' : 'text-slate-400'}`} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar 
        userEmail={session.user.email || (role === 'Provost' ? 'provost@gamji.edu.ng' : 'admin@gamji.edu.ng')} 
        userRole={role}
        userName={role === 'Provost' ? "College Provost" : "System Administrator"}
        onLogout={onLogout}
      />

      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        
        {/* Sidebar Navigation */}
        <div className={`w-64 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-shrink-0 h-fit hidden md:block`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{role === 'Provost' ? 'Provost' : 'Admin'} Menu</p>
          </div>
          <nav className="flex flex-col py-2">
            <SidebarItem id="overview" icon={LayoutDashboard} label="Overview" />
            <SidebarItem id="staff" icon={Shield} label="Staff Management" />
            <SidebarItem id="students" icon={GraduationCap} label="Students" />
            <SidebarItem id="courses" icon={BookOpen} label="Courses" />
            <SidebarItem id="payments" icon={CreditCard} label="Payments" />
            <SidebarItem id="reports" icon={FileText} label="Reports" />
          </nav>
          
          <div className="p-4 mt-4 border-t border-slate-100">
             <div className="bg-nursing-50 rounded-lg p-3 border border-nursing-100">
                <div className="flex items-center gap-2 mb-1 text-nursing-800 font-semibold text-xs">
                   <AlertCircle className="w-3 h-3" /> System Status
                </div>
                <p className="text-[10px] text-nursing-600">All services operational.<br/>Database Connected.</p>
             </div>
          </div>
        </div>

        {/* Mobile Nav Helper */}
        <div className="md:hidden w-full mb-4 overflow-x-auto flex gap-2 pb-2">
           {['overview', 'staff', 'students', 'courses', 'payments', 'reports'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as TabId)}
                className={`px-4 py-2 rounded-full text-xs font-bold capitalize whitespace-nowrap ${
                  activeTab === tab ? 'bg-nursing-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {tab}
              </button>
           ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          
          {/* Header */}
          <div className="flex justify-between items-center">
             <div>
               <h1 className="text-2xl font-bold text-slate-900 capitalize">{activeTab.replace('-', ' ')}</h1>
               <p className="text-slate-500 text-sm">Gamji College of Nursing Sciences, Sokoto</p>
             </div>
             {activeTab === 'staff' && (
                <Button onClick={() => { setCurrentStaff({}); setIsStaffModalOpen(true); }}>
                   <Plus className="w-4 h-4 mr-2" /> Add Staff
                </Button>
             )}
             {activeTab === 'students' && (
                <Button onClick={() => { setCurrentStudent({}); setIsStudentModalOpen(true); }}>
                   <Plus className="w-4 h-4 mr-2" /> Add Student
                </Button>
             )}
             {activeTab === 'courses' && (
                <Button onClick={() => { setCurrentCourse({}); setIsCourseModalOpen(true); }}>
                   <Plus className="w-4 h-4 mr-2" /> Add Course
                </Button>
             )}
             {activeTab === 'reports' && (
                <Button variant="outline">
                   <Download className="w-4 h-4 mr-2" /> Export All
                </Button>
             )}
          </div>

          {loading ? (
             <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-nursing-600" /></div>
          ) : (
            <>
              {/* VIEW: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6 animate-fade-in-up">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'Total Students', value: studentList.length, icon: Users, color: 'blue' },
                      { label: 'Pending Approval', value: studentList.filter(s => s.status === 'pending').length, icon: Users, color: 'yellow' },
                      { label: 'Staff Members', value: staffList.length, icon: Shield, color: 'purple' },
                      { label: 'Total Revenue', value: formatCurrency(paymentsList.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)), icon: CreditCard, color: 'green' },
                    ].map((stat, idx) => (
                      <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                        <div className={`p-3 rounded-lg bg-${stat.color}-50 text-${stat.color}-600`}>
                          <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                          <h3 className="text-xl font-bold text-slate-900">{stat.value}</h3>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center">
                          <TrendingUp className="w-5 h-5 mr-2 text-nursing-600" /> Recent Activity
                        </h3>
                        <div className="space-y-4">
                           {paymentsList.slice(0, 3).map((p, i) => (
                             <div key={i} className="flex items-start gap-3 pb-3 border-b border-slate-50 last:border-0">
                                <div className="w-2 h-2 mt-2 rounded-full bg-green-500" />
                                <div>
                                   <p className="text-sm text-slate-700">Payment received from {p.student_name}</p>
                                   <p className="text-xs text-slate-400">{new Date(p.created_at).toLocaleTimeString()}</p>
                                </div>
                             </div>
                           ))}
                           {paymentsList.length === 0 && <p className="text-sm text-slate-400 italic">No recent activity.</p>}
                        </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW: STAFF */}
              {activeTab === 'staff' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in-up">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                        <tr>
                          <th className="px-6 py-3 font-medium">Name</th>
                          <th className="px-6 py-3 font-medium">Role</th>
                          <th className="px-6 py-3 font-medium">Contact</th>
                          <th className="px-6 py-3 font-medium">Status</th>
                          <th className="px-6 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {staffList.map((staff) => (
                          <tr key={staff.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-semibold text-slate-900">{staff.full_name}</td>
                            <td className="px-6 py-4"><span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{staff.role}</span></td>
                            <td className="px-6 py-4 text-xs">{staff.email}</td>
                            <td className="px-6 py-4"><span className={`inline-block w-2 h-2 rounded-full mr-2 ${staff.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>{staff.status}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => { setCurrentStaff(staff); setIsStaffModalOpen(true); }} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteStaff(staff.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VIEW: STUDENTS */}
              {activeTab === 'students' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in-up">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                        <tr>
                          <th className="px-6 py-3 font-medium">Student Info</th>
                          <th className="px-6 py-3 font-medium">Program</th>
                          <th className="px-6 py-3 font-medium">Level</th>
                          <th className="px-6 py-3 font-medium">Status</th>
                          <th className="px-6 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {studentList.map((student) => (
                          <tr key={student.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-900">{student.full_name}</div>
                              <div className="text-xs text-slate-500">{student.reg_number}</div>
                            </td>
                            <td className="px-6 py-4 text-slate-700">{student.program}</td>
                            <td className="px-6 py-4 text-slate-700">{student.level}L</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium 
                                  ${student.status === 'active' ? 'bg-green-100 text-green-800' : student.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                  {student.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                               <div className="flex justify-end gap-2 items-center">
                                {student.status === 'pending' && (
                                  <button
                                    onClick={() => handleApproveStudent(student.id)}
                                    className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-bold hover:bg-green-100 transition"
                                    title="Approve student"
                                  >
                                    Approve
                                  </button>
                                )}
                                <button onClick={() => { setCurrentStudent(student); setIsStudentModalOpen(true); }} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteStudent(student.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VIEW: COURSES */}
              {activeTab === 'courses' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in-up">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                       <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                        <tr>
                          <th className="px-6 py-3 font-medium">Code</th>
                          <th className="px-6 py-3 font-medium">Title</th>
                          <th className="px-6 py-3 font-medium text-center">Units</th>
                          <th className="px-6 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {coursesList.map((course) => (
                          <tr key={course.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-bold text-nursing-700">{course.code}</td>
                            <td className="px-6 py-4 text-slate-900 font-medium">{course.title}</td>
                            <td className="px-6 py-4 text-center">{course.units}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => { setCurrentCourse(course); setIsCourseModalOpen(true); }} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteCourse(course.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VIEW: PAYMENTS */}
              {activeTab === 'payments' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in-up">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                        <tr>
                          <th className="px-6 py-3 font-medium">Date</th>
                          <th className="px-6 py-3 font-medium">Student</th>
                          <th className="px-6 py-3 font-medium">Purpose</th>
                          <th className="px-6 py-3 font-medium">Amount</th>
                          <th className="px-6 py-3 font-medium">Status</th>
                          <th className="px-6 py-3 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paymentsList.map((payment) => (
                          <tr key={payment.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 text-slate-500 text-xs">{new Date(payment.created_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4 font-medium text-slate-900">{payment.student_name}</td>
                            <td className="px-6 py-4 text-slate-600">{payment.purpose}</td>
                            <td className="px-6 py-4 font-bold text-slate-800">{formatCurrency(payment.amount)}</td>
                            <td className="px-6 py-4">
                                {payment.status === 'paid' ? (
                                  <span className="text-green-600 flex items-center text-xs font-bold"><CheckCircle className="w-3 h-3 mr-1" /> Paid</span>
                                ) : (
                                  <span className="text-yellow-600 flex items-center text-xs font-bold"><Clock className="w-3 h-3 mr-1" /> Pending</span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-right">
                               <Button 
                                  variant="ghost" 
                                  className="text-xs h-8" 
                                  onClick={() => togglePaymentStatus(payment.id, payment.status)}
                                >
                                  {payment.status === 'paid' ? 'Mark Pending' : 'Mark Paid'}
                               </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VIEW: REPORTS */}
              {activeTab === 'reports' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
                    {['Financial Summary', 'Student Enrollment Report'].map((report, i) => (
                      <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer group">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-50 rounded-lg"><FileText className="w-6 h-6 text-slate-500" /></div>
                            <div>
                                <h3 className="font-semibold text-slate-900">{report}</h3>
                                <p className="text-xs text-slate-400">PDF Available</p>
                            </div>
                          </div>
                          <Download className="w-5 h-5 text-slate-400" />
                      </div>
                    ))}
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* --- Modals --- */}
      
      {/* Staff Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-900">{currentStaff.id ? 'Edit Staff' : 'Add Staff'}</h3>
              <button onClick={() => setIsStaffModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveStaff} className="p-6 space-y-4">
              <Input label="Full Name" value={currentStaff.full_name || ''} onChange={e => setCurrentStaff({...currentStaff, full_name: e.target.value})} required />
              <Input label="Email" type="email" value={currentStaff.email || ''} onChange={e => setCurrentStaff({...currentStaff, email: e.target.value})} required />
              <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-700">Role</label>
                 <select className="flex h-11 w-full rounded-lg border border-slate-200 px-3" value={currentStaff.role || 'Lecturer'} onChange={e => setCurrentStaff({...currentStaff, role: e.target.value as any})}>
                   <option value="Admin">Admin</option>
                   <option value="Lecturer">Lecturer</option>
                   <option value="Bursar">Bursar</option>
                   <option value="Registrar">Registrar</option>
                 </select>
              </div>
              {!currentStaff.id && (
                <Input label="Initial Password" type="password" placeholder="Min 8 characters" value={(currentStaff as any).password || ''} onChange={e => setCurrentStaff({...currentStaff, ...(currentStaff as any), password: e.target.value})} required />
              )}
              <Button type="submit" className="w-full mt-2" disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : 'Save'}</Button>
            </form>
          </div>
        </div>
      )}

      {/* Student Modal */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-900">{currentStudent.id ? 'Edit Student' : 'Add Student'}</h3>
              <button onClick={() => setIsStudentModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveStudent} className="p-6 space-y-4">
              <Input label="Full Name" value={currentStudent.full_name || ''} onChange={e => setCurrentStudent({...currentStudent, full_name: e.target.value})} required />
              <Input label="Email" type="email" value={currentStudent.email || ''} onChange={e => setCurrentStudent({...currentStudent, email: e.target.value})} required />
              <Input label="Reg Number" value={currentStudent.reg_number || ''} onChange={e => setCurrentStudent({...currentStudent, reg_number: e.target.value})} required />
              <Input label="Program" value={currentStudent.program || ''} onChange={e => setCurrentStudent({...currentStudent, program: e.target.value})} required />
              <div className="grid grid-cols-2 gap-4">
                 <Input label="Level" type="number" value={currentStudent.level || 100} onChange={e => setCurrentStudent({...currentStudent, level: parseInt(e.target.value)})} />
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Status</label>
                    <select className="flex h-11 w-full rounded-lg border border-slate-200 px-3" value={currentStudent.status || 'active'} onChange={e => setCurrentStudent({...currentStudent, status: e.target.value as any})}>
                       <option value="active">Active</option>
                       <option value="suspended">Suspended</option>
                       <option value="graduated">Graduated</option>
                    </select>
                 </div>
              </div>
              {!currentStudent.id && (
                <Input label="Initial Password" type="password" placeholder="Min 8 characters" value={(currentStudent as any).password || ''} onChange={e => setCurrentStudent({...currentStudent, ...(currentStudent as any), password: e.target.value})} required />
              )}
              <Button type="submit" className="w-full mt-2" disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : 'Save'}</Button>
            </form>
          </div>
        </div>
      )}

      {/* Course Modal */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-900">{currentCourse.id ? 'Edit Course' : 'Add Course'}</h3>
              <button onClick={() => setIsCourseModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveCourse} className="p-6 space-y-4">
              <Input label="Code" value={currentCourse.code || ''} onChange={e => setCurrentCourse({...currentCourse, code: e.target.value})} required />
              <Input label="Title" value={currentCourse.title || ''} onChange={e => setCurrentCourse({...currentCourse, title: e.target.value})} required />
              <div className="grid grid-cols-2 gap-4">
                 <Input label="Units" type="number" value={currentCourse.units || 2} onChange={e => setCurrentCourse({...currentCourse, units: parseInt(e.target.value)})} />
                 <Input label="Level" type="number" value={currentCourse.level || 100} onChange={e => setCurrentCourse({...currentCourse, level: parseInt(e.target.value)})} />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : 'Save'}</Button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};