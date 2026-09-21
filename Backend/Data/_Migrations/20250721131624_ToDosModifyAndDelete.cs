using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class ToDosModifyAndDelete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                schema: "hrs",
                table: "ToDo",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DeletedById",
                schema: "hrs",
                table: "ToDo",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                schema: "hrs",
                table: "ToDo",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastModifiedAt",
                schema: "hrs",
                table: "ToDo",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LastModifiedById",
                schema: "hrs",
                table: "ToDo",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ToDo_DeletedById",
                schema: "hrs",
                table: "ToDo",
                column: "DeletedById");

            migrationBuilder.CreateIndex(
                name: "IX_ToDo_LastModifiedById",
                schema: "hrs",
                table: "ToDo",
                column: "LastModifiedById");

            migrationBuilder.AddForeignKey(
                name: "FK_ToDo_ApplicationUser_DeletedById",
                schema: "hrs",
                table: "ToDo",
                column: "DeletedById",
                principalSchema: "hrs",
                principalTable: "ApplicationUser",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ToDo_ApplicationUser_LastModifiedById",
                schema: "hrs",
                table: "ToDo",
                column: "LastModifiedById",
                principalSchema: "hrs",
                principalTable: "ApplicationUser",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ToDo_ApplicationUser_DeletedById",
                schema: "hrs",
                table: "ToDo");

            migrationBuilder.DropForeignKey(
                name: "FK_ToDo_ApplicationUser_LastModifiedById",
                schema: "hrs",
                table: "ToDo");

            migrationBuilder.DropIndex(
                name: "IX_ToDo_DeletedById",
                schema: "hrs",
                table: "ToDo");

            migrationBuilder.DropIndex(
                name: "IX_ToDo_LastModifiedById",
                schema: "hrs",
                table: "ToDo");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                schema: "hrs",
                table: "ToDo");

            migrationBuilder.DropColumn(
                name: "DeletedById",
                schema: "hrs",
                table: "ToDo");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                schema: "hrs",
                table: "ToDo");

            migrationBuilder.DropColumn(
                name: "LastModifiedAt",
                schema: "hrs",
                table: "ToDo");

            migrationBuilder.DropColumn(
                name: "LastModifiedById",
                schema: "hrs",
                table: "ToDo");
        }
    }
}
