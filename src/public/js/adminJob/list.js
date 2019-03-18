$(document).ready(function() {
    $("#searchTitle").keypress(function(event) {
        let keycode = (event.keyCode ? event.keyCode : event.which);
        if (keycode == "13") {
            if ($("#searchTitle").val() == "") {
                alert("Please enter Job Title for Search.");
                return false;
            } else {
                submitViewList();
            }
        }
    });

    $("#searchEmployerName").keypress(function(event) {
        let keycode = (event.keyCode ? event.keyCode : event.which);
        if (keycode == "13") {
            if ($("#searchEmployerName").val() == "") {
                alert("Please enter Employer Name for Search.");
                return false;
            } else {
                submitViewList();
            }
        }
    });
});

function showSearch() {
    $("#searchModal").modal("show");
}

function submitViewList() {
    $("#searchForm").submit();
}

function viewDetail(targetUrl) {
    let currentUrl = window.location.pathname + window.location.search;
    targetUrl += "?bu=" + window.btoa(currentUrl); // TODO: to support UTF-8
    window.location = targetUrl;
}