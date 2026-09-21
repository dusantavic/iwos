using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class UpdateEmployeeModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BankAccountNumber",
                schema: "hrs",
                table: "Employee");

            migrationBuilder.DropColumn(
                name: "BankWith",
                schema: "hrs",
                table: "Employee");

            migrationBuilder.DropColumn(
                name: "Citizenship",
                schema: "hrs",
                table: "Employee");

            migrationBuilder.DropColumn(
                name: "ContactPhone",
                schema: "hrs",
                table: "Employee");

            migrationBuilder.DropColumn(
                name: "EmploymentDate",
                schema: "hrs",
                table: "Employee");

            migrationBuilder.DropColumn(
                name: "WorkingHours",
                schema: "hrs",
                table: "Employee");

            migrationBuilder.AlterColumn<int>(
                name: "WeeklyHours",
                schema: "hrs",
                table: "Employee",
                type: "integer",
                nullable: false,
                defaultValue: 40,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "PersonalId",
                schema: "hrs",
                table: "Employee",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "ContactEmail",
                schema: "hrs",
                table: "Employee",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255);

            migrationBuilder.AlterColumn<DateOnly>(
                name: "BirthDate",
                schema: "hrs",
                table: "Employee",
                type: "date",
                nullable: true,
                oldClrType: typeof(DateOnly),
                oldType: "date");

            migrationBuilder.AddColumn<string>(
                name: "Country",
                schema: "hrs",
                table: "Employee",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Country",
                schema: "hrs",
                table: "Employee");

            migrationBuilder.AlterColumn<int>(
                name: "WeeklyHours",
                schema: "hrs",
                table: "Employee",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 40);

            migrationBuilder.AlterColumn<string>(
                name: "PersonalId",
                schema: "hrs",
                table: "Employee",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ContactEmail",
                schema: "hrs",
                table: "Employee",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255,
                oldNullable: true);

            migrationBuilder.AlterColumn<DateOnly>(
                name: "BirthDate",
                schema: "hrs",
                table: "Employee",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1),
                oldClrType: typeof(DateOnly),
                oldType: "date",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BankAccountNumber",
                schema: "hrs",
                table: "Employee",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BankWith",
                schema: "hrs",
                table: "Employee",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Citizenship",
                schema: "hrs",
                table: "Employee",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ContactPhone",
                schema: "hrs",
                table: "Employee",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateOnly>(
                name: "EmploymentDate",
                schema: "hrs",
                table: "Employee",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1));

            migrationBuilder.AddColumn<byte>(
                name: "WorkingHours",
                schema: "hrs",
                table: "Employee",
                type: "smallint",
                nullable: true);
        }
    }
}
