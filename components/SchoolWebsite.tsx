import React, { useState } from 'react';
import { Logo } from './Logo';
import {
  GraduationCap, BookOpen, Award, Users, Phone, Mail,
  MapPin, ChevronRight, Menu, X, Heart, Activity,
  Shield, Clock, Star
} from 'lucide-react';

interface SchoolWebsiteProps {
  onStudentLogin: () => void;
  onStaffLogin: () => void;
}

export const SchoolWebsite: React.FC<SchoolWebsiteProps> = ({ onStudentLogin, onStaffLogin }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  const scrollTo = (id: string) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Logo />
              <div className="hidden md:flex ml-10 space-x-1">
                {[
                  { id: 'home', label: 'Home' },
                  { id: 'about', label: 'About' },
                  { id: 'programmes', label: 'Programmes' },
                  { id: 'admissions', label: 'Admissions' },
                  { id: 'contact', label: 'Contact' },
                ].map(item => (
                  <button key={item.id} onClick={() => scrollTo(item.id)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeSection === item.id
                        ? 'bg-nursing-50 text-nursing-700'
                        : 'text-slate-600 hover:text-nursing-600 hover:bg-nursing-50'
                    }`}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <button onClick={onStudentLogin}
                className="px-4 py-2 bg-nursing-600 text-white rounded-lg text-sm font-semibold hover:bg-nursing-700 transition-colors shadow-sm">
                Student Portal
              </button>
            </div>
            <div className="flex items-center md:hidden">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-slate-500 hover:text-nursing-600 hover:bg-slate-100">
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 pt-2 pb-4 space-y-1">
            {['home','about','programmes','admissions','contact'].map(id => (
              <button key={id} onClick={() => scrollTo(id)}
                className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-nursing-50 capitalize">
                {id}
              </button>
            ))}
            <button onClick={onStudentLogin}
              className="w-full mt-2 px-4 py-2 bg-nursing-600 text-white rounded-lg text-sm font-semibold">
              Student Portal Login
            </button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section id="home" className="relative bg-nursing-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center opacity-15" />
        <div className="absolute inset-0 bg-gradient-to-br from-nursing-900/80 to-nursing-800/90" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-nursing-100 text-sm font-medium mb-6">
              <Star className="w-4 h-4" /> Accredited by the Nursing and Midwifery Council of Nigeria
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Excellence in Nursing Education & Practice
            </h1>
            <p className="text-nursing-100 text-lg leading-relaxed mb-8 max-w-2xl">
              Gamji College of Nursing Sciences, Sokoto trains compassionate, skilled nursing professionals committed to improving healthcare across Nigeria and beyond.
            </p>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => scrollTo('admissions')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-nursing-700 rounded-lg font-semibold hover:bg-nursing-50 transition-colors shadow-lg">
                Apply for Admission <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={onStudentLogin}
                className="inline-flex items-center gap-2 px-6 py-3 bg-nursing-600 text-white rounded-lg font-semibold border border-nursing-500 hover:bg-nursing-700 transition-colors">
                Student Portal <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        {/* Stats bar */}
        <div className="relative border-t border-white/10 bg-nursing-900/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { value: '20+', label: 'Years of Excellence' },
                { value: '500+', label: 'Graduates' },
                { value: '2', label: 'Programmes' },
                { value: '100%', label: 'NMCN Accredited' },
              ].map((stat, i) => (
                <div key={i}>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-nursing-200 text-sm mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-nursing-600 font-semibold text-sm uppercase tracking-wide mb-3">About Us</p>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Dedicated to Nursing Excellence in North-West Nigeria</h2>
              <p className="text-slate-600 leading-relaxed mb-6">
                Gamji College of Nursing Sciences is a premier institution located in Sokoto, Nigeria. Established with a mission to train world-class nursing professionals, we combine rigorous academic training with extensive practical experience in clinical settings.
              </p>
              <p className="text-slate-600 leading-relaxed mb-8">
                Our programmes are fully accredited by the Nursing and Midwifery Council of Nigeria (NMCN), ensuring our graduates meet the highest professional standards and are qualified to practice anywhere in Nigeria and internationally.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Shield, title: 'NMCN Accredited', desc: 'Fully recognised programmes' },
                  { icon: Users, title: 'Expert Faculty', desc: 'Experienced clinical educators' },
                  { icon: Activity, title: 'Clinical Training', desc: 'Hands-on patient care experience' },
                  { icon: Award, title: 'Proven Results', desc: 'High board exam pass rates' },
                ].map(({ icon: Icon, title, desc }, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                    <div className="p-2 bg-nursing-100 rounded-lg flex-shrink-0">
                      <Icon className="w-4 h-4 text-nursing-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{title}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-nursing-900 rounded-2xl overflow-hidden aspect-[4/3]">
                <img src="https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Nursing students in clinical training" className="w-full h-full object-cover opacity-80" />
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-4 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg"><Heart className="w-5 h-5 text-green-600" /></div>
                  <div>
                    <p className="font-bold text-slate-900">Compassionate Care</p>
                    <p className="text-slate-500 text-xs">Our core value</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Programmes */}
      <section id="programmes" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-nursing-600 font-semibold text-sm uppercase tracking-wide mb-3">Our Programmes</p>
            <h2 className="text-3xl font-bold text-slate-900">Academic Programmes Offered</h2>
            <p className="text-slate-500 mt-3 max-w-2xl mx-auto">Both programmes are fully accredited by the Nursing and Midwifery Council of Nigeria (NMCN)</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              {
                title: 'General Nursing',
                code: 'RN',
                duration: '3 Years',
                description: 'The General Nursing programme prepares students for comprehensive patient care across all healthcare settings. Graduates are qualified as Registered Nurses (RN) and equipped to work in hospitals, clinics, and community health centres.',
                highlights: ['Medical-Surgical Nursing', 'Paediatric Nursing', 'Maternal & Child Health', 'Community Health', 'Mental Health Nursing', 'Clinical Practicals'],
                color: 'nursing',
              },
              {
                title: 'Basic Midwifery',
                code: 'RM',
                duration: '2 Years',
                description: 'The Basic Midwifery programme specialises in maternal and newborn care. Graduates are qualified as Registered Midwives (RM) and play a critical role in reducing maternal and infant mortality in Nigeria.',
                highlights: ['Antenatal Care', 'Labour & Delivery', 'Postnatal Care', 'Newborn Care', 'Family Planning', 'Emergency Obstetrics'],
                color: 'blue',
              },
            ].map((prog, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className={`h-2 bg-${prog.color === 'nursing' ? 'nursing-600' : 'blue-600'}`} />
                <div className="p-8">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{prog.title}</h3>
                      <p className="text-slate-500 text-sm">{prog.code} · {prog.duration}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${prog.color === 'nursing' ? 'bg-nursing-100' : 'bg-blue-100'}`}>
                      <GraduationCap className={`w-6 h-6 ${prog.color === 'nursing' ? 'text-nursing-600' : 'text-blue-600'}`} />
                    </div>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">{prog.description}</p>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Course Highlights</p>
                    <div className="grid grid-cols-2 gap-2">
                      {prog.highlights.map((h, j) => (
                        <div key={j} className="flex items-center gap-1.5 text-xs text-slate-600">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${prog.color === 'nursing' ? 'bg-nursing-500' : 'bg-blue-500'}`} />
                          {h}
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => scrollTo('admissions')}
                    className={`mt-6 w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      prog.color === 'nursing'
                        ? 'bg-nursing-600 text-white hover:bg-nursing-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}>
                    Apply Now <ChevronRight className="inline w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Admissions */}
      <section id="admissions" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-nursing-600 font-semibold text-sm uppercase tracking-wide mb-3">Admissions</p>
            <h2 className="text-3xl font-bold text-slate-900">How to Apply</h2>
            <p className="text-slate-500 mt-3">Admissions are open — applications reviewed on a rolling basis</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              { step: '01', title: 'Create Account', desc: 'Register on the student portal with your name, email and chosen programme.', icon: Users },
              { step: '02', title: 'Submit Application', desc: 'Your application is automatically registered and assigned a registration number.', icon: BookOpen },
              { step: '03', title: 'Await Notification', desc: 'The Registrar reviews your application and activates your account upon approval.', icon: Clock },
            ].map(({ step, title, desc, icon: Icon }, i) => (
              <div key={i} className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-12 h-12 bg-nursing-600 text-white rounded-xl flex items-center justify-center text-lg font-bold mx-auto mb-4">{step}</div>
                <div className="p-3 bg-nursing-100 rounded-xl w-fit mx-auto mb-3"><Icon className="w-5 h-5 text-nursing-600" /></div>
                <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <div className="inline-flex flex-col sm:flex-row gap-4">
              <button onClick={onStudentLogin}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-nursing-600 text-white rounded-xl font-semibold text-lg hover:bg-nursing-700 transition-colors shadow-lg shadow-nursing-600/25">
                <GraduationCap className="w-5 h-5" /> Apply / Student Login
              </button>
              <button onClick={() => scrollTo('contact')}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-nursing-700 rounded-xl font-semibold text-lg border-2 border-nursing-200 hover:border-nursing-400 transition-colors">
                Contact Admissions Office
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 bg-nursing-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-nursing-300 font-semibold text-sm uppercase tracking-wide mb-3">Get In Touch</p>
            <h2 className="text-3xl font-bold">Contact Us</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              { icon: MapPin, title: 'Address', lines: ['Gamji College of Nursing Sciences', 'Sokoto, Sokoto State', 'Nigeria'] },
              { icon: Phone, title: 'Phone', lines: ['+234 800 000 0000', '+234 803 000 1111', 'Mon–Fri, 8am–5pm'] },
              { icon: Mail, title: 'Email', lines: ['info@gamji.edu.ng', 'admissions@gamji.edu.ng', 'registrar@gamji.edu.ng'] },
            ].map(({ icon: Icon, title, lines }, i) => (
              <div key={i} className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10">
                <div className="p-3 bg-white/20 rounded-xl w-fit mx-auto mb-4"><Icon className="w-6 h-6" /></div>
                <h3 className="font-bold text-lg mb-3">{title}</h3>
                {lines.map((line, j) => <p key={j} className="text-nursing-200 text-sm">{line}</p>)}
              </div>
            ))}
          </div>
          {/* Hidden staff login */}
          <div className="text-center">
            <p className="text-nursing-400 text-xs">
              Are you a member of staff?{' '}
              <button onClick={onStaffLogin} className="text-nursing-300 hover:text-white underline transition-colors text-xs">
                Staff login
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-nursing-950 bg-nursing-900 border-t border-nursing-800 py-8 text-center">
        <div className="max-w-7xl mx-auto px-4">
          <Logo variant="light" />
          <p className="text-nursing-400 text-sm mt-3">
            &copy; {new Date().getFullYear()} Gamji College of Nursing Sciences, Sokoto. All rights reserved.
          </p>
          <p className="text-nursing-500 text-xs mt-1">Accredited by the Nursing and Midwifery Council of Nigeria (NMCN)</p>
        </div>
      </footer>
    </div>
  );
};
