using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class RemoveShiftWeekPublication : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ShiftWeekPublication",
                schema: "hrs");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ShiftWeekPublication",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientId = table.Column<Guid>(type: "uuid", nullable: false),
                    PublishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PublishedById = table.Column<Guid>(type: "uuid", nullable: false),
                    WeekStartDate = table.Column<DateOnly>(type: "date", nullable: false)
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
                });

            migrationBuilder.CreateIndex(
                name: "IX_ShiftWeekPublication_ClientId_WeekStartDate",
                schema: "hrs",
                table: "ShiftWeekPublication",
                columns: new[] { "ClientId", "WeekStartDate" },
                unique: true);
        }
    }
}
