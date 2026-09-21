using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class AbsenceUpdates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsHoursEstimated",
                schema: "hrs",
                table: "Absence",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "MaxChargedWorkingDays",
                schema: "hrs",
                table: "Absence",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MinChargedWorkingDays",
                schema: "hrs",
                table: "Absence",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PseudoWeekendDaysCount",
                schema: "hrs",
                table: "Absence",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "WorkingHours",
                schema: "hrs",
                table: "Absence",
                type: "numeric(8,2)",
                precision: 8,
                scale: 2,
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsHoursEstimated",
                schema: "hrs",
                table: "Absence");

            migrationBuilder.DropColumn(
                name: "MaxChargedWorkingDays",
                schema: "hrs",
                table: "Absence");

            migrationBuilder.DropColumn(
                name: "MinChargedWorkingDays",
                schema: "hrs",
                table: "Absence");

            migrationBuilder.DropColumn(
                name: "PseudoWeekendDaysCount",
                schema: "hrs",
                table: "Absence");

            migrationBuilder.DropColumn(
                name: "WorkingHours",
                schema: "hrs",
                table: "Absence");
        }
    }
}
