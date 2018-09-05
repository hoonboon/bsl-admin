$(document).ready(function() {
    if ($("#customContent").length) {
        CKEDITOR.replace("customContent", {
            height: 300
        });
    }

    if (window.history.length > 1) {
        $("#btnGoBack").show();
    } else {
        $("#btnGoBack").hide();
    }
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

function goBack() {
    let bu = $("#bu").val();
    if (bu) {
        window.location = window.atob(bu);
    } else {
        window.history.back();
    }
}

function editDetail(targetUrl) {
    targetUrl += "?bu=" + $("#bu").val();
    window.location = targetUrl;
}