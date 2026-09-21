using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class AddSwapFlag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSwapped",
                schema: "hrs",
                table: "ShiftAssignment",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "LastSwapId",
                schema: "hrs",
                table: "ShiftAssignment",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsSwapped",
                schema: "hrs",
                table: "ShiftAssignment");

            migrationBuilder.DropColumn(
                name: "LastSwapId",
                schema: "hrs",
                table: "ShiftAssignment");
        }
    }
}
