'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function Navbar() {
    const { user, loading, loginWithGoogle, logout } = useAuth();

    return (
        <nav className="fixed w-full z-50 top-0 start-0 border-b border-gray-100 bg-white/70 backdrop-blur-xl">
            <div className="w-full flex flex-wrap items-center justify-between mx-auto px-6 py-4">
                <Link href="/" className="flex items-center space-x-2">
                    <span className="self-center text-xl font-bold tracking-tight text-gray-900">
                        MyPortfolio<span className="text-gray-400 font-light">.app</span>
                    </span>
                </Link>
                <div className="flex md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse items-center justify-end w-full md:w-auto gap-4">
                    {loading ? (
                        <div className="h-9 w-24 bg-gray-100 rounded animate-pulse"></div>
                    ) : user ? (
                        <>
                            <span className="text-sm text-gray-600">
                                {user.displayName || user.username}
                            </span>
                            <button
                                onClick={logout}
                                className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={loginWithGoogle}
                            type="button"
                            className="text-black bg-[#FFD54F] hover:bg-[#FFC107] focus:ring-4 focus:outline-none focus:ring-yellow-200 font-bold rounded-full text-sm px-6 py-2.5 text-center transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                        >
                            Get Started
                        </button>
                    )}

                </div>
            </div>
        </nav>
    );
}
