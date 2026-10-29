/**
 * Alerting & Incident Notification Engine
 * Provides threshold evaluation, deduplication, and cooldowns to prevent notification storms.
 */
import { logger } from './logger.js';
import { metricsCollector } from './metrics.js';
class AlertManager {
    activeAlerts = new Map();
    alertHistory = [];
    maxHistory = 50;
    // Default cooldown configuration (5 minutes by default, configurable per rule)
    ruleConfigs = {
        DATABASE_DISCONNECTED: {
            cooldownMs: 5 * 60 * 1000,
            severity: 'critical',
            description: 'MongoDB database connection lost or unreachable',
        },
        HIGH_5XX_ERROR_RATE: {
            cooldownMs: 5 * 60 * 1000,
            severity: 'critical',
            description: '5xx server error rate exceeds threshold (5%)',
        },
        SLOW_REQUEST_RATE: {
            cooldownMs: 5 * 60 * 1000,
            severity: 'warning',
            description: 'Slow request rate (>500ms) exceeds threshold (20%)',
        },
        JOB_FAILURE_BURST: {
            cooldownMs: 5 * 60 * 1000,
            severity: 'warning',
            description: 'Background task encountered consecutive failures (>= 3)',
        },
        SECURITY_ANOMALY: {
            cooldownMs: 5 * 60 * 1000,
            severity: 'warning',
            description: 'Elevated rate of 403 Forbidden or cross-tenant access attempts',
        },
    };
    /**
     * Triggers an alert with deduplication and cooldown enforcement.
     */
    triggerAlert(ruleKey, message, details, overrideSeverity, customCooldownMs) {
        const config = this.ruleConfigs[ruleKey] || {
            cooldownMs: 5 * 60 * 1000,
            severity: 'warning',
            description: 'General system alert',
        };
        const cooldown = customCooldownMs ?? config.cooldownMs;
        const severity = overrideSeverity ?? config.severity;
        const now = Date.now();
        const existing = this.activeAlerts.get(ruleKey);
        if (existing) {
            const elapsed = now - new Date(existing.timestamp).getTime();
            if (elapsed < cooldown) {
                existing.suppressedCount++;
                return {
                    triggered: false,
                    reason: `Alert "${ruleKey}" is in cooldown (${Math.round((cooldown - elapsed) / 1000)}s remaining). Suppressed ${existing.suppressedCount} occurrences.`,
                };
            }
        }
        const alert = {
            id: `alt_${ruleKey.toLowerCase()}_${now}`,
            ruleKey,
            severity,
            message,
            details,
            timestamp: new Date(now).toISOString(),
            suppressedCount: 0,
        };
        this.activeAlerts.set(ruleKey, alert);
        this.alertHistory.unshift(alert);
        if (this.alertHistory.length > this.maxHistory) {
            this.alertHistory.pop();
        }
        // Structured logging according to severity
        const logPayload = { alertId: alert.id, ruleKey, severity, details };
        if (severity === 'critical') {
            logger.error(`[INCIDENT ALERT] ${message}`, logPayload);
        }
        else if (severity === 'warning') {
            logger.warn(`[SYSTEM ALERT] ${message}`, logPayload);
        }
        else {
            logger.info(`[SYSTEM ALERT] ${message}`, logPayload);
        }
        return { triggered: true, alert };
    }
    /**
     * Evaluates current system metrics and triggers alerts when thresholds are violated.
     */
    evaluateMetrics() {
        const snapshot = metricsCollector.getSnapshot();
        const newAlerts = [];
        // Rule 1: High 5xx Error Rate (> 5% with min 10 requests)
        if (snapshot.http.totalRequests >= 10 && snapshot.http.errorRate5xx > 5.0) {
            const res = this.triggerAlert('HIGH_5XX_ERROR_RATE', `High 5xx error rate detected: ${snapshot.http.errorRate5xx}% over ${snapshot.http.totalRequests} requests`, { errorRate5xx: snapshot.http.errorRate5xx, totalRequests: snapshot.http.totalRequests });
            if (res.triggered && res.alert)
                newAlerts.push(res.alert);
        }
        // Rule 2: Slow Request Spike (> 20% requests exceed 500ms with min 10 requests)
        if (snapshot.http.totalRequests >= 10) {
            const slowRate = (snapshot.http.slowRequests / snapshot.http.totalRequests) * 100;
            if (slowRate > 20.0) {
                const res = this.triggerAlert('SLOW_REQUEST_RATE', `Elevated slow request rate: ${Math.round(slowRate)}% requests exceed 500ms`, { slowRate, slowCount: snapshot.http.slowRequests, total: snapshot.http.totalRequests });
                if (res.triggered && res.alert)
                    newAlerts.push(res.alert);
            }
        }
        // Rule 3: Background Job Consecutive Failures (>= 3)
        for (const [jobName, job] of Object.entries(snapshot.jobs)) {
            if (job.consecutiveFailures >= 3) {
                const res = this.triggerAlert('JOB_FAILURE_BURST', `Background job "${jobName}" failed ${job.consecutiveFailures} consecutive times`, { jobName, consecutiveFailures: job.consecutiveFailures, lastError: job.lastError });
                if (res.triggered && res.alert)
                    newAlerts.push(res.alert);
            }
        }
        return { evaluated: 3, newAlerts };
    }
    /**
     * Returns list of currently active alerts.
     */
    getActiveAlerts() {
        return Array.from(this.activeAlerts.values());
    }
    /**
     * Returns historical alerts.
     */
    getAlertHistory() {
        return [...this.alertHistory];
    }
    /**
     * Clears all alerts (for testing or manual resolution).
     */
    clearAlerts() {
        this.activeAlerts.clear();
        this.alertHistory = [];
    }
}
export const alertManager = new AlertManager();
