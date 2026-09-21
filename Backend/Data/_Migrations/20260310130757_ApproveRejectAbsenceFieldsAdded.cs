using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class ApproveRejectAbsenceFieldsAdded : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ApprovedById",
                schema: "hrs",
                table: "Absence",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RejectedById",
                schema: "hrs",
                table: "Absence",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RejectedDateTime",
                schema: "hrs",
                table: "Absence",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApprovedById",
                schema: "hrs",
                table: "Absence");

            migrationBuilder.DropColumn(
                name: "RejectedById",
                schema: "hrs",
                table: "Absence");

            migrationBuilder.DropColumn(
                name: "RejectedDateTime",
                schema: "hrs",
                table: "Absence");
        }
    }
}
