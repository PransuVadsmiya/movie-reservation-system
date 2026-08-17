'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { 
  Sparkles, UserPlus, Search, Armchair, Popcorn, 
  ChevronDown, ChevronUp, Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import UserDropdown from '@/components/UserDropdown';

// FAQ Component
const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-white/10 py-5">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full justify-between items-center text-left focus:outline-none"
      >
        <h4 className="text-xl font-medium text-gray-200">Q : {question}</h4>
        {isOpen ? <ChevronUp className="w-6 h-6 text-gray-400" /> : <ChevronDown className="w-6 h-6 text-gray-400" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="pt-4 text-gray-400 text-lg">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (loading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden relative font-sans selection:bg-red-500/30">
      
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center bg-gradient-to-b from-[#0a0a0f]/90 to-transparent backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-2xl font-bold tracking-tight">
            Ticketify
          </span>
        </Link>
        
        <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-2 py-1 backdrop-blur-md">
          <Link href="/" onClick={(e) => {
            if (window.location.pathname === '/') {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }} className="px-5 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-red-500 to-pink-500 text-transparent bg-clip-text cursor-pointer">Home</Link>
          <a href="#how-it-works" className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white transition-colors">How it Works?</a>
          <a href="#faqs" className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white transition-colors">FAQs</a>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link href={user.role === 'admin' ? "/admin/dashboard" : "/dashboard"} className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white transition-colors border border-white/10">Dashboard</Link>
              <UserDropdown />
            </>
          ) : (
            <Link href="/login" className="bg-[#ff4d6d] hover:bg-[#ff2a55] text-white transition-colors px-6 py-2 rounded-full font-bold text-sm">Log In</Link>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center w-full">
        
        {/* HERO SECTION */}
        <section className="relative w-full min-h-[80vh] flex items-center text-center pb-12 pt-32">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 filter blur-sm"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent"></div>
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h1 className="text-5xl md:text-8xl font-extrabold mb-6 tracking-tight leading-tight">
                Go Beyond Screenings.<br/>
                <span className="mt-2 block">Book with <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-500">Ticketify</span>.</span>
              </h1>
              
              <p className="text-lg md:text-2xl text-gray-400 mb-10 max-w-3xl mx-auto font-light italic">
                Empower your entertainment decisions with our platform's advanced bookings and intelligent seat selection.
              </p>

              <Link href={user ? (user.role === 'admin' ? "/admin/dashboard" : "/dashboard") : "/signup"} className="inline-flex items-center gap-2 bg-[#ff4d6d] text-white hover:bg-[#ff2a55] font-bold py-4 px-10 rounded-full transition-all transform hover:scale-105 text-lg">
                Get Started
              </Link>
            </motion.div>
          </div>
        </section>

        {/* STEPS SECTION */}
        <section id="how-it-works" className="w-full max-w-7xl mx-auto px-6 pt-4 pb-16">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Unlock premiere experiences in four<br/>simple steps.</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "1. Create Your Account", desc: "Create your secure account to access your personalized dashboard.", icon: <UserPlus className="w-8 h-8 text-[#ff4d6d]" /> },
              { title: "2. Browse Movies", desc: "Explore our curated list of trending movies and upcoming blockbusters.", icon: <Search className="w-8 h-8 text-[#ff4d6d]" /> },
              { title: "3. Select Seats", desc: "Use our interactive seat map to pick the perfect spot in the theater.", icon: <Armchair className="w-8 h-8 text-[#ff4d6d]" /> },
              { title: "4. Enjoy the Show", desc: "Get your digital ticket, grab some popcorn, and enjoy the experience.", icon: <Popcorn className="w-8 h-8 text-[#ff4d6d]" /> },
            ].map((step, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{ y: -8, boxShadow: "0px 0px 20px 2px rgba(255, 77, 109, 0.5)", borderColor: "rgba(255, 77, 109, 0.5)" }}
                className="bg-[#151722] border border-white/5 rounded-2xl p-8 text-center flex flex-col items-center transition-transform shadow-lg cursor-pointer"
              >
                <div className="bg-[#ff4d6d]/10 p-5 rounded-full mb-6">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-gray-400">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FAQS SECTION */}
        <section id="faqs" className="w-full max-w-5xl mx-auto px-6 pt-12 pb-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Frequently Asked Questions</h2>
          </div>
          
          <div className="space-y-4">
            <FAQItem 
              question="Are my payment details secure?" 
              answer="Yes, all transactions are encrypted using bank-level security protocols. We do not store your credit card information on our servers." 
            />
            <FAQItem 
              question="Is Ticketify a cinema chain?" 
              answer="No, Ticketify is a premier ticketing platform that partners with the best ultra-premium theaters across the country." 
            />
            <FAQItem 
              question="What is the pricing for Ticketify Premium?" 
              answer="Ticketify Premium is ₹499/month and includes benefits like zero convenience fees, priority booking, and exclusive discounts on snacks." 
            />
            <FAQItem 
              question="Do I need to print my tickets?" 
              answer="No, you can simply show the digital QR code on your smartphone at the cinema entrance." 
            />
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-white/10 bg-[#08080c] pt-16 pb-8 px-6 mt-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl font-bold tracking-tight">Ticketify</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-sm text-sm leading-relaxed">
                Ticketify is a smart movie reservation system designed to make movie booking simple and convenient. Browse movies, explore showtimes, choose your seats, and reserve your tickets with ease.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-6 text-sm tracking-wider">Quick Links</h4>
              <ul className="space-y-4">
                <li><Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">Home</Link></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">About us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Contact us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy policy</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-6 text-sm tracking-wider">Get in touch</h4>
              <ul className="space-y-4">
                <li className="text-gray-400 text-sm">+91 79847 19576</li>
                <li><a href="mailto:pransu@ticketify.com" className="text-gray-400 hover:text-white text-sm transition-colors">pransu@ticketify.com</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/10 text-center text-sm text-gray-500">
            <p>Copyright 2026 © GreatStack. All Right Reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
