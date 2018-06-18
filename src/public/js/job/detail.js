$(document).ready(function() {
    CKEDITOR.replace("customContent", {
        height: 300
    });
});

function submitDelete() {
    if (confirm("Confirm to delete this record?")) {
        $("#jobDeleteForm").submit();
    }
}

function preview() {
    if ($("#customContent").text() != "")
        $("#modalContent").html($("#customContent").text());

    $("#previewModal").modal("show");
}

function fbShare(url) {
    if (FB) {
        FB.ui({
            method: 'share',
            href: url,
        }, function (response) { });
    }
}