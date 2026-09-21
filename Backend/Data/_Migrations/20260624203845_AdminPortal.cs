using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class AdminPortal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AdminUser",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Username = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    FirstName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Active = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdminUser", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AdminAuditLog",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AdminUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Action = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    EntityType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    EntityId = table.Column<Guid>(type: "uuid", nullable: true),
                    Details = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdminAuditLog", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AdminAuditLog_AdminUser_AdminUserId",
                        column: x => x.AdminUserId,
                        principalSchema: "hrs",
                        principalTable: "AdminUser",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                schema: "hrs",
                table: "AdminUser",
                columns: new[] { "Id", "Active", "CreatedAt", "FirstName", "LastName", "PasswordHash", "Username" },
                values: new object[] { new Guid("99999999-9999-9999-9999-999999999999"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Iwos", "Admin", "AQAAAAIAAYagAAAAEGxVr5jOv5R4JthBJlsF/5CuHHsuO9gLLMIvDVMulGyLacija5DVJC7Q76s6evLXJg==", "admin" });

            migrationBuilder.CreateIndex(
                name: "IX_AdminAuditLog_AdminUserId",
                schema: "hrs",
                table: "AdminAuditLog",
                column: "AdminUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AdminAuditLog_CreatedAt",
                schema: "hrs",
                table: "AdminAuditLog",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AdminUser_Username",
                schema: "hrs",
                table: "AdminUser",
                column: "Username",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AdminAuditLog",
                schema: "hrs");

            migrationBuilder.DropTable(
                name: "AdminUser",
                schema: "hrs");
        }
    }
}
