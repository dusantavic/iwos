using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class AbsenceBalanceConfigured : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AbsenceBalance_EmployeeId",
                schema: "hrs",
                table: "AbsenceBalance");

            migrationBuilder.CreateIndex(
                name: "IX_AbsenceBalance_EmployeeId_Year",
                schema: "hrs",
                table: "AbsenceBalance",
                columns: new[] { "EmployeeId", "Year" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AbsenceBalance_EmployeeId_Year",
                schema: "hrs",
                table: "AbsenceBalance");

            migrationBuilder.CreateIndex(
                name: "IX_AbsenceBalance_EmployeeId",
                schema: "hrs",
                table: "AbsenceBalance",
                column: "EmployeeId");
        }
    }
}
