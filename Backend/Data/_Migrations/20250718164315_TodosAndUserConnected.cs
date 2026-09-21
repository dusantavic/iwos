using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class TodosAndUserConnected : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CreatedById",
                schema: "hrs",
                table: "ToDo",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ToDo_CreatedById",
                schema: "hrs",
                table: "ToDo",
                column: "CreatedById");

            migrationBuilder.AddForeignKey(
                name: "FK_ToDo_ApplicationUser_CreatedById",
                schema: "hrs",
                table: "ToDo",
                column: "CreatedById",
                principalSchema: "hrs",
                principalTable: "ApplicationUser",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ToDo_ApplicationUser_CreatedById",
                schema: "hrs",
                table: "ToDo");

            migrationBuilder.DropIndex(
                name: "IX_ToDo_CreatedById",
                schema: "hrs",
                table: "ToDo");

            migrationBuilder.DropColumn(
                name: "CreatedById",
                schema: "hrs",
                table: "ToDo");
        }
    }
}
