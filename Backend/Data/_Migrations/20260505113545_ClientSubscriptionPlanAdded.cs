using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class ClientSubscriptionPlanAdded : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CurrentSubscriptionId",
                schema: "hrs",
                table: "Client",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SubscriptionPlanType",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubscriptionPlanType", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ClientSubscriptionPlanHistory",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubscriptionPlanTypeId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedById = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClientSubscriptionPlanHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClientSubscriptionPlanHistory_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "hrs",
                        principalTable: "Client",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClientSubscriptionPlanHistory_SubscriptionPlanType_Subscrip~",
                        column: x => x.SubscriptionPlanTypeId,
                        principalSchema: "hrs",
                        principalTable: "SubscriptionPlanType",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                schema: "hrs",
                table: "SubscriptionPlanType",
                columns: new[] { "Id", "Code", "Description", "IsActive", "Name" },
                values: new object[,]
                {
                    { new Guid("11111111-1111-1111-1111-111111111111"), "ACTIVE", "Paid subscription with unrestricted access to scheduling features.", true, "Active" },
                    { new Guid("22222222-2222-2222-2222-222222222222"), "TRIAL", "Free trial; scheduling is limited to a 2-month window from the trial start date.", true, "Trial" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Client_CurrentSubscriptionId",
                schema: "hrs",
                table: "Client",
                column: "CurrentSubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_ClientSubscriptionPlanHistory_ClientId_EndDate",
                schema: "hrs",
                table: "ClientSubscriptionPlanHistory",
                columns: new[] { "ClientId", "EndDate" });

            migrationBuilder.CreateIndex(
                name: "IX_ClientSubscriptionPlanHistory_ClientId_StartDate",
                schema: "hrs",
                table: "ClientSubscriptionPlanHistory",
                columns: new[] { "ClientId", "StartDate" });

            migrationBuilder.CreateIndex(
                name: "IX_ClientSubscriptionPlanHistory_SubscriptionPlanTypeId",
                schema: "hrs",
                table: "ClientSubscriptionPlanHistory",
                column: "SubscriptionPlanTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_SubscriptionPlanType_Code",
                schema: "hrs",
                table: "SubscriptionPlanType",
                column: "Code",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Client_ClientSubscriptionPlanHistory_CurrentSubscriptionId",
                schema: "hrs",
                table: "Client",
                column: "CurrentSubscriptionId",
                principalSchema: "hrs",
                principalTable: "ClientSubscriptionPlanHistory",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Client_ClientSubscriptionPlanHistory_CurrentSubscriptionId",
                schema: "hrs",
                table: "Client");

            migrationBuilder.DropTable(
                name: "ClientSubscriptionPlanHistory",
                schema: "hrs");

            migrationBuilder.DropTable(
                name: "SubscriptionPlanType",
                schema: "hrs");

            migrationBuilder.DropIndex(
                name: "IX_Client_CurrentSubscriptionId",
                schema: "hrs",
                table: "Client");

            migrationBuilder.DropColumn(
                name: "CurrentSubscriptionId",
                schema: "hrs",
                table: "Client");
        }
    }
}
