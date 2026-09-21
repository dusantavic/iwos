using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class AuditFieldsAdded : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "LastModifiedBy",
                schema: "hrs",
                table: "AbsenceBalance",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastModifiedTimeStamp",
                schema: "hrs",
                table: "AbsenceBalance",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LastModifiedBy",
                schema: "hrs",
                table: "Absence",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastModifiedTimeStamp",
                schema: "hrs",
                table: "Absence",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastModifiedBy",
                schema: "hrs",
                table: "AbsenceBalance");

            migrationBuilder.DropColumn(
                name: "LastModifiedTimeStamp",
                schema: "hrs",
                table: "AbsenceBalance");

            migrationBuilder.DropColumn(
                name: "LastModifiedBy",
                schema: "hrs",
                table: "Absence");

            migrationBuilder.DropColumn(
                name: "LastModifiedTimeStamp",
                schema: "hrs",
                table: "Absence");
        }
    }
}
