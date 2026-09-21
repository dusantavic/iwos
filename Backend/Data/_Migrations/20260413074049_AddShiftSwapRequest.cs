using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class AddShiftSwapRequest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ShiftSwapRequest",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RequesterId = table.Column<Guid>(type: "uuid", nullable: false),
                    TargetEmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestedShiftId = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestedDate = table.Column<DateOnly>(type: "date", nullable: false),
                    OfferedShiftId = table.Column<Guid>(type: "uuid", nullable: false),
                    OfferedDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RespondedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftSwapRequest", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShiftSwapRequest_Employee_RequesterId",
                        column: x => x.RequesterId,
                        principalSchema: "hrs",
                        principalTable: "Employee",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ShiftSwapRequest_Employee_TargetEmployeeId",
                        column: x => x.TargetEmployeeId,
                        principalSchema: "hrs",
                        principalTable: "Employee",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ShiftSwapRequest_Shift_OfferedShiftId",
                        column: x => x.OfferedShiftId,
                        principalSchema: "hrs",
                        principalTable: "Shift",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ShiftSwapRequest_Shift_RequestedShiftId",
                        column: x => x.RequestedShiftId,
                        principalSchema: "hrs",
                        principalTable: "Shift",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ShiftSwapRequest_OfferedShiftId",
                schema: "hrs",
                table: "ShiftSwapRequest",
                column: "OfferedShiftId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftSwapRequest_RequestedShiftId",
                schema: "hrs",
                table: "ShiftSwapRequest",
                column: "RequestedShiftId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftSwapRequest_RequesterId",
                schema: "hrs",
                table: "ShiftSwapRequest",
                column: "RequesterId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftSwapRequest_TargetEmployeeId",
                schema: "hrs",
                table: "ShiftSwapRequest",
                column: "TargetEmployeeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ShiftSwapRequest",
                schema: "hrs");
        }
    }
}
