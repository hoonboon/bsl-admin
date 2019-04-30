$(document).ready(function() {
    if (window.history.length > 1) {
        $("#btnGoBack").show();
    } else {
        $("#btnGoBack").hide();
    }
});

function submitDelete() {
    if (confirm("Confirm to Delete this Employer?")) {
        $("#employerDeleteForm").submit();
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
    targetUrl += "?recruiterId=" + $("#recruiterId").val();
    targetUrl += "&bu=" + $("#bu").val();
    window.location = targetUrl;
}