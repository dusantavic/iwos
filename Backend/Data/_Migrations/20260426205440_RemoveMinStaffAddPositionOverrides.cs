using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class RemoveMinStaffAddPositionOverrides : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MinEmployees",
                schema: "hrs",
                table: "ShiftDaySchedule");

            migrationBuilder.DropColumn(
                name: "MinEmployees",
                schema: "hrs",
                table: "ShiftDateOverride");

            migrationBuilder.CreateTable(
                name: "ShiftPositionRequirementOverride",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ShiftId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    PositionId = table.Column<Guid>(type: "uuid", nullable: false),
                    RequiredCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftPositionRequirementOverride", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShiftPositionRequirementOverride_Position_PositionId",
                        column: x => x.PositionId,
                        principalSchema: "hrs",
                        principalTable: "Position",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ShiftPositionRequirementOverride_Shift_ShiftId",
                        column: x => x.ShiftId,
                        principalSchema: "hrs",
                        principalTable: "Shift",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ShiftPositionRequirementOverride_PositionId",
                schema: "hrs",
                table: "ShiftPositionRequirementOverride",
                column: "PositionId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftPositionRequirementOverride_ShiftId_Date_PositionId",
                schema: "hrs",
                table: "ShiftPositionRequirementOverride",
                columns: new[] { "ShiftId", "Date", "PositionId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ShiftPositionRequirementOverride",
                schema: "hrs");

            migrationBuilder.AddColumn<int>(
                name: "MinEmployees",
                schema: "hrs",
                table: "ShiftDaySchedule",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MinEmployees",
                schema: "hrs",
                table: "ShiftDateOverride",
                type: "integer",
                nullable: true);
        }
    }
}
