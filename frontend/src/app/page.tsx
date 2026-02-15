'use client';

import { useState, useEffect } from 'react';

/* ─── Typewriter Hook ─── */
function useTypewriter(words: string[], speed = 50, pause = 2000) {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    if (index >= words.length) {
      setIndex(0);
      return;
    }

    const currentWord = words[index];
    const typeSpeed = isDeleting ? 30 : speed;

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (subIndex < currentWord.length) {
          setText(currentWord.substring(0, subIndex + 1));
          setSubIndex((prev) => prev + 1);
        } else {
          setTimeout(() => setIsDeleting(true), pause);
        }
      } else {
        if (subIndex > 0) {
          setText(currentWord.substring(0, subIndex - 1));
          setSubIndex((prev) => prev - 1);
        } else {
          setIsDeleting(false);
          setIndex((prev) => (prev + 1) % words.length);
        }
      }
    }, typeSpeed);

    return () => clearTimeout(timeout);
  }, [subIndex, isDeleting, index, words, speed, pause]);

  return text;
}

export default function Home() {
  const commonTextStyle = "text-[2vh] min-[480px]:text-[1.2vw]";
  const commonGap = "gap-[1vh] min-[480px]:gap-[0.5vw]";

  // Typewriter effects
  const differentiatorText = useTypewriter([
    'talks to visitors',
    'takes feedback and reviews',
    'captures intent',
    'answers questions',
    'qualifies leads',
    'detects user interest',
    'represents you/your business',
    'gives crazy analytics',
    'helps you grow',
    'captures leads',
    'takes appointment requests',
    'takes orders & quotes',
    'escalates support issues',
    'answers FAQs',
    'manages follow-ups',
    'collects feedback & reviews'
  ], 70, 2000);

  return (
    <div className="relative h-screen bg-black overflow-hidden flex flex-col items-center justify-center font-sans text-gray-400 p-2">

      {/* Branding Header */}
      <div className="mb-[4vh] text-center z-10 flex flex-col gap-[1vh]">
        <h1 className="text-[#FFF9C4] font-bold tracking-tighter leading-none" style={{ fontSize: '5vh' }}>preffer.me</h1>
        <p className="text-[#D4C93A] tracking-[0.3em] uppercase font-medium" style={{ fontSize: '1.2vh' }}>making everyone prefer you</p>
      </div>

      {/* The Box */}
      <main className="relative z-10 w-full max-w-4xl border border-gray-800 rounded-xl overflow-hidden flex flex-col bg-black">

        {/* Top Header: "Read this" - Removed bg-gray-900/50 */}
        <div className="w-full border-b border-gray-800 py-3 text-center">
          <span className={`text-gray-500 uppercase tracking-widest font-semibold ${commonTextStyle}`} style={{ fontSize: '1.5vh' }}>
            <span className="text-[#FFF9C4]">Read this</span>
          </span>
        </div>

        {/* content body */}
        <div className={`p-8 md:p-12 flex flex-col items-center justify-center text-center ${commonGap} w-full`}>

          {/* Top Two Lines (Same Size) */}
          <div className={`flex flex-col items-center justify-center opacity-90 ${commonGap} w-full`}>
            {/* 1. Identity Line */}
            <p className={`font-medium text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis max-w-full px-1 ${commonTextStyle}`}>
              Building something of your own?
            </p>

            {/* 2. Pain Line */}
            <p className={`font-medium text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis max-w-4xl px-4 ${commonTextStyle}`}>
              Tired of working, managing inquiries, missing leads, explaining yourself again and again?
            </p>
          </div>

          {/* 3. Main Headline */}
          <div className="">
            <h1 className={` tracking-tight leading-tight text-gray-400 ${commonTextStyle}`}>
              Get a professional page + AI representative that handles this <span className="text-[#FFF9C4]">for you.</span>
            </h1>
          </div>

          {/* 4. Differentiator */}
          <div className="">
            <p className={`text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis ${commonTextStyle}`}>
              With an <span className="text-[#FFF9C4]">AI representative</span> that <span className="text-gray-300">{differentiatorText}</span><span className="animate-pulse">|</span>
            </p>
          </div>

          {/* 5. Trust & Control + User's new line */}
          <div className="max-w-3xl px-4 flex flex-col items-center gap-[0.5vh]">
            <p className={`text-gray-500 leading-relaxed ${commonTextStyle}`}>
              Your AI gets its name, personality, and instructions from you and represents you the way you want.
            </p>
            <p className={`text-gray-500 leading-relaxed ${commonTextStyle}`}>
              You get 500 free credits initially!
            </p>
          </div>

        </div>

        {/* Bottom Footer: CTA - Removed bg-gray-900/50 */}
        <div className="w-full border-t border-gray-800 py-6 text-center">
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/google`}
            className={`inline-block bg-[#FFF9C4] text-black px-[4vh] py-[1.5vh] min-[480px]:px-[2vw] min-[480px]:py-[0.8vw] rounded-full font-bold hover:bg-[#FFF9C7] transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(212,160,23,0.4)] ${commonTextStyle}`}
          >
            Start now
          </a>
        </div>

      </main>

    </div>
  );
}
