using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Logging;
using TranPOC.Models;
using Microsoft.EntityFrameworkCore;

namespace TranPOC.Pages
{
    public class IndexModel : PageModel
    {
        private readonly ILogger<IndexModel> _logger;
        private readonly ToDoContext todos;

        public List<ToDo> ToDo { get; set; }

        public IndexModel(ILogger<IndexModel> logger, ToDoContext todos)
        {
            _logger = logger;
            this.todos = todos;
        }

        public bool ShowDone { get; set; }

        public async Task<IActionResult> OnGetAsync([FromQuery]bool done)
        {
            ShowDone = done;
            ToDo = 
                done ? await todos.ToDo.Where(item => item.DoneAt != null).ToListAsync()
                : await todos.ToDo.Where(item => item.DoneAt == null).ToListAsync();
            return Page();
        }        

        [BindProperty]
        public ToDoOperation Operation { get; set; }

        public async Task<IActionResult> OnPostAsync()
        {
            if (Operation.Ids != null && Operation.Ids.Count > 0) {
                if (Operation.Kind == ToDoOperationKind.Delete) {
                    foreach (int id in Operation.Ids) {
                        var item = await todos.ToDo.FindAsync(id);
                        todos.ToDo.Remove(item);
                    }
                    await todos.SaveChangesAsync();
                }
            }
            return RedirectToPage("./Index");
        }

    }
}
