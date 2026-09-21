namespace Iwos.Common.Configurations
{
    public sealed record EmailNotificationSettings
    {
        public const string SectionKey = "EmailNotificationSettings";

        public string EmailNotificationAddress { get; init; } = string.Empty;
        public string EmailNotificationAddressPassword { get; init; } = string.Empty;
    }
}
