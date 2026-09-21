using System.Collections.Generic;

namespace Iwos.Common.Configurations
{
    public sealed record FileSettings
    {
        public long FileSizeLimit { get; init; }
        public IReadOnlyList<string> AllowedExtensions { get; init; } = [];
    }
}
