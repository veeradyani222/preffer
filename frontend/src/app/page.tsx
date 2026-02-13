'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import ProblemSolution from '@/components/landing/ProblemSolution';
import HowItWorks from '@/components/landing/HowItWorks';
import Features from '@/components/landing/Features';
import DemoSection from '@/components/landing/DemoSection';
import Infrastructure from '@/components/landing/Infrastructure';
import TargetAudience from '@/components/landing/TargetAudience';
import CTA from '@/components/landing/CTA';
import Footer from '@/components/landing/Footer';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/user/dashboard');
    }
  }, [user, loading, router]);

  // Optional: Show nothing or a loading spinner while checking auth
  if (loading) {
    return <div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="bg-white min-h-screen text-gray-900 font-sans selection:bg-[#FFD54F] selection:text-black">
      <Navbar />
      <main>
        <ProblemSolution />
        <HowItWorks />
        <Features />
        <DemoSection />
        <Infrastructure />
        <TargetAudience />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
