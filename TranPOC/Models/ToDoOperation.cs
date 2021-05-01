using System.Collections.Generic;
namespace TranPOC.Models {

    public enum ToDoOperationKind { Delete = 1 };
    public class ToDoOperation {
        public ToDoOperationKind Kind { get; set; }
        public List<int> Ids { get; set; }
    }

}