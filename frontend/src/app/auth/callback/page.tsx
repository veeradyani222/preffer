

import { Suspense } from 'react';
import CallbackInner from './CallbackInner';

export const dynamic = 'force-dynamic';

export default function AuthCallback() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-12 h-12 border-[3px] border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium tracking-wide text-sm uppercase">Loading...</p>
                </div>
            </div>
        }>
            <CallbackInner />
        </Suspense>
    );
}
