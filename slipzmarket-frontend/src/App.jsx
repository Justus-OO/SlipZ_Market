import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';

import BrowseCards from './pages/BrowseCards';
import Cart from './pages/Cart';
import Wallet from './pages/Wallet';
import OrderHistory from './pages/OrderHistory';
import Account from './pages/Account';
import AdminDashboard from './pages/AdminDashboard';
import GlobalSettings from './pages/GlobalSettings';
import ManagePackages from './pages/ManagePackages';
import ManageInvoices from './pages/ManageInvoices';
import Home from './pages/Home';
import Auth from './pages/Auth';
import MyDatasets from './pages/MyDatasets';
import { AdminSupport } from './pages/Chat/AdminSupport';
import SiteCustomization from './pages/SiteCustomization';

function App() {
  return (
    <Router>
      <Routes>
        {/* PUBLIC ROUTE: Standalone without MainLayout (No Sidebar/Header) */}
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        
        {/* PROTECTED / APP ROUTES: Wrapped securely in MainLayout */}
        <Route
          path="/*"
          element={
            <MainLayout>
              <Routes>
                {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/settings" element={<GlobalSettings />} />
                <Route path="/packages" element={<ManagePackages />} />
                <Route path="/invoices" element={<ManageInvoices />} />
                <Route path="/customization" element={<SiteCustomization />} />
                <Route path="/support" element={<AdminSupport />} />
                <Route path="/datasets" element={<MyDatasets />} />



                {/* Marketplace Routes */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/browse" element={<BrowseCards />} />
                
                {/* User Routes */}
                <Route path="/cart" element={<Cart />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/history" element={<OrderHistory />} />
                <Route path="/account" element={<Account />} />
              </Routes>
            </MainLayout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;