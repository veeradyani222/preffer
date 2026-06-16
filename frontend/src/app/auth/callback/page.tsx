import CallbackInner from './CallbackInner';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type AuthCallbackProps = {
    searchParams: Promise<{ token?: string }>;
};

export default async function AuthCallback({ searchParams }: AuthCallbackProps) {
    const { token } = await searchParams;

    return <CallbackInner token={token ?? null} />;
}