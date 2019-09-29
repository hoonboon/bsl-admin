$(document).ready(function() {
    CKEDITOR.replace("customContent", {
        height: 300
    });

    if (window.history.length > 1) {
        $("#btnGoBack").show();
    } else {
        $("#btnGoBack").hide();
    }

    $("#productPriceId").on("change", function() {
        let newPriceId = $(this).val();
        let newPrice = productPriceSet.find(function(elem) {
            return elem._id === newPriceId;
        });
        let publishDateStart = $("#publishStart").val();
        
        setPublishEnd(publishDateStart, newPrice.postingDays);
      });

      $("#publishStart").on("change", function() {
          let priceId = $("#productPriceId").val();
          let price = productPriceSet.find(function(elem) {
              return elem._id === priceId;
          });
          let newPublishDateStart = $(this).val();
          
          setPublishEnd(newPublishDateStart, price.postingDays);
        });
});

function goBack() {
    let bu = $("#bu").val();
    if (bu) {
        window.location = window.atob(bu);
    } else {
        window.history.back();
    }
}

function setPublishEnd(publishDateStart, postingDays) {
    let newPublishDateEnd = moment(publishDateStart, "YYYY-MM-DD").add(postingDays - 1, "days").format("YYYY-MM-DD");
    $("#publishEnd").val(newPublishDateEnd);
}
