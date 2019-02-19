$(document).ready(function() {
    if (window.history.length > 1) {
        $("#btnGoBack").show();
    } else {
        $("#btnGoBack").hide();
    }
});

function submitTerminate() {
    if (confirm("Confirm to Terminate this Recruiter?")) {
        $("#recruiterTerminateForm").submit();
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