import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../utils/api';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import {
  Asterisk,
  Bell,
  CheckCircle2,
  ChevronDown,
  Languages,
  Layers,
  Loader2,
  LogOut,
  PlusCircle,
  Settings,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

// --- STRIPE IMPORTS ---
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe outside of the component to avoid recreating the object on every render
// Make sure you have VITE_STRIPE_PUBLISHABLE_KEY in your .env file
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

const MOCK_NOTIFICATIONS = [
  { id: 1, title: 'Export Complete', text: "Your list 'Q3 Founders' is ready for download.", time: '2m ago', unread: true },
  { id: 2, title: 'Low Balance', text: 'Your workspace balance is below £50.00.', time: '1h ago', unread: true },
];

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English (UK)' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
];

const readAdminStateFromToken = () => {
  const token = localStorage.getItem('slipz_token');

  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role === 'ADMIN';
  } catch {
    return false;
  }
};

// --- NEW SUB-COMPONENT FOR STRIPE FORM ---
// This must be a separate component so it can access useStripe() from the <Elements> provider
const StripeDepositForm = ({ setIsFundsModalOpen, setUserProfile }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleDeposit = async (event) => {
    event.preventDefault();
    if (!depositAmount || Number.isNaN(Number(depositAmount))) return;
    if (!stripe || !elements) return;

    setIsDepositing(true);
    setErrorMessage('');

    try {
      const token = localStorage.getItem('slipz_token');
      
      // 1. Hit your backend to create a Stripe PaymentIntent
      const intentResponse = await axios.post(
        `${API_URL}/payments/create-intent`, 
        { amount: Number(depositAmount) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const clientSecret = intentResponse.data.clientSecret;

      // 2. Confirm the payment securely with Stripe
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        }
      });

if (result.error) {
        setErrorMessage(result.error.message);
      } else if (result.paymentIntent.status === 'succeeded') {
        
        // 👉 MAKE SURE IT CALLS /payments/finalize-deposit
        const response = await axios.post(
          `${API_URL}/payments/finalize-deposit`,
          { amount: depositAmount, paymentIntentId: result.paymentIntent.id },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setUserProfile((previous) => ({ ...previous, balance: parseFloat(response.data.newBalance) }));
        alert(`Successfully added £${depositAmount} to workspace!`);
        setIsFundsModalOpen(false);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(error.response?.data?.error || 'Failed to process deposit.');
    } finally {
      setIsDepositing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#2a1b1b', // Maps to your primary text color
        '::placeholder': { color: '#a09393' }, // Maps to your muted text color
      },
      invalid: { color: '#dc2626' },
    },
  };

  return (
    <form onSubmit={handleDeposit} className="p-6">
      <p className="mb-5 text-[13px] text-primary opacity-80">
        Top up your workspace balance to purchase datasets instantly. Funds are applied immediately via your secure payment method.
      </p>

      <div className="mb-4 flex flex-col gap-2">
        <label className="text-[12px] font-bold uppercase tracking-widest text-muted">Deposit Amount (£)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-primary">£</span>
          <input
            type="number"
            min="10"
            step="10"
            required
            autoFocus
            value={depositAmount}
            onChange={(event) => setDepositAmount(event.target.value)}
            placeholder="100.00"
            className="w-full rounded-xl border border-theme bg-surface py-3 pl-8 pr-4 text-[16px] font-bold text-primary outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-2">
        <label className="text-[12px] font-bold uppercase tracking-widest text-muted">Card Details</label>
        <div className="w-full rounded-xl border border-theme bg-surface py-4 px-4 shadow-sm">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-[13px] text-red-600 border border-red-200">
          {errorMessage}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setIsFundsModalOpen(false)} className="flex-1 rounded-xl border border-theme bg-surface px-4 py-3 text-[14px] font-bold text-primary shadow-sm transition-colors hover:bg-app">
          Cancel
        </button>
        <button type="submit" disabled={!stripe || isDepositing} className="flex flex-2 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-[14px] font-bold text-surface shadow-sm transition-colors hover:bg-accent disabled:opacity-70">
          {isDepositing && <Loader2 size={16} className="animate-spin" />} 
          {isDepositing ? 'Processing...' : `Deposit Funds`}
        </button>
      </div>
    </form>
  );
};
// ----------------------------------------------


const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem('slipz_token')));
  const [isAdmin, setIsAdmin] = useState(() => readAdminStateFromToken());
  const [userProfile, setUserProfile] = useState({
    name: 'Loading...',
    email: '',
    balance: 0,
    organization: 'Loading...',
    avatarColor: '#8b6f5a',
  });
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isFundsModalOpen, setIsFundsModalOpen] = useState(false);

  const currentLanguageLabel = LANGUAGE_OPTIONS.find((language) => language.code === i18n.resolvedLanguage)?.label || LANGUAGE_OPTIONS[0].label;

  const closeDropdowns = useCallback(() => {
    setActiveDropdown(null);
  }, []);

  const handleSignOut = useCallback(() => {
    closeDropdowns();
    localStorage.removeItem('slipz_token');
    localStorage.removeItem('slipz_user');
    setIsAuthenticated(false);
    setIsAdmin(false);
    navigate('/auth');
  }, [closeDropdowns, navigate]);

  useEffect(() => {
    const token = localStorage.getItem('slipz_token');

    if (!token) {
      return;
    }

    try {
      JSON.parse(atob(token.split('.')[1]));
    } catch {
      localStorage.removeItem('slipz_token');
      localStorage.removeItem('slipz_user');
      navigate('/auth');
      return;
    }

    const fetchHeaderData = async () => {
      try {
        const profileRes = await axios.get(`${API_URL}/account/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const workspaceRes = await axios.get(`${API_URL}/workspace`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUserProfile({
          name: `${profileRes.data.data.firstName} ${profileRes.data.data.lastName}`,
          email: profileRes.data.data.email,
          balance: parseFloat(workspaceRes.data.data.balance),
          organization: workspaceRes.data.data.organization,
          avatarColor: '#8b6f5a',
        });
      } catch (error) {
        console.error('Failed to load header data:', error);
        if (error.response?.status === 401) handleSignOut();
      }
    };

    fetchHeaderData();
  }, [handleSignOut, location.pathname, navigate]);

  const toggleDropdown = (name) => {
    setActiveDropdown((current) => (current === name ? null : name));
  };

  const handleLanguageChange = async (languageCode) => {
    await i18n.changeLanguage(languageCode);
    closeDropdowns();
  };

  return (
    <>
      {activeDropdown && <div className="fixed inset-0 z-40" onClick={closeDropdowns} />}

      <header className="relative z-50 flex h-18 w-full items-center justify-between border-b-0 bg-surface px-6 transition-colors lg:px-10">
        <div className="flex shrink-0 items-center gap-4">
          <button type="button" className="flex items-center gap-2" onClick={() => navigate(isAdmin ? '/admin' : '/dashboard')}>
            <Asterisk size={36} strokeWidth={2.5} className="text-muted" />
            <span className="hidden text-2xl font-bold tracking-tight text-primary sm:block">SlipZMarket</span>
          </button>

          {isAuthenticated && isAdmin && (
            <div className="hidden items-center gap-2 rounded-lg border border-theme bg-accent px-3 py-1.5 shadow-sm md:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{t('adminActive')}</span>
            </div>
          )}
        </div>

        {isAuthenticated && (
          <div className="ml-auto flex items-center gap-3 sm:gap-5">
            <div className="hidden items-center gap-3 lg:flex">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => toggleDropdown('language')}
                className={`flex items-center gap-1.5 transition-colors ${activeDropdown === 'language' ? 'text-muted' : 'text-primary hover:text-muted'}`}
              >
                <Languages size={18} />
                <span className="text-[14px] font-medium">{currentLanguageLabel}</span>
                <ChevronDown size={14} className={`transition-transform ${activeDropdown === 'language' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'language' && (
                <div className="absolute right-0 top-full mt-4 w-40 overflow-hidden rounded-xl border border-theme bg-surface shadow-lg animate-fade-in-up">
                  {LANGUAGE_OPTIONS.map((language) => (
                    <button
                      key={language.code}
                      type="button"
                      onClick={() => handleLanguageChange(language.code)}
                      className={`w-full px-4 py-2.5 text-left text-[13px] font-medium transition-colors ${i18n.resolvedLanguage === language.code ? 'bg-app text-primary' : 'text-primary hover:bg-app hover:text-muted'}`}
                    >
                      {language.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative z-50 hidden lg:flex">
              <button
                type="button"
                onClick={() => toggleDropdown('notifications')}
                className={`relative transition-colors ${activeDropdown === 'notifications' ? 'text-muted' : 'text-primary hover:text-muted'}`}
              >
                <Bell size={20} />
                <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent" />
              </button>

              {activeDropdown === 'notifications' && (
                <div className="absolute -right-5 top-full mt-4 flex w-80 flex-col overflow-hidden rounded-xl border border-theme bg-surface shadow-lg animate-fade-in-up">
                  <div className="flex items-center justify-between border-b border-theme bg-app px-4 py-3">
                    <span className="text-[14px] font-bold text-primary">{t('notifications')}</span>
                    <button type="button" className="text-[11px] font-bold text-muted hover:underline">
                      {t('markAllRead')}
                    </button>
                  </div>
                  <div className="max-h-75 overflow-y-auto">
                    {MOCK_NOTIFICATIONS.map((notification) => (
                      <div
                        key={notification.id}
                        className={`cursor-pointer border-b border-theme p-4 transition-colors hover:bg-app ${notification.unread ? 'bg-surface' : 'opacity-70'}`}
                      >
                        <div className="mb-1 flex items-start justify-between">
                          <h4 className="flex items-center gap-1.5 text-[13px] font-bold text-primary">
                            {notification.unread && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                            {notification.title}
                          </h4>
                          <span className="text-[11px] font-medium text-muted">{notification.time}</span>
                        </div>
                        <p className="pl-3 text-[12px] leading-relaxed text-primary opacity-80">{notification.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden h-8 w-px bg-theme lg:block" />

            <div className="flex items-center gap-3">
              <div className="hidden shrink-0 items-center gap-3 rounded-lg border border-theme bg-surface px-2 py-1.5 shadow-sm sm:flex sm:gap-4 sm:px-3">
                <div className="flex items-center gap-2 text-primary">
                  <Wallet size={18} className="text-primary" />
                  <span className="text-[14px] font-bold tracking-tight sm:text-[15px]">
                    £{userProfile.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFundsModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-md border border-accent bg-surface px-2 py-1 text-[12px] font-bold text-muted shadow-sm transition-all hover:bg-accent hover:text-surface sm:px-3 sm:text-[13px]"
                >
                  <PlusCircle size={14} /> {t('addFunds')}
                </button>
              </div>

              <div className="relative z-50 hidden md:flex">
                <button
                  type="button"
                  onClick={() => toggleDropdown('org')}
                  className="flex items-center gap-2 rounded-lg border border-theme bg-surface px-4 py-2 text-[14px] font-bold text-primary shadow-sm transition-colors hover:bg-app"
                >
                  <Layers size={18} className="text-muted" />
                  {userProfile.organization}
                </button>

                {activeDropdown === 'org' && (
                  <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-theme bg-surface shadow-lg animate-fade-in-up">
                    <div className="border-b border-theme bg-app px-4 py-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted">{t('switchWorkspace')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={closeDropdowns}
                      className="flex w-full items-center justify-between bg-app px-4 py-3 text-left text-[13px] font-bold text-primary"
                    >
                      {userProfile.organization} <CheckCircle2 size={16} className="text-muted" />
                    </button>
                  </div>
                )}
              </div>

              <div className="relative z-50 flex">
                <button type="button" onClick={() => toggleDropdown('user')} className="group ml-1 flex shrink-0 cursor-pointer items-center gap-2 sm:ml-2 sm:gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-theme text-xs font-bold uppercase text-white shadow-sm" style={{ backgroundColor: userProfile.avatarColor }}>
                    {userProfile.name.substring(0, 2)}
                  </div>

                  <div className="hidden flex-col items-start leading-tight xl:flex">
                    <span className="text-[14px] font-bold text-primary transition-colors group-hover:text-muted">{userProfile.name}</span>
                    {isAdmin && <span className="text-[10px] font-bold uppercase text-muted">System Admin</span>}
                  </div>

                  <ChevronDown size={14} className={`hidden text-primary transition-transform group-hover:text-muted sm:block ${activeDropdown === 'user' ? 'rotate-180' : ''}`} />
                </button>

                {activeDropdown === 'user' && (
                  <div className="absolute right-0 top-full mt-4 flex w-60 flex-col overflow-hidden rounded-xl border border-theme bg-surface shadow-lg animate-fade-in-up">
                    <div className="border-b border-theme bg-app px-4 py-3">
                      <p className="text-[14px] font-bold text-primary">{userProfile.name}</p>
                      <p className="truncate text-[12px] text-muted">{userProfile.email}</p>
                    </div>

                    <div className="flex flex-col gap-1 border-b border-theme p-2">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            closeDropdowns();
                            navigate('/settings');
                          }}
                          className="flex w-full items-center gap-2 rounded-md border border-transparent px-3 py-2 text-left text-[13px] font-bold text-muted transition-colors hover:border-theme hover:bg-surface hover:text-primary"
                        >
                          <ShieldCheck size={16} /> Global Settings
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          closeDropdowns();
                          navigate('/account');
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] font-medium text-primary transition-colors hover:bg-app"
                      >
                        <Settings size={16} className="text-muted" /> Account Settings
                      </button>
                    </div>

                    <div className="p-2">
                      <button type="button" onClick={handleSignOut} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] font-bold text-primary transition-colors hover:bg-app hover:text-muted">
                        <LogOut size={16} /> {t('signOut')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* STRIPE MODAL WRAPPED IN ELEMENTS */}
      {isFundsModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 animate-fade-in bg-[#3b2a23]/60 backdrop-blur-sm" onClick={() => setIsFundsModalOpen(false)} />

          <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-theme bg-surface shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-theme bg-app px-6 py-5">
              <h3 className="flex items-center gap-2 text-[18px] font-bold text-primary">
                <Wallet size={20} className="text-muted" /> Add Funds
              </h3>
              <button type="button" onClick={() => setIsFundsModalOpen(false)} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-primary">
                <X size={20} />
              </button>
            </div>

            {/* This is the Stripe wrapped form */}
            <Elements stripe={stripePromise}>
              <StripeDepositForm 
                setIsFundsModalOpen={setIsFundsModalOpen} 
                setUserProfile={setUserProfile} 
              />
            </Elements>

          </div>
        </div>
      )}
    </>
  );
};

export default Header;