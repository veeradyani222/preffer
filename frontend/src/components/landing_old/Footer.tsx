'use client';

import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">

                    <div className="flex items-center space-x-2">
                        <span className="text-xl font-bold tracking-tight text-gray-900">
                            Preffer<span className="text-gray-400 font-light">.me</span>
                        </span>
                    </div>

                    <div className="flex gap-8 text-sm font-medium text-gray-600">
                        <Link href="#" className="hover:text-black transition-colors">About</Link>
                        <Link href="#" className="hover:text-black transition-colors">Privacy</Link>
                        <Link href="#" className="hover:text-black transition-colors">Contact</Link>
                    </div>

                </div>

                <div className="border-t border-gray-50 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400">
                    <p>&copy; {new Date().getFullYear()} prefer.me. All rights reserved.</p>
                    <p>Built with <span className="font-bold text-gray-600">Archestra</span> & <span className="font-bold text-gray-600">MCP</span></p>
                </div>
            </div>
        </footer>
    );
}
