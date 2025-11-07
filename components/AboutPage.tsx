import React from 'react';

const AboutPage: React.FC = () => {
  return (
    <main id="about" className="py-16 md:py-24 bg-cream">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
             <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Redefining the Pharmacy Experience
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Elevated Wellness Rx was created to change the way traditional pharmacy is viewed — shifting from a transactional model to one centered on <span className="font-bold text-slate-700">total patient wellness</span>. Our mission is to <span className="font-bold text-slate-700">elevate the pharmacy experience</span> by combining <span className="font-bold text-slate-700">compassionate care</span> with <span className="font-bold text-slate-700">innovative clinical programs</span> that help patients take control of their health.
            </p>
          </div>

          <div className="mt-12 text-lg text-slate-600 space-y-6">
            <p>
              At Elevated Wellness Rx, we believe that a pharmacy should be more than just a place to pick up prescriptions — it should be a <span className="font-bold text-slate-700">partner in your health journey</span>. That’s why we’ve integrated advanced programs such as <span className="font-bold text-slate-700">Remote Patient Monitoring (RPM)</span>, <span className="font-bold text-slate-700">Medication Therapy Management (MTM)</span>, and <span className="font-bold text-slate-700">Chronic Care Management (CCM)</span> to support patients beyond the counter. These services allow us to work hand-in-hand with providers to ensure <span className="font-bold text-slate-700">better outcomes</span>, <span className="font-bold text-slate-700">improved medication adherence</span>, and a <span className="font-bold text-slate-700">higher quality of life</span> for every individual we serve.
            </p>
            <p>
              We are especially committed to serving the populations often neglected the most — the <span className="font-bold text-slate-700">Medicare and Medicaid communities</span>. Through personalized delivery services, customized pill boxes, and ongoing care coordination, we <span className="font-bold text-slate-700">remove barriers to access</span> and provide the consistency patients need to stay healthy and independent.
            </p>
            <blockquote className="border-l-4 border-burgundy pl-6 italic text-slate-700 font-semibold">
              At Elevated Wellness Rx, our goal is simple: to elevate healthcare by delivering pharmacy services that are <span className="font-bold text-slate-800">proactive, personal, and purposeful</span>.
            </blockquote>
          </div>
        </div>
      </div>
    </main>
  );
};

export default AboutPage;