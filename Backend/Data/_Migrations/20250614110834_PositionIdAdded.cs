using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class PositionIdAdded : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EmployeePosition",
                schema: "hrs");

            migrationBuilder.AddColumn<Guid>(
                name: "PositionId",
                schema: "hrs",
                table: "Employee",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("666ee8db-93c1-4593-a108-a3e5d0f88bf2"));

            migrationBuilder.CreateTable(
                name: "EmployeePositionHistory",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    PositionId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
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
                name: "IX_Employee_PositionId",
                schema: "hrs",
                table: "Employee",
                column: "PositionId");

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

            migrationBuilder.AddForeignKey(
                name: "FK_Employee_Position_PositionId",
                schema: "hrs",
                table: "Employee",
                column: "PositionId",
                principalSchema: "hrs",
                principalTable: "Position",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Employee_Position_PositionId",
                schema: "hrs",
                table: "Employee");

            migrationBuilder.DropTable(
                name: "EmployeePositionHistory",
                schema: "hrs");

            migrationBuilder.DropIndex(
                name: "IX_Employee_PositionId",
                schema: "hrs",
                table: "Employee");

            migrationBuilder.DropColumn(
                name: "PositionId",
                schema: "hrs",
                table: "Employee");

            migrationBuilder.CreateTable(
                name: "EmployeePosition",
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
                    table.PrimaryKey("PK_EmployeePosition", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmployeePosition_Employee_EmployeeId",
                        column: x => x.EmployeeId,
                        principalSchema: "hrs",
                        principalTable: "Employee",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EmployeePosition_Position_PositionId",
                        column: x => x.PositionId,
                        principalSchema: "hrs",
                        principalTable: "Position",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EmployeePosition_EmployeeId",
                schema: "hrs",
                table: "EmployeePosition",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployeePosition_PositionId",
                schema: "hrs",
                table: "EmployeePosition",
                column: "PositionId");
        }
    }
}
