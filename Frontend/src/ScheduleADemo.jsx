import { useNavigate } from 'react-router-dom';
import { favicon } from './assets';

export default function ScheduleADemo() {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission or API call here
    navigate('/thank-you'); // Navigate to a success page or dashboard
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-950 via-neutral-900 to-slate-900 flex items-center justify-center overflow-hidden px-4">
      
            <div className="absolute w-[500px] h-[500px] bg-blue-700 opacity-20 rounded-full blur-[160px] top-[-10%] left-[-15%] pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] bg-blue-700 opacity-10 rounded-full blur-[160px] bottom-[-15%] right-[-10%] pointer-events-none" />
      <div className="absolute inset-0 bg-noise-pattern opacity-5 pointer-events-none" />

      
      <div className="scale-[0.95] flex w-full max-w-6xl shadow-2xl rounded-xl overflow-hidden">
        {/* Left Panel with Logo and Message */}
        <div className="hidden md:flex flex-col items-center justify-center w-1/2 p-12 text-center bg-black/20">
          <img
            src={favicon}
            alt="App Logo"
            className="w-69  mb-9 max-w-full drop-shadow-[0_5px_30px_rgba(0,0,0,0.3)]"
          />
          <h1 className="text-2xl font-bold text-white leading-snug">
            Elevate your processes with <span className="text-blue-100">Iwos</span>.
          </h1>
          <p className="text-xs text-blue-100 mt-3 max-w-sm">
            Book a personalized demo with our team and see the platform in action.
          </p>
        
        </div>

        {/* Right Panel - Schedule Form */}
        <div className="w-full md:w-1/2 bg-neutral-900 px-10 py-12 space-y-3">
          <div className="text-center">
            <h2 className="text-3xl font-semibold text-white">Schedule a Demo</h2>
            <p className="text-neutral-400 mt-2 text-sm">Fill out the form to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block mb-1 text-sm text-neutral-300">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                placeholder="Jane Smith"
                className="w-full px-4 py-2 bg-neutral-800 text-white border border-neutral-700 rounded-md placeholder-neutral-500 focus:ring-2 focus:ring-blue-700 focus:outline-none"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block mb-1 text-sm text-neutral-300">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                placeholder="you@example.com"
                className="w-full px-4 py-2 bg-neutral-800 text-white border border-neutral-700 rounded-md placeholder-neutral-500 focus:ring-2 focus:ring-blue-700 focus:outline-none"
                required
              />
            </div>

            <div>
              <label htmlFor="company" className="block mb-1 text-sm text-neutral-300">
                Company Name
              </label>
              <input
                type="text"
                id="company"
                placeholder="Your Company Inc."
                className="w-full px-4 py-2 bg-neutral-800 text-white border border-neutral-700 rounded-md placeholder-neutral-500 focus:ring-2 focus:ring-blue-700 focus:outline-none"
                required
              />
            </div>

            <div>
              <label htmlFor="time" className="block mb-1 text-sm text-neutral-300">
                Preferred Time
              </label>
              <input
                type="datetime-local"
                id="time"
                className="w-full px-4 py-2 bg-neutral-800 text-white border border-neutral-700 rounded-md focus:ring-2 focus:ring-blue-700 focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 mt-3 bg-blue-700 hover:bg-blue-600 text-white font-semibold rounded-lg transition shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-blue-700 focus:outline-none"
            >
              Request Demo
            </button>
          </form>

          <p className="text-center text-sm text-neutral-400">
            Need help?{' '}
            <a href="/contact" className="text-white hover:underline">
              Contact our team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
