using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class AbsenceDateUpdate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EndDateTime",
                schema: "hrs",
                table: "Absence");

            migrationBuilder.DropColumn(
                name: "StartDateTime",
                schema: "hrs",
                table: "Absence");

            migrationBuilder.AddColumn<DateOnly>(
                name: "EndDate",
                schema: "hrs",
                table: "Absence",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1));

            migrationBuilder.AddColumn<DateOnly>(
                name: "StartDate",
                schema: "hrs",
                table: "Absence",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EndDate",
                schema: "hrs",
                table: "Absence");

            migrationBuilder.DropColumn(
                name: "StartDate",
                schema: "hrs",
                table: "Absence");

            migrationBuilder.AddColumn<DateTime>(
                name: "EndDateTime",
                schema: "hrs",
                table: "Absence",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "StartDateTime",
                schema: "hrs",
                table: "Absence",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));
        }
    }
}
