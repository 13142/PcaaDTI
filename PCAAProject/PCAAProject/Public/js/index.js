/// <reference path="../../Scripts/typings/globals/jquery/index.d.ts" />
//import * as $ from "jquery"
var databaseDesc = this["databaseDesc"];
var allCurrentChanges = [];
var coloumnTitles = $("#members").find("th");
//  var removerBtn = $('<button class="btn btn-default btn-sm">x</button>');
var removerBtn = $("<a/>", {
    html: "&times;",
    class: "removeColBtns",
    href: "#/",
}).hide(0).on("click", removeHeaderClicked);
for (let i = 1; i < coloumnTitles.length - 1; i++) {
    removerBtn.clone(true, true).appendTo(coloumnTitles.get(i));
    //Hiding everything apart from the default IF they have javascript, so they can still view all the data without javascript enabled
    $("#members,#venuelocations,#registrationinfo").find("td:nth-child(" + (i + 1) + "), th:nth-child(" + (i + 1) + ")").hide();
}
$(".buttonSelector").hide(0);
$(".editSaveBtn,.editCancleBtn").hide(0);
toggleCurCol("members", "FName", true);
toggleCurCol("members", "LName", true);
toggleCurCol("members", "MobileNum", true);
toggleCurCol("members", "Email", true);
$("#attendenceRepBtn").click(function (e) {
    console.log("U FKING SRS?");
    window.open("requestPdf?file=attendenceRep");
    //$.ajax("/requestPdf",
    //    {
    //        data: "attendencePDF",
    //        contentType: "application/json",
    //        type: "GET",
    //        success: res => {
    //            console.log(res);
    //            location.reload();
    //        }
    //    });
});
$(".colEditBtn").click(() => {
    $(".removeColBtns").toggle(25);
    $(".buttonSelector").toggle(25);
});
// Prevent dropdown from closing
$(".dropdown-menu").on("click.bs.dropdown", e => {
    e.stopPropagation();
    e.preventDefault();
});
$(".editEntryBtn").click(e => {
    $(e.target.parentElement.parentElement.parentElement).find(".dataEntry").each(function (i) {
        if (i === 0) {
            return;
        }
        var temp = $(this).append($("<input/>", {
            value: $(this).text(),
            placeholder: $(this).text(),
            class: "form-control",
            maxlength: 50,
        })).children();
        $(this).text("").append(temp);
    });
    $(e.target).hide();
    $(e.target.parentElement).find(".editSaveBtn,.editCancleBtn").show();
});
var latestTargetInfo = { id: -1, table: "none", row: $() };
$("#removalConfirm").on("show.bs.modal", function (e) {
    latestTargetInfo.row = $(e.relatedTarget.parentElement.parentElement.parentElement);
    latestTargetInfo.id = +$(e.relatedTarget.parentElement.parentElement.parentElement).find(".dataEntry").first().text();
    latestTargetInfo.table = findContainingTable($(e.relatedTarget));
    $(this).find(".info").text("id = " + latestTargetInfo.id);
    //latestTargetInfo.row.css("backgroundColor", "lightcoral");
});
function findContainingTable(candidate) {
    var containedTable = "Failed";
    if ($.contains($("#members")[0], candidate[0])) {
        containedTable = "members";
    }
    else if ($.contains($("#RegistrationsPanel")[0], candidate[0])) {
        containedTable = "registrationinfo";
    }
    else if ($.contains($("#VenuesPanel")[0], candidate[0])) {
        containedTable = "venuelocations";
    }
    return containedTable;
}
$("#removeConfirmBtn").click(e => {
    latestTargetInfo.row.remove();
    // Remove already existing items to avoid changing things that are removed. 
    // (Probably redundent since operations are done in order, saves some data and processing power server-side I suppose)
    let indexToRemove = allCurrentChanges.findIndex(c => c.rowID === latestTargetInfo.id);
    while (indexToRemove) {
        allCurrentChanges.splice(indexToRemove, 1);
        indexToRemove = allCurrentChanges.findIndex(c => c.rowID === latestTargetInfo.id);
    }
    allCurrentChanges.push({ rowID: latestTargetInfo.id, table: latestTargetInfo.table, operation: "DELETE" });
});
$("#revertConfirmBtn").click(e => {
    location.reload();
});
$("#submitConfirmBtn").click(e => {
    $.ajax("/submitNewTable", {
        data: JSON.stringify(allCurrentChanges),
        contentType: "application/json",
        type: "POST",
        success: res => {
            console.log(res);
            location.reload();
        }
    });
});
$(".editSaveBtn").click(e => {
    var currentRowData = [];
    $(e.target.parentElement.parentElement.parentElement).find(".dataEntry").each(function (i) {
        if (i === 0) {
            currentRowData.push({
                newData: $(this).text(),
                colInd: i
            });
            return;
        }
        var textBoxObj = $(this).children("input").first();
        if (textBoxObj.val() !== textBoxObj.attr("placeholder")) {
            $(this).text(textBoxObj.val());
            currentRowData.push({
                newData: $(this).text(),
                colInd: i
            });
        }
        else {
            $(this).text(textBoxObj.val());
        }
    });
    $(e.target.parentElement.parentElement.parentElement).find(".editSaveBtn,.editCancleBtn").hide(0);
    $(e.target.parentElement.parentElement.parentElement).find(".editEntryBtn").show();
    allCurrentChanges.push({ rowID: currentRowData[0].newData, data: currentRowData, table: findContainingTable($(e.target)), operation: "UPDATE" });
});
$(".editCancleBtn").click(e => {
    $(e.target.parentElement.parentElement.parentElement).find(".dataEntry").each(function (i) {
        $(this).text($(this).children("input").first().attr("placeholder"));
    });
    $(e.target.parentElement.parentElement.parentElement).find(".editSaveBtn,.editCancleBtn").hide(0);
    $(e.target.parentElement.parentElement.parentElement).find(".editEntryBtn").show();
});
$(".buttonSelSelction").click(e => {
    // var colHeaderObj = $("th:contains(\"" + e.target.textContent + "×\")");
    toggleCurCol(findContainingTable($(e.target)), e.target.textContent);
});
function toggleCurCol(table, rowToRemove, forceVisibility = false) {
    var indexObj = $("#" + table).find("th:contains(\"" + rowToRemove + "×\")");
    console.log(indexObj);
    $("#" + table).find("td:nth-child(" + (indexObj.index() + 1) + "), th:nth-child(" + (indexObj.index() + 1) + ")").toggle();
    if (indexObj.is(":visible") || forceVisibility) {
        $("a.buttonSelSelction:contains(" + rowToRemove + ")").prepend($('<span class="glyphicon glyphicon-ok pull-right"></span>'));
    }
    else {
        $("a.buttonSelSelction:contains(" + rowToRemove + ")").children("span").remove();
    }
}
function removeHeaderClicked(e) {
    var targetColIndex = $(e.target.parentElement).index() + 1;
    toggleCurCol(findContainingTable($(e.target)), $(e.target.parentElement).text().slice(0, -1));
}
//# sourceMappingURL=index.js.map