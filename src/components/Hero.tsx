import React from 'react';

interface HeroProps {
  onOpenRefillModal: () => void;
  onOpenTransferModal: () => void; // New prop for opening transfer modal
}

const Hero: React.FC<HeroProps> = ({ onOpenRefillModal, onOpenTransferModal }) => {
  return (
    <section className="relative hero-bg bg-center bg-cover min-h-[60vh] md:min-h-[70vh] lg:min-h-screen flex items-center overflow-hidden">
      <div
        className="absolute inset-0 bg-linear-to-b from-white/10 via-transparent to-black/30"
        aria-hidden="true"
      />
      <div className="relative max-w-7xl px-4 sm:px-6 lg:px-8 py-24 lg:py-32 flex flex-col items-start justify-center">
        <div className="max-w-2xl">
          <span className="inline-block px-4 py-1 rounded-full bg-(--color-brand-green)/15 text-(--color-brand-green) border border-(--color-brand-green)/30 text-sm font-semibold mb-6">
            Welcome to Complete HealthcareRX
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white leading-tight mb-6">
            More Than Just a <span className="text-(--color-brand-green)">Pharmacy</span>. <br/>
            We're Your Health Partner.
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8 leading-relaxed">
            Experience personalized care where our pharmacists know your name and your health history. Fast refills, expert advice, and a commitment to your wellness.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={onOpenRefillModal}
              className="px-8 py-4 bg-(--color-brand-green) hover:bg-brand-green-dark text-white rounded-lg font-semibold text-lg transition-all shadow-lg hover:shadow-(color:--color-brand-green)/30"
            >
              Refill Prescription
            </button>
            <button
              onClick={onOpenTransferModal}
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white border border-(--color-brand-green)/50 rounded-lg font-semibold text-lg backdrop-blur-sm transition-all"
            >
              Transfer Prescription
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
