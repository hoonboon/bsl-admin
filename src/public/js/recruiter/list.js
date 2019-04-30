$(document).ready(function() {

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

function goCreate(targetUrl) {
    let currentUrl = window.location.pathname + window.location.search;
    targetUrl += "?bu=" + window.btoa(currentUrl); // TODO: to support UTF-8
    window.location = targetUrl;
}