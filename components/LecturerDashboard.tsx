import React, { useState, useEffect } from 'react';
import type { Session } from '../services/apiClient';
import { api } from '../services/apiClient';
import { Navbar } from './Navbar';
import { 
  BookOpen, 
  Users, 
  FileText, 
  UploadCloud, 
  Loader2
} from 'lucide-react';
import { Button } from './Button';

interface LecturerDashboardProps {
  session: Session;
  onLogout: () => void;
}

type TabId = 'courses' | 'upload' | 'students' | 'reports';

interface Course {
  id: string;
  code: string;
  title: string;
  level: number;
  status: 'active' | 'completed';
}

interface StudentResult {
  id: string;
  student_name: string;
  reg_number: string;
  ca_score: number;
  exam_score: number;
  total: number;
  grade: string;
  status: 'submitted' | 'draft';
  course_id?: string;
}

export const LecturerDashboard: React.FC<LecturerDashboardProps> = ({ session, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabId>('courses');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [lecturerName, setLecturerName] = useState("Lecturer");

  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ca: number, exam: number}>({ ca: 0, exam: 0 });
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const staff = await api.staff.getProfile(session.user.id);

        if (staff) {
          setLecturerName(staff.full_name);
          const courseData = await api.courses.listByLecturer(staff.id);
          if (courseData && courseData.length > 0) {
             setCourses(courseData.map((c: any) => ({ ...c, status: 'active' })));
          } else {
             setCourses([]); 
          }
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [session]);

  useEffect(() => {
     const currentCourseId = selectedCourseId || courses[0]?.id;
     if (!currentCourseId) return;

     const fetchResults = async () => {
        try {
          const data = await api.results.listByCourse(currentCourseId);
          if (data) {
            setResults(data.map((item: any) => ({
               id: item.id,
               student_name: item.student_name || item.students?.full_name || 'Unknown',
               reg_number: item.reg_number || item.students?.reg_number || 'N/A',
               ca_score: item.ca_score,
               exam_score: item.exam_score,
               total: item.total,
               grade: item.grade,
               status: item.status,
               course_id: currentCourseId
            })));
          } else {
            setResults([]);
          }
        } catch (err) {
          console.error(err);
          setResults([]);
        }
     };
     fetchResults();
  }, [selectedCourseId, courses]);

  const handleSaveResult = async (id: string) => {
    setSavingId(id);
    const total = editValues.ca + editValues.exam;
    const grade = total >= 70 ? 'A' : total >= 60 ? 'B' : total >= 50 ? 'C' : total >= 45 ? 'D' : 'F';

    try {
        await api.results.update(id, {
          ca_score: editValues.ca, exam_score: editValues.exam, total, grade, status: 'submitted'
        });
        
        setResults(prev => prev.map(r => r.id === id ? { ...r, ca_score: editValues.ca, exam_score: editValues.exam, total, grade, status: 'submitted' } : r));
        setIsEditing(null);
     } catch (e) { alert("Failed to save result."); } finally { setSavingId(null); }
  };

  const SidebarItem = ({ id, icon: Icon, label }: { id: TabId, icon: React.ElementType, label: string }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-200 border-r-2 ${activeTab === id ? 'bg-nursing-50 text-nursing-700 border-nursing-600' : 'text-slate-600 hover:bg-slate-50 hover:text-nursing-600 border-transparent'}`}
    >
      <Icon className={`w-5 h-5 ${activeTab === id ? 'text-nursing-600' : 'text-slate-400'}`} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar userEmail={session.user.email || 'lecturer@gamji.edu.ng'} userRole="Lecturer" userName={lecturerName} onLogout={onLogout} />
      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        <div className={`w-64 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-shrink-0 h-fit hidden md:block`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50/50"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lecturer Menu</p></div>
          <nav className="flex flex-col py-2">
            <SidebarItem id="courses" icon={BookOpen} label="My Courses" />
            <SidebarItem id="upload" icon={UploadCloud} label="Upload Results" />
            <SidebarItem id="students" icon={Users} label="View Students" />
            <SidebarItem id="reports" icon={FileText} label="Reports" />
          </nav>
        </div>
        <div className="flex-1 space-y-6">
           <div className="flex justify-between items-center">
             <div><h1 className="text-2xl font-bold text-slate-900 capitalize">{activeTab === 'upload' ? 'Upload & Manage Results' : activeTab.replace('-', ' ')}</h1><p className="text-slate-500 text-sm">Gamji College of Nursing Sciences, Sokoto</p></div>
          </div>
          {loading && activeTab === 'courses' ? (<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-nursing-600" /></div>) : (
            <>
              {activeTab === 'courses' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
                  {courses.length > 0 ? courses.map((course) => (
                    <div key={course.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all group relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-1 h-full ${course.status === 'active' ? 'bg-nursing-500' : 'bg-slate-300'}`}></div>
                      <div className="flex justify-between items-start mb-4"><div className="p-2 rounded-lg bg-nursing-50 text-nursing-600"><BookOpen className="w-6 h-6" /></div></div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">{course.code}</h3>
                      <p className="text-slate-600 text-sm mb-4 h-10">{course.title}</p>
                      <div className="mt-4 pt-2"><Button variant="outline" className="w-full text-xs h-9" onClick={() => { setSelectedCourseId(course.id); setActiveTab('upload'); }}>Manage Results</Button></div>
                    </div>
                  )) : (
                     <div className="col-span-full p-12 text-center bg-white rounded-xl border border-dashed border-slate-200">
                        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-slate-900">No courses assigned</h3>
                     </div>
                  )}
                </div>
              )}
              {activeTab === 'upload' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <select className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer" value={selectedCourseId || ''} onChange={(e) => setSelectedCourseId(e.target.value)}>
                        {courses.length > 0 ? courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.title}</option>) : <option>No active courses</option>}
                    </select>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-xs"><tr><th className="px-6 py-3">Student</th><th className="px-6 py-3 text-center">CA (30)</th><th className="px-6 py-3 text-center">Exam (70)</th><th className="px-6 py-3 text-center">Total</th><th className="px-6 py-3 text-center">Grade</th><th className="px-6 py-3 text-right">Action</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {results.length > 0 ? results.map((result) => (
                          <tr key={result.id} className={`hover:bg-slate-50 transition-colors ${isEditing === result.id ? 'bg-blue-50/50' : ''}`}>
                            <td className="px-6 py-4"><div className="font-semibold text-slate-900">{result.student_name}</div><div className="text-xs text-slate-500">{result.reg_number}</div></td>
                            <td className="px-6 py-4 text-center">{isEditing === result.id ? (<input type="number" max="30" min="0" className="w-16 text-center border rounded p-1" value={editValues.ca} onChange={(e) => setEditValues({...editValues, ca: parseInt(e.target.value) || 0})} />) : result.ca_score}</td>
                            <td className="px-6 py-4 text-center">{isEditing === result.id ? (<input type="number" max="70" min="0" className="w-16 text-center border rounded p-1" value={editValues.exam} onChange={(e) => setEditValues({...editValues, exam: parseInt(e.target.value) || 0})} />) : result.exam_score}</td>
                            <td className="px-6 py-4 text-center font-bold">{isEditing === result.id ? (editValues.ca + editValues.exam) : result.total}</td>
                            <td className="px-6 py-4 text-center"><span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${result.grade === 'A' ? 'bg-green-100 text-green-700' : 'bg-slate-100'}`}>{isEditing === result.id ? '-' : result.grade}</span></td>
                            <td className="px-6 py-4 text-right">
                              {isEditing === result.id ? (<div className="flex justify-end gap-2"><Button onClick={() => handleSaveResult(result.id)} className="h-8 px-3 text-xs" disabled={savingId === result.id}>Save</Button></div>) : (<button onClick={() => { setIsEditing(result.id); setEditValues({ ca: result.ca_score, exam: result.exam_score }); }} className="text-nursing-600 text-xs font-medium px-2 py-1 hover:bg-nursing-50 rounded">Edit</button>)}
                            </td>
                          </tr>
                        )) : (<tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No students found.</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {activeTab === 'students' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
                    <div className="divide-y divide-slate-100">
                      {results.map((student, idx) => (
                          <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50">
                            <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-nursing-100 flex items-center justify-center text-nursing-700 font-bold">{student.student_name.charAt(0)}</div><div><p className="font-semibold text-slate-900">{student.student_name}</p></div></div>
                          </div>
                      ))}
                      {results.length === 0 && <div className="p-6 text-center text-slate-500">No students to display.</div>}
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