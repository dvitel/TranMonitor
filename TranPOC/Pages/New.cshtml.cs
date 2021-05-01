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
    public class NewModel : PageModel
    {
        private readonly ILogger<IndexModel> _logger;
        private readonly ToDoContext todos;

        public List<ToDo> ToDo;

        public NewModel(ILogger<IndexModel> logger, ToDoContext todos)
        {
            _logger = logger;
            this.todos = todos;
        }

        [BindProperty]
        public ToDo Item { get; set; }

        public async Task<IActionResult> OnGet(int? id) {
            if (id.HasValue) {
                Item = await todos.ToDo.FindAsync(id.Value);
                if (Item == null) return NotFound();
            }
            else Item = new ToDo{ From = DateTime.Now, To = DateTime.Now.AddHours(2), EstimatedTime = TimeSpan.FromHours(1)};
            return Page();
        }

        public async Task<IActionResult> OnPostAsync() 
        {
            if (!ModelState.IsValid) return Page();
            if (Item.From > Item.To) {
                ModelState.AddModelError("Item.To", "End date should be greater than start date");
                return Page();
            }
            if (Item.Id == 0) {
                todos.ToDo.Add(Item);
            } else {
                //TODO: better to fetch and then update
                todos.Update(Item);
            }
            await todos.SaveChangesAsync();
            return RedirectToPage("./Index");
        }
    }
}
