using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class AddEmployeeAccount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ApplicationUser_Client_ClientId",
                schema: "hrs",
                table: "ApplicationUser");

            migrationBuilder.AlterColumn<Guid>(
                name: "ClientId",
                schema: "hrs",
                table: "ApplicationUser",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "EmployeeAccount",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientId = table.Column<Guid>(type: "uuid", nullable: false),
                    Username = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    Active = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastLoginAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeeAccount", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmployeeAccount_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "hrs",
                        principalTable: "Client",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EmployeeAccount_Employee_EmployeeId",
                        column: x => x.EmployeeId,
                        principalSchema: "hrs",
                        principalTable: "Employee",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeAccount_ClientId",
                schema: "hrs",
                table: "EmployeeAccount",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeAccount_EmployeeId",
                schema: "hrs",
                table: "EmployeeAccount",
                column: "EmployeeId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeAccount_Username",
                schema: "hrs",
                table: "EmployeeAccount",
                column: "Username",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_ApplicationUser_Client_ClientId",
                schema: "hrs",
                table: "ApplicationUser",
                column: "ClientId",
                principalSchema: "hrs",
                principalTable: "Client",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ApplicationUser_Client_ClientId",
                schema: "hrs",
                table: "ApplicationUser");

            migrationBuilder.DropTable(
                name: "EmployeeAccount",
                schema: "hrs");

            migrationBuilder.AlterColumn<Guid>(
                name: "ClientId",
                schema: "hrs",
                table: "ApplicationUser",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddForeignKey(
                name: "FK_ApplicationUser_Client_ClientId",
                schema: "hrs",
                table: "ApplicationUser",
                column: "ClientId",
                principalSchema: "hrs",
                principalTable: "Client",
                principalColumn: "Id");
        }
    }
}
