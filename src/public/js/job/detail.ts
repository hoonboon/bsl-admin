$(document).ready(function() {

});

export function submitDelete() {
    if (confirm("Confirm to delete this record?")) {
        $("#jobDeleteForm").submit();
    }
}
