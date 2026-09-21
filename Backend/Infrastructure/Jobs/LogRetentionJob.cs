using Iwos.Common.Configurations;
using Microsoft.Extensions.Configuration;
using Npgsql;
using Quartz;
using Serilog;
using System;
using System.Threading.Tasks;

namespace Iwos.Infrastructure.Jobs
{
    /// <summary>
    /// Periodically prunes the Serilog "Log" table so it doesn't grow without
    /// bound on long-lived deployments. Runs daily; deletes anything older than
    /// <c>Serilog:RetentionDays</c> (defaults to 30 days when unset).
    ///
    /// We delete by raw SQL on a small column (raise_date) which is cheap on
    /// postgres even without an explicit index; if log volume grows enough that
    /// this becomes slow we should add an index on raise_date.
    /// </summary>
    public sealed class LogRetentionJob : IJob
    {
        public const int DefaultRetentionDays = 30;

        private readonly IConfiguration _configuration;
        private readonly AppConfiguration _appConfig;

        public LogRetentionJob(IConfiguration configuration, AppConfiguration appConfig)
        {
            _configuration = configuration;
            _appConfig = appConfig;
        }

        public async Task Execute(IJobExecutionContext context)
        {
            var days = _configuration.GetValue<int?>("Serilog:RetentionDays") ?? DefaultRetentionDays;
            if (days <= 0)
            {
                // Operator opt-out — retention disabled.
                return;
            }

            var cutoff = DateTimeOffset.UtcNow.AddDays(-days);
            var sql = $"DELETE FROM \"{GlobalConfiguration.SchemaName}\".\"Log\" WHERE raise_date < @cutoff";

            try
            {
                await using var conn = new NpgsqlConnection(_appConfig.DatabaseConnectionString);
                await conn.OpenAsync(context.CancellationToken);
                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("cutoff", cutoff);
                var deleted = await cmd.ExecuteNonQueryAsync(context.CancellationToken);
                Log.Information("LogRetentionJob deleted {Count} rows older than {Cutoff:o}", deleted, cutoff);
            }
            catch (Exception ex)
            {
                Log.Warning(ex, "LogRetentionJob failed; will retry on next schedule");
            }
        }
    }
}
