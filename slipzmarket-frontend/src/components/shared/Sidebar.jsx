import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../utils/api';
import { 
  Home, Users, ShoppingCart, History, User, 
  LogOut, LogIn, ChevronLeft, ChevronRight, 
  ChevronDown, ShieldAlert, FileSpreadsheet
} from 'lucide-react';
import { getLocalCart } from '../../utils/sessionCart';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [openMenus, setOpenMenus] = useState({ browse: false, admin: false });
  const [cartCount, setCartCount] = useState(0);
  
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

  // --- CART SYNC LOGIC ---
  const fetchCartCount = useCallback(async () => {
    if (isAuthenticated) {
      try {
        const res = await axios.get(`${API_URL}/cart`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const items = res.data.items || res.data.data?.items || [];
        // Count total items
        setCartCount(items.length || 0);
      } catch {
        // Fallback to local cart if backend fails
        const localCart = getLocalCart();
        setCartCount(localCart.length);
      }
    } else {
      // Not logged in - show local cart count
      const localCart = getLocalCart();
      setCartCount(localCart.length);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    // Load cart count on mount
    let isMounted = true;
    
    const init = async () => {
      if (isMounted) {
        await fetchCartCount();
      }
    };
    
    init();

    // Listen for local storage changes (local cart updates)
    const handleStorageChange = (e) => {
      if (e.key === 'slipz_local_cart' || !e.key) {
        fetchCartCount();
      }
    };
    
    // Listen for custom cart update events
    const handleCartUpdate = () => {
      fetchCartCount();
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      isMounted = false;
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchCartCount]);

  // --- AUTH ACTIONS ---
  const handleAuthAction = () => {
    if (isAuthenticated) {
      localStorage.removeItem('slipz_token');
      navigate('/auth'); 
    } else {
      navigate('/auth');
    }
  };

  // --- NAVIGATION ARRAY ---
  let navItems = isAuthenticated ? [
    { name: 'Dashboard', path: '/dashboard', icon: <Home size={20} /> },
    { 
      name: 'Browse Leads', 
      id: 'browse',path: '/browse?category=Email Leads',
      icon: <Users size={20} />, 
      subItems: [
        { name: 'Email Leads', path: '/browse?category=Email Leads' },
        { name: 'Direct Dial Phone', path: '/browse?category=Phone Leads' },
        { name: 'Custom ICP', path: '/browse?category=All Leads' }
      ]
    },
    { name: 'Datasets', path: '/datasets', icon: <FileSpreadsheet size={20} /> },
    { name: 'My Cart', path: '/cart', icon: <ShoppingCart size={20} />, badge: cartCount },
    { name: 'Order History', path: '/history', icon: <History size={20} /> },
    { name: 'Account Info', path: '/account', icon: <User size={20} /> },
  ] : [
    { name: 'Home', path: '/', icon: <Home size={20} /> },
    { 
      name: 'Browse Leads', 
      id: 'browse',
      path: '/browse',
      icon: <Users size={20} />, 
      subItems: [
        { name: 'Email Leads', path: '/browse' },
        { name: 'Direct Dial Phone', path: '/browse' },
      ]
    },
    { name: 'My Cart', path: '/cart', icon: <ShoppingCart size={20} />, badge: cartCount },
  ];

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

  const getRoute = (path) => {
    if (!path) return '';
    const [pathname, query = ''] = path.split('?');
    return `${pathname}${query ? `?${query}` : ''}`;
  };

  const handleMenuClick = (item) => {
    if (item.subItems) {
      if (item.path) navigate(item.path);
      if (isCollapsed) setIsCollapsed(false);
      setOpenMenus(prev => ({ ...prev, [item.id]: !prev[item.id] }));
    } else {
      navigate(item.path);
    }
  };

  return (
    <aside className={`relative bg-app text-primary flex flex-col h-full py-6 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] border-r border-theme z-40 ${isCollapsed ? 'w-22' : 'w-64'}`}>
      
      {/* Toggle button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-8 bg-surface text-muted rounded-full p-1 shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-theme hover:bg-accent hover:text-surface transition-all duration-200 z-50 flex items-center justify-center hover:scale-110"
      >
        {isCollapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 px-4 mt-6 overflow-y-auto custom-scrollbar overflow-x-hidden">
        {navItems.map((item) => {
          const hasSubItems = !!item.subItems;
          const isMenuOpen = openMenus[item.id];
          const currentRoute = `${location.pathname}${location.search}`;
          const isActive = currentRoute === getRoute(item.path) || 
            (hasSubItems && item.subItems.some(sub => currentRoute === getRoute(sub.path)));
          
          const isAdminMenu = item.id === 'admin';

          return (
            <div key={item.name} className="relative flex flex-col">
              <div 
                onClick={() => handleMenuClick(item)}
                className={`relative flex items-center gap-3 cursor-pointer rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-surface shadow-sm border border-theme text-primary' 
                    : isAdminMenu 
                      ? 'text-muted hover:bg-surface/50 hover:text-primary border border-transparent'
                      : 'text-muted hover:bg-surface/60 hover:text-primary border border-transparent'
                } ${isCollapsed ? 'justify-center p-3.5' : 'px-4 py-3.5'} ${isAdminMenu && !isCollapsed ? 'mt-4 border-t border-theme pt-4' : ''}`}
              >
                {/* Active Indicator Line (When Expanded) */}
                {isActive && !isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-accent rounded-r-full" />
                )}

                <div className={`shrink-0 transition-transform duration-200 ${isActive ? 'text-accent scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </div>

                {!isCollapsed && (
                  <div className="flex flex-1 items-center justify-between overflow-hidden">
                    <span className="font-bold text-[14px] whitespace-nowrap truncate">{item.name}</span>
                    {hasSubItems && <ChevronDown size={16} className={`text-muted transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} />}
                  </div>
                )}

                {/* --- CART BADGE --- */}
                {item.badge !== undefined && item.badge > 0 && (
                  <div className={`absolute flex items-center justify-center bg-accent text-white font-black rounded-full border-2 border-app transition-all duration-300 shadow-sm ${
                    isCollapsed 
                      ? 'top-1.5 right-1.5 w-4.5 h-4.5 text-[9px]' 
                      : 'right-3 top-1/2 -translate-y-1/2 h-5 min-w-5 px-1.5 text-[10px]'
                  }`}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </div>
                )}
              </div>

              {/* Sub-items with Smooth Accordion Animation */}
              <div 
                className={`grid transition-all duration-300 ease-in-out ${hasSubItems && isMenuOpen && !isCollapsed ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0'}`}
              >
                <div className="overflow-hidden">
                  <div className="flex flex-col ml-5 pl-4 border-l-2 border-theme/60 space-y-1 py-1">
                    {hasSubItems && item.subItems.map((sub) => {
                      const isSubActive = currentRoute === getRoute(sub.path);
                      return (
                        <button
                          key={sub.name}
                          onClick={() => navigate(sub.path)}
                          className={`text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 hover:translate-x-1 ${
                            isSubActive 
                              ? 'text-primary font-bold bg-surface border border-theme shadow-sm' 
                              : 'text-muted hover:text-primary hover:bg-surface/50'
                          }`}
                        >
                          {sub.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="pt-4 border-t border-theme px-4 mt-auto flex flex-col gap-2">
        <div 
          onClick={handleAuthAction}
          className={`flex items-center gap-3 cursor-pointer rounded-xl text-muted hover:bg-surface hover:text-red-600 hover:shadow-sm border border-transparent transition-all duration-200 group ${isCollapsed ? 'justify-center p-3.5' : 'px-4 py-3.5'}`}
        >
          <div className="shrink-0 group-hover:scale-110 transition-transform duration-200">
            {isAuthenticated ? <LogOut size={20} /> : <LogIn size={20} />}
          </div>
          {!isCollapsed && <span className="font-bold text-[14px]">{isAuthenticated ? 'Sign Out' : 'Log In'}</span>}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;