'use client';

import React from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class GlobalErrorGuard extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-black text-white p-8 overflow-auto font-mono text-xs">
                    <h1 className="text-xl text-red-500 font-bold mb-4">CRITICAL APPLICATION ERROR</h1>
                    <div className="bg-red-900/20 border border-red-500 p-4 rounded mb-4">
                        <h2 className="text-lg font-bold">{this.state.error?.name}: {this.state.error?.message}</h2>
                    </div>
                    <div className="whitespace-pre-wrap text-gray-400 mb-8">
                        {this.state.error?.stack}
                    </div>

                    {this.state.errorInfo && (
                        <div className="whitespace-pre-wrap text-gray-500">
                            Component Stack:
                            {this.state.errorInfo.componentStack}
                        </div>
                    )}

                    <button
                        className="bg-white text-black px-6 py-3 rounded mt-8 font-bold"
                        onClick={() => window.location.reload()}
                    >
                        RELOAD APP
                    </button>

                    <button
                        className="bg-gray-800 text-white px-6 py-3 rounded mt-4 ml-4 font-bold"
                        onClick={() => {
                            localStorage.clear();
                            window.location.reload();
                        }}
                    >
                        CLEAR DATA & RELOAD
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
