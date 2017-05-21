/// <reference path="../../Scripts/typings/globals/jquery/index.d.ts" />
//import * as $ from "jquery"

var newEntriesAdded = 0;
var databaseDesc = this["databaseDesc"];
var tableIndexLookup = this["tableIndexLookup"];
var allCurrentChanges = [];

$('[data-toggle="tooltip"]')["tooltip"]();
//  var removerBtn = $('<button class="btn btn-default btn-sm">x</button>');
var removerBtn = $("<a/>",
    {
        html: "&times;",
        class: "removeColBtns",
        href: "#/"
    }).hide(0).on("click", removeHeaderClicked);

for (let names in tableIndexLookup) {
    if (tableIndexLookup.hasOwnProperty(names)) {
        let coloumnTitles = $("#" + names).find("th");
        for (let ii = 1; ii < coloumnTitles.length - 1; ii++) {
            removerBtn.clone(true, true).appendTo(coloumnTitles.get(ii));
            //Hiding everything apart from the default IF they have javascript, so they can still view all the data without javascript enabled
            $("#" + names).find("td:nth-child(" + (ii + 1) + "), th:nth-child(" + (ii + 1) + ")").hide();
        }
    }
}
//for (let i = 0; i < tables.length; i++) {

//}

//$("#members,#venuelocations,#registrationinfo").find("th:last-child, td:last-child").show();
$(".buttonSelector").hide(0);
$(".editSaveBtn,.editCancelBtn").hide(0);
toggleCurCol("members", "FName", true);
toggleCurCol("members", "LName", true);
toggleCurCol("members", "MobileNum", true);
toggleCurCol("members", "Email", true);
toggleCurCol("venuelocations", "VenueName", true);
toggleCurCol("venuelocations", "ContactPerson", true);
toggleCurCol("venuelocations", "Capacity", true);
toggleCurCol("venuelocations", "Address1", true);
toggleCurCol("registrationinfo", "id", true);
toggleCurCol("registrationinfo", "MemberID", true);
toggleCurCol("registrationinfo", "ActivityID", true);
toggleCurCol("cancelledregistrations", "id", true);
toggleCurCol("cancelledregistrations", "MemberID", true);
toggleCurCol("cancelledregistrations", "ActivityID", true);
toggleCurCol("committee", "MemberID", true);
toggleCurCol("committee", "Position", true);
toggleCurCol("jubileeactivities", "ActivityName", true);
toggleCurCol("jubileeactivities", "eventDate", true);
toggleCurCol("jubileeactivities", "startTime", true);
toggleCurCol("jubileeactivities", "endTime", true);
toggleCurCol("jubileeactivities", "Venue", true);

$("#idSelection").draggable({
    handle: ".modal-header",
    //  cursor: "hand"
});
$("#attendenceRepBtn").click(e => {
    window.open("/main/requestPdf?file=attendenceRep");
});

$("#activityRegis").click(e => {
    window.open("/main/requestPdf?file=activityRegis");
});

$("#nameBadges").click(e => {
    window.open("/main/requestPdf?file=nameBadge");
});

$("#viewList").click(e => {
    window.open("/main/onlineMemberList");
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
        const addEntryIn = $(this).children(".editEntry").find(".addEntryInput");
        if (addEntryIn.is("[type='checkbox']")) {
            addEntryIn.prop("checked", originalValue.toLowerCase() === "yes" || originalValue.toLowerCase() === "true");
        }

        addEntryIn.attr("placeholder", originalValue);
        addEntryIn.val(originalValue);

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

$(".cancelRegisBtn").click(function (e) {
    const curId = +$(e.target).parents("tr").children(".dataEntry").first().children(".displayEntry").text();
    $(e.target).parents("tr").remove();
    //addRow("cancelledregistrations", [{ data: curId }, { data: 454545 }, { moreData: 32323}]);
    allCurrentChanges.push({rowID: curId, operation: "CANCEL"});
});

let latestTargetInfo = {id: [], table: "none", row: $()};

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
    // (Probably redundant since operations are done in order, saves some data and processing power server-side I suppose)

    //Checks if the target was an edit or a new entry, don't try to delete it if it's a new entry
    for (let i = 0; i < latestTargetInfo.id.length; i++) {
        if (latestTargetInfo.id[i] < 0) {
            latestTargetInfo.id.splice(i, 1);
            i--;
        }
    }
    allCurrentChanges.push({rowID: latestTargetInfo.id, table: latestTargetInfo.table, operation: "DELETE"});
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
$(".addEntryModal").on("show.bs.modal", function (e) {
    const entry = $(this).find(".addEntryEntry");
    if ($(e.relatedTarget).hasClass("massEditEdit")) {
        $(this).find(".addConfirmBtn").text("Apply").attr("panelMode", "massEdit");
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
        $(this).find(".addConfirmBtn").text("Add").attr("panelMode", "add");
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

$(".addEntryModal").find(".addConfirmBtn").click(e => {
    const containingTable = findContainingTable($(e.target));

    let hasAnyErrors = false;
    $(e.target).parents("div.modal-content").find(".addEntryInput").each(function () {
        const hasError = checkForErrors($(this), ($(e.target).attr("panelMode") === "massEdit"));

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
        $(e.target).parents(".addEntryModal").find(".addEntryEntry").each(function (i) {
            let entryData = "";
            const dynItem = $(this).find(".addEntryInput");

            const entryName = $(this).find(".addEntryLbl").text();
            if (i === 0) {
                editionEntry.push({name: entryName, colInd: i, data: massEditCheckboxIds(containingTable)});
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

            editionEntry.push({colInd: i, name: entryName, data: entryData});
        });
        $("#" + containingTable).find(".massEditCbox:checked").each(function (i) {
            const row = $(this).parents("tr").children(".dataEntry");
            for (let ii = 0; ii < editionEntry.length; ii++) {
                if (editionEntry[ii].colInd !== 0) {
                    row.eq(editionEntry[ii].colInd).children(".displayEntry").text(editionEntry[ii].data);
                }
            }
        });

        allCurrentChanges.push({
            table: containingTable,
            rowID: editionEntry[0].data,
            operation: "UPDATE",
            data: editionEntry
        });
        return;
    }

    $(e.target).removeClass("btn-danger").addClass("btn-primary").text("Add");
    let additionEntry = [];
    $(e.target).parents(".addEntryModal").find(".addEntryEntry").each(function (i) {
        let entryData = "";
        const dynItem = $(this).find(".addEntryInput");

        const entryName = $(this).find(".addEntryLbl").text();
        if (i === 0) {
            additionEntry.push({name: entryName, data: ((-1) - newEntriesAdded)});
            return;
        }
        if (dynItem.length === 0) {
            additionEntry.push({name: "ID", data: ((-1) - newEntriesAdded)});
            return;
        }
        if (dynItem.attr("type") === "checkbox") {
            entryData = dynItem.is(":checked") ? "Yes" : "No";
        } else {
            entryData = dynItem.val().trim();
        }

        additionEntry.push({name: entryName, data: entryData});
    });
    allCurrentChanges.push({
        table: containingTable,
        rowID: [((-1) - newEntriesAdded)],
        operation: "INSERT",
        data: additionEntry
    });
    newEntriesAdded++;
    addRow(containingTable, additionEntry);
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
    $.ajax("/main/submitNewTable",
        {
            data: JSON.stringify(allCurrentChanges),
            contentType: "application/json",
            type: "POST",
            success: res => {
                location.reload();
            },
            error: (jqXHR, textStatus, errorThrown) => {
                if (jqXHR.responseText.includes("ERROR")) {
                    const errorCode = jqXHR.responseText.split(":")[1];
                    if (errorCode === "1451") {
                        $("#submitConfirmBtn")
                            .text("ERROR: A member you tried to remove is referenced from another class.")
                            .removeClass(".btn-success").addClass("btn-danger");
                        needToRefresh = true;
                    }else if (errorCode === "1452") {
                        $("#submitConfirmBtn")
                            .text("ERROR: An id you added is incorrect, please recheck them")
                            .removeClass(".btn-success").addClass("btn-danger");
                        needToRefresh = true;
                    }
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
    const dataEntryLst = $(e.target.parentElement.parentElement.parentElement).find(".dataEntry");
    //Add id as first item to comply with mass edit format
    const currentRowData = [{colInd: 0, data: dataEntryLst.first().text().trim()}];

    let hasAnyErrors = false;
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

        //Maybe add this back in at the end
        // if (outputData !== inputObj.attr("placeholder")) {
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
        //   }
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

    //Check if the data is newly added
    if (+currentRowData[0].data < 0) {
        const toBeChangedInd = allCurrentChanges.findIndex((value, index, obj) => {
            return value.rowID[0] === +currentRowData[0].data && value.table === findContainingTable($(e.target));
        });

        allCurrentChanges[toBeChangedInd].data = currentRowData;
    } else {
        allCurrentChanges.push({
            rowID: [+currentRowData[0].data],
            data: currentRowData,
            table: findContainingTable($(e.target)),
            operation: "UPDATE"
        });
    }
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

$(".selectAllCb").change(function (e) {
    const containingTable = findContainingTable($(e.target));
    const checked = $(e.target).is(":checked");

    $("#" + containingTable).find(".massEditCbox").prop("checked", checked);
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
    if (inputToCheck.val().toLowerCase() === "<same>" && sameMode) {
        inputToCheck.parent().removeClass("has-error");
        return false;
    }
    const inputTxt: String = inputToCheck.val().trim();
    const colId = +inputToCheck.attr("colID");
    const requirements = databaseDesc[tableIndexLookup[findContainingTable(inputToCheck)]][0][colId];

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
    if (varType === "time" && !inputTxt.match(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)) {
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
        $("#" + table + " a.buttonSelSelction").filter(function () {
            return $(this).text().toLowerCase() === rowToRemove.toLowerCase();
        }).prepend($('<span class="glyphicon glyphicon-ok pull-right"></span>'));
    }
    else {
        $("#" + table + " a.buttonSelSelction").filter(function () {
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
    const containedTable = candidate.parents(".parentTableContainer");
    if (containedTable.length > 0) {
        return containedTable.attr("id");
    } else {
        throw "CANT FIND CONTAINER";
    }
    //candidate.parents(".parentTableContainer").attr("id");
    //if ($.contains($("#members")[0], candidate[0])) {
    //    containedTable = "members";
    //} else if ($.contains($("#registrationinfo")[0], candidate[0])) {
    //    containedTable = "registrationinfo";
    //} else if ($.contains($("#venuelocations")[0], candidate[0])) {
    //    containedTable = "venuelocations";
    //} else if ($.contains($("#cancelledregistrations")[0], candidate[0])) {
    //    containedTable = "cancelledregistrations";
    //}
    //if (containedTable === "Failed") {
    //    throw "CANT FIND CONTAINER";
    //}
    //return containedTable;
}

function addRow(containingTable, newData) {

    const titleLst = databaseDesc[tableIndexLookup[containingTable]][0];
    const newRow = $("<tr>");

    // TODO: Allow mass edit for new entries again.
    newRow.append('<td class="col-md-1 vert-align"></td>');
    //newRow
    //    .append('<td class="col-md-1 vert-align">\r\n<div class="anim-checkbox" draggable="false">\r\n<label>\r\n<input type="checkbox" value="">\r\n<span class="cr">\r\n<i class="cr-icon glyphicon glyphicon-ok"></i>\r\n</span>\r\n</label>\r\n</div>\r\n</td>');
    const editTemplateCont = $("#" + containingTable).find(".editEntryModel");

    for (let i = 0; i < titleLst.length; i++) {
        // const newItem = $('<td class="vert-align dataEntry">' + newData[i].data + '</td>');
        const newItem = $("<td>",
            {
                class: "vert-align dataEntry"
            });
        newItem.append($("<div>",
            {
                class: "displayEntry",
                text: newData[i].data
            }));
        if (i >= 1) {
            newItem.append(editTemplateCont.children().eq(i - 1).clone().removeClass("editEntryMod").addClass("editEntry"));
        }

        const isHidden = $("#" + containingTable + " div.buttonSelector .dropdown-menu").find("*").filter(function () {
                return $(this).text().toLowerCase() === titleLst[i].Field.toLowerCase();
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

var startUpload = file => {
    const formData = new FormData();
    formData.append("excelVenue", file);
    $.ajax("/main/uploadExcel",
        {
            type: 'POST',
            // Ajax events
            success: function (data) {
                $("#uploadxlsx")["modal"]("hide");
                location.reload();
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
};
$("#drop-zone").on("drop", e => {
    e.preventDefault();
    e.stopPropagation();
    if (e.originalEvent["dataTransfer"] && e.originalEvent["dataTransfer"].files.length) {
        const file = e.originalEvent["dataTransfer"].files[0];
        if (file.name.length < 1) {
        }
        else if (file.size > 10000) {
            alert("The file is too big");
        } else {
            startUpload(file);
        }
    }
});

$('#drop-zone').on("dragover", e => {
    e.preventDefault();
    e.stopPropagation();
    $(e.target).addClass("drop");
});
$('#drop-zone').on("dragenter", e => {
    e.preventDefault();
    e.stopPropagation();
});
$("#drop-zone").on("dragleave", e => {
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
$("#idSelection .tableSelection").change();
let searchID = {tableID: -1, colName: "", targetName: ""};
$("#idSelection .tableSelection").change(e => {
    let secondPart = $("#idSelection .secondPart");
    let thirdPart = $("#idSelection .thirdPart");
    if ($(e.target).prop("selectedIndex") === 0) {
        secondPart.hide();
        thirdPart.hide();
        return;
    }
    const colData = databaseDesc[tableIndexLookup[$(e.target).val()]][0];
    const colSelect = secondPart.find("select.form-control");
    const resultSelect = thirdPart.find("select.form-control");
    resultSelect.empty();
    colSelect.empty();
    colSelect.append($("<option>", {
        text: "Select search column"
    }));
    resultSelect.append($("<option>", {
        text: "Select search column"
    }));
    for (let i = 0; i < colData.length; i++) {
        let field = colData[i].Field;
        colSelect.append($("<option>", {
            text: field
        }));
        resultSelect.append($("<option>", {
            text: field
        }));
    }
    searchID.tableID = tableIndexLookup[$(e.target).val()] - 1;
    secondPart.show();
    thirdPart.hide();
    searchID.colName = "";
});

$("#idSelection .secondPart select.form-control").change(e => {
    let thirdPart = $("#idSelection .thirdPart");
    if ($(e.target).prop("selectedIndex") === 0) {
        thirdPart.hide();
        return;
    }
    $("th.searcherCol").text($(e.target).val());

    searchID.colName = $(e.target).val();
    $("#idSearchBox").trigger("input");
    thirdPart.show();
});
$("#idSelection .thirdPart select.form-control").change(e => {
    if ($(e.target).prop("selectedIndex") === 0) {
        $(".thirdPart th.resultCol").text("");
        searchID.targetName = "";
        $("#idSearchBox").trigger("input");
        return;
    }
    $(".thirdPart th.resultCol").text($(e.target).val());
    searchID.targetName = $(e.target).val();
    $("#idSearchBox").trigger("input");
});
const resultsTableBody = $("#idSelection tbody");
$("#idSearchBox").on("input", e => {
    if (searchID.tableID === -1 || searchID.colName === "") {
        return;
    }
    let detailArray: Array<any> = databaseDesc[searchID.tableID][0];

    detailArray = detailArray.filter(function (item) {
        return item[searchID.colName].toLowerCase().includes($(e.target).val().toLowerCase());
        //  / /.test(item[searchID.colName])
    });
    // console.log(detailArray);

    resultsTableBody.empty();
    for (let i = 0; i < detailArray.length; i++) {
        // let obj = detailArray[i];
        let toAppend = $("<tr>").append($("<td>", {
            text: detailArray[i][searchID.colName]
        }))
        if (searchID.targetName !== "") {
            toAppend.append($("<td>", {
                text: detailArray[i][searchID.targetName]
            }));
        }
        resultsTableBody.append(toAppend);
        // toAppend.appendTo(resultsTableBody);
    }
});


// Doesn't work consistently

// resultsTableBody.on("click","tr", (e) => {
//     console.log($(e.target.parentElement).children("td").last().text());
//   //  copyTextToClipboard($(e.target.parentElement).children("td").last().text())
// });
//
// function copyTextToClipboard(text) {
//     let textArea = document.createElement("textarea");
//
//     textArea.style.position = 'fixed';
//     textArea.style.top = "0";
//     textArea.style.left = "0";
//     textArea.style.width = '2em';
//     textArea.style.height = '2em';
//     textArea.style.padding = "0";
//     textArea.style.border = 'none';
//     textArea.style.outline = 'none';
//     textArea.style.boxShadow = 'none';
//     textArea.style.background = 'transparent';
//     textArea.value = text;
//     document.body.appendChild(textArea);
//     textArea.select();
//     try {
//         const successful = document.execCommand('copy');
//         const msg = successful ? 'successful' : 'unsuccessful';
//         console.log('Copying text command was ' + msg);
//     } catch (err) {
//         console.log('Oops, unable to copy');
//     }
//
//     document.body.removeChild(textArea);
// }

















