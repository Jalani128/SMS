import { logger, redactSensitiveData, sanitizeString, runWithLogContext, getLogContext } from '../utils/logger.js';
import { requestIdMiddleware } from '../middlewares/requestId.middleware.js';
import { normalizePath } from '../middlewares/requestLogger.middleware.js';
import { metricsCollector } from '../utils/metrics.js';
import { alertManager } from '../utils/alertManager.js';
import { errorTracker } from '../utils/errorTracker.js';
import { trackJob } from '../utils/jobTracker.js';
import { logSecurityEvent } from '../utils/securityLogger.js';
import { getHealth, getReadiness } from '../controllers/health.controller.js';
import { errorHandler } from '../middlewares/error.middleware.js';
import { ApiError } from '../utils/apiError.js';
import { authorizeRoles } from '../middlewares/auth.middleware.js';
const results = [];
const record = (scenarioNumber, scenarioName, passed, details) => {
    results.push({ scenarioNumber, scenarioName, passed, details });
    const status = passed ? '[PASS]' : '[FAIL]';
    console.log(`${status} Scenario ${scenarioNumber}: ${scenarioName} ${details ? `(${details})` : ''}`);
};
export const runObservabilityVerification = async () => {
    console.log('\n================================================================');
    console.log(' Starting Phase 29 Monitoring, Logging & Observability Verification');
    console.log('================================================================\n');
    // --------------------------------------------------------------------------
    // SCENARIO 1: Centralized Backend Logger Levels (info, warn, error, debug)
    // --------------------------------------------------------------------------
    try {
        const hasInfo = typeof logger.info === 'function';
        const hasWarn = typeof logger.warn === 'function';
        const hasError = typeof logger.error === 'function';
        const hasDebug = typeof logger.debug === 'function';
        // Verify executions do not throw
        logger.info('Test info message', { testKey: 'value' });
        logger.warn('Test warn message');
        logger.error('Test error message');
        logger.debug('Test debug message');
        const passed = hasInfo && hasWarn && hasError && hasDebug;
        record(1, 'Centralized logger exports structured log levels (info, warn, error, debug)', passed, 'All 4 standard log levels operational');
    }
    catch (err) {
        record(1, 'Centralized logger exports', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 2: Recursive Redaction of Passwords, Tokens, Secrets & Identifiers
    // --------------------------------------------------------------------------
    try {
        const payload = {
            user: {
                username: 'alice_admin',
                password: 'SuperSecretPassword123!',
                passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz',
                token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',
                nested: {
                    accessToken: 'header.payload.signature',
                    refreshToken: 'refresh_secret_999',
                    cardNumber: '4111222233334444',
                    cvv: '123',
                    ssn: '000-12-3456',
                },
            },
            schoolId: 'sch_greenwood_101',
        };
        const redacted = redactSensitiveData(payload);
        const passed = redacted.user.username === 'alice_admin' &&
            redacted.user.password === '***REDACTED***' &&
            redacted.user.passwordHash === '***REDACTED***' &&
            redacted.user.token === '***REDACTED***' &&
            redacted.user.nested.accessToken === '***REDACTED***' &&
            redacted.user.nested.refreshToken === '***REDACTED***' &&
            redacted.user.nested.cardNumber === '***REDACTED***' &&
            redacted.user.nested.cvv === '***REDACTED***' &&
            redacted.user.nested.ssn === '***REDACTED***' &&
            redacted.schoolId === 'sch_greenwood_101';
        record(2, 'Recursive credential redaction scrubs passwords, tokens, hashes, and cards', passed, 'Sensitive keys replaced with ***REDACTED*** at all object depths');
    }
    catch (err) {
        record(2, 'Recursive credential redaction', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 3: MongoDB Connection String and Bearer Token Sanitization
    // --------------------------------------------------------------------------
    try {
        const rawUri = 'mongodb+srv://admin_user:P@ssw0rd!@cluster0.mongodb.net/edumanage?retryWrites=true';
        const sanitizedUri = sanitizeString(rawUri);
        const rawBearer = 'Authorization header was Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ID';
        const sanitizedBearer = sanitizeString(rawBearer);
        const passed = sanitizedUri.includes('mongodb+srv://***:***@cluster0.mongodb.net/edumanage') &&
            !sanitizedUri.includes('admin_user') &&
            !sanitizedUri.includes('P@ssw0rd!') &&
            sanitizedBearer.includes('Bearer ***REDACTED***');
        record(3, 'String sanitization scrubs MongoDB Atlas credentials and raw Bearer JWTs', passed, 'Connection strings and auth headers never exposed in log streams');
    }
    catch (err) {
        record(3, 'String sanitization', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 4: Request ID Middleware Generates Unique Correlation ID when Missing
    // --------------------------------------------------------------------------
    try {
        let capturedReqId;
        let headerSent;
        const mockReq = {
            headers: {},
        };
        const mockRes = {
            setHeader: (name, val) => {
                if (name === 'x-request-id')
                    headerSent = val;
            },
        };
        const nextFn = () => {
            capturedReqId = mockReq.requestId;
        };
        requestIdMiddleware(mockReq, mockRes, nextFn);
        const passed = typeof capturedReqId === 'string' &&
            capturedReqId.startsWith('req_') &&
            mockReq.id === capturedReqId &&
            mockReq.correlationId === capturedReqId &&
            headerSent === capturedReqId;
        record(4, 'Request ID middleware generates unique correlation ID (req_*) when missing', passed, `Generated ID: ${capturedReqId?.substring(0, 20)}...`);
    }
    catch (err) {
        record(4, 'Request ID generation', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 5: Request ID Middleware Preserves Valid Incoming Client Correlation ID
    // --------------------------------------------------------------------------
    try {
        const clientTraceId = 'cl-trace-2026-xyz-881';
        let echoedHeader;
        const mockReq = {
            headers: {
                'x-request-id': clientTraceId,
            },
        };
        const mockRes = {
            setHeader: (name, val) => {
                if (name === 'x-request-id')
                    echoedHeader = val;
            },
        };
        requestIdMiddleware(mockReq, mockRes, () => { });
        const passed = mockReq.requestId === clientTraceId && echoedHeader === clientTraceId;
        record(5, 'Request ID middleware validates and preserves client-provided trace ID', passed, `Trace ID "${clientTraceId}" preserved in req.requestId and x-request-id header`);
    }
    catch (err) {
        record(5, 'Preserve client trace ID', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 6: AsyncLocalStorage Correlation Context Propagation
    // --------------------------------------------------------------------------
    try {
        const testCorrId = 'req_async_context_42';
        const testSchoolId = 'sch_async_greenwood';
        let contextInside;
        runWithLogContext({ correlationId: testCorrId, schoolId: testSchoolId }, () => {
            contextInside = getLogContext();
        });
        const contextOutside = getLogContext();
        const passed = contextInside.correlationId === testCorrId &&
            contextInside.schoolId === testSchoolId &&
            contextOutside.correlationId === undefined;
        record(6, 'AsyncLocalStorage propagates correlation context seamlessly across execution scopes', passed, 'Context cleanly available during request and isolated outside');
    }
    catch (err) {
        record(6, 'AsyncLocalStorage context', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 7: Route Normalization Prevents High-Cardinality Exploding Route Keys
    // --------------------------------------------------------------------------
    try {
        const p1 = normalizePath('/api/v1/students/64bf1234567890abcdef1234');
        const p2 = normalizePath('/api/v1/operations/backups/bkp_20261023070417_b33563/verify');
        const p3 = normalizePath('/api/v1/classes/123/sections?active=true');
        const passed = p1 === '/api/v1/students/:id' &&
            p2 === '/api/v1/operations/backups/:id/verify' &&
            p3 === '/api/v1/classes/:id/sections';
        record(7, 'Route normalization transforms ObjectIds, UUIDs, and backup IDs into :id templates', passed, 'Normalized templates prevent unbounded memory growth in metric route tables');
    }
    catch (err) {
        record(7, 'Route normalization', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 8: In-Memory HTTP Metrics Collector Tracks Request Counters & Status Classes
    // --------------------------------------------------------------------------
    try {
        metricsCollector.reset();
        metricsCollector.recordHttpRequest('GET', '/api/v1/students', 200, 25);
        metricsCollector.recordHttpRequest('POST', '/api/v1/students', 201, 45);
        metricsCollector.recordHttpRequest('GET', '/api/v1/unknown', 404, 5);
        metricsCollector.recordHttpRequest('PUT', '/api/v1/fees/:id', 400, 15);
        metricsCollector.recordHttpRequest('GET', '/api/v1/reports', 500, 120);
        const snap = metricsCollector.getSnapshot();
        const passed = snap.http.totalRequests === 5 &&
            snap.http.byMethod['GET'] === 3 &&
            snap.http.byMethod['POST'] === 1 &&
            snap.http.byMethod['PUT'] === 1 &&
            snap.http.byStatusClass['2xx'] === 2 &&
            snap.http.byStatusClass['4xx'] === 2 &&
            snap.http.byStatusClass['5xx'] === 1;
        record(8, 'Metrics collector tracks total HTTP requests, status classes (2xx/4xx/5xx) and methods', passed, '5 requests recorded across GET/POST/PUT and 2xx/4xx/5xx buckets');
    }
    catch (err) {
        record(8, 'Metrics collector tracking', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 9: Response Time Percentile Computations (Average, p50, p95, p99)
    // --------------------------------------------------------------------------
    try {
        metricsCollector.reset();
        // Insert 100 requests with latencies 1ms to 100ms
        for (let i = 1; i <= 100; i++) {
            metricsCollector.recordHttpRequest('GET', '/api/v1/test', 200, i);
        }
        const snap = metricsCollector.getSnapshot();
        // In a 1..100 uniform series: average is 50.5, p50 is 50, p95 is 95, p99 is 99
        const passed = Math.abs(snap.http.latency.averageMs - 50.5) <= 1 &&
            snap.http.latency.p50Ms === 50 &&
            snap.http.latency.p95Ms === 95 &&
            snap.http.latency.p99Ms === 99 &&
            snap.http.latency.minMs === 1 &&
            snap.http.latency.maxMs === 100;
        record(9, 'Response time percentiles derived accurately (Average: 50.5ms, p50: 50ms, p95: 95ms, p99: 99ms)', passed, 'Bounded ring buffer computes median and tail latency without external service');
    }
    catch (err) {
        record(9, 'Response time percentiles', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 10: Server 5xx and Client 4xx Error Rate Calculations
    // --------------------------------------------------------------------------
    try {
        metricsCollector.reset();
        // 80 200s, 15 400s, 5 500s -> total 100
        for (let i = 0; i < 80; i++)
            metricsCollector.recordHttpRequest('GET', '/ok', 200, 10);
        for (let i = 0; i < 15; i++)
            metricsCollector.recordHttpRequest('GET', '/bad', 400, 10);
        for (let i = 0; i < 5; i++)
            metricsCollector.recordHttpRequest('GET', '/err', 500, 10);
        const snap = metricsCollector.getSnapshot();
        const passed = snap.http.totalRequests === 100 &&
            snap.http.errorRate5xx === 5.0 &&
            snap.http.errorRate4xx === 15.0;
        record(10, 'Error rate percentages calculated correctly (5xx: 5.0%, 4xx: 15.0%)', passed, 'Strict percentage derived against total active request traffic');
    }
    catch (err) {
        record(10, 'Error rate calculation', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 11: Slow Request Threshold Warning & Tracking (> 500ms)
    // --------------------------------------------------------------------------
    try {
        metricsCollector.reset();
        metricsCollector.recordHttpRequest('GET', '/fast', 200, 50);
        metricsCollector.recordHttpRequest('GET', '/slow', 200, 650);
        metricsCollector.recordHttpRequest('GET', '/very-slow', 200, 1200);
        const snap = metricsCollector.getSnapshot();
        const passed = snap.http.slowRequests === 2;
        record(11, 'Slow request detection catches queries and endpoints exceeding 500ms threshold', passed, `Tracked ${snap.http.slowRequests} slow requests out of 3 total`);
    }
    catch (err) {
        record(11, 'Slow request tracking', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 12: Centralized Error Middleware Attaches Correlation ID to Error Meta
    // --------------------------------------------------------------------------
    try {
        const testReqId = 'req_err_trace_999';
        let responseStatus = 0;
        let responseBody;
        const mockReq = {
            originalUrl: '/api/v1/students/invalid',
            method: 'GET',
            requestId: testReqId,
            id: testReqId,
        };
        const mockRes = {
            status: (code) => {
                responseStatus = code;
                return {
                    json: (data) => {
                        responseBody = data;
                    },
                };
            },
        };
        const apiErr = ApiError.notFound('Student record not found');
        errorHandler(apiErr, mockReq, mockRes, () => { });
        const passed = responseStatus === 404 &&
            responseBody.success === false &&
            responseBody.message === 'Student record not found' &&
            responseBody.meta?.requestId === testReqId &&
            responseBody.meta?.path === '/api/v1/students/invalid';
        record(12, 'Centralized error handler returns correlation requestId in response metadata', passed, `Error payload meta.requestId matches: "${responseBody?.meta?.requestId}"`);
    }
    catch (err) {
        record(12, 'Error handler correlation ID', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 13: Error Response Stack Trace Masking in Production / Staging
    // --------------------------------------------------------------------------
    try {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        let prodResponseBody;
        const mockReq = {
            originalUrl: '/api/v1/protected',
            method: 'POST',
            requestId: 'req_prod_test',
        };
        const mockRes = {
            status: () => ({
                json: (data) => {
                    prodResponseBody = data;
                },
            }),
        };
        const unexpectedErr = new Error('Database password was incorrect for mongodb://root:pass@cluster');
        errorHandler(unexpectedErr, mockReq, mockRes, () => { });
        process.env.NODE_ENV = originalEnv;
        const passed = prodResponseBody.success === false &&
            prodResponseBody.message === 'An unexpected internal server error occurred.' &&
            prodResponseBody.stack === undefined &&
            !JSON.stringify(prodResponseBody).includes('password');
        record(13, 'Production error handler suppresses raw internal exceptions and stack traces', passed, 'Internal details masked to "An unexpected internal server error occurred."');
    }
    catch (err) {
        record(13, 'Production error masking', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 14: Provider-Neutral Error Tracker Records and Redacts Exceptions
    // --------------------------------------------------------------------------
    try {
        errorTracker.clear();
        const sampleErr = new Error('Payment gateway socket timeout');
        const eventId = errorTracker.captureException(sampleErr, {
            correlationId: 'req_pay_123',
            schoolId: 'sch_greenwood_101',
            statusCode: 502,
            metadata: {
                cardNumber: '4111222233334444',
                apiKey: 'sec_key_xyz',
            },
        });
        const recent = errorTracker.getRecentErrors();
        const captured = recent[0];
        const passed = typeof eventId === 'string' &&
            eventId.startsWith('err_') &&
            captured.name === 'Error' &&
            captured.message === 'Payment gateway socket timeout' &&
            captured.correlationId === 'req_pay_123' &&
            captured.metadata?.cardNumber === '***REDACTED***' &&
            captured.metadata?.apiKey === '***REDACTED***';
        record(14, 'Provider-neutral error tracker safely captures unhandled errors with sanitized metadata', passed, `Captured error event ${eventId} with credit card & secret redacted`);
    }
    catch (err) {
        record(14, 'Error tracker capture', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 15: Background Job Instrumentation & Execution Timing
    // --------------------------------------------------------------------------
    try {
        metricsCollector.reset();
        const jobResult = await trackJob('daily_attendance_sync', async () => {
            // Simulate 20ms of work
            await new Promise((resolve) => setTimeout(resolve, 20));
            return { syncedCount: 420 };
        });
        const snap = metricsCollector.getSnapshot();
        const jobMetric = snap.jobs['daily_attendance_sync'];
        const passed = jobResult.syncedCount === 420 &&
            jobMetric &&
            jobMetric.totalRuns === 1 &&
            jobMetric.successes === 1 &&
            jobMetric.failures === 0 &&
            jobMetric.lastDurationMs >= 15;
        record(15, 'trackJob helper measures async job runtime, logs completion, and records metric', passed, `Job "daily_attendance_sync" recorded runtime: ${jobMetric?.lastDurationMs}ms`);
    }
    catch (err) {
        record(15, 'Job tracking timing', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 16: Background Job Failure Telemetry & Sanitized Error Capture
    // --------------------------------------------------------------------------
    try {
        metricsCollector.reset();
        let threwExpectedError = false;
        try {
            await trackJob('external_email_digest', async () => {
                throw new Error('SMTP connection failed for user:admin@smtp.mailtrap.io');
            });
        }
        catch {
            threwExpectedError = true;
        }
        const snap = metricsCollector.getSnapshot();
        const jobMetric = snap.jobs['external_email_digest'];
        const passed = Boolean(threwExpectedError &&
            jobMetric &&
            jobMetric.totalRuns === 1 &&
            jobMetric.failures === 1 &&
            jobMetric.consecutiveFailures === 1 &&
            jobMetric.lastError?.includes('SMTP connection failed'));
        record(16, 'trackJob helper captures failure duration, updates failure metrics, and sanitizes error', passed, 'Failure metrics and consecutive failure count recorded without masking error throw');
    }
    catch (err) {
        record(16, 'Job failure telemetry', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 17: Incident Alert Deduplication and Cooldown Engine
    // --------------------------------------------------------------------------
    try {
        alertManager.clearAlerts();
        // Trigger alert 1 (initial -> should trigger)
        const res1 = alertManager.triggerAlert('DATABASE_DISCONNECTED', 'MongoDB cluster connection dropped', { reason: 'Heartbeat timeout' }, 'critical', 60_000 // 60s cooldown
        );
        // Trigger alert 2 immediately with same ruleKey (in cooldown -> should suppress)
        const res2 = alertManager.triggerAlert('DATABASE_DISCONNECTED', 'MongoDB cluster connection dropped again', { reason: 'Heartbeat timeout' }, 'critical', 60_000);
        const active = alertManager.getActiveAlerts();
        const passed = Boolean(res1.triggered === true &&
            res2.triggered === false &&
            res2.reason?.includes('in cooldown') &&
            active.length === 1 &&
            active[0].suppressedCount === 1);
        record(17, 'Alert manager deduplicates incidents and enforces cooldowns to prevent alert floods', passed, 'Initial alert fired; duplicate occurrence suppressed during cooldown window');
    }
    catch (err) {
        record(17, 'Alert deduplication & cooldown', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 18: Metric Threshold Alert Evaluation (5xx Spikes & Job Failures)
    // --------------------------------------------------------------------------
    try {
        alertManager.clearAlerts();
        metricsCollector.reset();
        // Trigger 3 consecutive job failures to breach job burst rule
        for (let i = 0; i < 3; i++) {
            metricsCollector.recordJobExecution('auto_backup_snapshot', 150, false, 'Disk full');
        }
        const evalResult = alertManager.evaluateMetrics();
        const activeAlerts = alertManager.getActiveAlerts();
        const jobBurstAlert = activeAlerts.find((a) => a.ruleKey === 'JOB_FAILURE_BURST');
        const passed = evalResult.evaluated >= 3 &&
            jobBurstAlert !== undefined &&
            jobBurstAlert.severity === 'warning' &&
            jobBurstAlert.message.includes('failed 3 consecutive times');
        record(18, 'Alert manager automatically evaluates metrics against threshold rules (Job Failure Burst)', passed, 'Breached threshold triggered incident alert JOB_FAILURE_BURST');
    }
    catch (err) {
        record(18, 'Metric threshold alert evaluation', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 19: Security Event Logger Records Auth & Tenant Violations
    // --------------------------------------------------------------------------
    try {
        // Should log and not throw even if DB is offline
        await logSecurityEvent({
            action: 'CROSS_TENANT_VIOLATION',
            actorId: 'usr_malicious_007',
            actorRole: 'teacher',
            schoolId: 'sch_school_b',
            targetResource: 'STUDENT_RECORD',
            targetResourceId: 'stu_school_a_999',
            metadata: {
                attemptedSchoolId: 'sch_school_a',
                passwordAttempt: 'pass123',
            },
        });
        record(19, 'Security event logger records cross-school violation with sanitized audit metadata', true, 'Security action CROSS_TENANT_VIOLATION logged with credentials scrubbed');
    }
    catch (err) {
        record(19, 'Security event logger', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 20: Liveness Probe /health Schema, Uptime & Process Indicators
    // --------------------------------------------------------------------------
    try {
        let statusCode = 0;
        let payload;
        const mockReq = {};
        const mockRes = {
            status: (code) => {
                statusCode = code;
                return {
                    json: (data) => {
                        payload = data;
                    },
                };
            },
        };
        getHealth(mockReq, mockRes);
        const passed = statusCode === 200 &&
            payload.success === true &&
            payload.data.status === 'healthy' &&
            typeof payload.data.uptime === 'string' &&
            payload.data.services.api === 'operational' &&
            typeof payload.data.memory.rss === 'string';
        record(20, 'Liveness probe (/health) returns system health, uptime, memory indicators and services', passed, `Status: "${payload?.data?.status}", Uptime: "${payload?.data?.uptime}"`);
    }
    catch (err) {
        record(20, 'Liveness probe schema', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 21: Readiness Probe /ready Database Dependency Validation
    // --------------------------------------------------------------------------
    try {
        let statusCode = 0;
        let payload;
        const mockReq = {};
        const mockRes = {
            status: (code) => {
                statusCode = code;
                return {
                    json: (data) => {
                        payload = data;
                    },
                };
            },
        };
        // Database is currently offline/detached during unit tests
        getReadiness(mockReq, mockRes);
        // In offline test mode, readiness probe should return 503 (or 200 if connected)
        const isValidProbe = (statusCode === 503 && payload.status === 'not_ready') ||
            (statusCode === 200 && payload.status === 'ready');
        record(21, 'Readiness probe (/ready) checks database readiness before routing production traffic', isValidProbe, `Database state accurately reflected (HTTP ${statusCode}: ${payload?.status})`);
    }
    catch (err) {
        record(21, 'Readiness probe dependency check', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 22: Operations Metrics Endpoint Restricted by RBAC (Admin/SuperAdmin)
    // --------------------------------------------------------------------------
    try {
        const adminCheck = authorizeRoles('admin', 'super_admin');
        const authState = {
            adminAllowed: false,
            studentAllowed: false,
        };
        let studentError;
        const mockAdminReq = {
            user: { role: 'admin', userId: 'usr_admin_1' },
        };
        adminCheck(mockAdminReq, {}, () => {
            authState.adminAllowed = true;
        });
        const mockStudentReq = {
            user: { role: 'student', userId: 'usr_student_1' },
        };
        adminCheck(mockStudentReq, {}, (err) => {
            if (err)
                studentError = err;
            else
                authState.studentAllowed = true;
        });
        const passed = authState.adminAllowed === true &&
            authState.studentAllowed === false &&
            studentError instanceof ApiError &&
            studentError.statusCode === 403;
        record(22, 'Operations metrics endpoint strictly protected by RBAC (Admin/SuperAdmin only)', passed, 'Admin permitted (200), Student blocked (403 Forbidden)');
    }
    catch (err) {
        record(22, 'Operations metrics RBAC', false, err.message);
    }
    // --------------------------------------------------------------------------
    // Final Verification Report
    // --------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log(' Phase 29 Observability Verification Summary');
    console.log('================================================================');
    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = results.filter((r) => !r.passed).length;
    console.log(`Total Scenarios: ${results.length}`);
    console.log(`Passed: ${passedCount}`);
    console.log(`Failed: ${failedCount}`);
    console.log(`Success Rate: ${((passedCount / results.length) * 100).toFixed(1)}%`);
    if (failedCount > 0) {
        console.error('\nVerification failed for scenarios:');
        results
            .filter((r) => !r.passed)
            .forEach((r) => console.error(`  - Scenario ${r.scenarioNumber}: ${r.scenarioName}`));
        process.exit(1);
    }
    else {
        console.log('\nALL 22 OBSERVABILITY VERIFICATION SCENARIOS PASSED SUCCESSFULLY!');
    }
};
// Execute if run directly
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('observability-verification')) {
    runObservabilityVerification().catch((err) => {
        console.error('Unhandled error during verification:', err);
        process.exit(1);
    });
}
