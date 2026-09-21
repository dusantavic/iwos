namespace Iwos.Common.Contracts
{
    /// <summary>
    /// Shared constants that discriminate manager vs. employee-portal identities
    /// across token generation, authorization policies, and claim inspection.
    /// </summary>
    public static class PortalAuth
    {
        public const string PortalTypeClaim = "portal_type";

        public const string Manager = "manager";
        public const string Employee = "employee";
        public const string Admin = "admin";

        public const string ManagerPolicy = "ManagerOnly";
        public const string EmployeePortalPolicy = "EmployeePortalOnly";
        public const string AdminPortalPolicy = "AdminPortalOnly";

        public const string EmployeeAccountIdClaim = "employee_account_id";
        public const string EmployeeIdClaim = "employee_id";
        public const string AdminUserIdClaim = "admin_user_id";
    }
}
