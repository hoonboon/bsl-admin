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

function goTo(targetUrl) {
    targetUrl += "?bu=" + $("#bu").val();
    window.location = targetUrl;
}

function getDocument(trxId) {
    const targetUrl = "/creditAccount/" + trxId + "/trxDocument?bu=" + $("#bu").val();
    alert("This will download Official Document of Trx ID: " + trxId);
}