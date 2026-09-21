using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class EmployeeWeeklyDaysAdded : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "WeeklyDays",
                schema: "hrs",
                table: "Employee",
                type: "integer",
                nullable: false,
                defaultValue: 5);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WeeklyDays",
                schema: "hrs",
                table: "Employee");
        }
    }
}
