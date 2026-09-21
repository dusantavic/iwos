using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class AbsenceBalanceAdded : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "RequestGroupId",
                schema: "hrs",
                table: "Absence",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UsedFromAnnual",
                schema: "hrs",
                table: "Absence",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "UsedFromCarriedOver",
                schema: "hrs",
                table: "Absence",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "WorkingDays",
                schema: "hrs",
                table: "Absence",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Year",
                schema: "hrs",
                table: "Absence",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "AbsenceBalance",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    AnnualDays = table.Column<int>(type: "integer", nullable: false, defaultValue: 20),
                    CarriedOverDays = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AbsenceBalance", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AbsenceBalance_Employee_EmployeeId",
                        column: x => x.EmployeeId,
                        principalSchema: "hrs",
                        principalTable: "Employee",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AbsenceBalance_EmployeeId",
                schema: "hrs",
                table: "AbsenceBalance",
                column: "EmployeeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AbsenceBalance",
                schema: "hrs");

            migrationBuilder.DropColumn(
                name: "RequestGroupId",
                schema: "hrs",
                table: "Absence");

            migrationBuilder.DropColumn(
                name: "UsedFromAnnual",
                schema: "hrs",
                table: "Absence");

            migrationBuilder.DropColumn(
                name: "UsedFromCarriedOver",
                schema: "hrs",
                table: "Absence");

            migrationBuilder.DropColumn(
                name: "WorkingDays",
                schema: "hrs",
                table: "Absence");

            migrationBuilder.DropColumn(
                name: "Year",
                schema: "hrs",
                table: "Absence");
        }
    }
}
