'use client';

export default function OpenInBrowserScreen() {
    return (
        <main className="min-h-screen bg-black text-gray-200 flex items-center justify-center px-6">
            <div className="w-full max-w-xl text-center border border-gray-800 rounded-2xl p-8 sm:p-10 bg-[#0d0d0d]">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-[#FFF9C4] text-black text-2xl font-bold mb-5">
                    ...
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-[#FFF9C4] mb-4">
                    Open in Browser to Continue
                </h1>
                <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-3">
                    Google Sign-In requires a secure browser.
                </p>
                <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
                    Please tap the three dots (...) and select <span className="font-semibold text-gray-200">Open in Browser</span> to continue.
                </p>
            </div>
        </main>
    );
}
