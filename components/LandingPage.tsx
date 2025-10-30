import React, { useEffect, useRef, useState } from 'react';
import { ClockIcon } from './icons/ClockIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { Logo } from './Logo';
import { useAppSettings } from '../hooks/useAppSettings';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

interface LandingPageProps {
  onLoginClick: () => void;
  onGetStartedClick: () => void;
  onAdminClick: () => void;
}

const Feature: React.FC<{ icon: React.ReactNode, title: string, children: React.ReactNode, delay: string, isVisible: boolean }> = ({ icon, title, children, delay, isVisible }) => (
  <div 
    className={`bg-light-bg/50 border border-slate-700 p-6 rounded-xl text-center flex flex-col items-center relative overflow-hidden transition-all duration-500 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    style={{ transitionDelay: delay }}
  >
     <div className="absolute top-0 left-0 w-1/2 h-px bg-gradient-to-r from-transparent via-primary to-transparent"></div>
     <div className="absolute bottom-0 right-0 w-1/2 h-px bg-gradient-to-l from-transparent via-primary to-transparent"></div>
    <div className="bg-primary/20 text-primary p-3 rounded-full mb-4">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-text-main mb-2">{title}</h3>
    <p className="text-text-secondary">{children}</p>
  </div>
);

const useOnScreen = (options: IntersectionObserverInit) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isIntersecting, setIntersecting] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIntersecting(true);
                if (ref.current) {
                  observer.unobserve(ref.current);
                }
            }
        }, options);

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) {
                observer.unobserve(ref.current);
            }
        };
    }, [ref, options]);

    return [ref, isIntersecting] as const;
};


export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onGetStartedClick, onAdminClick }) => {
  const { settings } = useAppSettings();
  const { landingContent: content } = settings;

  const [featuresRef, featuresAreVisible] = useOnScreen({ threshold: 0.1 });
  const [ctaRef, ctaIsVisible] = useOnScreen({ threshold: 0.5 });


  return (
    <>
    <div className="min-h-screen bg-dark-bg text-text-main font-sans w-full overflow-x-hidden">
      <nav className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
            <Logo />
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
           <button 
            onClick={onAdminClick} 
            className="p-2 rounded-full text-text-secondary hover:text-secondary hover:bg-light-bg/50 transition-colors"
            title="Temp Admin Access"
          >
            <ShieldCheckIcon className="w-6 h-6" />
          </button>
          <button onClick={onLoginClick} className="font-semibold text-text-secondary hover:text-text-main transition-colors">
            Login
          </button>
          <button onClick={onGetStartedClick} className="bg-primary text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
            Sign Up
          </button>
        </div>
      </nav>

      <main className="flex flex-col items-center text-center px-4">
        {/* Hero Section */}
        <section className="py-20 md:py-32 w-full max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-4 animate-fade-in-down bg-clip-text text-transparent bg-gradient-to-b from-text-main to-text-secondary">
            {content.heroTitle}
          </h1>
          <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-8 animate-fade-in-up">
            {content.heroSubtitle}
          </p>
          <button 
            onClick={onGetStartedClick} 
            className="bg-secondary text-slate-900 font-bold py-3 px-8 rounded-lg text-lg hover:bg-emerald-400 transition-transform transform hover:scale-105 shadow-lg shadow-secondary/20 relative overflow-hidden group">
            <span className="relative z-10">Get Started for Free</span>
            <span className="absolute inset-0 bg-white/20 animate-shine opacity-0 group-hover:opacity-100 transition-opacity"></span>
          </button>
        </section>

        {/* Features Section */}
        <section ref={featuresRef} id="features" className="py-20 md:py-24 w-full max-w-7xl mx-auto">
            <h2 className={`text-4xl font-bold tracking-tighter mb-12 transition-all duration-700 ${featuresAreVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>Why Choose Pynor?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <Feature icon={<ClockIcon className="w-8 h-8"/>} title={content.feature1Title} isVisible={featuresAreVisible} delay="100ms">
                    {content.feature1Description}
                </Feature>
                <Feature icon={<ChartBarIcon className="w-8 h-8"/>} title={content.feature2Title} isVisible={featuresAreVisible} delay="300ms">
                    {content.feature2Description}
                </Feature>
                <Feature icon={<SparklesIcon className="w-8 h-8"/>} title={content.feature3Title} isVisible={featuresAreVisible} delay="500ms">
                    {content.feature3Description}
                </Feature>
            </div>
        </section>
        
         {/* CTA Section */}
        <section ref={ctaRef} className="py-20 md:py-24 w-full">
            <div className={`max-w-3xl mx-auto bg-light-bg border border-slate-700 p-10 rounded-xl shadow-2xl transition-all duration-700 ${ctaIsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <h3 className="text-3xl md:text-4xl font-bold tracking-tighter mb-4">
                    Ready to monitor your websites like a pro?
                </h3>
                <p className="text-text-secondary mb-8">
                    Sign up today and get instant access to all of Pynor's features. No credit card required.
                </p>
                 <button 
                    onClick={onGetStartedClick} 
                    className="bg-primary text-white font-bold py-3 px-8 rounded-lg text-lg hover:bg-blue-700 transition-transform transform hover:scale-105 shadow-lg shadow-primary/20 relative overflow-hidden group">
                    <span className="relative z-10">Start Pinging Now</span>
                     <span className="absolute inset-0 bg-white/20 animate-shine opacity-0 group-hover:opacity-100 transition-opacity"></span>
                </button>
            </div>
        </section>
      </main>

      <footer className="text-center text-slate-600 py-8 mt-8">
          <p>
              Pynor by{' '}
              <a
                  href="https://twitter.com/Oladizz01"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-primary transition-colors"
              >
                  𝕆𝕃𝔸𝔻𝕀ℤℤ
              </a>
          </p>
      </footer>
    </div>
    </>
  );
};