using System;
using System.ComponentModel.DataAnnotations;
namespace TranPOC.Models {
    public class ToDo {
        public int Id { get; set; }
        [Required]
        [StringLength(255)]
        public string Desc { get; set; }
        public DateTime From { get; set; }
        public DateTime To { get; set; }
        public TimeSpan EstimatedTime { get; set; }
        public TimeSpan? RealTime { get; set; }
        public DateTime? DoneAt { get; set; }
    }
}