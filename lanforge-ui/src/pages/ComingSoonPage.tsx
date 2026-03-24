import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const ComingSoonPage: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/business/public');
        setSettings(response.data.businessInfo);
      } catch (error) {
        console.error('Error fetching settings', error);
      }
    };
    fetchSettings();
  }, []);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [budget, setBudget] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (!settings?.comingSoonDate) return;
    
    const targetDate = new Date(settings.comingSoonDate).getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;
      
      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [settings?.comingSoonDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    
    try {
      await api.post('/build-requests', { name, email, phone, budget, details });
      setSubmitStatus('success');
      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitStatus('idle');
        setName(''); setEmail(''); setPhone(''); setBudget(''); setDetails('');
      }, 3000);
    } catch (error) {
      console.error('Error submitting build request', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="z-10 text-center max-w-3xl w-full">
        <img src="/logo-2.png" alt="LANForge Logo" className="h-24 mx-auto mb-8" />
        
        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">Something Awesome Is Coming</h1>
        <p className="text-xl text-gray-400 mb-12">We are currently building our new experience. Check back soon!</p>
        
        {settings?.comingSoonDate && (
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <div className="flex flex-col items-center bg-gray-800 rounded-lg p-6 min-w-[100px] border border-gray-700">
              <span className="text-4xl md:text-6xl font-bold text-primary-500">{timeLeft.days}</span>
              <span className="text-sm text-gray-400 uppercase tracking-widest mt-2">Days</span>
            </div>
            <div className="flex flex-col items-center bg-gray-800 rounded-lg p-6 min-w-[100px] border border-gray-700">
              <span className="text-4xl md:text-6xl font-bold text-primary-500">{timeLeft.hours}</span>
              <span className="text-sm text-gray-400 uppercase tracking-widest mt-2">Hours</span>
            </div>
            <div className="flex flex-col items-center bg-gray-800 rounded-lg p-6 min-w-[100px] border border-gray-700">
              <span className="text-4xl md:text-6xl font-bold text-primary-500">{timeLeft.minutes}</span>
              <span className="text-sm text-gray-400 uppercase tracking-widest mt-2">Minutes</span>
            </div>
            <div className="flex flex-col items-center bg-gray-800 rounded-lg p-6 min-w-[100px] border border-gray-700">
              <span className="text-4xl md:text-6xl font-bold text-primary-500">{timeLeft.seconds}</span>
              <span className="text-sm text-gray-400 uppercase tracking-widest mt-2">Seconds</span>
            </div>
          </div>
        )}
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-600 hover:bg-primary-500 text-white text-lg font-bold py-4 px-10 rounded-full transition-all transform hover:scale-105 shadow-[0_0_15px_rgba(234,88,12,0.5)]"
        >
          Request a Custom Build
        </button>
      </div>
      
      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Request a Build</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {submitStatus === 'success' ? (
                <div className="bg-green-900 border border-green-500 text-green-100 p-4 rounded-lg flex items-center mb-4">
                  <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Your request has been submitted successfully! We will be in touch soon.</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {submitStatus === 'error' && (
                    <div className="bg-red-900 border border-red-500 text-red-100 p-3 rounded-lg text-sm">
                      There was an error submitting your request. Please try again.
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
                    <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500" placeholder="John Doe" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
                      <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500" placeholder="john@example.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500" placeholder="(555) 123-4567" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Estimated Budget</label>
                    <input type="text" value={budget} onChange={e => setBudget(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500" placeholder="$1,500 - $2,000" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Build Details *</label>
                    <textarea required value={details} onChange={e => setDetails(e.target.value)} rows={4} className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 resize-none" placeholder="What are you looking to use this PC for? Any specific parts or games?"></textarea>
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className={`w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 rounded-lg transition-colors ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComingSoonPage;
