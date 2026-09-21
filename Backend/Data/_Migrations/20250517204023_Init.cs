using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Iwos.Data._Migrations
{
    /// <inheritdoc />
    public partial class Init : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "hrs");

            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TokenInfo",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Username = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    RefreshToken = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ExpiredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TokenInfo", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClaimType = table.Column<string>(type: "text", nullable: true),
                    ClaimValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalSchema: "hrs",
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Absence",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<byte>(type: "smallint", nullable: false),
                    Status = table.Column<byte>(type: "smallint", nullable: false),
                    StartDateTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndDateTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RequestedDateTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ApprovedDateTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Absence", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ApplicationUser",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FirstName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    LastName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastLogin = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Active = table.Column<bool>(type: "boolean", nullable: false),
                    ReceiveEmail = table.Column<bool>(type: "boolean", nullable: false),
                    Type = table.Column<byte>(type: "smallint", nullable: false),
                    ClientId = table.Column<Guid>(type: "uuid", nullable: true),
                    UserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    NormalizedEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: true),
                    SecurityStamp = table.Column<string>(type: "text", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true),
                    PhoneNumber = table.Column<string>(type: "text", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApplicationUser", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClaimType = table.Column<string>(type: "text", nullable: true),
                    ClaimValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_ApplicationUser_UserId",
                        column: x => x.UserId,
                        principalSchema: "hrs",
                        principalTable: "ApplicationUser",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                schema: "hrs",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "text", nullable: false),
                    ProviderKey = table.Column<string>(type: "text", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "text", nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_ApplicationUser_UserId",
                        column: x => x.UserId,
                        principalSchema: "hrs",
                        principalTable: "ApplicationUser",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                schema: "hrs",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_ApplicationUser_UserId",
                        column: x => x.UserId,
                        principalSchema: "hrs",
                        principalTable: "ApplicationUser",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalSchema: "hrs",
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                schema: "hrs",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    LoginProvider = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_ApplicationUser_UserId",
                        column: x => x.UserId,
                        principalSchema: "hrs",
                        principalTable: "ApplicationUser",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Client",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ContactEmail = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Active = table.Column<bool>(type: "boolean", nullable: false),
                    Status = table.Column<byte>(type: "smallint", nullable: false),
                    Plan = table.Column<byte>(type: "smallint", nullable: false),
                    Billing = table.Column<byte>(type: "smallint", nullable: false),
                    ContactPerson = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ContactPhone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    LastActivity = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Address = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    LogoId = table.Column<Guid>(type: "uuid", nullable: true),
                    IdentificationNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Code = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    BankAccountNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    BankWith = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Client", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Employee",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContactEmail = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Active = table.Column<bool>(type: "boolean", nullable: false),
                    FirstName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PersonalId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ContactPhone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ContractType = table.Column<byte>(type: "smallint", nullable: false),
                    EducationType = table.Column<byte>(type: "smallint", nullable: false),
                    WorkingHours = table.Column<byte>(type: "smallint", nullable: false),
                    BankAccountNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    BankWith = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Citizenship = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    BirthDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EmploymentDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ClientId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Employee", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Employee_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "hrs",
                        principalTable: "Client",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Department",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ClientId = table.Column<Guid>(type: "uuid", nullable: false),
                    HeadId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Department", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Department_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "hrs",
                        principalTable: "Client",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Department_Employee_HeadId",
                        column: x => x.HeadId,
                        principalSchema: "hrs",
                        principalTable: "Employee",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "File",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    FullSystemName = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Active = table.Column<bool>(type: "boolean", nullable: false),
                    Path = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    UploadedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UploadedById = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_File", x => x.Id);
                    table.ForeignKey(
                        name: "FK_File_ApplicationUser_UploadedById",
                        column: x => x.UploadedById,
                        principalSchema: "hrs",
                        principalTable: "ApplicationUser",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_File_Employee_EmployeeId",
                        column: x => x.EmployeeId,
                        principalSchema: "hrs",
                        principalTable: "Employee",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Note",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Content = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    CreatedDateTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Note", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Note_Employee_EmployeeId",
                        column: x => x.EmployeeId,
                        principalSchema: "hrs",
                        principalTable: "Employee",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ToDo",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Content = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    CreatedDateTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DueDateTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ToDo", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ToDo_Employee_EmployeeId",
                        column: x => x.EmployeeId,
                        principalSchema: "hrs",
                        principalTable: "Employee",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Position",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Position", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Position_Department_DepartmentId",
                        column: x => x.DepartmentId,
                        principalSchema: "hrs",
                        principalTable: "Department",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EmployeePosition",
                schema: "hrs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    PositionId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeePosition", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmployeePosition_Employee_EmployeeId",
                        column: x => x.EmployeeId,
                        principalSchema: "hrs",
                        principalTable: "Employee",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EmployeePosition_Position_PositionId",
                        column: x => x.PositionId,
                        principalSchema: "hrs",
                        principalTable: "Position",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Absence_EmployeeId",
                schema: "hrs",
                table: "Absence",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                schema: "hrs",
                table: "ApplicationUser",
                column: "NormalizedEmail",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ApplicationUser_ClientId",
                schema: "hrs",
                table: "ApplicationUser",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                schema: "hrs",
                table: "ApplicationUser",
                column: "NormalizedUserName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AspNetRoleClaims_RoleId",
                schema: "hrs",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                schema: "hrs",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                schema: "hrs",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                schema: "hrs",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                schema: "hrs",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_Client_LogoId",
                schema: "hrs",
                table: "Client",
                column: "LogoId");

            migrationBuilder.CreateIndex(
                name: "IX_Department_ClientId",
                schema: "hrs",
                table: "Department",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_Department_HeadId",
                schema: "hrs",
                table: "Department",
                column: "HeadId");

            migrationBuilder.CreateIndex(
                name: "IX_Employee_ClientId",
                schema: "hrs",
                table: "Employee",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployeePosition_EmployeeId",
                schema: "hrs",
                table: "EmployeePosition",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployeePosition_PositionId",
                schema: "hrs",
                table: "EmployeePosition",
                column: "PositionId");

            migrationBuilder.CreateIndex(
                name: "IX_File_EmployeeId",
                schema: "hrs",
                table: "File",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_File_UploadedById",
                schema: "hrs",
                table: "File",
                column: "UploadedById");

            migrationBuilder.CreateIndex(
                name: "IX_Note_EmployeeId",
                schema: "hrs",
                table: "Note",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_Position_DepartmentId",
                schema: "hrs",
                table: "Position",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_ToDo_EmployeeId",
                schema: "hrs",
                table: "ToDo",
                column: "EmployeeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Absence_Employee_EmployeeId",
                schema: "hrs",
                table: "Absence",
                column: "EmployeeId",
                principalSchema: "hrs",
                principalTable: "Employee",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ApplicationUser_Client_ClientId",
                schema: "hrs",
                table: "ApplicationUser",
                column: "ClientId",
                principalSchema: "hrs",
                principalTable: "Client",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Client_File_LogoId",
                schema: "hrs",
                table: "Client",
                column: "LogoId",
                principalSchema: "hrs",
                principalTable: "File",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_File_Employee_EmployeeId",
                schema: "hrs",
                table: "File");

            migrationBuilder.DropForeignKey(
                name: "FK_ApplicationUser_Client_ClientId",
                schema: "hrs",
                table: "ApplicationUser");

            migrationBuilder.DropTable(
                name: "Absence",
                schema: "hrs");

            migrationBuilder.DropTable(
                name: "AspNetRoleClaims",
                schema: "hrs");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims",
                schema: "hrs");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins",
                schema: "hrs");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles",
                schema: "hrs");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens",
                schema: "hrs");

            migrationBuilder.DropTable(
                name: "EmployeePosition",
                schema: "hrs");

            migrationBuilder.DropTable(
                name: "Note",
                schema: "hrs");

            migrationBuilder.DropTable(
                name: "ToDo",
                schema: "hrs");

            migrationBuilder.DropTable(
                name: "TokenInfo",
                schema: "hrs");

            migrationBuilder.DropTable(
                name: "AspNetRoles",
                schema: "hrs");

            migrationBuilder.DropTable(
                name: "Position",
                schema: "hrs");

            migrationBuilder.DropTable(
                name: "Department",
                schema: "hrs");

            migrationBuilder.DropTable(
                name: "Employee",
                schema: "hrs");

            migrationBuilder.DropTable(
                name: "Client",
                schema: "hrs");

            migrationBuilder.DropTable(
                name: "File",
                schema: "hrs");

            migrationBuilder.DropTable(
                name: "ApplicationUser",
                schema: "hrs");
        }
    }
}
