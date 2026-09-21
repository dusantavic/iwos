namespace Iwos.Common.Configurations
{
    public sealed class ApplicationSettings
    {
        public const string AppKey = "Application";

        /// <summary>
        /// Set by <see cref="AppConfiguration.Build"/> at startup.
        /// Prefer injecting <see cref="AppConfiguration"/> over accessing this directly.
        /// </summary>
        public static ApplicationSettings? Instance { get; internal set; }

        public JwtSettings JwtSettings { get; init; } = new();
    }
}
