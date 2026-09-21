using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class RemoveEducationType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EducationType",
                schema: "hrs",
                table: "Employee");

            migrationBuilder.AlterColumn<byte>(
                name: "WorkingHours",
                schema: "hrs",
                table: "Employee",
                type: "smallint",
                nullable: true,
                oldClrType: typeof(byte),
                oldType: "smallint");

            migrationBuilder.AlterColumn<byte>(
                name: "ContractType",
                schema: "hrs",
                table: "Employee",
                type: "smallint",
                nullable: true,
                oldClrType: typeof(byte),
                oldType: "smallint");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<byte>(
                name: "WorkingHours",
                schema: "hrs",
                table: "Employee",
                type: "smallint",
                nullable: false,
                defaultValue: (byte)0,
                oldClrType: typeof(byte),
                oldType: "smallint",
                oldNullable: true);

            migrationBuilder.AlterColumn<byte>(
                name: "ContractType",
                schema: "hrs",
                table: "Employee",
                type: "smallint",
                nullable: false,
                defaultValue: (byte)0,
                oldClrType: typeof(byte),
                oldType: "smallint",
                oldNullable: true);

            migrationBuilder.AddColumn<byte>(
                name: "EducationType",
                schema: "hrs",
                table: "Employee",
                type: "smallint",
                nullable: false,
                defaultValue: (byte)0);
        }
    }
}
