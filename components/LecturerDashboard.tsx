import React, { useState, useEffect } from 'react';
import type { Session } from '../services/apiClient';
import { api } from '../services/apiClient';
import { Navbar } from './Navbar';
import { BookOpen, UploadCloud, Loader2, User } from 'lucide-react';
import { Button } from './Button';

interface LecturerDashboardProps { session: Session; onLogout: () => void; }
type TabId = 'overview' | 'courses' | 'results' | 'profile';

interface Course { id: string; code: string; title: string; level: number; units?: number; semester?: string; status?: string; }
interface StudentResult {
  id: string; student_name: string; reg_number: string;
  ca_score: number; exam_score: number; total: number;
  grade: string; status: 'submitted' | 'draft'; course_id?: string;
}

export const LecturerDashboard: React.FC<LecturerDashboardProps> = ({ session, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [lecturerName, setLecturerName] = useState('Lecturer');
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ ca: 0, exam: 0 });
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const staff = await api.staff.getProfile(session.user.id);
        if (staff) {
          setLecturerName(staff.full_name);
          const courseData = await api.courses.listByLecturer(staff.id);
          setCourses((courseData || []).map((c: any) => ({ ...c, status: 'active' })));
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [session]);

  useEffect(() => {
    const courseId = selectedCourseId || courses[0]?.id;
    if (!courseId) return;
    api.results.listByCourse(courseId).then(data => {
      setResults((data || []).map((item: any) => ({
        id: item.id,
        student_name: item.student_name || item.students?.full_name || 'Unknown',
        reg_number: item.reg_number || item.students?.reg_number || 'N/A',
        ca_score: item.ca_score, exam_score: item.exam_score,
        total: item.total, grade: item.grade, status: item.status, course_id: courseId,
      })));
    }).catch(() => setResults([]));
  }, [selectedCourseId, courses]);

  const handleSaveResult = async (id: string) => {
    setSavingId(id);
    const total = editValues.ca + editValues.exam;
    const grade = total >= 70 ? 'A' : total >= 60 ? 'B' : total >= 50 ? 'C' : total >= 45 ? 'D' : 'F';
    try {
      await api.results.update(id, { ca_score: editValues.ca, exam_score: editValues.exam, total, grade, status: 'submitted' });
      setResults(prev => prev.map(r => r.id === id ? { ...r, ca_score: editValues.ca, exam_score: editValues.exam, total, grade, status: 'submitted' } : r));
      setIsEditing(null);
    } catch { alert('Failed to save result.'); }
    finally { setSavingId(null); }
  };

  const gradeColor = (g: string) => {
    if (g === 'A') return 'bg-green-100 text-green-700';
    if (g === 'B') return 'bg-blue-100 text-blue-700';
    if (g === 'C') return 'bg-yellow-100 text-yellow-700';
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        userEmail={session.user.email || 'lecturer@gamji.edu.ng'}
        userRole="Lecturer"
        userName={lecturerName}
        onLogout={onLogout}
        activeTab={activeTab}
        onTabChange={t => setActiveTab(t as TabId)}
      />

      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        {/* Sidebar */}
        <aside className="w-64 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-shrink-0 h-fit hidden md:block">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lecturer Menu</p>
            <p className="text-sm font-semibold text-slate-700 mt-0.5">{lecturerName}</p>
          </div>
          <nav className="flex flex-col py-2">
            {([
              { id: 'overview', label: 'Overview', icon: BookOpen },
              { id: 'courses', label: 'My Courses', icon: BookOpen },
              { id: 'results', label: 'Results', icon: UploadCloud },
              { id: 'profile', label: 'My Profile', icon: User },
            ] as { id: TabId; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-r-2 ${
                  activeTab === id ? 'bg-nursing-50 text-nursing-700 border-nursing-600' : 'text-slate-600 hover:bg-slate-50 hover:text-nursing-600 border-transparent'
                }`}>
                <Icon className={`w-5 h-5 ${activeTab === id ? 'text-nursing-600' : 'text-slate-400'}`} />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1 space-y-6 min-w-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 capitalize">
              {activeTab === 'results' ? 'Results Management' : activeTab}
            </h1>
            <p className="text-slate-500 text-sm">Gamji College of Nursing Sciences, Sokoto</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-nursing-600" /></div>
          ) : (
            <>
              {/* OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                      <p className="text-sm text-slate-500">My Courses</p>
                      <p className="text-2xl font-bold text-nursing-600 mt-1">{courses.length}</p>
                    </div>
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                      <p className="text-sm text-slate-500">Students (current course)</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1">{results.length}</p>
                    </div>
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                      <p className="text-sm text-slate-500">Results Submitted</p>
                      <p className="text-2xl font-bold text-green-600 mt-1">{results.filter(r => r.status === 'submitted').length}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                    <h3 className="font-bold text-slate-900 mb-4">Assigned Courses</h3>
                    {courses.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-6">No courses assigned yet. Contact Admin.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {courses.map(c => (
                          <div key={c.id} className="p-4 border border-slate-100 rounded-xl hover:border-nursing-200 transition-colors">
                            <p className="font-bold text-nursing-700">{c.code}</p>
                            <p className="text-sm text-slate-600 mt-0.5">{c.title}</p>
                            <Button variant="outline" className="mt-3 text-xs h-8 w-full"
                              onClick={() => { setSelectedCourseId(c.id); setActiveTab('results'); }}>
                              Manage Results
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* COURSES */}
              {activeTab === 'courses' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {courses.length > 0 ? courses.map(course => (
                    <div key={course.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-nursing-500" />
                      <div className="p-2 rounded-lg bg-nursing-50 text-nursing-600 w-fit mb-3">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">{course.code}</h3>
                      <p className="text-slate-600 text-sm mt-1 mb-2">{course.title}</p>
                      <p className="text-xs text-slate-400 mb-4">
                        {course.level}L · {course.semester || '1st'} Semester · {course.units || 0} units
                      </p>
                      <Button variant="outline" className="w-full text-xs h-9"
                        onClick={() => { setSelectedCourseId(course.id); setActiveTab('results'); }}>
                        Manage Results
                      </Button>
                    </div>
                  )) : (
                    <div className="col-span-full p-12 text-center bg-white rounded-xl border border-dashed border-slate-200">
                      <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-slate-900">No courses assigned</h3>
                      <p className="text-slate-500 text-sm mt-1">Contact the Admin to assign courses to your account.</p>
                    </div>
                  )}
                </div>
              )}

              {/* RESULTS */}
              {activeTab === 'results' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <select
                      className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer"
                      value={selectedCourseId || ''}
                      onChange={e => setSelectedCourseId(e.target.value)}
                    >
                      {courses.length > 0
                        ? courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)
                        : <option>No courses assigned</option>
                      }
                    </select>
                    <span className="text-xs text-slate-400">
                      {results.filter(r => r.status === 'submitted').length}/{results.length} submitted
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                        <tr>
                          <th className="px-6 py-3">Student</th>
                          <th className="px-6 py-3 text-center">CA /30</th>
                          <th className="px-6 py-3 text-center">Exam /70</th>
                          <th className="px-6 py-3 text-center">Total</th>
                          <th className="px-6 py-3 text-center">Grade</th>
                          <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {results.length > 0 ? results.map(result => (
                          <tr key={result.id} className={`hover:bg-slate-50 ${isEditing === result.id ? 'bg-blue-50/50' : ''}`}>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-900">{result.student_name}</div>
                              <div className="text-xs text-slate-500">{result.reg_number}</div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {isEditing === result.id
                                ? <input type="number" max="30" min="0" className="w-16 text-center border rounded p-1"
                                    value={editValues.ca} onChange={e => setEditValues({ ...editValues, ca: parseInt(e.target.value) || 0 })} />
                                : result.ca_score}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {isEditing === result.id
                                ? <input type="number" max="70" min="0" className="w-16 text-center border rounded p-1"
                                    value={editValues.exam} onChange={e => setEditValues({ ...editValues, exam: parseInt(e.target.value) || 0 })} />
                                : result.exam_score}
                            </td>
                            <td className="px-6 py-4 text-center font-bold">
                              {isEditing === result.id ? editValues.ca + editValues.exam : result.total}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${gradeColor(isEditing === result.id ? '' : result.grade)}`}>
                                {isEditing === result.id ? '—' : result.grade}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {isEditing === result.id ? (
                                <Button onClick={() => handleSaveResult(result.id)} className="h-8 px-3 text-xs" disabled={savingId === result.id}>
                                  Save
                                </Button>
                              ) : (
                                <button
                                  onClick={() => { setIsEditing(result.id); setEditValues({ ca: result.ca_score, exam: result.exam_score }); }}
                                  className="text-nursing-600 text-xs font-medium px-2 py-1 hover:bg-nursing-50 rounded"
                                >
                                  Edit
                                </button>
                              )}
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No students found for this course.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* PROFILE */}
              {activeTab === 'profile' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden max-w-lg">
                  <div className="p-5 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><User className="w-5 h-5" /> My Profile</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                      <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-2xl font-bold text-purple-700">
                        {lecturerName.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">{lecturerName}</h2>
                        <p className="text-slate-500 text-sm">{session.user.email}</p>
                        <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">LECTURER</span>
                      </div>
                    </div>
                    {[
                      { label: 'Full Name', value: lecturerName },
                      { label: 'Email', value: session.user.email },
                      { label: 'Role', value: 'Lecturer' },
                      { label: 'Courses Assigned', value: String(courses.length) },
                    ].map((f, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{f.label}</p>
                        <p className="font-semibold text-slate-800 mt-0.5">{f.value}</p>
                      </div>
                    ))}
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
