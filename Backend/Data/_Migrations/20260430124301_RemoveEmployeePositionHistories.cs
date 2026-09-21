using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class RemoveEmployeePositionHistories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EmployeePositionHistory",
                schema: "hrs");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EmployeePositionHistory",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    PositionId = table.Column<Guid>(type: "uuid", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeePositionHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmployeePositionHistory_Employee_EmployeeId",
                        column: x => x.EmployeeId,
                        principalSchema: "hrs",
                        principalTable: "Employee",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EmployeePositionHistory_Position_PositionId",
                        column: x => x.PositionId,
                        principalSchema: "hrs",
                        principalTable: "Position",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EmployeePositionHistory_EmployeeId",
                schema: "hrs",
                table: "EmployeePositionHistory",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployeePositionHistory_PositionId",
                schema: "hrs",
                table: "EmployeePositionHistory",
                column: "PositionId");
        }
    }
}
