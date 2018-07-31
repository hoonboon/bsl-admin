/*!
 * Calling module JS file to implement: 
 * - The target function: submitViewList()
 * - Hidden form input: newPageNo, rowPerPage
 */

function goToPage(newPageNo) {
    $("#newPageNo").val(newPageNo);
    submitViewList();
}

function changeRowPerPage(rowPerPage) {
    $("#rowPerPage").val(rowPerPage);
    $("#newPageNo").val(1);
    submitViewList();
}
