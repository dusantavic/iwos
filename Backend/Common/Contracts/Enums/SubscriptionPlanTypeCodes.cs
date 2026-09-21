namespace Iwos.Common.Contracts.Enums
{
    /// <summary>
    /// Stable string codes mirrored in the SubscriptionPlanType seed data.
    /// Use these constants when comparing the current plan in code paths
    /// that gate behaviour (e.g. scheduling access).
    /// </summary>
    public static class SubscriptionPlanTypeCodes
    {
        public const string Active = "ACTIVE";
        public const string Trial = "TRIAL";
    }
}
