import React, { useEffect, useState } from "react";
import { api, onAuthStateChange } from "./services/apiClient";
import type { Session } from "./services/apiClient";

import { SchoolWebsite } from "./components/SchoolWebsite";
import { AuthPage } from "./components/AuthPage";
import { StudentDashboard } from "./components/StudentDashboard";
import { LecturerDashboard } from "./components/LecturerDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { ProvostDashboard } from "./components/ProvostDashboard";
import { RegistrarDashboard } from "./components/RegistrarDashboard";
import { BursarDashboard } from "./components/BursarDashboard";

export type UserRole = 'Student' | 'Lecturer' | 'Registrar' | 'Bursar' | 'Admin' | 'Provost';

// Which screen to show
type Screen = 'website' | 'student-auth' | 'staff-auth' | 'dashboard';

// Staff roles that use the staff login path
const STAFF_ROLES: UserRole[] = ['Lecturer', 'Registrar', 'Bursar', 'Admin', 'Provost'];

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>('website');

  useEffect(() => {
    // Check for existing session
    const subscription = onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        const userRole = newSession.user.role as UserRole;
        setRole(userRole);
        setScreen('dashboard');
      } else {
        setRole(null);
        // Don't reset to website if user explicitly navigated to auth
        setLoading(prev => {
          if (prev) return false; // first load
          return false;
        });
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    await api.auth.logout();
    setSession(null);
    setRole(null);
    setScreen('website');
    setLoading(false);
  };

  const handleLogin = (_userRole: UserRole, _userId: string) => {
    // Session updated via subscription
    setScreen('dashboard');
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-nursing-50 font-sans text-nursing-600">
        <div className="w-12 h-12 border-4 border-nursing-200 border-t-nursing-600 rounded-full animate-spin mb-4" />
        <p className="font-medium animate-pulse">Loading...</p>
      </div>
    );
  }

  // Show dashboard if logged in
  if (session && role && screen === 'dashboard') {
    switch (role) {
      case 'Student':
        return <StudentDashboard session={session} onLogout={handleLogout} />;
      case 'Lecturer':
        return <LecturerDashboard session={session} onLogout={handleLogout} />;
      case 'Registrar':
        return <RegistrarDashboard session={session} onLogout={handleLogout} />;
      case 'Bursar':
        return <BursarDashboard session={session} onLogout={handleLogout} />;
      case 'Admin':
        return <AdminDashboard session={session} onLogout={handleLogout} />;
      case 'Provost':
        return <ProvostDashboard session={session} onLogout={handleLogout} />;
      default:
        return (
          <div className="flex h-screen items-center justify-center bg-slate-50">
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-800">Unknown Role</h2>
              <p className="text-slate-500 mb-4">Your account role ({role}) is not configured.</p>
              <button onClick={handleLogout} className="text-nursing-600 hover:underline">Sign Out</button>
            </div>
          </div>
        );
    }
  }

  // Show auth pages
  if (screen === 'student-auth' || screen === 'staff-auth') {
    return (
      <AuthPage
        onLogin={handleLogin}
        mode={screen === 'staff-auth' ? 'staff' : 'student'}
        onBack={() => setScreen('website')}
      />
    );
  }

  // Show school website (default)
  return (
    <SchoolWebsite
      onStudentLogin={() => setScreen('student-auth')}
      onStaffLogin={() => setScreen('staff-auth')}
    />
  );
}
