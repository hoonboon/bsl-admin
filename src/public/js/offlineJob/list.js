$(document).ready(function() {
    let recruiters = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('label'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        // local: recruiterSet,
        remote: {
            url: 'api/recruiters?q=%QUERY',
            wildcard: '%QUERY',
            transform: function(response) {
                let results = [];
                if (response && response instanceof Array) {
                    response.forEach(element => {
                        const newElem = {
                            value: element._id,
                            label: element.name + " - " + element.email,
                        };
                        results.push(newElem);
                    });
                }
                // console.log("results: " + JSON.stringify(results));
                return results;
            },
        },
        identify: function(obj) { return obj.value; },
    });

    $('.typeahead').typeahead({
        hint: true,
        highlight: true, /* Enable substring highlighting */
        minLength: 3 /* Specify minimum characters required for showing suggestions */
    }, {
        name: 'recruiters',
        display: 'label',
        source: recruiters,
        limit: Infinity,
    });

    $('.typeahead').bind('typeahead:select', function(ev, selected) {
        console.log("selected: " + JSON.stringify(selected));
        submitFilter(selected.value, selected.label);
    });
    
    $("#searchTitle").keypress(function(event) {
        let keycode = (event.keyCode ? event.keyCode : event.which);
        if (keycode == "13") {
            submitViewList();
        }
    });

    $("#searchEmployerName").keypress(function(event) {
        let keycode = (event.keyCode ? event.keyCode : event.which);
        if (keycode == "13") {
            submitViewList();
        }
    });

});

function showSearch() {
    $("#searchModal").modal("show");
}

function showSelectRecruiter() {
    $("#selectRecruiterModal").modal("show");
}

function submitViewList() {
    $("#searchForm").submit();
}

function submitFilter(value) {
    $("#recruiterId").val(value);
    $("#searchForm").submit();
}

function viewDetail(targetUrl) {
    let currentUrl = window.location.pathname + window.location.search;
    targetUrl += "?bu=" + window.btoa(currentUrl); // TODO: to support UTF-8
    window.location = targetUrl;
}

function goCreate(targetUrl) {
    let currentUrl = window.location.pathname + window.location.search;
    targetUrl += "?recruiterId=" + $("#recruiterId").val();
    targetUrl += "&bu=" + window.btoa(currentUrl); // TODO: to support UTF-8
    window.location = targetUrl;
}