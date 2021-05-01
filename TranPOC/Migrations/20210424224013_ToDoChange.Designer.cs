﻿// <auto-generated />
using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using TranPOC.Models;

namespace TranPOC.Migrations
{
    [DbContext(typeof(ToDoContext))]
    [Migration("20210424224013_ToDoChange")]
    partial class ToDoChange
    {
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "5.0.5");

            modelBuilder.Entity("TranPOC.Models.ToDo", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("INTEGER");

                    b.Property<string>("Desc")
                        .IsRequired()
                        .HasMaxLength(255)
                        .HasColumnType("TEXT");

                    b.Property<DateTime?>("DoneAt")
                        .HasColumnType("TEXT");

                    b.Property<TimeSpan>("EstimatedTime")
                        .HasColumnType("TEXT");

                    b.Property<DateTime>("From")
                        .HasColumnType("TEXT");

                    b.Property<TimeSpan?>("RealTime")
                        .HasColumnType("TEXT");

                    b.Property<DateTime>("To")
                        .HasColumnType("TEXT");

                    b.HasKey("Id");

                    b.ToTable("ToDo");
                });
#pragma warning restore 612, 618
        }
    }
}
