export class ApiResponse {
    static send(res, { statusCode = 200, success = true, message = 'Operation successful', data, meta, }) {
        return res.status(statusCode).json({
            success,
            message,
            ...(data !== undefined && { data }),
            meta: {
                timestamp: new Date().toISOString(),
                version: 'v1',
                ...meta,
            },
        });
    }
    static success(res, data, message = 'Success', statusCode = 200, meta) {
        return this.send(res, { statusCode, success: true, message, data, meta });
    }
    static created(res, data, message = 'Resource created successfully', meta) {
        return this.send(res, { statusCode: 201, success: true, message, data, meta });
    }
}
