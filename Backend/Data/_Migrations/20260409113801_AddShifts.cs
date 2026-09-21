using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class AddShifts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Shift",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientId = table.Column<Guid>(type: "uuid", nullable: false),
                    Label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DefaultStartTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    DefaultEndTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Shift", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Shift_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "hrs",
                        principalTable: "Client",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShiftWeekPublication",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientId = table.Column<Guid>(type: "uuid", nullable: false),
                    WeekStartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    PublishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PublishedById = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftWeekPublication", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShiftWeekPublication_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "hrs",
                        principalTable: "Client",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ShiftWeekPublication_Employee_PublishedById",
                        column: x => x.PublishedById,
                        principalSchema: "hrs",
                        principalTable: "Employee",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShiftAssignment",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ShiftId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AssignedById = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftAssignment", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShiftAssignment_Employee_EmployeeId",
                        column: x => x.EmployeeId,
                        principalSchema: "hrs",
                        principalTable: "Employee",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ShiftAssignment_Shift_ShiftId",
                        column: x => x.ShiftId,
                        principalSchema: "hrs",
                        principalTable: "Shift",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShiftDateOverride",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ShiftId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    StartTime = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    EndTime = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    MinEmployees = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftDateOverride", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShiftDateOverride_Shift_ShiftId",
                        column: x => x.ShiftId,
                        principalSchema: "hrs",
                        principalTable: "Shift",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShiftDaySchedule",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ShiftId = table.Column<Guid>(type: "uuid", nullable: false),
                    DayOfWeek = table.Column<int>(type: "integer", nullable: false),
                    StartTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    EndTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    MinEmployees = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftDaySchedule", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShiftDaySchedule_Shift_ShiftId",
                        column: x => x.ShiftId,
                        principalSchema: "hrs",
                        principalTable: "Shift",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShiftUnavailability",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ShiftId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    ReportedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftUnavailability", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShiftUnavailability_Employee_EmployeeId",
                        column: x => x.EmployeeId,
                        principalSchema: "hrs",
                        principalTable: "Employee",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ShiftUnavailability_Shift_ShiftId",
                        column: x => x.ShiftId,
                        principalSchema: "hrs",
                        principalTable: "Shift",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Shift_ClientId",
                schema: "hrs",
                table: "Shift",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftAssignment_EmployeeId",
                schema: "hrs",
                table: "ShiftAssignment",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftAssignment_ShiftId_EmployeeId_Date",
                schema: "hrs",
                table: "ShiftAssignment",
                columns: new[] { "ShiftId", "EmployeeId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShiftDateOverride_ShiftId_Date",
                schema: "hrs",
                table: "ShiftDateOverride",
                columns: new[] { "ShiftId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShiftDaySchedule_ShiftId_DayOfWeek",
                schema: "hrs",
                table: "ShiftDaySchedule",
                columns: new[] { "ShiftId", "DayOfWeek" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShiftUnavailability_EmployeeId",
                schema: "hrs",
                table: "ShiftUnavailability",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftUnavailability_ShiftId_EmployeeId_Date",
                schema: "hrs",
                table: "ShiftUnavailability",
                columns: new[] { "ShiftId", "EmployeeId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShiftWeekPublication_ClientId_WeekStartDate",
                schema: "hrs",
                table: "ShiftWeekPublication",
                columns: new[] { "ClientId", "WeekStartDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShiftWeekPublication_PublishedById",
                schema: "hrs",
                table: "ShiftWeekPublication",
                column: "PublishedById");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ShiftAssignment",
                schema: "hrs");

            migrationBuilder.DropTable(
                name: "ShiftDateOverride",
                schema: "hrs");

            migrationBuilder.DropTable(
                name: "ShiftDaySchedule",
                schema: "hrs");

            migrationBuilder.DropTable(
                name: "ShiftUnavailability",
                schema: "hrs");

            migrationBuilder.DropTable(
                name: "ShiftWeekPublication",
                schema: "hrs");

            migrationBuilder.DropTable(
                name: "Shift",
                schema: "hrs");
        }
    }
}
