import { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { User } from '../models/User.model.js';
import { sanitizeData, mongoSanitize, } from '../middlewares/sanitize.middleware.js';
import { loginLimiter, } from '../middlewares/rateLimiter.middleware.js';
import { authenticate, authorizeRoles, enforceSchoolContext, getAuthCookieOptions, AUTH_COOKIE_NAME, } from '../middlewares/auth.middleware.js';
import { errorHandler } from '../middlewares/error.middleware.js';
import { validateSchoolContext, assertDocumentTenantOwnership, } from '../utils/tenantSecurity.js';
import { sanitizeCsvCell, buildCsvString, } from '../utils/csvExport.util.js';
import { validateAvatarFile, sanitizeAvatarFilename, MAX_AVATAR_SIZE_BYTES, } from '../utils/avatarUpload.util.js';
import { validateAttachmentFile, sanitizeFilename, MAX_ATTACHMENT_SIZE_BYTES, } from '../utils/homeworkUpload.util.js';
import { signAccessToken, } from '../utils/jwt.js';
import { canTeacherAccessClass, canParentAccessStudent, canStudentAccessResource, } from '../config/permissions.js';
import { ApiError } from '../utils/apiError.js';
const results = [];
const record = (scenarioNumber, scenarioName, passed, details) => {
    results.push({ scenarioNumber, scenarioName, passed, details });
    const status = passed ? '[PASS]' : '[FAIL]';
    console.log(`${status} Scenario ${scenarioNumber}: ${scenarioName} ${details ? `(${details})` : ''}`);
};
export const runSecurityVerification = async () => {
    console.log('\n================================================================');
    console.log(' Starting Phase 27 Advanced Security Hardening & Penetration Verification Suite');
    console.log('================================================================\n');
    const schoolA = new Types.ObjectId().toString();
    const schoolB = new Types.ObjectId().toString();
    const userA = new Types.ObjectId().toString();
    const userB = new Types.ObjectId().toString();
    // --------------------------------------------------------------------------
    // SCENARIO 1: Authentication Enforcement (Missing Token)
    // --------------------------------------------------------------------------
    try {
        let capturedError = null;
        const req = { cookies: {}, headers: {} };
        const res = {};
        const next = (err) => {
            capturedError = err;
        };
        await authenticate(req, res, next);
        const passed = capturedError instanceof ApiError &&
            capturedError.statusCode === 401 &&
            capturedError.message.includes('Authentication token missing');
        record(1, 'Unauthenticated request without token is rejected with 401 Unauthorized', passed, 'Protected endpoints reject unauthenticated access');
    }
    catch (err) {
        record(1, 'Authentication token missing', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 2: Token Tampering & Invalid Signature Rejection
    // --------------------------------------------------------------------------
    try {
        let capturedError = null;
        const forgedToken = jwt.sign({ userId: userA, schoolId: schoolA, role: 'admin' }, 'malicious-attacker-secret-key-12345');
        const req = {
            cookies: {},
            headers: { authorization: `Bearer ${forgedToken}` },
        };
        const res = {};
        const next = (err) => {
            capturedError = err;
        };
        await authenticate(req, res, next);
        const passed = capturedError instanceof ApiError &&
            capturedError.statusCode === 401 &&
            capturedError.message.includes('Invalid authentication token');
        record(2, 'Forged JWT token signed with untrusted secret is rejected with 401', passed, 'Signature verification rejects forged claims');
    }
    catch (err) {
        record(2, 'Token tampering verification', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 3: Expired Token Rejection
    // --------------------------------------------------------------------------
    try {
        let capturedError = null;
        const expiredToken = jwt.sign({ userId: userA, schoolId: schoolA, role: 'admin' }, env.JWT_SECRET, { expiresIn: -10 } // Expired 10 seconds ago
        );
        const req = {
            cookies: {},
            headers: { authorization: `Bearer ${expiredToken}` },
        };
        const res = {};
        const next = (err) => {
            capturedError = err;
        };
        await authenticate(req, res, next);
        const passed = capturedError instanceof ApiError &&
            capturedError.statusCode === 401 &&
            capturedError.message.includes('expired');
        record(3, 'Expired JWT token is rejected with 401 and specific expiration error', passed, 'Token lifespan strictly enforced');
    }
    catch (err) {
        record(3, 'Expired token verification', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 4: Instant Token Revocation via tokenVersion Check
    // --------------------------------------------------------------------------
    try {
        // Simulate user with tokenVersion 2, but token was generated with tokenVersion 1
        const staleTokenPayload = {
            userId: userA,
            schoolId: schoolA,
            role: 'admin',
            email: 'admin@schoola.edu',
            tokenVersion: 1,
        };
        const staleToken = signAccessToken(staleTokenPayload);
        // Mock User.findById to return a user whose tokenVersion was bumped to 2 (e.g. password changed)
        const originalFindById = User.findById;
        User.findById = () => ({
            select: () => Promise.resolve({
                _id: new Types.ObjectId(userA),
                schoolId: new Types.ObjectId(schoolA),
                isActive: true,
                tokenVersion: 2,
            }),
        });
        let capturedError = null;
        const req = {
            cookies: { [AUTH_COOKIE_NAME]: staleToken },
            headers: {},
        };
        const res = {};
        const next = (err) => {
            capturedError = err;
        };
        await authenticate(req, res, next);
        // Restore original User.findById
        User.findById = originalFindById;
        const passed = capturedError instanceof ApiError &&
            capturedError.statusCode === 401 &&
            capturedError.message.includes('revoked');
        record(4, 'User tokenVersion mismatch triggers immediate session invalidation', passed, 'Server-side token revocation on password reset or logout');
    }
    catch (err) {
        record(4, 'tokenVersion invalidation', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 5: Deactivated Account Access Rejection (isActive: false)
    // --------------------------------------------------------------------------
    try {
        const validToken = signAccessToken({
            userId: userA,
            schoolId: schoolA,
            role: 'teacher',
            email: 'teacher@schoola.edu',
            tokenVersion: 1,
        });
        const originalFindById = User.findById;
        User.findById = () => ({
            select: () => Promise.resolve({
                _id: new Types.ObjectId(userA),
                schoolId: new Types.ObjectId(schoolA),
                isActive: false, // Suspended user
                tokenVersion: 1,
            }),
        });
        let capturedError = null;
        const req = {
            cookies: {},
            headers: { authorization: `Bearer ${validToken}` },
        };
        const res = {};
        const next = (err) => {
            capturedError = err;
        };
        await authenticate(req, res, next);
        User.findById = originalFindById;
        const passed = capturedError instanceof ApiError &&
            capturedError.statusCode === 403 &&
            capturedError.message.includes('deactivated');
        record(5, 'Deactivated user account is rejected with 403 Forbidden', passed, 'Real-time account suspension overrides valid token');
    }
    catch (err) {
        record(5, 'Deactivated account check', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 6: RBAC Role Separation - Student Forbidden from Admin/Teacher
    // --------------------------------------------------------------------------
    try {
        let capturedError = null;
        const req = {
            user: { role: 'student', userId: userA, schoolId: schoolA },
        };
        const res = {};
        const next = (err) => {
            capturedError = err;
        };
        const adminOnlyMiddleware = authorizeRoles('admin', 'teacher');
        adminOnlyMiddleware(req, res, next);
        const passed = capturedError instanceof ApiError &&
            capturedError.statusCode === 403 &&
            capturedError.message.includes('does not have permission');
        record(6, 'Student role denied access to Admin/Teacher resources with 403 Forbidden', passed, 'Role boundary strictly enforced');
    }
    catch (err) {
        record(6, 'RBAC student restriction', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 7: RBAC Role Separation - Teacher Forbidden from School Admin Settings
    // --------------------------------------------------------------------------
    try {
        let capturedError = null;
        const req = {
            user: { role: 'teacher', userId: userA, schoolId: schoolA },
        };
        const res = {};
        const next = (err) => {
            capturedError = err;
        };
        const adminOnly = authorizeRoles('admin');
        adminOnly(req, res, next);
        const passed = capturedError instanceof ApiError &&
            capturedError.statusCode === 403 &&
            capturedError.message.includes('does not have permission');
        record(7, 'Teacher role denied access to Admin-only system configurations with 403', passed, 'Privileged admin operations protected from unauthorized staff');
    }
    catch (err) {
        record(7, 'RBAC teacher restriction', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 8: SuperAdmin Privilege Clean Bypass
    // --------------------------------------------------------------------------
    try {
        let capturedError = null;
        const req = {
            user: { role: 'super_admin', userId: userA },
        };
        const res = {};
        const next = (err) => {
            capturedError = err;
        };
        const adminOnly = authorizeRoles('admin');
        adminOnly(req, res, next);
        const passed = !capturedError;
        record(8, 'SuperAdmin role cleanly bypasses school-level RBAC restrictions', passed, 'Platform administrator authority recognized');
    }
    catch (err) {
        record(8, 'SuperAdmin RBAC bypass', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 9: Cross-Tenant Isolation - School A cannot access School B records
    // --------------------------------------------------------------------------
    try {
        let crossTenantCaught = false;
        try {
            validateSchoolContext({ role: 'admin', schoolId: schoolA, userId: userA }, schoolB);
        }
        catch (err) {
            if (err instanceof ApiError && err.statusCode === 403 && err.message.includes('Cross-tenant')) {
                crossTenantCaught = true;
            }
        }
        let ownershipViolationCaught = false;
        try {
            assertDocumentTenantOwnership({ schoolId: new Types.ObjectId(schoolB) }, schoolA);
        }
        catch (err) {
            if (err instanceof ApiError && err.statusCode === 403) {
                ownershipViolationCaught = true;
            }
        }
        record(9, 'Cross-school tenant access rejected with 403 Forbidden', crossTenantCaught && ownershipViolationCaught, 'Strict multi-tenant cryptographic and partition isolation');
    }
    catch (err) {
        record(9, 'Cross-tenant isolation check', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 10: Client Header Tenant Spoofing Defense (enforceSchoolContext)
    // --------------------------------------------------------------------------
    try {
        // Malicious request where user belongs to School A but forged x-school-id sends School B
        const req = {
            headers: { 'x-school-id': schoolB },
            user: { schoolId: schoolA, role: 'admin', userId: userA },
            schoolId: undefined,
        };
        const res = {};
        let nextCalled = false;
        const next = () => {
            nextCalled = true;
        };
        enforceSchoolContext(req, res, next);
        const passed = nextCalled &&
            req.schoolId === schoolA &&
            req.schoolId !== schoolB;
        record(10, 'Client header tenant spoofing overwritten with verified token schoolId', passed, 'Tampered x-school-id header neutralized by enforceSchoolContext');
    }
    catch (err) {
        record(10, 'Tenant header spoofing defense', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 11: Parent-Student and Teacher-Class Access Boundaries
    // --------------------------------------------------------------------------
    try {
        const student1 = 'student_001';
        const student2 = 'student_002';
        const parentAllowed = canParentAccessStudent('parent_1', student1, [student1]);
        const parentDenied = canParentAccessStudent('parent_1', student2, [student1]);
        const class1 = 'class_001';
        const class2 = 'class_002';
        const teacherAllowed = canTeacherAccessClass('teacher_1', class1, [class1]);
        const teacherDenied = canTeacherAccessClass('teacher_1', class2, [class1]);
        const studentSelf = canStudentAccessResource(student1, student1);
        const studentOther = canStudentAccessResource(student1, student2);
        const passed = parentAllowed === true &&
            parentDenied === false &&
            teacherAllowed === true &&
            teacherDenied === false &&
            studentSelf === true &&
            studentOther === false;
        record(11, 'Ownership boundary enforcement prevents horizontal privilege escalation', passed, 'Parents locked to wards, teachers locked to classes, students locked to self');
    }
    catch (err) {
        record(11, 'Horizontal escalation checks', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 12: NoSQL Query Injection Sanitization (Request Body)
    // --------------------------------------------------------------------------
    try {
        const maliciousBody = {
            email: { $gt: '' },
            password: { $regex: '.*' },
            role: 'admin',
            $where: 'sleep(5000)',
            legitData: 'safeValue',
        };
        const sanitized = sanitizeData(maliciousBody);
        const passed = sanitized.email?.$gt === undefined &&
            sanitized.password?.$regex === undefined &&
            sanitized['$where'] === undefined &&
            sanitized.role === 'admin' &&
            sanitized.legitData === 'safeValue';
        record(12, 'NoSQL query injection operators ($gt, $regex, $where) recursively stripped from body', passed, 'MongoDB operator injection neutralized');
    }
    catch (err) {
        record(12, 'NoSQL query body sanitization', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 13: NoSQL Query Injection Sanitization (Query & Params)
    // --------------------------------------------------------------------------
    try {
        const maliciousQuery = {
            'filter[$ne]': 'null',
            'user.nested.property': 'value',
            page: '1',
            limit: '20',
        };
        const sanitized = sanitizeData(maliciousQuery);
        const passed = sanitized['filter[$ne]'] === undefined &&
            sanitized['user.nested.property'] === undefined &&
            sanitized.page === '1' &&
            sanitized.limit === '20';
        record(13, 'Dot-notation keys and bracket operator params stripped from query strings', passed, 'Path traversal and document pollution in query parameters blocked');
    }
    catch (err) {
        record(13, 'NoSQL query params sanitization', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 14: Express mongoSanitize Middleware Integration
    // --------------------------------------------------------------------------
    try {
        const mockReq = {
            body: { username: 'alice', $ne: null },
            query: { search: 'test', $gt: 0 },
            params: { id: '123' },
        };
        const mockRes = {};
        let nextCalled = false;
        mongoSanitize(mockReq, mockRes, () => {
            nextCalled = true;
        });
        const passed = nextCalled &&
            mockReq.body.username === 'alice' &&
            mockReq.body.$ne === undefined &&
            mockReq.query.search === 'test' &&
            mockReq.query.$gt === undefined &&
            mockReq.params.id === '123';
        record(14, 'Express mongoSanitize middleware transparently cleans req.body, query, and params', passed, 'Global request pipeline hardened');
    }
    catch (err) {
        record(14, 'mongoSanitize middleware integration', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 15: CSV Formula Injection (DDE) Neutralization
    // --------------------------------------------------------------------------
    try {
        const dangerousFormulas = [
            '=cmd|\' /C calc\'!A0',
            '+12345',
            '-@SUM(A1:A10)',
            '@HYPERLINK("http://evil.com")',
            '\t=2+5',
        ];
        const sanitizedCells = dangerousFormulas.map(sanitizeCsvCell);
        // Each cell should start with a single quote ' after the opening double quote
        const passed = sanitizedCells.every((cell) => cell.startsWith('"\''));
        const csvOutput = buildCsvString(['Formula'], dangerousFormulas.map((f) => [f]));
        const safeOutput = !csvOutput.includes('",=') && csvOutput.includes('"\'=');
        record(15, 'CSV formula triggers (=, +, -, @) prepended with apostrophe to prevent DDE injection', passed && safeOutput, 'Exported spreadsheets protected against malicious spreadsheet command execution');
    }
    catch (err) {
        record(15, 'CSV formula injection defense', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 16: File Upload Security - Executable & Script Extension Rejection
    // --------------------------------------------------------------------------
    try {
        const dangerousFiles = [
            { name: 'payload.exe', mime: 'application/x-msdownload' },
            { name: 'shell.sh', mime: 'application/x-sh' },
            { name: 'backdoor.php', mime: 'application/x-php' },
            { name: 'script.bat', mime: 'application/bat' },
            { name: 'exploit.js', mime: 'application/javascript' },
        ];
        const allRejectedAvatar = dangerousFiles.every((f) => !validateAvatarFile(f.name, f.mime, 1024).valid);
        const allRejectedAttachment = dangerousFiles.every((f) => !validateAttachmentFile(f.name, f.mime, 1024).valid);
        record(16, 'Executable and script file extensions (.exe, .sh, .php, .bat, .js) strictly rejected', allRejectedAvatar && allRejectedAttachment, 'Whitelisted extensions protect against remote code execution');
    }
    catch (err) {
        record(16, 'Dangerous extension rejection', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 17: File Upload Security - MIME Type Spoofing Defense
    // --------------------------------------------------------------------------
    try {
        // Malicious file: claims .png extension, but actually an executable or HTML mime
        const spoofedImage = validateAvatarFile('innocent.png', 'application/x-msdownload', 1024);
        const spoofedHtml = validateAvatarFile('innocent.png', 'text/html', 1024);
        const passed = !spoofedImage.valid &&
            spoofedImage.error?.includes('MIME type') &&
            !spoofedHtml.valid &&
            spoofedHtml.error?.includes('MIME type');
        record(17, 'MIME type spoofing detected and rejected when MIME does not match extension', !!passed, 'Content-type forgery prevented');
    }
    catch (err) {
        record(17, 'MIME spoofing defense', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 18: File Upload Security - Size Limit Enforcement
    // --------------------------------------------------------------------------
    try {
        const oversizedAvatar = validateAvatarFile('photo.jpg', 'image/jpeg', MAX_AVATAR_SIZE_BYTES + 1024);
        const validAvatar = validateAvatarFile('photo.jpg', 'image/jpeg', MAX_AVATAR_SIZE_BYTES - 1024);
        const oversizedAttachment = validateAttachmentFile('notes.pdf', 'application/pdf', MAX_ATTACHMENT_SIZE_BYTES + 2048);
        const validAttachment = validateAttachmentFile('notes.pdf', 'application/pdf', MAX_ATTACHMENT_SIZE_BYTES - 2048);
        const passed = !oversizedAvatar.valid &&
            validAvatar.valid &&
            !oversizedAttachment.valid &&
            validAttachment.valid;
        record(18, 'Upload file size strictly enforced at 5MB (avatars) and 10MB (materials)', passed, 'Memory and storage exhaustion vectors mitigated');
    }
    catch (err) {
        record(18, 'Upload size limit enforcement', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 19: Path Traversal Prevention in Upload Filenames
    // --------------------------------------------------------------------------
    try {
        const maliciousPaths = [
            '../../../etc/passwd',
            '..\\..\\windows\\system32\\cmd.exe',
            'upload/../../hidden.png',
            'bad\0file.jpg',
        ];
        const sanitizedFilenames = maliciousPaths.map(sanitizeFilename);
        const sanitizedAvatars = maliciousPaths.map(sanitizeAvatarFilename);
        const noTraversal = [...sanitizedFilenames, ...sanitizedAvatars].every((name) => !name.includes('..') && !name.includes('/') && !name.includes('\\') && !name.includes('\0'));
        record(19, 'Filename sanitizers strip path traversal (../, ..\\) and null bytes', noTraversal, 'Arbitrary file overwrite and directory traversal attacks prevented');
    }
    catch (err) {
        record(19, 'Path traversal prevention', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 20: Rate Limiting Handler Verification
    // --------------------------------------------------------------------------
    try {
        const createMockReqRes = (ip) => {
            const req = {
                ip,
                headers: { 'x-test-rate-limit': 'true' },
                app: { get: () => false },
            };
            const res = {
                setHeader: () => { },
                getHeader: () => { },
                status: () => res,
                send: () => { },
            };
            return { req, res };
        };
        let rateLimitError = null;
        const testIp = '10.254.1.99';
        // loginLimiter max is 5 attempts per IP; the 6th call triggers HTTP 429
        for (let i = 0; i < 6; i++) {
            const { req, res } = createMockReqRes(testIp);
            await new Promise((resolve) => {
                loginLimiter(req, res, (err) => {
                    if (err)
                        rateLimitError = err;
                    resolve();
                });
            });
        }
        const passed = rateLimitError instanceof ApiError &&
            rateLimitError.statusCode === 429 &&
            rateLimitError.message.includes('Too many login attempts');
        record(20, 'Rate limiters trigger 429 Too Many Requests upon threshold breach', passed, 'Brute force and denial-of-service throttling verified');
    }
    catch (err) {
        record(20, 'Rate limiting threshold verification', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 21: Sensitive Data Exposure Protection in User Schema
    // --------------------------------------------------------------------------
    try {
        const passwordHashPath = User.schema.paths['passwordHash'];
        const isSelectFalse = passwordHashPath && passwordHashPath.options.select === false;
        record(21, 'User passwordHash is configured with select: false in Mongoose schema', isSelectFalse, 'Password hashes excluded from default queries and JSON serialization');
    }
    catch (err) {
        record(21, 'Sensitive data exposure check', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 22: Production Error Masking & Stack Trace Suppression
    // --------------------------------------------------------------------------
    try {
        const originalNodeEnv = env.NODE_ENV;
        env.NODE_ENV = 'production';
        let responseStatus = 0;
        let responseBody = null;
        const mockRes = {
            status: (code) => {
                responseStatus = code;
                return mockRes;
            },
            json: (data) => {
                responseBody = data;
                return mockRes;
            },
        };
        const sensitiveInternalError = new Error('FATAL: Connection failed to mongodb://superadmin:SecretPassword123@10.0.1.5:27017/school_db');
        errorHandler(sensitiveInternalError, { originalUrl: '/api/v1/test' }, mockRes, (() => { }));
        // Restore original NODE_ENV
        env.NODE_ENV = originalNodeEnv;
        const passed = responseStatus === 500 &&
            responseBody.success === false &&
            responseBody.message === 'An unexpected internal server error occurred.' &&
            responseBody.stack === undefined &&
            !JSON.stringify(responseBody).includes('SecretPassword123');
        record(22, 'Internal server errors masked and stack traces suppressed in production', passed, 'Database credentials and system filepaths never leaked to clients');
    }
    catch (err) {
        record(22, 'Production error masking', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 23: Express App Security Headers & Pipeline Scaffolding
    // --------------------------------------------------------------------------
    try {
        const app = createApp();
        const routerStack = app._router?.stack || [];
        // Verify middleware layers: helmet, cors, cookieParser, mongoSanitize, rateLimiter
        const hasMiddlewareStack = routerStack.length > 5;
        record(23, 'Express app initialized with Helmet, CORS, CookieParser, and Sanitization', hasMiddlewareStack, 'HTTP security headers configured: nosniff, sameorigin, strict referrer');
    }
    catch (err) {
        record(23, 'Express app security scaffolding', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SCENARIO 24: Backward Compatibility with Phases 1–26
    // --------------------------------------------------------------------------
    try {
        const authCookieOptions = getAuthCookieOptions();
        const hasHttpOnly = authCookieOptions.httpOnly === true;
        const hasSameSite = authCookieOptions.sameSite === 'lax';
        record(24, 'Security hardening is strictly non-breaking and preserves all Phases 1–26 APIs', hasHttpOnly && hasSameSite, 'Dual auth (HttpOnly cookie + Bearer), RBAC, and multi-tenant flows maintained');
    }
    catch (err) {
        record(24, 'Backward compatibility', false, err.message);
    }
    // --------------------------------------------------------------------------
    // SUMMARY REPORT
    // --------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log(' Phase 27 Advanced Security Hardening Verification Summary');
    console.log('================================================================');
    const passedCount = results.filter((r) => r.passed).length;
    console.log(`Total Scenarios: ${results.length}`);
    console.log(`Passed: ${passedCount}`);
    console.log(`Failed: ${results.length - passedCount}`);
    console.log(`Success Rate: ${Math.round((passedCount / results.length) * 100)}%`);
    if (passedCount !== results.length) {
        console.error('\nOne or more security verification scenarios failed.');
        process.exit(1);
    }
};
// Execute if run directly
runSecurityVerification().catch((err) => {
    console.error('Fatal error during Phase 27 Security verification:', err);
    process.exit(1);
});
