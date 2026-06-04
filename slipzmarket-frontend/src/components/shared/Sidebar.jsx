import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, Users, ShoppingCart, History, User, 
  LogOut, LogIn, ChevronLeft, ChevronRight, 
  ChevronDown, ShieldAlert, FileSpreadsheet
} from 'lucide-react';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [openMenus, setOpenMenus] = useState({ browse: false, admin: false });
  
  const navigate = useNavigate();
  const location = useLocation();

  const token = typeof window !== 'undefined' ? localStorage.getItem('slipz_token') : null;
  let isAuthenticated = false;
  let isAdmin = false;

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      isAuthenticated = true;
      isAdmin = payload.role === 'ADMIN';
    } catch {
      console.error('Invalid token format');
    }
  }

  // --- UPGRADE: Real Sign Out Logic ---
  const handleAuthAction = () => {
    if (isAuthenticated) {
      localStorage.removeItem('slipz_token'); // Destroy session
      navigate('/auth'); // Kick them out to login page
    } else {
      navigate('/auth');
    }
  };

  let navItems = isAuthenticated ? [
    { name: 'Dashboard', path: '/dashboard', icon: <Home size={20} /> },
{ 
      name: 'Browse Leads', 
      id: 'browse',
      icon: <Users size={20} />, 
      subItems: [
        { name: 'Email Leads', path: '/browse?category=Email Leads' },
        { name: 'Direct Dial Phone', path: '/browse?category=Phone Leads' },
        { name: 'Custom ICP', path: '/browse?category=All Leads' }
      ]
    },
    { name: 'Datasets', path: '/datasets', icon: <FileSpreadsheet size={20} /> },
    { name: 'My Cart', path: '/cart', icon: <ShoppingCart size={20} /> },
    { name: 'Order History', path: '/history', icon: <History size={20} /> },
    { name: 'Account Info', path: '/account', icon: <User size={20} /> },
  ] : [
    { name: 'Home', path: '/', icon: <Home size={20} /> },
    { 
      name: 'Browse Leads', 
      id: 'browse',
      icon: <Users size={20} />, 
      subItems: [
        { name: 'Email Leads', path: '/browse' },
        { name: 'Direct Dial Phone', path: '/browse' },
      ]
    },
  ];

  // Inject Admin Navigation ONLY if the JWT confirms they are an Admin
  if (isAuthenticated && isAdmin) {
    navItems.push({
      name: 'Admin Panel',
      id: 'admin',
      icon: <ShieldAlert size={20} />,
      subItems: [
        { name: 'Overview', path: '/admin' },
        { name: 'Manage Packages', path: '/packages' },
        { name: 'Manage Invoices', path: '/invoices' },
        { name: 'Support', path: '/support' },
        { name: 'Global Settings', path: '/settings' },
        { name: 'Site Customization', path: '/customization' },
      ]
    });
  }

  const handleMenuClick = (item) => {
    if (item.subItems) {
      if (isCollapsed) setIsCollapsed(false);
      setOpenMenus(prev => ({ ...prev, [item.id]: !prev[item.id] }));
    } else {
      navigate(item.path);
    }
  };

  return (
    <aside className={`relative bg-app text-primary flex flex-col h-full py-6 transition-all duration-300 ease-in-out border-r border-theme z-40 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      
      {/* Toggle button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-6 bg-surface text-muted rounded-full p-1.5 shadow-md border border-theme hover:bg-accent hover:text-surface transition-all z-50"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 px-3 mt-4 overflow-y-auto custom-scrollbar overflow-x-hidden">
        {navItems.map((item) => {
          const hasSubItems = !!item.subItems;
          const isMenuOpen = openMenus[item.id];
          const isActive = location.pathname === item.path || 
            (hasSubItems && item.subItems.some(sub => location.pathname === sub.path));
          
          const isAdminMenu = item.id === 'admin';

          return (
            <div key={item.name} className="relative group flex flex-col">
              <div 
                onClick={() => handleMenuClick(item)}
                className={`flex items-center gap-3 cursor-pointer rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-accent text-surface shadow-md' 
                    : isAdminMenu 
                      ? 'text-muted hover:bg-surface hover:text-primary border border-transparent'
                      : 'text-muted hover:bg-surface hover:text-primary'
                } ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3'} ${isAdminMenu && !isCollapsed ? 'mt-4 border-t border-theme pt-3' : ''}`}
              >
                <div className="shrink-0">{item.icon}</div>
                {!isCollapsed && (
                  <div className="flex flex-1 items-center justify-between">
                    <span className="font-bold text-[14px]">{item.name}</span>
                    {hasSubItems && <ChevronDown size={16} className={`transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />}
                  </div>
                )}
              </div>

              {/* Sub-items */}
                {hasSubItems && isMenuOpen && !isCollapsed && (
                <div className="flex flex-col mt-1 ml-4 pl-4 border-l-2 border-theme space-y-1">
                  {item.subItems.map((sub) => (
                    <button
                      key={sub.name}
                      onClick={() => navigate(sub.path)}
                      className={`text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                        location.pathname === sub.path 
                          ? 'text-primary font-bold bg-surface border border-theme' 
                          : 'text-muted hover:text-primary hover:bg-surface'
                      }`}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="pt-4 border-t border-theme px-3 mt-auto flex flex-col gap-2">
        
        {/* Real Authentication Toggle */}
        <div 
          onClick={handleAuthAction}
          className={`flex items-center gap-3 cursor-pointer rounded-xl text-muted hover:bg-surface hover:text-primary transition-all ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3'}`}
        >
          {isAuthenticated ? <LogOut size={20} /> : <LogIn size={20} />}
          {!isCollapsed && <span className="font-bold text-[14px]">{isAuthenticated ? 'Sign Out' : 'Log In'}</span>}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;