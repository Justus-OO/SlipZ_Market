import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, Database, ShieldCheck, Zap, 
  Asterisk, Search, Mail, BarChart3, Users,
  CheckCircle2, Building2, LayoutDashboard
} from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); // <-- Added state for search

  // Check if the user is already logged in when they hit the landing page
  useEffect(() => {
    const token = localStorage.getItem('slipz_token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  // CTA for Authentication/Dashboard
  const handleAuthCTA = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  // CTA for Public Browsing
  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Pass the query as a URL parameter so the browse page can read it
      navigate(`/browse?query=${encodeURIComponent(searchQuery)}`);
    } else {
      // Just go to the default browse page if input is empty
      navigate('/browse');
    }
  };

  return (
    <div className="min-h-screen bg-app font-sans selection:bg-accent selection:text-surface flex flex-col overflow-y-auto custom-scrollbar">
      
      {/* --- PUBLIC NAVBAR --- */}
      <nav className="w-full px-6 lg:px-10 py-4 flex items-center justify-between border-b border-theme bg-app/90 backdrop-blur-md sticky top-0 z-50 transition-all">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <Asterisk size={20} strokeWidth={3} className="text-muted" />
          <span className="text-[18px] sm:text-xl font-bold text-primary tracking-tight">
            SlipZMarket
          </span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          <button onClick={() => navigate('/browse')} className="text-[14px] font-bold text-primary hover:text-muted transition-colors flex items-center gap-1">
            Platform <ChevronDownIcon />
          </button>
          <button className="text-[14px] font-bold text-primary hover:text-muted transition-colors">
            Pricing
          </button>
          <button className="text-[14px] font-bold text-primary hover:text-muted transition-colors">
            Resources
          </button>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <button 
              onClick={handleAuthCTA}
              className="bg-accent hover:bg-accent px-5 py-2.5 rounded-lg text-surface font-bold shadow-md transition-all flex items-center gap-2"
            >
              <LayoutDashboard size={14} /> Go to Dashboard
            </button>
          ) : (
            <>
              <button 
                onClick={() => navigate('/auth')}
                className="hidden sm:block text-[14px] font-bold text-primary hover:text-muted transition-colors"
              >
                Log In
              </button>
              <button 
                onClick={() => navigate('/auth')}
                className="bg-accent hover:bg-accent px-5 py-2.5 rounded-lg text-surface font-bold shadow-md transition-all flex items-center gap-2"
              >
                Sign Up for Free <ArrowRight size={14} />
              </button>
            </>
          )}
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <main className="flex-1 flex flex-col items-center text-center px-6 pt-20 pb-16 lg:pt-28 lg:pb-24 max-w-[1200px] mx-auto w-full animate-fade-in-up">
        
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-theme text-muted text-[12px] font-bold shadow-sm mb-8 hover:border-accent transition-colors cursor-pointer">
          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider">New</span>
          Introducing Advanced Intent Data Signals <ArrowRight size={12} />
        </div>
        
        <h1 className="text-2xl md:text-4xl lg:text-[48px] font-black text-primary tracking-tight leading-[1.05] mb-6 max-w-4xl">
          Find, contact, and close your ideal buyers.
        </h1>
        
        <p className="text-[15px] md:text-[18px] text-muted font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
          Access a living database of over 275M+ contacts and 73M+ companies. Build highly targeted lists and engage them directly.
        </p>

        {/* --- INTERACTIVE SEARCH INPUT --- */}
        <div className="w-full max-w-3xl bg-surface p-2 rounded-2xl border border-theme shadow-xl flex flex-col sm:flex-row items-center gap-2 mb-8 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all">
          <div className="flex-1 flex items-center gap-3 px-4 w-full h-12 sm:h-auto">
            <Search size={20} className="text-muted shrink-0" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="E.g., VP of Sales at Software companies in the US..." 
              className="w-full text-[15px] text-primary font-medium outline-none placeholder:text-muted bg-transparent"
            />
          </div>
          <button 
            onClick={handleSearch}
            className="w-full sm:w-auto bg-accent hover:bg-accent text-surface px-8 py-3.5 rounded-xl text-[15px] font-bold shadow-sm transition-colors shrink-0 flex items-center justify-center gap-2"
          >
            <Search size={16} /> Browse Publicly
          </button>
        </div>

        <p className="text-[13px] font-medium text-muted flex items-center justify-center gap-6 flex-wrap">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-500" /> Free 14-day trial</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-500" /> No credit card required</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-500" /> Cancel anytime</span>
        </p>

        {/* --- SOCIAL PROOF --- */}
        <div className="mt-20 pt-10 border-t border-theme w-full flex flex-col items-center gap-6">
          <p className="text-[13px] font-bold text-muted uppercase tracking-widest">Trusted by over 500,000 revenue professionals</p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="flex items-center gap-2 text-xl font-black tracking-tighter text-primary"><Building2 size={20}/> AcmeCorp</div>
            <div className="flex items-center gap-2 text-xl font-black tracking-tighter text-primary"><Zap size={20}/> GlobalTech</div>
            <div className="flex items-center gap-2 text-xl font-black tracking-tighter text-primary"><ShieldCheck size={20}/> NexusHealth</div>
            <div className="flex items-center gap-2 text-xl font-black tracking-tighter text-primary"><Database size={20}/> Stark Ind.</div>
          </div>
        </div>
      </main>

      {/* --- STATISTICS / METRICS SECTION --- */}
      <section className="bg-primary py-16 px-6">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-theme/20">
          <div className="flex flex-col items-center text-center pt-8 md:pt-0">
            <h3 className="text-2xl font-black text-surface mb-2 tracking-tight">275M+</h3>
            <p className="text-[15px] font-medium text-muted">Verified global contacts</p>
          </div>
          <div className="flex flex-col items-center text-center pt-8 md:pt-0">
            <h3 className="text-2xl font-black text-surface mb-2 tracking-tight">73M+</h3>
            <p className="text-[15px] font-medium text-muted">Company profiles</p>
          </div>
          <div className="flex flex-col items-center text-center pt-8 md:pt-0">
            <h3 className="text-2xl font-black text-surface mb-2 tracking-tight">98%</h3>
            <p className="text-[15px] font-medium text-muted">Email deliverability guarantee</p>
          </div>
        </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section className="bg-surface py-24 px-6 relative">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-black text-primary tracking-tight mb-4">The only platform you need to power your go-to-market.</h2>
            <p className="text-[16px] text-muted font-medium">Replace your fragmented tech stack. SlipZMarket gives you the data, engagement tools, and analytics to scale revenue fast.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface border border-theme rounded-3xl p-8 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-surface border border-theme rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <Users size={20} className="text-muted" />
              </div>
              <h3 className="text-[20px] font-bold text-primary mb-3 tracking-tight">Find exactly who to target</h3>
              <p className="text-[15px] text-muted font-medium leading-relaxed mb-6">
                Use 65+ data attributes to filter by industry, funding, technology used, and job titles to build the ultimate ICP list.
              </p>
              {/* --- ROUTED TO PUBLIC BROWSE --- */}
              <button onClick={() => navigate('/browse')} className="text-[14px] font-bold text-accent hover:text-accent-hover flex items-center gap-1 transition-colors">
                Explore B2B Data <ArrowRight size={16} />
              </button>
            </div>

            <div className="bg-surface border border-theme rounded-3xl p-8 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-surface border border-theme rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <Mail size={20} className="text-muted" />
              </div>
              <h3 className="text-[20px] font-bold text-primary mb-3 tracking-tight">Engage at scale</h3>
              <p className="text-[15px] text-muted font-medium leading-relaxed mb-6">
                Automate your outreach with multi-channel sequences. Send highly personalized emails and dial directly from the platform.
              </p>
              <button onClick={() => navigate('/browse')} className="text-[14px] font-bold text-accent hover:text-accent-hover flex items-center gap-1 transition-colors">
                View Engagement Tools <ArrowRight size={16} />
              </button>
            </div>

            <div className="bg-surface border border-theme rounded-3xl p-8 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-surface border border-theme rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <BarChart3 size={20} className="text-muted" />
              </div>
              <h3 className="text-[20px] font-bold text-primary mb-3 tracking-tight">Close more deals</h3>
              <p className="text-[15px] text-muted font-medium leading-relaxed mb-6">
                Track open rates, meeting conversions, and team performance. Sync everything bi-directionally with Salesforce or HubSpot.
              </p>
              <button onClick={() => navigate('/browse')} className="text-[14px] font-bold text-accent hover:text-accent-hover flex items-center gap-1 transition-colors">
                Discover Analytics <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* --- BOTTOM CTA --- */}
      <section className="bg-accent py-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-surface/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-primary/20 rounded-full blur-3xl"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-2xl md:text-4xl font-black text-surface tracking-tight mb-6">Ready to hit your revenue goals?</h2>
          <p className="text-[16px] md:text-[18px] text-surface font-medium mb-10">
            Join the hundreds of thousands of companies using SlipZMarket to fuel their growth. Set up takes less than 2 minutes.
          </p>
          <button 
            onClick={handleAuthCTA}
            className="bg-surface hover:bg-surface-soft text-accent px-10 py-4 rounded-xl text-[16px] font-bold shadow-xl transition-all flex items-center gap-2 mx-auto"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Sign up for free'} <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-primary py-12 px-6 mt-auto">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Asterisk size={24} strokeWidth={2.5} className="text-surface" />
            <span className="text-[16px] font-bold text-surface tracking-tight">
              SlipZMarket
            </span>
          </div>
          <div className="flex items-center gap-6 text-[13px] font-bold text-muted">
            <span className="hover:text-surface cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-surface cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-surface cursor-pointer transition-colors">Contact Support</span>
          </div>
          <p className="text-[12px] text-muted font-medium">
            &copy; {new Date().getFullYear()} SlipZMarket. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
};

// Quick helper component for the navbar arrow
const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

export default Home;