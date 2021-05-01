using System;
using Microsoft.EntityFrameworkCore.Migrations;

namespace TranPOC.Migrations
{
    public partial class ToDoChange : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsDone",
                table: "ToDo");

            migrationBuilder.AlterColumn<TimeSpan>(
                name: "EstimatedTime",
                table: "ToDo",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<string>(
                name: "Desc",
                table: "ToDo",
                type: "TEXT",
                maxLength: 255,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DoneAt",
                table: "ToDo",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "RealTime",
                table: "ToDo",
                type: "TEXT",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DoneAt",
                table: "ToDo");

            migrationBuilder.DropColumn(
                name: "RealTime",
                table: "ToDo");

            migrationBuilder.AlterColumn<int>(
                name: "EstimatedTime",
                table: "ToDo",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(TimeSpan),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<string>(
                name: "Desc",
                table: "ToDo",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 255);

            migrationBuilder.AddColumn<bool>(
                name: "IsDone",
                table: "ToDo",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }
    }
}
