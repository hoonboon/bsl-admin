$(document).ready(function() {
    CKEDITOR.replace("customContent", {
        height: 300
    });
});

function submitDelete() {
    if (confirm("Confirm to delete this record?")) {
        $("#jobDeleteForm").submit();
    }
}
