using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class AddShiftDayPositionRequirementOverride : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ShiftDayPositionRequirementOverride",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ShiftId = table.Column<Guid>(type: "uuid", nullable: false),
                    DayOfWeek = table.Column<int>(type: "integer", nullable: false),
                    PositionId = table.Column<Guid>(type: "uuid", nullable: false),
                    RequiredCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftDayPositionRequirementOverride", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShiftDayPositionRequirementOverride_Position_PositionId",
                        column: x => x.PositionId,
                        principalSchema: "hrs",
                        principalTable: "Position",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ShiftDayPositionRequirementOverride_Shift_ShiftId",
                        column: x => x.ShiftId,
                        principalSchema: "hrs",
                        principalTable: "Shift",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ShiftDayPositionRequirementOverride_PositionId",
                schema: "hrs",
                table: "ShiftDayPositionRequirementOverride",
                column: "PositionId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftDayPositionRequirementOverride_ShiftId_DayOfWeek_Posit~",
                schema: "hrs",
                table: "ShiftDayPositionRequirementOverride",
                columns: new[] { "ShiftId", "DayOfWeek", "PositionId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ShiftDayPositionRequirementOverride",
                schema: "hrs");
        }
    }
}
