import React from 'react';
import { 
  ShieldCheck, Globe, 
  Asterisk, CreditCard, Wallet, FileText 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-app border-t border-theme mt-auto w-full relative z-20">
      
      {/* Top Tier: Brand, Links, Settings */}
      <div className="px-0 py-10 md:py-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-10">
          
          {/* Left: Brand Identity */}
          <div className="flex flex-col gap-4 max-w-sm">
            <div className="flex items-center gap-2 group cursor-pointer w-fit">
                <Asterisk 
                  size={28} 
                  strokeWidth={2.5} 
                  className="text-accent group-hover:rotate-90 transition-transform duration-500" 
                />
                <span className="font-bold text-primary tracking-tight text-xl">
                SlipZMarket
              </span>
            </div>
              <p className="text-[14px] text-muted leading-relaxed font-medium">
              The premier B2B marketplace for verified marketing leads, targeted contact data, and seamless CRM enrichment.
            </p>
          </div>

          {/* Center: Marketplace Links */}
          <div className="flex flex-wrap gap-x-10 gap-y-4 text-[14px] font-medium text-primary">
            <a href="#support" className="hover:text-accent transition-colors">{t('supportCenter')}</a>
            <a href="#api" className="hover:text-accent transition-colors">{t('apiDocumentation')}</a>
            <a href="#compliance" className="hover:text-accent transition-colors">{t('dataCompliance')}</a>
            <a href="#privacy" className="hover:text-accent transition-colors">{t('termsPrivacy')}</a>
          </div>

          {/* Right: Localization & Payments */}
          <div className="flex flex-col gap-5">
            
            {/* Region / Currency */}
            <div className="flex items-center gap-4 text-muted">
              <div className="flex items-center gap-1.5 hover:text-[#2a1b1b] cursor-pointer transition-colors">
                <Globe size={16} />
                <span className="text-[13px] font-semibold">{t('language')}</span>
              </div>
              <div className="h-4 w-px bg-theme"></div>
              <div className="flex items-center gap-1.5 hover:text-[#2a1b1b] cursor-pointer transition-colors">
                <span className="text-[14px] font-bold">£</span>
                <span className="text-[13px] font-semibold">GBP</span>
              </div>
            </div>
            
            {/* Payment Methods */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-muted font-bold tracking-wider mr-1">{t('accepted')}</span>
              <div className="bg-surface border border-theme p-2 rounded-md text-primary hover:text-accent hover:border-accent transition-colors cursor-help shadow-sm" title="Credit Cards">
                <CreditCard size={16} />
              </div>
              <div className="bg-surface border border-theme p-2 rounded-md text-primary hover:text-accent hover:border-accent transition-colors cursor-help shadow-sm" title="Wire Transfer / Invoice">
                <FileText size={16} />
              </div>
              <div className="bg-surface border border-theme p-2 rounded-md text-primary hover:text-accent hover:border-accent transition-colors cursor-help shadow-sm" title="Digital Wallets">
                <Wallet size={16} />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Tier: Legal & Security */}
      <div className="border-t border-theme bg-app px-0 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Copyright & Live Status */}
        <div className="flex items-center gap-4">
          <p className="text-[13px] text-muted font-medium">
            &copy; {new Date().getFullYear()} SlipZMarket LLC. All rights reserved.
          </p>
          <div className="hidden md:block h-3 w-px bg-theme"></div>
          <div className="hidden md:flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-sm">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest">{t('allSystemsOperational')}</span>
          </div>
        </div>

        {/* Security Badge */}
        <div className="flex items-center gap-2 text-primary bg-surface border border-theme px-4 py-1.5 rounded-md shadow-sm">
          <ShieldCheck size={14} className="text-accent" />
          <span className="text-[11px] font-bold tracking-widest uppercase">{t('gdprCcpaCompliant')}</span>
        </div>
        
      </div>
    </footer>
  );
};

export default Footer;