using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class CurrentHeadAssignmentDate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "CurrentHeadAssignmentDate",
                schema: "hrs",
                table: "Department",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CurrentHeadAssignmentDate",
                schema: "hrs",
                table: "Department");
        }
    }
}
