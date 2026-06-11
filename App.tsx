import React, { useEffect, useState } from "react";
import { api, onAuthStateChange } from "./services/apiClient";
import type { Session } from "./services/apiClient";

// Components
import { AuthPage } from "./components/AuthPage";
import { StudentDashboard } from "./components/StudentDashboard";
import { LecturerDashboard } from "./components/LecturerDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { RegistrarDashboard } from "./components/RegistrarDashboard";
import { BursarDashboard } from "./components/BursarDashboard";

export type UserRole = 'Student' | 'Lecturer' | 'Registrar' | 'Bursar' | 'Admin' | 'Provost';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Listen for Auth Changes
    const subscription = onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setSession(newSession);
        if (newSession && newSession.user) {
          setRole(newSession.user.role as UserRole);
        } else {
          setRole(null);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = (userRole: UserRole, userId: string) => {
    // Session is updated automatically via subscription onStateChange
  };

  const handleLogout = async () => {
    setLoading(true);
    await api.auth.logout();
    setSession(null);
    setRole(null);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-nursing-50 font-sans text-nursing-600">
        <div className="w-12 h-12 border-4 border-nursing-200 border-t-nursing-600 rounded-full animate-spin mb-4"></div>
        <p className="font-medium animate-pulse">Accessing Secure Portal...</p>
      </div>
    );
  }

  if (!session || !role) {
    return <AuthPage onLogin={handleLogin} />;
  }

  // Routing Logic
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
      return <AdminDashboard session={session} onLogout={handleLogout} role="Admin" />;
    case 'Provost':
      return <AdminDashboard session={session} onLogout={handleLogout} role="Provost" />;
    default:
      return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-800">Unknown Role Detected</h2>
            <p className="text-slate-500 mb-4">Your account role ({role}) is not configured for a dashboard.</p>
            <button onClick={handleLogout} className="text-nursing-600 hover:underline">Sign Out</button>
          </div>
        </div>
      );
  }
}