
/**
 * Simple performance monitoring utility.
 * In a real application, this would send metrics to a service like Datadog, Sentry, or Firebase Performance Monitoring.
 */

type MetricType = 'API_LATENCY' | 'RENDER_TIME' | 'DB_QUERY';

interface PerformanceMetric {
    name: string;
    type: MetricType;
    durationMs: number;
    timestamp: number;
    metadata?: any;
}

class PerformanceMonitor {
    private static instance: PerformanceMonitor;
    private metrics: PerformanceMetric[] = [];
    private isEnabled = true;

    private constructor() {
        if (typeof window !== 'undefined') {
            // Enable in development or if flag is set
            this.isEnabled = process.env.NODE_ENV === 'development' || localStorage.getItem('debug_perf') === 'true';
        }
    }

    public static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }

    public startTimer(name: string) {
        if (!this.isEnabled) return () => {};
        
        const start = performance.now();
        return (metadata?: any) => {
            const duration = performance.now() - start;
            this.log(name, 'API_LATENCY', duration, metadata);
        };
    }

    public log(name: string, type: MetricType, durationMs: number, metadata?: any) {
        if (!this.isEnabled) return;

        const metric: PerformanceMetric = {
            name,
            type,
            durationMs,
            timestamp: Date.now(),
            metadata
        };

        this.metrics.push(metric);
        
        // Prevent memory leak by capping metrics history
        if (this.metrics.length > 1000) {
            this.metrics.shift();
        }
        
        // Console output for immediate visibility
        const color = durationMs > 1000 ? 'color: red' : durationMs > 200 ? 'color: orange' : 'color: green';
        console.log(`%c[PERF] ${name} (${type}): ${durationMs.toFixed(2)}ms`, color, metadata || '');

        // TODO: Batch send to backend
    }
}

export const perfMonitor = PerformanceMonitor.getInstance();
