import React, { useState } from 'react';
import { Logo } from './Logo';
import { Button } from './Button';
import { 
  Home, 
  BookOpen, 
  FileBarChart, 
  CreditCard, 
  User, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck 
} from 'lucide-react';

export type UserRole = 'Student' | 'Lecturer' | 'Registrar' | 'Bursar' | 'Admin';

interface NavbarProps {
  userEmail: string;
  userRole?: string;
  userName?: string;
  onLogout: () => void;
}

interface NavItem {
  label: string;
  icon: React.FC<{ className?: string }>;
  href: string;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { 
    label: 'Home', 
    icon: Home, 
    href: '#', 
    roles: ['Student', 'Lecturer', 'Registrar', 'Bursar', 'Admin'] 
  },
  { 
    label: 'Courses', 
    icon: BookOpen, 
    href: '#courses', 
    roles: ['Student', 'Lecturer', 'Registrar'] 
  },
  { 
    label: 'Results', 
    icon: FileBarChart, 
    href: '#results', 
    roles: ['Student', 'Lecturer', 'Registrar'] 
  },
  { 
    label: 'Payments', 
    icon: CreditCard, 
    href: '#payments', 
    roles: ['Student', 'Bursar'] 
  },
  { 
    label: 'Profile', 
    icon: User, 
    href: '#profile', 
    roles: ['Student', 'Lecturer', 'Registrar', 'Bursar', 'Admin'] 
  },
];

export const Navbar: React.FC<NavbarProps> = ({ 
  userEmail, 
  userRole = 'Student', 
  userName, 
  onLogout 
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Cast userRole to UserRole to match the type, assuming valid input or fallback
  const role = (userRole || 'Student') as UserRole;

  const filteredNavItems = NAV_ITEMS.filter(item => item.roles.includes(role));

  const getRoleBadgeColor = (r: string) => {
    switch (r) {
      case 'Admin': return 'bg-red-100 text-red-700';
      case 'Lecturer': return 'bg-purple-100 text-purple-700';
      case 'Bursar': return 'bg-amber-100 text-amber-700';
      case 'Registrar': return 'bg-blue-100 text-blue-700';
      default: return 'bg-nursing-100 text-nursing-700';
    }
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left Side: Logo */}
          <div className="flex items-center">
            <Logo />
            {/* Desktop Navigation */}
            <div className="hidden md:ml-10 md:flex md:space-x-4">
              {filteredNavItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-600 hover:text-nursing-600 hover:bg-nursing-50 rounded-md transition-colors"
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          {/* Right Side: User Info & Logout */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex flex-col items-end">
               <span className="text-sm font-semibold text-slate-900">
                 {userName || userEmail.split('@')[0]}
               </span>
               <div className="flex items-center gap-1">
                 <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getRoleBadgeColor(role)}`}>
                   {role}
                 </span>
               </div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <Button variant="ghost" onClick={onLogout} className="text-slate-500 hover:text-red-600 hover:bg-red-50">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-500 hover:text-nursing-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-nursing-500"
            >
              {isMobileMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-50 border-t border-slate-200">
          <div className="space-y-1 px-2 pt-2 pb-3">
            {filteredNavItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center px-3 py-3 rounded-md text-base font-medium text-slate-700 hover:text-nursing-700 hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm"
              >
                <item.icon className="w-5 h-5 mr-3 text-slate-500" />
                {item.label}
              </a>
            ))}
          </div>
          <div className="border-t border-slate-200 pt-4 pb-4">
            <div className="flex items-center px-5">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-nursing-100 flex items-center justify-center text-nursing-700 font-bold">
                  {(userName || userEmail)[0].toUpperCase()}
                </div>
              </div>
              <div className="ml-3">
                <div className="text-base font-medium leading-none text-slate-800">
                  {userName || userEmail.split('@')[0]}
                </div>
                <div className="text-sm font-medium leading-none text-slate-500 mt-1">
                  {userEmail}
                </div>
                <div className={`mt-2 inline-flex text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getRoleBadgeColor(role)}`}>
                   {role}
                 </div>
              </div>
            </div>
            <div className="mt-3 px-2">
              <Button 
                variant="outline" 
                onClick={onLogout} 
                className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 border-red-100"
              >
                <LogOut className="mr-3 h-5 w-5" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};