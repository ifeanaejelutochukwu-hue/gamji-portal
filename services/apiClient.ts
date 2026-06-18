/**
 * Clean, standard REST API Client for Gamji College of Nursing Sciences
 * Connects to a custom Go backend (or falls back to high-fidelity mock data)
 */

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export interface Session {
  token: string;
  user: User;
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

export interface StaffMember {
  id: string;
  auth_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'Admin' | 'Lecturer' | 'Registrar' | 'Bursar' | 'Provost';
  status: 'active' | 'leave';
}

export interface Course {
  id: string;
  code: string;
  title: string;
  units: number;
  level: number;
  semester: string;
  lecturer_id?: string;
  status?: string;
}

export interface Result {
  id: string;
  student_id: string;
  course_id: string;
  ca_score: number;
  exam_score: number;
  total: number;
  grade: string;
  status: 'submitted' | 'draft';
  courses?: {
    code: string;
    title: string;
    units: number;
  };
  students?: {
    full_name: string;
    reg_number: string;
  };
  // Flattened for easy UI access
  course_code?: string;
  course_title?: string;
  score?: number;
  units?: number;
  student_name?: string;
  reg_number?: string;
}

export interface Payment {
  id: string;
  student_id: string;
  amount: number;
  purpose: string;
  status: 'paid' | 'pending' | 'overdue';
  created_at: string;
  reference?: string;
  student_name?: string;
  reg_number?: string;
  students?: {
    full_name: string;
    reg_number: string;
  };
}

export interface AdmissionApplication {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  program: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  avatar_url?: string;
}

// Support configurable Go endpoints
const STORAGE_PREFIX = 'gamji_portal_';

export const getGoBackendConfig = () => {
  const envUrl = import.meta.env.VITE_API_URL;

  if (typeof window === 'undefined') {
    return { enabled: !!envUrl, url: envUrl || 'http://localhost:8080' };
  }

  // If VITE_API_URL is set (production), always use it — no manual toggle needed
  if (envUrl && envUrl !== 'http://localhost:8080') {
    return { enabled: true, url: envUrl };
  }

  // In development, respect the manual localStorage toggle
  const enabled = localStorage.getItem(STORAGE_PREFIX + 'go_enabled') === 'true';
  const url = localStorage.getItem(STORAGE_PREFIX + 'go_url') || envUrl || 'http://localhost:8080';
  return { enabled, url };
};

export const saveGoBackendConfig = (enabled: boolean, url: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_PREFIX + 'go_enabled', enabled ? 'true' : 'false');
  localStorage.setItem(STORAGE_PREFIX + 'go_url', url);
};

// INITIAL MOCK DATA STORAGE
const INITIAL_STUDENTS: StudentProfile[] = [
  {
    id: 'std_1',
    auth_id: 'usr_student',
    full_name: 'Hadiza Bello Shagari',
    reg_number: 'GNS/2024/0042',
    program: 'General Nursing',
    year_of_study: 2,
    level: 200,
    status: 'active',
    email: 'student@gamji.edu.ng'
  }
];

const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'stf_lecturer',
    auth_id: 'usr_lecturer',
    full_name: 'Dr. Ibrahim Abubakar',
    email: 'lecturer@gamji.edu.ng',
    phone: '+234 803 123 4567',
    role: 'Lecturer',
    status: 'active'
  },
  {
    id: 'stf_registrar',
    auth_id: 'usr_registrar',
    full_name: 'Mallam Kabiru Usman',
    email: 'registrar@gamji.edu.ng',
    phone: '+234 806 987 6543',
    role: 'Registrar',
    status: 'active'
  },
  {
    id: 'stf_bursar',
    auth_id: 'usr_bursar',
    full_name: 'Mrs. Aisha Aliyu',
    email: 'bursar@gamji.edu.ng',
    phone: '+234 812 345 6789',
    role: 'Bursar',
    status: 'active'
  },
  {
    id: 'stf_admin',
    auth_id: 'usr_admin',
    full_name: 'Suleiman Bello',
    email: 'admin@gamji.edu.ng',
    phone: '+234 809 111 2222',
    role: 'Admin',
    status: 'active'
  },
  {
    id: 'stf_provost',
    auth_id: 'usr_provost',
    full_name: 'Prof. Aliyu Muhammad Sokoto',
    email: 'provost@gamji.edu.ng',
    phone: '+234 803 000 1111',
    role: 'Provost',
    status: 'active'
  }
];

const INITIAL_COURSES: Course[] = [
  {
    id: 'crs_1',
    code: 'GNS 201',
    title: 'Foundations of Nursing Practice',
    units: 3,
    level: 200,
    semester: '1st',
    lecturer_id: 'stf_lecturer'
  },
  {
    id: 'crs_2',
    code: 'GNS 203',
    title: 'Human Anatomy & Physiology II',
    units: 4,
    level: 200,
    semester: '1st',
    lecturer_id: 'stf_lecturer'
  },
  {
    id: 'crs_3',
    code: 'GNS 205',
    title: 'Pharmacology in Nursing',
    units: 3,
    level: 200,
    semester: '1st',
    lecturer_id: 'stf_lecturer'
  }
];

const INITIAL_RESULTS: Result[] = [
  {
    id: 'res_1',
    student_id: 'std_1',
    course_id: 'crs_1',
    ca_score: 24,
    exam_score: 52,
    total: 76,
    grade: 'A',
    status: 'submitted'
  },
  {
    id: 'res_2',
    student_id: 'std_1',
    course_id: 'crs_2',
    ca_score: 21,
    exam_score: 45,
    total: 66,
    grade: 'B',
    status: 'submitted'
  },
  {
    id: 'res_3',
    student_id: 'std_1',
    course_id: 'crs_3',
    ca_score: 18,
    exam_score: 38,
    total: 56,
    grade: 'C',
    status: 'draft'
  }
];

const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'pay_1',
    student_id: 'std_1',
    amount: 120000,
    purpose: 'Tuition Fees (2024/2025)',
    status: 'paid',
    created_at: '2026-05-15T10:00:00Z'
  },
  {
    id: 'pay_2',
    student_id: 'std_1',
    amount: 25000,
    purpose: 'Accommodation Fee',
    status: 'paid',
    created_at: '2026-05-16T14:30:00Z'
  },
  {
    id: 'pay_3',
    student_id: 'std_1',
    amount: 15000,
    purpose: 'Nursing Laboratory Practical Fee',
    status: 'pending',
    created_at: '2026-06-01T09:15:00Z'
  }
];

const INITIAL_ADMISSIONS: AdmissionApplication[] = [
  {
    id: 'adm_1',
    full_name: 'Mary Amadi',
    email: 'mary.amadi@gmail.com',
    phone: '+234 705 444 3333',
    program: 'General Nursing',
    status: 'pending',
    submitted_at: '2026-06-01T11:00:00Z'
  },
  {
    id: 'adm_2',
    full_name: 'Mustapha Gwadabawa',
    email: 'musty.g@yahoo.com',
    phone: '+234 815 666 7777',
    program: 'Basic Midwifery',
    status: 'approved',
    submitted_at: '2026-05-28T08:22:00Z'
  },
  {
    id: 'adm_3',
    full_name: 'Zainab Isa Aliyu',
    email: 'zainab.isa@outlook.com',
    phone: '+234 902 333 4444',
    program: 'Public Health Nursing',
    status: 'rejected',
    submitted_at: '2026-05-25T15:40:00Z'
  }
];

// Helper functions for mock storage
const getStorageItem = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const val = localStorage.getItem(STORAGE_PREFIX + key);
    return val ? JSON.parse(val) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setStorageItem = <T>(key: string, value: T) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.error(err);
  }
};

class LocalDatabase {
  static get students(): StudentProfile[] { return getStorageItem('students', INITIAL_STUDENTS); }
  static set students(v) { setStorageItem('students', v); }

  static get staff(): StaffMember[] { return getStorageItem('staff', INITIAL_STAFF); }
  static set staff(v) { setStorageItem('staff', v); }

  static get courses(): Course[] { return getStorageItem('courses', INITIAL_COURSES); }
  static set courses(v) { setStorageItem('courses', v); }

  static get results(): Result[] { return getStorageItem('results', INITIAL_RESULTS); }
  static set results(v) { setStorageItem('results', v); }

  static get payments(): Payment[] { return getStorageItem('payments', INITIAL_PAYMENTS); }
  static set payments(v) { setStorageItem('payments', v); }

  static get admissions(): AdmissionApplication[] { return getStorageItem('admissions', INITIAL_ADMISSIONS); }
  static set admissions(v) { setStorageItem('admissions', v); }
}

const authListeners = new Set<(event: string, session: Session | null) => void>();

export const onAuthStateChange = (callback: (event: string, session: Session | null) => void) => {
  authListeners.add(callback);
  const curSession = getStorageItem<Session | null>('session', null);
  setTimeout(() => {
    try {
      callback('INITIAL_SESSION', curSession);
    } catch (e) {
      console.error(e);
    }
  }, 0);
  return {
    unsubscribe() {
      authListeners.delete(callback);
    }
  };
};

const notifyAuthObservers = (event: string, session: Session | null) => {
  authListeners.forEach(listener => {
    try {
      listener(event, session);
    } catch (e) {
      console.error("Auth listener notify error:", e);
    }
  });
};

export const pingGoBackend = async (url: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const host = url.endsWith('/') ? url.slice(0, -1) : url;
    
    // Attempt standard health check endpoint or root endpoint
    const response = await fetch(`${host}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    }).catch(() => fetch(`${host}/`, { method: 'GET', signal: controller.signal }));

    clearTimeout(timeoutId);
    return response.ok;
  } catch (err) {
    console.warn("Backend ping failed:", err);
    return false;
  }
};

/**
 * Standard fetch helper that appends token headers when talking to the Go backend
 */
async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { enabled, url } = getGoBackendConfig();
  if (!enabled) {
    throw new Error("Go backend integration is currently offline or unconfigured.");
  }

  const cleanBase = url.endsWith('/') ? url.slice(0, -1) : url;
  const targetUrl = `${cleanBase}${path.startsWith('/') ? path : '/' + path}`;

  const session = getStorageItem<Session | null>('session', null);
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (session?.token) {
    headers.set('Authorization', `Bearer ${session.token}`);
  }

  const response = await fetch(targetUrl, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown server response');
    throw new Error(errorBody || `HTTP request failed: status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// THE CENTRAL API OBJECT (Mimicking actual HTTP requests)
export const api = {
  // 1. Auth Module
  auth: {
    async login(email: string, password?: string): Promise<Session> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        // Real Go backend fetch
        try {
          const session = await apiRequest<Session>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          });
          setStorageItem('session', session);
          notifyAuthObservers('SIGNED_IN', session);
          return session;
        } catch (err: any) {
          throw new Error(err.message || "Failed to authenticate with Go backend.");
        }
      } else {
        // High fidelity Local Mock Auth
        const normalized = email.toLowerCase().trim();
        const student = LocalDatabase.students.find(s => s.email.toLowerCase() === normalized);
        const staff = LocalDatabase.staff.find(s => s.email.toLowerCase() === normalized);

        let user: User;
        if (student) {
          user = { id: student.auth_id, email: student.email, full_name: student.full_name, role: 'Student' };
        } else if (staff) {
          user = { id: staff.auth_id, email: staff.email, full_name: staff.full_name, role: staff.role };
        } else {
          // Fallback user auto-creation
          const parts = normalized.split('@')[0].split('.');
          const name = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
          user = { id: 'usr_' + Math.random().toString(36).substr(2, 7), email: normalized, full_name: name, role: 'Student' };
        }

        const sessionObj: Session = {
          token: 'mock_token_' + Math.random().toString(36).substr(2, 12),
          user,
        };

        setStorageItem('session', sessionObj);
        notifyAuthObservers('SIGNED_IN', sessionObj);
        return sessionObj;
      }
    },

    async logout(): Promise<void> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        await apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => {});
      }
      setStorageItem('session', null);
      notifyAuthObservers('SIGNED_OUT', null);
    },

    async getSession(): Promise<Session | null> {
      return getStorageItem<Session | null>('session', null);
    }
  },

  // 2. Student Module
  students: {
    async getProfile(authId: string): Promise<StudentProfile> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        return apiRequest<StudentProfile>(`/api/students/profile?auth_id=${authId}`);
      } else {
        const profile = LocalDatabase.students.find(s => s.auth_id === authId);
        if (!profile) throw new Error("Student profile not found.");
        return profile;
      }
    },

    async list(): Promise<StudentProfile[]> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        return apiRequest<StudentProfile[]>('/api/students');
      } else {
        return LocalDatabase.students;
      }
    },

    async create(student: Partial<StudentProfile>): Promise<StudentProfile> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        return apiRequest<StudentProfile>('/api/students', {
          method: 'POST',
          body: JSON.stringify(student),
        });
      } else {
        const list = LocalDatabase.students;
        const newObj: StudentProfile = {
          id: 'std_' + Math.random().toString(36).substr(2, 6),
          auth_id: 'usr_' + Math.random().toString(36).substr(2, 6),
          full_name: student.full_name || 'Unnamed Student',
          reg_number: student.reg_number || 'REG/PENDING',
          program: student.program || 'General Nursing',
          year_of_study: student.year_of_study || 1,
          level: student.level || 100,
          status: student.status || 'active',
          email: student.email || 'student@gamji.edu.ng',
        };
        LocalDatabase.students = [...list, newObj];
        return newObj;
      }
    },

    async update(id: string, updates: Partial<StudentProfile>): Promise<StudentProfile> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        return apiRequest<StudentProfile>(`/api/students/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates),
        });
      } else {
        const list = LocalDatabase.students;
        const index = list.findIndex(s => s.id === id);
        if (index === -1) throw new Error("Student not found");
        const updated = { ...list[index], ...updates };
        list[index] = updated;
        LocalDatabase.students = [...list];
        return updated;
      }
    },

    async delete(id: string): Promise<void> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        return apiRequest<void>(`/api/students/${id}`, { method: 'DELETE' });
      } else {
        LocalDatabase.students = LocalDatabase.students.filter(s => s.id !== id);
      }
    }
  },

  // 3. Staff Module
  staff: {
    async getProfile(authId: string): Promise<StaffMember> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        return apiRequest<StaffMember>(`/api/staff/profile?auth_id=${authId}`);
      } else {
        const profile = LocalDatabase.staff.find(s => s.auth_id === authId);
        if (!profile) throw new Error("Staff profile not found.");
        return profile;
      }
    },

    async list(): Promise<StaffMember[]> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        return apiRequest<StaffMember[]>('/api/staff');
      } else {
        return LocalDatabase.staff;
      }
    },

    async create(member: Partial<StaffMember>): Promise<StaffMember> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        return apiRequest<StaffMember>('/api/staff', {
          method: 'POST',
          body: JSON.stringify(member),
        });
      } else {
        const list = LocalDatabase.staff;
        const newObj: StaffMember = {
          id: 'stf_' + Math.random().toString(36).substr(2, 6),
          auth_id: 'usr_' + Math.random().toString(36).substr(2, 6),
          full_name: member.full_name || 'Staff Member',
          email: member.email || 'staff@gamji.edu.ng',
          phone: member.phone || '',
          role: member.role || 'Lecturer',
          status: member.status || 'active',
        };
        LocalDatabase.staff = [...list, newObj];
        return newObj;
      }
    },

    async update(id: string, updates: Partial<StaffMember>): Promise<StaffMember> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        return apiRequest<StaffMember>(`/api/staff/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates),
        });
      } else {
        const list = LocalDatabase.staff;
        const index = list.findIndex(s => s.id === id);
        if (index === -1) throw new Error("Staff not found");
        const updated = { ...list[index], ...updates };
        list[index] = updated;
        LocalDatabase.staff = [...list];
        return updated;
      }
    },

    async delete(id: string): Promise<void> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        return apiRequest<void>(`/api/staff/${id}`, { method: 'DELETE' });
      } else {
        LocalDatabase.staff = LocalDatabase.staff.filter(s => s.id !== id);
      }
    }
  },

  // 4. Courses Module
  courses: {
    async list(): Promise<Course[]> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        return apiRequest<Course[]>('/api/courses');
      } else {
        return LocalDatabase.courses;
      }
    },

    async listByLecturer(lecturerId: string): Promise<Course[]> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        return apiRequest<Course[]>(`/api/courses?lecturer_id=${lecturerId}`);
      } else {
        return LocalDatabase.courses.filter(c => c.lecturer_id === lecturerId);
      }
    },

    async create(course: Partial<Course>): Promise<Course> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        return apiRequest<Course>('/api/courses', {
          method: 'POST',
          body: JSON.stringify(course),
        });
      } else {
        const list = LocalDatabase.courses;
        const newObj: Course = {
          id: 'crs_' + Math.random().toString(36).substr(2, 6),
          code: course.code || 'UNK 101',
          title: course.title || 'Course Details Pended',
          units: course.units || 3,
          level: course.level || 100,
          semester: course.semester || '1st',
          lecturer_id: course.lecturer_id,
        };
        LocalDatabase.courses = [...list, newObj];
        return newObj;
      }
    },

    async update(id: string, updates: Partial<Course>): Promise<Course> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        return apiRequest<Course>(`/api/courses/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates),
        });
      } else {
        const list = LocalDatabase.courses;
        const index = list.findIndex(c => c.id === id);
        if (index === -1) throw new Error("Course not found");
        const updated = { ...list[index], ...updates };
        list[index] = updated;
        LocalDatabase.courses = [...list];
        return updated;
      }
    },

    async delete(id: string): Promise<void> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        return apiRequest<void>(`/api/courses/${id}`, { method: 'DELETE' });
      } else {
        LocalDatabase.courses = LocalDatabase.courses.filter(c => c.id !== id);
      }
    }
  },

  // 5. Results Module
  results: {
    async listByStudent(studentId: string): Promise<Result[]> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        return apiRequest<Result[]>(`/api/results?student_id=${studentId}`);
      } else {
        const allCourses = LocalDatabase.courses;
        return LocalDatabase.results
          .filter(r => r.student_id === studentId)
          .map(r => {
            const crs = allCourses.find(c => c.id === r.course_id);
            return {
              ...r,
              courses: crs ? { code: crs.code, title: crs.title, units: crs.units } : undefined,
              course_code: crs?.code,
              course_title: crs?.title,
              units: crs?.units,
              score: r.total
            };
          });
      }
    },

    async listByCourse(courseId: string): Promise<Result[]> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        return apiRequest<Result[]>(`/api/results?course_id=${courseId}`);
      } else {
        const students = LocalDatabase.students;
        return LocalDatabase.results
          .filter(r => r.course_id === courseId)
          .map(r => {
            const std = students.find(s => s.id === r.student_id);
            return {
              ...r,
              students: std ? { full_name: std.full_name, reg_number: std.reg_number } : undefined,
              student_name: std?.full_name,
              reg_number: std?.reg_number
            };
          });
      }
    },

    async update(id: string, updates: Partial<Result>): Promise<Result> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        return apiRequest<Result>(`/api/results/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates),
        });
      } else {
        const list = LocalDatabase.results;
        const index = list.findIndex(r => r.id === id);
        if (index === -1) throw new Error("Result record not found");
        const updated = { ...list[index], ...updates };
        list[index] = updated;
        LocalDatabase.results = [...list];
        return updated;
      }
    },

    async saveResult(payload: { id?: string; course_id: string; student_id: string; ca_score: number; exam_score: number; total: number; grade: string; status: 'submitted' | 'draft' }) {
      const config = getGoBackendConfig();
      if (config.enabled) {
        return apiRequest<Result>('/api/results/save', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } else {
        const list = LocalDatabase.results;
        if (payload.id) {
          const index = list.findIndex(r => r.id === payload.id);
          if (index !== -1) {
            const updated = { ...list[index], ...payload };
            list[index] = updated;
            LocalDatabase.results = [...list];
            return updated;
          }
        }
        const created: Result = {
          id: 'res_' + Math.random().toString(36).substr(2, 6),
          ...payload
        };
        LocalDatabase.results = [...list, created];
        return created;
      }
    }
  },

  // 6. Payments Module
  payments: {
    async list(): Promise<Payment[]> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        return apiRequest<Payment[]>('/api/payments');
      } else {
        const students = LocalDatabase.students;
        return LocalDatabase.payments.map(p => {
          const std = students.find(s => s.id === p.student_id);
          return {
            ...p,
            students: std ? { full_name: std.full_name, reg_number: std.reg_number } : undefined,
            student_name: std?.full_name,
            reg_number: std?.reg_number
          };
        });
      }
    },

    async listByStudent(studentId: string): Promise<Payment[]> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        return apiRequest<Payment[]>(`/api/payments?student_id=${studentId}`);
      } else {
        return LocalDatabase.payments.filter(p => p.student_id === studentId);
      }
    },

    async verify(id: string, status: 'paid' | 'pending' | 'overdue'): Promise<Payment> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        return apiRequest<Payment>(`/api/payments/${id}/verify`, {
          method: 'PUT',
          body: JSON.stringify({ status })
        });
      } else {
        const list = LocalDatabase.payments;
        const index = list.findIndex(p => p.id === id);
        if (index === -1) throw new Error("Payment record not found");
        const updated = { ...list[index], status };
        list[index] = updated;
        LocalDatabase.payments = [...list];
        return updated;
      }
    }
  },

  // 7. Admissions Module
  admissions: {
    async list(): Promise<AdmissionApplication[]> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        return apiRequest<AdmissionApplication[]>('/api/admissions');
      } else {
        return LocalDatabase.admissions;
      }
    },

    async updateStatus(id: string, status: 'approved' | 'rejected' | 'pending'): Promise<AdmissionApplication> {
      const config = getGoBackendConfig();
      if (config.enabled) {
        return apiRequest<AdmissionApplication>(`/api/admissions/${id}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status }),
        });
      } else {
        const list = LocalDatabase.admissions;
        const index = list.findIndex(a => a.id === id);
        if (index === -1) throw new Error("Admission application not found");
        const updated = { ...list[index], status };
        list[index] = updated;
        LocalDatabase.admissions = [...list];
        return updated;
      }
    }
  }
};
