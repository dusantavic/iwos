using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class AddShiftClientConfig : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ShiftWeekPublication_Employee_PublishedById",
                schema: "hrs",
                table: "ShiftWeekPublication");

            migrationBuilder.DropIndex(
                name: "IX_ShiftWeekPublication_PublishedById",
                schema: "hrs",
                table: "ShiftWeekPublication");

            migrationBuilder.AddColumn<string>(
                name: "FullName",
                schema: "hrs",
                table: "ShiftUnavailability",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "ShiftClientConfig",
                schema: "hrs",
                columns: table => new
                {
                    ClientId = table.Column<Guid>(type: "uuid", nullable: false),
                    WeekEndsWorking = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftClientConfig", x => x.ClientId);
                    table.ForeignKey(
                        name: "FK_ShiftClientConfig_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "hrs",
                        principalTable: "Client",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ShiftClientConfig",
                schema: "hrs");

            migrationBuilder.DropColumn(
                name: "FullName",
                schema: "hrs",
                table: "ShiftUnavailability");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftWeekPublication_PublishedById",
                schema: "hrs",
                table: "ShiftWeekPublication",
                column: "PublishedById");

            migrationBuilder.AddForeignKey(
                name: "FK_ShiftWeekPublication_Employee_PublishedById",
                schema: "hrs",
                table: "ShiftWeekPublication",
                column: "PublishedById",
                principalSchema: "hrs",
                principalTable: "Employee",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
