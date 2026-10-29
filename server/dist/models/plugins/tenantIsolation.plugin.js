/**
 * Mongoose Multi-Tenancy Scoping Plugin
 * Automatically appends the schoolId filter to queries
 * unless explicitly bypassed via query option { skipTenantFilter: true }
 */
export const tenantIsolationPlugin = (schema, options) => {
    const tenantField = options?.tenantField || 'schoolId';
    const applyTenantFilter = function () {
        const currentOptions = this.getOptions();
        // Allow super-admin or system internal bypass if explicitly requested
        if (currentOptions && currentOptions.skipTenantFilter) {
            return;
        }
        const contextTenantId = currentOptions && currentOptions.schoolId;
        if (contextTenantId) {
            this.where({ [tenantField]: contextTenantId });
        }
    };
    schema.pre('find', applyTenantFilter);
    schema.pre('findOne', applyTenantFilter);
    schema.pre('findOneAndUpdate', applyTenantFilter);
    schema.pre('countDocuments', applyTenantFilter);
    schema.pre('deleteMany', applyTenantFilter);
};
