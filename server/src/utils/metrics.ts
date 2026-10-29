/**
 * In-Memory Metrics & Performance Collector
 * Enterprise-grade observability collector with bounded memory and strict cardinality safeguards.
 */

export interface HttpRouteMetric {
  route: string;
  count: number;
  totalDurationMs: number;
  avgDurationMs: number;
  slowCount: number;
}

export interface JobMetric {
  name: string;
  totalRuns: number;
  successes: number;
  failures: number;
  consecutiveFailures: number;
  lastRunAt: string | null;
  lastDurationMs: number;
  avgDurationMs: number;
  lastError?: string;
}

export interface MetricsSnapshot {
  http: {
    totalRequests: number;
    byMethod: Record<string, number>;
    byStatusClass: {
      '2xx': number;
      '3xx': number;
      '4xx': number;
      '5xx': number;
      other: number;
    };
    statusCodes: Record<string, number>;
    latency: {
      averageMs: number;
      minMs: number;
      maxMs: number;
      p50Ms: number;
      p95Ms: number;
      p99Ms: number;
    };
    slowRequests: number;
    errorRate5xx: number;
    errorRate4xx: number;
    routes: HttpRouteMetric[];
  };
  jobs: Record<string, JobMetric>;
  system: {
    uptimeSeconds: number;
    memoryMb: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
    nodeVersion: string;
    environment: string;
  };
  timestamp: string;
}

class MetricsCollector {
  private totalRequests = 0;
  private byMethod: Record<string, number> = {};
  private byStatusClass = {
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0,
    other: 0,
  };
  private statusCodes: Record<string, number> = {};
  private slowRequests = 0;
  private slowThresholdMs = 500;

  // Bounded ring buffer for latency percentiles (1000 items max)
  private readonly maxLatencySamples = 1000;
  private latencyBuffer: number[] = [];
  private totalLatencySum = 0;
  private minLatency = Infinity;
  private maxLatency = 0;

  // Bounded route templates map (max 100 entries to prevent high cardinality memory leaks)
  private readonly maxBoundedRoutes = 100;
  private routeMetrics = new Map<
    string,
    { count: number; totalDurationMs: number; slowCount: number }
  >();

  // Background jobs registry
  private jobMetrics = new Map<string, JobMetric>();

  /**
   * Records an incoming HTTP request completion.
   */
  public recordHttpRequest(
    method: string,
    normalizedPath: string,
    statusCode: number,
    durationMs: number
  ): void {
    this.totalRequests++;

    // Track HTTP Method
    const upperMethod = (method || 'UNKNOWN').toUpperCase();
    this.byMethod[upperMethod] = (this.byMethod[upperMethod] || 0) + 1;

    // Track Status Class
    if (statusCode >= 200 && statusCode < 300) {
      this.byStatusClass['2xx']++;
    } else if (statusCode >= 300 && statusCode < 400) {
      this.byStatusClass['3xx']++;
    } else if (statusCode >= 400 && statusCode < 500) {
      this.byStatusClass['4xx']++;
    } else if (statusCode >= 500 && statusCode < 600) {
      this.byStatusClass['5xx']++;
    } else {
      this.byStatusClass.other++;
    }

    // Track Exact Status Code
    const codeKey = String(statusCode);
    this.statusCodes[codeKey] = (this.statusCodes[codeKey] || 0) + 1;

    // Track Latency
    const duration = Math.max(0, Math.round(durationMs * 100) / 100);
    this.totalLatencySum += duration;
    if (duration < this.minLatency) this.minLatency = duration;
    if (duration > this.maxLatency) this.maxLatency = duration;

    if (this.latencyBuffer.length >= this.maxLatencySamples) {
      this.latencyBuffer.shift();
    }
    this.latencyBuffer.push(duration);

    // Track Slow Requests
    const isSlow = duration >= this.slowThresholdMs;
    if (isSlow) {
      this.slowRequests++;
    }

    // Track Normalized Route (cardinality-safe)
    const routeKey = `${upperMethod} ${normalizedPath}`;
    if (this.routeMetrics.has(routeKey)) {
      const existing = this.routeMetrics.get(routeKey)!;
      existing.count++;
      existing.totalDurationMs += duration;
      if (isSlow) existing.slowCount++;
    } else if (this.routeMetrics.size < this.maxBoundedRoutes) {
      this.routeMetrics.set(routeKey, {
        count: 1,
        totalDurationMs: duration,
        slowCount: isSlow ? 1 : 0,
      });
    }
  }

  /**
   * Records execution of a background job or scheduled task.
   */
  public recordJobExecution(
    name: string,
    durationMs: number,
    success: boolean,
    errorSummary?: string
  ): void {
    const existing = this.jobMetrics.get(name) || {
      name,
      totalRuns: 0,
      successes: 0,
      failures: 0,
      consecutiveFailures: 0,
      lastRunAt: null,
      lastDurationMs: 0,
      avgDurationMs: 0,
    };

    existing.totalRuns++;
    existing.lastRunAt = new Date().toISOString();
    existing.lastDurationMs = Math.round(durationMs);

    if (success) {
      existing.successes++;
      existing.consecutiveFailures = 0;
      delete existing.lastError;
    } else {
      existing.failures++;
      existing.consecutiveFailures++;
      if (errorSummary) {
        existing.lastError = errorSummary;
      }
    }

    const prevSum = existing.avgDurationMs * (existing.totalRuns - 1);
    existing.avgDurationMs = Math.round((prevSum + durationMs) / existing.totalRuns);

    this.jobMetrics.set(name, existing);
  }

  /**
   * Calculates percentile value from sorted sample list.
   */
  private calculatePercentile(sorted: number[], percentile: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  /**
   * Returns a complete, immutable snapshot of system metrics.
   */
  public getSnapshot(): MetricsSnapshot {
    const sortedLatencies = [...this.latencyBuffer].sort((a, b) => a - b);
    const avgLatency =
      this.totalRequests > 0 ? Math.round((this.totalLatencySum / this.totalRequests) * 100) / 100 : 0;

    const errorRate5xx =
      this.totalRequests > 0
        ? Math.round((this.byStatusClass['5xx'] / this.totalRequests) * 10000) / 100
        : 0;

    const errorRate4xx =
      this.totalRequests > 0
        ? Math.round((this.byStatusClass['4xx'] / this.totalRequests) * 10000) / 100
        : 0;

    const routes: HttpRouteMetric[] = Array.from(this.routeMetrics.entries()).map(([route, m]) => ({
      route,
      count: m.count,
      totalDurationMs: Math.round(m.totalDurationMs),
      avgDurationMs: Math.round((m.totalDurationMs / m.count) * 100) / 100,
      slowCount: m.slowCount,
    }));

    // Sort routes by count descending
    routes.sort((a, b) => b.count - a.count);

    const jobs: Record<string, JobMetric> = {};
    for (const [key, val] of this.jobMetrics.entries()) {
      jobs[key] = { ...val };
    }

    const mem = process.memoryUsage();

    return {
      http: {
        totalRequests: this.totalRequests,
        byMethod: { ...this.byMethod },
        byStatusClass: { ...this.byStatusClass },
        statusCodes: { ...this.statusCodes },
        latency: {
          averageMs: avgLatency,
          minMs: this.minLatency === Infinity ? 0 : this.minLatency,
          maxMs: this.maxLatency,
          p50Ms: this.calculatePercentile(sortedLatencies, 50),
          p95Ms: this.calculatePercentile(sortedLatencies, 95),
          p99Ms: this.calculatePercentile(sortedLatencies, 99),
        },
        slowRequests: this.slowRequests,
        errorRate5xx,
        errorRate4xx,
        routes,
      },
      jobs,
      system: {
        uptimeSeconds: Math.floor(process.uptime()),
        memoryMb: {
          rss: Math.round(mem.rss / (1024 * 1024)),
          heapUsed: Math.round(mem.heapUsed / (1024 * 1024)),
          heapTotal: Math.round(mem.heapTotal / (1024 * 1024)),
          external: Math.round(mem.external / (1024 * 1024)),
        },
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Resets all internal counters (for isolated test suites).
   */
  public reset(): void {
    this.totalRequests = 0;
    this.byMethod = {};
    this.byStatusClass = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0, other: 0 };
    this.statusCodes = {};
    this.slowRequests = 0;
    this.latencyBuffer = [];
    this.totalLatencySum = 0;
    this.minLatency = Infinity;
    this.maxLatency = 0;
    this.routeMetrics.clear();
    this.jobMetrics.clear();
  }
}

export const metricsCollector = new MetricsCollector();
