using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class NotesModifyAndDelete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                schema: "hrs",
                table: "Note",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DeletedById",
                schema: "hrs",
                table: "Note",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                schema: "hrs",
                table: "Note",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastModifiedAt",
                schema: "hrs",
                table: "Note",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LastModifiedById",
                schema: "hrs",
                table: "Note",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Note_DeletedById",
                schema: "hrs",
                table: "Note",
                column: "DeletedById");

            migrationBuilder.CreateIndex(
                name: "IX_Note_LastModifiedById",
                schema: "hrs",
                table: "Note",
                column: "LastModifiedById");

            migrationBuilder.AddForeignKey(
                name: "FK_Note_ApplicationUser_DeletedById",
                schema: "hrs",
                table: "Note",
                column: "DeletedById",
                principalSchema: "hrs",
                principalTable: "ApplicationUser",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Note_ApplicationUser_LastModifiedById",
                schema: "hrs",
                table: "Note",
                column: "LastModifiedById",
                principalSchema: "hrs",
                principalTable: "ApplicationUser",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Note_ApplicationUser_DeletedById",
                schema: "hrs",
                table: "Note");

            migrationBuilder.DropForeignKey(
                name: "FK_Note_ApplicationUser_LastModifiedById",
                schema: "hrs",
                table: "Note");

            migrationBuilder.DropIndex(
                name: "IX_Note_DeletedById",
                schema: "hrs",
                table: "Note");

            migrationBuilder.DropIndex(
                name: "IX_Note_LastModifiedById",
                schema: "hrs",
                table: "Note");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                schema: "hrs",
                table: "Note");

            migrationBuilder.DropColumn(
                name: "DeletedById",
                schema: "hrs",
                table: "Note");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                schema: "hrs",
                table: "Note");

            migrationBuilder.DropColumn(
                name: "LastModifiedAt",
                schema: "hrs",
                table: "Note");

            migrationBuilder.DropColumn(
                name: "LastModifiedById",
                schema: "hrs",
                table: "Note");
        }
    }
}
