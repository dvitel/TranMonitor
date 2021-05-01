// Please see documentation at https://docs.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your JavaScript code.

function askAndSubmit(e) {
    var res = confirm("Are you sure you want to delete this work item?");
    if (res) {
        $(e).closest("form").submit();
    }
}
