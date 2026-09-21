using Microsoft.Extensions.Configuration;
using System;

namespace Iwos.Common.Configurations
{
    /// <summary>
    /// Unified application configuration singleton. Initialized once at startup via <see cref="Build"/>.
    /// Access anywhere via <see cref="Instance"/> or inject directly through DI.
    /// </summary>
    public sealed class AppConfiguration
    {
        private static AppConfiguration? _instance;

        /// <summary>
        /// Globally accessible configuration instance. Throws if accessed before <see cref="Build"/> is called.
        /// </summary>
        public static AppConfiguration Instance =>
            _instance ?? throw new InvalidOperationException(
                $"{nameof(AppConfiguration)} has not been initialized. Call {nameof(Build)} at application startup.");

        public ApplicationSettings Application { get; private init; } = null!;
        public FileSettings Files { get; private init; } = null!;
        public EmailNotificationSettings EmailNotification { get; private init; } = null!;
        public string DatabaseConnectionString { get; private init; } = string.Empty;

        private AppConfiguration() { }

        /// <summary>
        /// Builds and returns the singleton <see cref="AppConfiguration"/> from the supplied <see cref="IConfiguration"/>.
        /// Idempotent — subsequent calls return the already-built instance.
        /// </summary>
        public static AppConfiguration Build(IConfiguration configuration)
        {
            if (_instance is not null)
                return _instance;

            var appSettings = Require<ApplicationSettings>(configuration, ApplicationSettings.AppKey);
            ValidateJwtSettings(appSettings.JwtSettings);
            ApplicationSettings.Instance = appSettings;

            _instance = new AppConfiguration
            {
                Application = appSettings,
                Files = BuildFileSettings(configuration),
                EmailNotification = BuildEmailNotificationSettings(configuration),
                DatabaseConnectionString = configuration.GetConnectionString("Db")
                    ?? throw new InvalidOperationException("Missing required connection string 'Db'.")
            };

            return _instance;
        }

        /// <summary>
        /// Fails fast when the signing key is absent or too short. Without this the app
        /// starts happily with an empty key and every issued token silently fails
        /// validation, which is far harder to diagnose than a startup exception.
        /// </summary>
        private static void ValidateJwtSettings(JwtSettings jwt)
        {
            const int minKeyLength = 32; // HS256 requires a 256-bit key.

            if (string.IsNullOrWhiteSpace(jwt.JwtSecretKey))
                throw new InvalidOperationException(
                    "Missing JWT signing key. Set Application:JwtSettings:JwtSecretKey in " +
                    "appsettings.Development.json, or the APPLICATION__JWTSETTINGS__JWTSECRETKEY environment variable.");

            if (jwt.JwtSecretKey.Length < minKeyLength)
                throw new InvalidOperationException(
                    $"JWT signing key is too short ({jwt.JwtSecretKey.Length} chars); at least {minKeyLength} are required for HS256.");
        }

        private static T Require<T>(IConfiguration configuration, string sectionKey) where T : class =>
            configuration.GetSection(sectionKey).Get<T>()
                ?? throw new InvalidOperationException($"Missing required configuration section '{sectionKey}'.");

        private static FileSettings BuildFileSettings(IConfiguration configuration)
        {
            var raw = configuration.GetValue<string>("AllowedFileExtentions") ?? string.Empty;
            var extensions = raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            return new FileSettings
            {
                FileSizeLimit = configuration.GetValue<long>("FileSizeLimit"),
                AllowedExtensions = extensions
            };
        }

        private static EmailNotificationSettings BuildEmailNotificationSettings(IConfiguration configuration) =>
            Require<EmailNotificationSettings>(configuration, EmailNotificationSettings.SectionKey);

    }
}
