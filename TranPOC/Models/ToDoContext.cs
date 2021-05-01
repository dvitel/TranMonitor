using Microsoft.EntityFrameworkCore;
using System;
namespace TranPOC.Models {    

    public class ToDoContext : DbContext {
        public DbSet<ToDo> ToDo { get; set; }

        public ToDoContext() {}

        public ToDoContext(DbContextOptions<ToDoContext> options): base(options) {}

        // The following configures EF to create a Sqlite database file as `C:\blogging.db`.
        // For Mac or Linux, change this to `/tmp/blogging.db` or any other absolute path.
        protected override void OnConfiguring(DbContextOptionsBuilder options)
            => options.UseSqlite(@"Data Source=/tmp/todo.db");        
    }
}
