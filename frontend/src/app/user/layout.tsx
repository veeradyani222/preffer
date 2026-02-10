import Sidebar from '@/components/dashboard/Sidebar';

export default function UserLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-white">
            <Sidebar />
            <div className="flex-1 ml-64">
                <main className="p-12 max-w-5xl mx-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
