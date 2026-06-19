import React, { useState } from 'react';
import { Logo } from './Logo';
import { Button } from './Button';
import {
  Home, BookOpen, FileBarChart, CreditCard, User,
  LogOut, Menu, X
} from 'lucide-react';

export type UserRole = 'Student' | 'Lecturer' | 'Registrar' | 'Bursar' | 'Admin' | 'Provost';

interface NavbarProps {
  userEmail: string;
  userRole?: string;
  userName?: string;
  onLogout: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

interface NavItem {
  label: string;
  tab: string;
  icon: React.FC<{ className?: string }>;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home',     tab: 'overview',  icon: Home,        roles: ['Student', 'Lecturer', 'Registrar', 'Bursar', 'Admin', 'Provost'] },
  { label: 'Courses',  tab: 'courses',   icon: BookOpen,    roles: ['Student', 'Lecturer', 'Registrar'] },
  { label: 'Results',  tab: 'results',   icon: FileBarChart, roles: ['Student', 'Lecturer', 'Registrar'] },
  { label: 'Payments', tab: 'payments',  icon: CreditCard,  roles: ['Student', 'Bursar'] },
  { label: 'Profile',  tab: 'profile',   icon: User,        roles: ['Student', 'Lecturer', 'Registrar', 'Bursar', 'Admin', 'Provost'] },
];

const getRoleBadgeColor = (r: string) => {
  switch (r) {
    case 'Admin':     return 'bg-red-100 text-red-700';
    case 'Provost':   return 'bg-slate-200 text-slate-700';
    case 'Lecturer':  return 'bg-purple-100 text-purple-700';
    case 'Bursar':    return 'bg-amber-100 text-amber-700';
    case 'Registrar': return 'bg-blue-100 text-blue-700';
    default:          return 'bg-nursing-100 text-nursing-700';
  }
};

export const Navbar: React.FC<NavbarProps> = ({
  userEmail, userRole = 'Student', userName, onLogout, activeTab, onTabChange
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const filteredItems = NAV_ITEMS.filter(item => item.roles.includes(userRole));

  const handleTabClick = (tab: string) => {
    if (onTabChange) onTabChange(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Logo />
            {/* Desktop nav */}
            <div className="hidden md:ml-8 md:flex md:items-center md:space-x-1">
              {filteredItems.map(item => (
                <button
                  key={item.tab}
                  onClick={() => handleTabClick(item.tab)}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === item.tab
                      ? 'bg-nursing-50 text-nursing-700 font-semibold'
                      : 'text-slate-600 hover:text-nursing-600 hover:bg-nursing-50'
                  }`}
                >
                  <item.icon className="w-4 h-4 mr-1.5" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-slate-900">{userName || userEmail.split('@')[0]}</span>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getRoleBadgeColor(userRole)}`}>{userRole}</span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <Button variant="ghost" onClick={onLogout} className="text-slate-500 hover:text-red-600 hover:bg-red-50">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-slate-500 hover:text-nursing-600 hover:bg-slate-100">
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-50 border-t border-slate-200">
          <div className="space-y-1 px-2 pt-2 pb-3">
            {filteredItems.map(item => (
              <button key={item.tab} onClick={() => handleTabClick(item.tab)}
                className={`w-full flex items-center px-3 py-3 rounded-md text-base font-medium transition-colors ${
                  activeTab === item.tab
                    ? 'bg-nursing-50 text-nursing-700'
                    : 'text-slate-700 hover:text-nursing-700 hover:bg-white'
                }`}>
                <item.icon className="w-5 h-5 mr-3 text-slate-500" />
                {item.label}
              </button>
            ))}
          </div>
          <div className="border-t border-slate-200 px-4 py-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-nursing-100 flex items-center justify-center text-nursing-700 font-bold">
                {(userName || userEmail)[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{userName || userEmail.split('@')[0]}</p>
                <p className="text-xs text-slate-500">{userEmail}</p>
              </div>
            </div>
            <Button variant="outline" onClick={onLogout} className="w-full justify-start text-red-600 hover:bg-red-50 border-red-100">
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};
