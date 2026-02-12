'use client';

import { useAuth } from '@/context/AuthContext';

export default function Hero() {
    const { loginWithGoogle, user } = useAuth();

    return (
        <section className="bg-white text-black min-h-screen flex items-center justify-center pt-20 relative overflow-hidden">

            {/* Background Decor - Yellow/Soft Blobs */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#FFD54F]/20 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
            <div className="absolute bottom-[0%] left-[0%] w-[400px] h-[400px] bg-blue-50/50 rounded-full blur-[80px] -z-10 pointer-events-none"></div>

            <div className="py-8 px-4 mx-auto max-w-screen-xl lg:py-16 lg:px-12 relative z-10 w-full">

                <div className="flex flex-col lg:flex-row items-center justify-between gap-12">

                    {/* Left Content */}
                    <div className="flex-1 text-center lg:text-left space-y-6">

                        <h1 className="text-5xl font-extrabold tracking-tight leading-tight md:text-6xl lg:text-7xl">
                            We make you <br />
                            showcase
                            {' '}easily!
                        </h1>

                        <p className="text-lg font-medium text-gray-500 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                            Build a portfolio that stands out. Connect your GitHub, choose a minimalist style, and let your work speak for itself.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                            {!user && (
                                <button
                                    onClick={loginWithGoogle}
                                    className="whitespace-nowrap bg-[#FFD54F] hover:bg-[#FFC107] text-black text-lg font-bold py-3.5 px-10 rounded-full shadow-lg transition-all transform hover:scale-105"
                                >
                                    Get Started
                                </button>
                            )}
                        </div>



                    </div>

                    {/* Right Content - Visuals */}
                    <div className="flex-1 w-full max-w-lg lg:max-w-xl relative">
                        {/* Abstract Phone/Card shapes to match vibe */}
                        <div className="relative z-10 bg-white rounded-[2.5rem] p-6 shadow-2xl border border-gray-100 rotate-[-3deg] hover:rotate-0 transition-transform duration-500">
                            <div className="bg-gray-50 rounded-3xl h-64 w-full flex items-center justify-center mb-4 overflow-hidden relative">
                                {/* Abstract Art Placeholder */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-purple-50 opacity-50"></div>
                                <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center text-4xl">🚀</div>
                            </div>
                            <div className="space-y-3">
                                <div className="h-6 bg-gray-100 rounded-full w-3/4"></div>
                                <div className="h-4 bg-gray-50 rounded-full w-full"></div>
                                <div className="h-4 bg-gray-50 rounded-full w-5/6"></div>
                            </div>
                            <div className="mt-6 flex justify-between items-center">
                                <div className="h-10 w-24 bg-[#FFD54F] rounded-full opacity-80"></div>
                                <div className="h-10 w-10 bg-gray-100 rounded-full"></div>
                            </div>
                        </div>

                        {/* Decorative background blob behind image */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-[#FFD54F]/10 to-blue-100/20 rounded-full blur-3xl -z-10"></div>
                    </div>

                </div>
            </div>
        </section>
    );
}
