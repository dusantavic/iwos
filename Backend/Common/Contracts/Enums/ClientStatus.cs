namespace Iwos.Common.Contracts.Enums
{
    public enum ClientStatus : byte
    {
        Active = 0,     // Full access
        Trial = 1,      // Free trial period active (limited)
        Cancelled = 2,  // Cancelled subscription
        Suspended = 3,  // privremene restrikcije (npr zakljucan ili ogranicen zbog kasnjenja ili problemima sa naplatom)
        Pending = 4,    // Everything is paid and confirmed, client waiting onboarding
        Overdue = 5     // Delay in paying, but not yet locked
    }
}
