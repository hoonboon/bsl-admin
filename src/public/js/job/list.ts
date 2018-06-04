$(document).ready(function() {

});

export function showSearch() {
    (<any>$("#searchModal")).modal("show");
}

export function submitSearch() {
    $("#searchForm").submit();
}
