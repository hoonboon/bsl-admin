$(document).ready(function() {
    if (window.history.length > 1) {
        $("#btnGoBack").show();
    } else {
        $("#btnGoBack").hide();
    }

    $("#productPriceId").change(function() {
        let selectedId = $("#productPriceId").val();
        let newPrice = productPriceSet.find(function(item) {
            return item._id === selectedId;
        });
        if (newPrice) {
            $("#totalAmount").val(newPrice.currency + numeral(newPrice.unitPrice).format("0,0.00"));
            $("#totalCredit").val(numeral(newPrice.unitCreditValue).format("0,0"));
        }
    });
});

function goBack() {
    window.history.back();
}

function submitAddCredit() {
    if (confirm("Confirm to save?")) {
        $("#addCreditForm").submit();
    }
}
