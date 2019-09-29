$(document).ready(function() {
    CKEDITOR.replace("customContent", {
        height: 300
    });

    if (window.history.length > 1) {
        $("#btnGoBack").show();
    } else {
        $("#btnGoBack").hide();
    }
});

function goBack() {
    window.history.back();
}
