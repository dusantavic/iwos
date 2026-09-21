using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class RemoveEmployeeAnchorDate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RotationAnchorDate",
                schema: "hrs",
                table: "Employee");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "RotationAnchorDate",
                schema: "hrs",
                table: "Employee",
                type: "date",
                nullable: true);
        }
    }
}
