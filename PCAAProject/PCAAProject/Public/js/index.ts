/// <reference path="../../Scripts/typings/globals/jquery/index.d.ts" />
//import * as $ from "jquery"

var newEntriesAdded = 0;
var databaseDesc = this["databaseDesc"];
var allCurrentChanges = [];

var coloumnTitles = $("#members").find("th");
$('[data-toggle="tooltip"]')["tooltip"]();
//  var removerBtn = $('<button class="btn btn-default btn-sm">x</button>');
var removerBtn = $("<a/>",
    {
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
$(".editSaveBtn,.editCancelBtn").hide(0);

toggleCurCol("members", "FName", true);
toggleCurCol("members", "LName", true);
toggleCurCol("members", "MobileNum", true);
toggleCurCol("members", "Email", true);

$("#attendenceRepBtn").click(function (e) {
    window.open("requestPdf?file=attendenceRep");
});


$("#activityRegis").click(e => {
    window.open("requestPdf?file=activityRegis");
});

$("#activityRegis").click(e => {
    window.open("requestPdf?file=activityRegis");
});

$("#nameBadges").click(e => {
    window.open("requestPdf?file=nameBadge");
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
$("tbody").on("click", ".editEntryBtn", e => {
    $(e.target.parentElement.parentElement.parentElement).find(".dataEntry").each(function (i) {
        if (i === 0) {
            return;
        }
        const originalValue = $(this).find(".displayEntry").text();
        $(this).children(".editEntry").find(".addEntryInput").attr("placeholder", originalValue);
        $(this).children(".editEntry").find(".addEntryInput").val(originalValue);
        $(this).children(".editEntry").show();
        $(this).children(".displayEntry").hide();


        //var temp = $(this).append($("<input/>",
        //    {
        //        value: $(this).text(),
        //        placeholder: $(this).text(),
        //        class: "form-control",
        //        maxlength: 50,
        //    })).children();

        //$(this).text("").append(temp);
    });
    $(e.target).hide();
    $(e.target.parentElement).find(".editSaveBtn,.editCancelBtn").show();
});


var latestTargetInfo = { id: [], table: "none", row: $() };

$("#removalConfirm").on("show.bs.modal", function (e) {

    latestTargetInfo.table = findContainingTable($(e.relatedTarget));
    latestTargetInfo.row = $();
    if ($(e.relatedTarget).hasClass("massEditRemove")) {
        latestTargetInfo.id = massEditCheckboxIds(latestTargetInfo.table,
            cur => {
                latestTargetInfo.row = latestTargetInfo.row.add(cur);
            });
    } else {
        latestTargetInfo.row = $(e.relatedTarget.parentElement.parentElement.parentElement);
        latestTargetInfo.id = [+$(e.relatedTarget.parentElement.parentElement.parentElement).find(".dataEntry").first().text().trim()];

    }
    $(this).find(".info").text("id = " + latestTargetInfo.id);
    //latestTargetInfo.row.css("backgroundColor", "lightcoral");
});

$("#removeConfirmBtn").click(e => {
    latestTargetInfo.row.remove();
    otherEntryRemovalCheck(latestTargetInfo.id, latestTargetInfo.table);
    // Remove already existing items to avoid changing things that are to be removed. 
    // (Probably redundent since operations are done in order, saves some data and processing power server-side I suppose)

    //Checks if the target was an edit or a new entry, don't try to delete it if it's a new entry
    for (let i = 0; i < latestTargetInfo.id.length; i++) {
        if (latestTargetInfo.id[i] < 0) {
            latestTargetInfo.id.splice(i, 1);
            i--;
        }
    }
    allCurrentChanges.push({ rowID: latestTargetInfo.id, table: latestTargetInfo.table, operation: "DELETE" });
});

$("input.addEntryInput").blur(e => {
    if (checkForErrors($(e.target))) {
        $(e.target.parentElement).addClass("has-error");
    } else {
        $(e.target.parentElement).removeClass("has-error");
    }
});
$("input.addEntryInput[type='checkbox']").change(function () {
    $(this).attr("changed", "true");
});
$("#addMembers").on("show.bs.modal", e => {
    const entry = $("#addMembers").find(".addEntryEntry");
    if ($(e.relatedTarget).hasClass("massEditEdit")) {
        $("#addMembers").find(".addConfirmBtn").text("Apply").attr("panelMode", "massEdit");
        entry.find("input.addEntryInput").val("<same>");
        entry.find("select.addEntryInput").each(function (i) {
            if ($(this).find("option:contains('<same>')").length === 0) {
                $(this).append($("<option>",
                    {
                        text: "<same>"
                    }));
            }
            $(this).val("<same>");
        });
        entry.find("input.addEntryInput[type='number']").val(-1);
        entry.find("input.addEntryInput[type='checkbox']").attr("changed", "false");
    } else {
        $("#addMembers").find(".addConfirmBtn").text("Add").attr("panelMode", "add");
        entry.find("select.addEntryInput").each(function (i) {
            //Check if the last click was a mass edit, if so, clear the same tags. Otherwise save previous input
            const selectOpt = $(this).find("option:contains('<same>')");
            if (selectOpt.length > 0) {
                selectOpt.remove();
                entry.find("input.addEntryInput").val("");
                entry.find("input.addEntryInput[type='number']").val(2000);
            }
        });
    }
});

$("#addMembers").find(".addConfirmBtn").click(e => {
    let hasAnyErrors = false;
    $(e.target).parents("div.modal-content").find(".addEntryInput").each(function () {
        const hasError = checkForErrors($(this, $(e.target).attr("panelMode") === "massEdit"));
        if (hasError) {
            hasAnyErrors = true;
        }
    });
    if (hasAnyErrors) {
        $(e.target).removeClass("btn-primary").addClass("btn-danger").text("There is an error in your input, press this when fixed");
        e.preventDefault();
        e.stopPropagation();
        return;
    }

    if ($(e.target).attr("panelMode") === "massEdit") {
        let editionEntry = [];
        $("#addMembers").find(".addEntryEntry").each(function (i) {
            let entryData = "";
            const dynItem = $(this).find(".addEntryInput");

            const entryName = $(this).find(".addEntryLbl").text();
            if (i === 0) {
                editionEntry.push({ name: entryName, colInd: i, data: massEditCheckboxIds("members") });
                return;
            }
            if (dynItem.length === 0) {
                return;
            }
            if (dynItem.val() === "<same>" || dynItem.attr("changed") === "false" || dynItem.val() === "-1") {
                return;
            }
            if (dynItem.attr("type") === "checkbox") {
                entryData = dynItem.is(":checked") ? "Yes" : "No";
            } else {
                entryData = dynItem.val().trim();
            }

            editionEntry.push({ colInd: i, name: entryName, data: entryData });
        });
        $("#members").find(".massEditCbox:checked").each(function (i) {
            const row = $(this).parents("tr").children(".dataEntry");
            for (let ii = 0; ii < editionEntry.length; ii++) {
                row.eq(editionEntry[ii].colInd).children(".displayEntry").text(editionEntry[ii].data);
            }
        });
        allCurrentChanges.push({ table: "members", rowID: editionEntry[0].data, operation: "UPDATE", data: editionEntry });
        return;
    }

    $(e.target).removeClass("btn-danger").addClass("btn-primary").text("Add");
    let additionEntry = [];
    $("#addMembers").find(".addEntryEntry").each(function (i) {
        let entryData = "";
        const dynItem = $(this).find(".addEntryInput");

        const entryName = $(this).find(".addEntryLbl").text();
        if (i === 0) {
            additionEntry.push({ name: entryName, data: ((-1) - newEntriesAdded) });
            return;
        }
        if (dynItem.length === 0) {
            additionEntry.push({ name: "ID", data: ((-1) - newEntriesAdded) });
            return;
        }
        if (dynItem.attr("type") === "checkbox") {
            entryData = dynItem.is(":checked") ? "Yes" : "No";
        } else {
            entryData = dynItem.val().trim();
        }

        additionEntry.push({ name: entryName, data: entryData });
    });
    allCurrentChanges.push({ table: "members", rowID: [((-1) - newEntriesAdded)], operation: "INSERT", data: additionEntry });
    newEntriesAdded++;
    addRow("members", additionEntry);

});

function massEditCheckboxIds(table: String, loopFunctions: Function = null) {
    const idsToRemove = [];
    $("#" + table).find(".massEditCbox:checked").each(function (i) {
        const curRow = $(this).parents("tr");
        loopFunctions && loopFunctions(curRow);
        idsToRemove.push(+curRow.find(".dataEntry").first().text().trim());
    });
    return idsToRemove;
}
$("#revertConfirmBtn").click(e => {
    location.reload();
});
let needToRefresh = false;
$("#submitConfirmBtn").click(e => {
    if ($("#submitConfirmBtn").hasClass("btn-danger")) {
        location.reload();
        return;
    }
    e.preventDefault();
    e.stopPropagation();
    $.ajax("/submitNewTable",
        {
            data: JSON.stringify(allCurrentChanges),
            contentType: "application/json",
            type: "POST",
            success: res => {
                if (res.includes("ERROR")) {
                    const errorCode = res.split(":")[1];
                    if (errorCode === "1451") {
                        $("#submitConfirmBtn")
                            .text("ERROR: A member you tried to remove is referenced from another class.")
                            .removeClass(".btn-success").addClass("btn-danger");
                        needToRefresh = true;
                    }
                } else {
                    location.reload();
                }
            }
        });
});

$("#submitConfirm").on("hidden.bs.modal", () => {
    if (needToRefresh) {
        location.reload();
    }
});

$("tbody").on("click", ".editSaveBtn", (e => {
    var currentRowData = [];
    let hasAnyErrors = false;
    const dataEntryLst = $(e.target.parentElement.parentElement.parentElement).find(".dataEntry");
    dataEntryLst.each(function (i) {
        if (i === 0) {
            return;
        }
        const inputObj = $(this).find(".addEntryInput").first();
        let outputData: string;
        if (inputObj.attr("type") === "checkbox") {
            outputData = inputObj.is(":checked") ? "Yes" : "No";
        } else {
            outputData = inputObj.val().trim();
        }

        if (outputData !== inputObj.attr("placeholder")) {
            if (checkForErrors(inputObj)) {
                inputObj.parent().addClass("has-error");
                hasAnyErrors = true;
                return;
            }
            $(this).children(".displayEntry").text(outputData);
            if (inputObj.attr("type") === "checkbox") {
                outputData = inputObj.is(":checked").toString();
            }
            currentRowData.push({
                data: outputData,
                colInd: i
            });
        }
    });
    if (hasAnyErrors) {
        $(e.target).removeClass("btn-success").addClass("btn-danger").attr("title", "There is an error in your input, press this again when fixed")["tooltip"]("fixTitle")["tooltip"]("show").text("Error");
        e.preventDefault();
        e.stopPropagation();
        return;
    }
    dataEntryLst.each(function () {
        $(this).children(".editEntry").hide();
        $(this).children(".displayEntry").show();
    });
    $(e.target).removeClass("btn-danger").addClass("btn-success").attr("title", "")["tooltip"]("destroy").text("Save");
    $('[data-toggle="tooltip"]')["tooltip"]();
    $(e.target.parentElement.parentElement.parentElement).find(".editSaveBtn,.editCancelBtn").hide(0);
    $(e.target.parentElement.parentElement.parentElement).find(".editEntryBtn").show();

    allCurrentChanges.push({ rowID: [+dataEntryLst.first().text().trim()], data: currentRowData, table: findContainingTable($(e.target)), operation: "UPDATE" });
}));

$("tbody").on("click", ".editCancelBtn", (e => {
    $(e.target.parentElement.parentElement.parentElement).find(".dataEntry").each(function () {
        $(this).children(".editEntry").hide();
        $(this).children(".displayEntry").show();
    });
    $(e.target.parentElement).children(".editSaveBtn").removeClass("btn-danger").addClass("btn-success").attr("title", "")["tooltip"]("destroy").text("Save");
    $(e.target.parentElement.parentElement.parentElement).find(".editSaveBtn,.editCancelBtn").hide(0);
    $(e.target.parentElement.parentElement.parentElement).find(".editEntryBtn").show();
}));
$(".buttonSelSelction").click(e => {
    // var colHeaderObj = $("th:contains(\"" + e.target.textContent + "×\")");
    toggleCurCol(findContainingTable($(e.target)), e.target.textContent);

});

function getAllIndices(arr, val) {
    var indexes = [], i;
    for (i = 0; i < arr.length; i++)
        if (arr[i] === val)
            indexes.push(i);
    return indexes;
}
function checkForErrors(inputToCheck: JQuery, sameMode = false) {
    if (inputToCheck.attr("type") === "checkbox") {
        return false;
    }
    if (inputToCheck.val().toLowerCase() === "<same>") {
        inputToCheck.parent().removeClass("has-error");
        return false;
    }
    const inputTxt: String = inputToCheck.val().trim();
    const colId = +inputToCheck.attr("colID");

    const requirements = databaseDesc[1][0][colId];

    let maxLength = (requirements.Type.match(/\(\d+\)/));
    maxLength = maxLength ? +(maxLength[0].substr(1).slice(0, -1)) : NaN;

    const varType = requirements.Type.match(/[a-zA-Z]+/)[0];

    if (requirements.Null === "NO" && isEmptyOrSpaces(inputTxt)) {
        inputToCheck.parent().addClass("has-error");
        return true;
    }

    if (!isNaN(maxLength) && inputTxt.length > maxLength) {
        inputToCheck.parent().addClass("has-error");
        return true;
    }

    if (varType === "date" && !inputTxt.match(/^(0?[1-9]|[12][0-9]|3[01])\ *[\/\-]\ *(0?[1-9]|1[012])\ *[\/\-]\ *\d{4}$/)) {
        inputToCheck.parent().addClass("has-error");
        return true;
    }

    if (varType === "year" && (isNaN(+inputTxt) || (+inputTxt <= 0 && (+inputTxt !== -1 && sameMode)))) {
        inputToCheck.parent().addClass("has-error");
        return true;
    }
    inputToCheck.parent().removeClass("has-error");
    return false;

}

function toggleCurCol(table: String, rowToRemove: String, forceVisibility = false) {
    const indexObj = $("#" + table).find("th").filter(function () {
        return $(this).text().toLowerCase() === rowToRemove.toLowerCase() + "×";
    });
    $("#" + table).find("td:nth-child(" + (indexObj.index() + 1) + "), th:nth-child(" + (indexObj.index() + 1) + ")").toggle();
    if (indexObj.is(":visible") || forceVisibility) {
        $("a.buttonSelSelction").filter(function () {
            return $(this).text().toLowerCase() === rowToRemove.toLowerCase();
        }).prepend($('<span class="glyphicon glyphicon-ok pull-right"></span>'));
    }
    else {
        $("a.buttonSelSelction").filter(function () {
            return $(this).text().toLowerCase() === rowToRemove.toLowerCase();
        }).children("span").remove();
    }
}

function removeHeaderClicked(e: JQueryEventObject) {
    const targetColIndex = $(e.target.parentElement).index() + 1;
    toggleCurCol(findContainingTable($(e.target)), $(e.target.parentElement).text().slice(0, -1));
}

function isEmptyOrSpaces(str: String) {
    return str === null || str.match(/^ *$/) !== null;
}

function findContainingTable(candidate: JQuery) {
    let containedTable = "Failed";
    if ($.contains($("#members")[0], candidate[0])) {
        containedTable = "members";
    } else if ($.contains($("#registrationInfo")[0], candidate[0])) {
        containedTable = "registrationinfo";
    } else if ($.contains($("#venuelocations")[0], candidate[0])) {
        containedTable = "venuelocations";
    }
    return containedTable;
}

function addRow(containingTable, newData) {
    const memberTitleLst = databaseDesc[0][1];
    const newRow = $("<tr>");
    newRow
        .append('<td class="col-md-1 vert-align">\r\n<div class="anim-checkbox" draggable="false">\r\n<label>\r\n<input type="checkbox" value="">\r\n<span class="cr">\r\n<i class="cr-icon glyphicon glyphicon-ok"></i>\r\n</span>\r\n</label>\r\n</div>\r\n</td>');

    for (let i = 0; i < memberTitleLst.length; i++) {
        const newItem = $('<td class="vert-align dataEntry">' + newData[i].data + '</td>');

        const isHidden = $("div.buttonSelector .dropdown-menu").find("*").filter(function () {
            return $(this).text().toLowerCase() === newData[i].name.toLowerCase();
        }).find("span").length === 0;
        if (isHidden) {

            newItem.hide(0);
        }
        newRow.append(newItem);
    }
    newRow
        .append('<td class=\"vert-align editBtnGroup\">\r\n<div class=\"btn-group btn-group-sm pull-right show-on-hover\">\r\n<button type=\"button\" class=\"btn btn-success editSaveBtn\">Save</button>\r\n<button type=\"button\" class=\"btn btn-warning editCancelBtn\">Cancel</button>\r\n<button type=\"button\" class=\"btn btn-default editEntryBtn\">Edit</button>\r\n<button type=\"button\" class=\"btn btn-danger\" data-toggle=\"modal\" data-target=\"#removalConfirm\">Delete</button>\r\n</div>\r\n</td>');
    newRow.css("backgroundColor", "palegreen");
    newRow.find(".editSaveBtn,.editCancelBtn").hide(0);
    newRow.find(".editEntryBtn").trigger("click");
    $("#" + containingTable).find("tbody").append(newRow);
}

function otherEntryRemovalCheck(allIDs: Array<Number>, relevantTable) {
    for (let i = 0; i < allIDs.length; i++) {
        let indicesToRemove = allCurrentChanges.reduce((acc, c, i) => {
            // Untested code:
            if (c.table === relevantTable) {
                const allEntries = getAllIndices(c.rowID, allIDs[i]);
                if (allEntries.length > 0) {
                    for (let ii = 0; ii < allEntries.length; ii++) {
                        c.rowID.splice(allEntries[ii], 1);
                    }
                    if (c.rowID.length === 0) {
                        acc.push(i);
                    }
                }
            }
            // Untested end
            return acc;
        }, []);
        for (let ii = 0; ii < indicesToRemove.length; ii++) {
            allCurrentChanges.splice(indicesToRemove[ii], 1);
        }
    }
}




var dropZone = document.getElementById('drop-zone');
var uploadForm = document.getElementById('js-upload-form');

var startUpload = function (file) {
    const formData = new FormData();
    formData.append("file", file);
    $.ajax("/uploadExcel", {
        type: 'POST',
        // Ajax events
        success: function (data) {
        },
        error: function () {
            alert("Something went wrong!");
        },
        // Form data
        data: formData,
        // Options to tell jQuery not to process data or worry about the content-type
        cache: false,
        contentType: false,
        processData: false
    });
}
$("#drop-zone").on("drop", function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.originalEvent["dataTransfer"] && e.originalEvent["dataTransfer"].files.length) {
        const file = e.originalEvent["dataTransfer"].files[0];
        if (file.name.length < 1) { }
        else if (file.size > 10000) {
            alert("The file is too big");
        } else {
            startUpload(file);
        }
    }
});

$('#drop-zone').on("dragover", function (e) {
    e.preventDefault();
    e.stopPropagation();
    $(e.target).addClass("drop");
});
$('#drop-zone').on("dragenter", function (e) {
    e.preventDefault();
    e.stopPropagation();
});
$("#drop-zone").on("dragleave", function (e) {
    $(e.target).removeClass("drop");
});
$('#js-upload-files').change(function () {
    const file = this.files[0];
    const name = file.name;
    const size = file.size;
    const type = file.type;

    if (file.name.length < 1) {
    }
    else if (file.size > 10000) {
        alert("The file is too big");
    }
    else {
        $(':submit').click(function () {
            startUpload(file);
        });
    }
});