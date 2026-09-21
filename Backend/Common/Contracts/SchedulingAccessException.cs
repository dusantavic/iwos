using System;

namespace Iwos.Common.Contracts
{
    public sealed class SchedulingAccessException : Exception
    {
        public const string CodeStatusBlocked = "SCHEDULING_NOT_ALLOWED";
        public const string CodeWindowExceeded = "SCHEDULING_WINDOW_EXCEEDED";
        public const string CodeTenantUnknown = "SCHEDULING_TENANT_UNKNOWN";

        public string Code { get; }
        public DateOnly? MaxPlannableDate { get; }

        public SchedulingAccessException(string code, string message, DateOnly? maxPlannableDate = null)
            : base(message)
        {
            Code = code;
            MaxPlannableDate = maxPlannableDate;
        }
    }
}
