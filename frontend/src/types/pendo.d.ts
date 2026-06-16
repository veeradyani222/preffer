interface Pendo {
    trackAgent: (eventType: string, metadata: object) => void;
}

declare global {
    interface Window {
        pendo: Pendo;
    }
}

export {};
