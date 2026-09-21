using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class NotesAndUserConnected : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CreatedById",
                schema: "hrs",
                table: "Note",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "UpcomingAnniversariesDto",
                schema: "hrs",
                columns: table => new
                {
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    FullName = table.Column<string>(type: "text", nullable: false),
                    AnniversaryDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    ProfilePictureSrc = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                });

            migrationBuilder.CreateIndex(
                name: "IX_Note_CreatedById",
                schema: "hrs",
                table: "Note",
                column: "CreatedById");

            migrationBuilder.AddForeignKey(
                name: "FK_Note_ApplicationUser_CreatedById",
                schema: "hrs",
                table: "Note",
                column: "CreatedById",
                principalSchema: "hrs",
                principalTable: "ApplicationUser",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Note_ApplicationUser_CreatedById",
                schema: "hrs",
                table: "Note");

            migrationBuilder.DropTable(
                name: "UpcomingAnniversariesDto",
                schema: "hrs");

            migrationBuilder.DropIndex(
                name: "IX_Note_CreatedById",
                schema: "hrs",
                table: "Note");

            migrationBuilder.DropColumn(
                name: "CreatedById",
                schema: "hrs",
                table: "Note");
        }
    }
}
