$(document).ready(function() {
    if (window.history.length > 1) {
        $("#btnGoBack").show();
    } else {
        $("#btnGoBack").hide();
    }
});

function goBack() {
    window.history.back();
}

function submitAddCredit() {
    if (confirm("Confirm to save?")) {
        $("#addCreditForm").submit();
    }
}
