using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class AddShiftRotationPatterns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "PinnedShiftId",
                schema: "hrs",
                table: "Employee",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "RotationAnchorDate",
                schema: "hrs",
                table: "Employee",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RotationPatternId",
                schema: "hrs",
                table: "Employee",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ShiftRotationPattern",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DaysOn = table.Column<int>(type: "integer", nullable: false),
                    DaysOff = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftRotationPattern", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShiftRotationPattern_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "hrs",
                        principalTable: "Client",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Employee_PinnedShiftId",
                schema: "hrs",
                table: "Employee",
                column: "PinnedShiftId");

            migrationBuilder.CreateIndex(
                name: "IX_Employee_RotationPatternId",
                schema: "hrs",
                table: "Employee",
                column: "RotationPatternId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftRotationPattern_ClientId",
                schema: "hrs",
                table: "ShiftRotationPattern",
                column: "ClientId");

            migrationBuilder.AddForeignKey(
                name: "FK_Employee_ShiftRotationPattern_RotationPatternId",
                schema: "hrs",
                table: "Employee",
                column: "RotationPatternId",
                principalSchema: "hrs",
                principalTable: "ShiftRotationPattern",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Employee_Shift_PinnedShiftId",
                schema: "hrs",
                table: "Employee",
                column: "PinnedShiftId",
                principalSchema: "hrs",
                principalTable: "Shift",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Employee_ShiftRotationPattern_RotationPatternId",
                schema: "hrs",
                table: "Employee");

            migrationBuilder.DropForeignKey(
                name: "FK_Employee_Shift_PinnedShiftId",
                schema: "hrs",
                table: "Employee");

            migrationBuilder.DropTable(
                name: "ShiftRotationPattern",
                schema: "hrs");

            migrationBuilder.DropIndex(
                name: "IX_Employee_PinnedShiftId",
                schema: "hrs",
                table: "Employee");

            migrationBuilder.DropIndex(
                name: "IX_Employee_RotationPatternId",
                schema: "hrs",
                table: "Employee");

            migrationBuilder.DropColumn(
                name: "PinnedShiftId",
                schema: "hrs",
                table: "Employee");

            migrationBuilder.DropColumn(
                name: "RotationAnchorDate",
                schema: "hrs",
                table: "Employee");

            migrationBuilder.DropColumn(
                name: "RotationPatternId",
                schema: "hrs",
                table: "Employee");
        }
    }
}
