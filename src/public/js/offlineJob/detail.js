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

function submitDelete(actionUrl) {
    if (confirm("Confirm to Delete this record?")) {
        $("#jobForm").attr("action", actionUrl);
        $("#jobForm").submit();
    }
}

function submitPublish(actionUrl) {
    if (confirm("Confirm to Publish this record?")) {
        $("#jobForm").attr("action", actionUrl);
        $("#jobForm").submit();
    }
}

function preview() {
    if ($("#customContent").text() != "")
        $("#modalContent").html($("#customContent").text());

    $("#previewModal").modal("show");
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