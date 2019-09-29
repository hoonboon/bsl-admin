$(document).ready(function() {
    if (window.history.length > 1) {
        $("#btnGoBack").show();
    } else {
        $("#btnGoBack").hide();
    }
});

function goBack() {
    let bu = $("#bu").val();
    if (bu) {
        window.location = window.atob(bu);
    } else {
        window.history.back();
    }
}
