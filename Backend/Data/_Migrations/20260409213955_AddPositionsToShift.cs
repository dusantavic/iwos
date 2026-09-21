using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class AddPositionsToShift : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ShiftPositionRequirement",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ShiftId = table.Column<Guid>(type: "uuid", nullable: false),
                    PositionId = table.Column<Guid>(type: "uuid", nullable: false),
                    RequiredCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftPositionRequirement", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShiftPositionRequirement_Position_PositionId",
                        column: x => x.PositionId,
                        principalSchema: "hrs",
                        principalTable: "Position",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ShiftPositionRequirement_Shift_ShiftId",
                        column: x => x.ShiftId,
                        principalSchema: "hrs",
                        principalTable: "Shift",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ShiftPositionRequirement_PositionId",
                schema: "hrs",
                table: "ShiftPositionRequirement",
                column: "PositionId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftPositionRequirement_ShiftId_PositionId",
                schema: "hrs",
                table: "ShiftPositionRequirement",
                columns: new[] { "ShiftId", "PositionId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ShiftPositionRequirement",
                schema: "hrs");
        }
    }
}
