using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class SubscriptionDurationAdded : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DurationMonths",
                schema: "hrs",
                table: "SubscriptionPlanType",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PlanningWindowMonths",
                schema: "hrs",
                table: "SubscriptionPlanType",
                type: "integer",
                nullable: true);

            migrationBuilder.UpdateData(
                schema: "hrs",
                table: "SubscriptionPlanType",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                columns: new[] { "Description", "DurationMonths", "PlanningWindowMonths" },
                values: new object[] { "Paid subscription with unrestricted scheduling and no fixed expiry.", null, null });

            migrationBuilder.UpdateData(
                schema: "hrs",
                table: "SubscriptionPlanType",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                columns: new[] { "Description", "DurationMonths", "PlanningWindowMonths" },
                values: new object[] { "Free trial; subscription lasts 1 month, scheduling reach is 2 months from the trial start date.", 1, 2 });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DurationMonths",
                schema: "hrs",
                table: "SubscriptionPlanType");

            migrationBuilder.DropColumn(
                name: "PlanningWindowMonths",
                schema: "hrs",
                table: "SubscriptionPlanType");

            migrationBuilder.UpdateData(
                schema: "hrs",
                table: "SubscriptionPlanType",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "Description",
                value: "Paid subscription with unrestricted access to scheduling features.");

            migrationBuilder.UpdateData(
                schema: "hrs",
                table: "SubscriptionPlanType",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                column: "Description",
                value: "Free trial; scheduling is limited to a 2-month window from the trial start date.");
        }
    }
}
