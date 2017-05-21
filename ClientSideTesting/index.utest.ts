/// <reference path="../Scripts/typings/globals/mocha/index.d.ts" />
/// <reference path="../Scripts/typings/globals/jquery/index.d.ts" />

// Probably should move this file from the public folder
// ----------------------------------------------------
mocha.setup("bdd");

describe("Submiting", function () {
    before(done => {
        $.ajax("/databaseSubmitTesting",
            {
                data: JSON.stringify({command: "Clear"}),
                contentType: "application/json",
                type: "POST",
                success: res => {
                    done();
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    throw jqXHR.status.toString() + " <--- Code ";
                }
            });
    });
    it("Adding New Row", function () {
        let entryLsts = $("#addRegis").find(".addEntryEntry");
        assert(entryLsts.length === 3, "Not enough entries");
        entryLsts.each(function (i) {
            if (i === 0) {
                return;
            }
            let currentInput: JQuery = $(this).children(".addEntryInput");
            assert(currentInput.length !== 0, "addEntryEntry error");

            switch (i) {
                case 1:
                    currentInput.val(183);
                    break;
                case 2:
                    currentInput.val(3);
            }
        });
        $("#addRegis").find(".addConfirmBtn").click();
        let regisTable = $("#registrationinfo").find("tbody");
        let newlyAddedRow = regisTable.children("tr").last();
        assert(newlyAddedRow.css("backgroundColor").toString() === "rgb(152, 251, 152)");
        assert(newlyAddedRow.children().length === 5, "column number right");
        assert(newlyAddedRow.children().first().children(".anim-checkbox").length === 0, "checkbox no exists");
        newlyAddedRow.children(".dataEntry").each(function (i) {
            if (i === 0) {
                assert($(this).children(".displayEntry").text() === "-1", "Check ID is -1");
                return;
            }
            assert($(this).children(".editEntry").is(":visible") === false);
            assert($(this).children(".editEntry").children(".addEntryInput").length === 1);
            switch (i) {
                case 1:
                    assert($(this).children(".displayEntry").text() === "183");
                    break;
                case 2:
                    assert($(this).children(".displayEntry").text() === "3");
                    break;
            }
        });
        assert(newlyAddedRow.find(".cancelRegisBtn").length === 0);
        $.ajax("/databaseSubmitTesting",
            {
                data: JSON.stringify({command: "Write", data: [allCurrentChanges[allCurrentChanges.length - 1]]}),
                contentType: "application/json",
                type: "POST",
                success: res => {
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    throw jqXHR.status;
                }
            });

    });
    it("Edit existing row", function () {
        let changeCount = allCurrentChanges.length;

        let regisTable = $("#registrationinfo").find("tbody");
        let curRow = regisTable.children().first();
        let btns = curRow.children(".editBtnGroup").children().first();

        assert(btns.children(".editSaveBtn").css("display") === "none", "save btn should not be visible");
        assert(btns.children(".editCancelBtn").css("display") === "none", "cancel btn should not be visible");
        assert(btns.children(".editEntryBtn").css("display") !== "none", "edit btn should be visible");
        assert(btns.children(".cancelRegisBtn").css("display") !== "none", "cancel btn should be visible");
        curRow.children(".dataEntry").each((index, elem) => {
            if (index === 0) {
                assert($(elem).children(".displayEntry").is(":visible"), "id is vis");
                return;
            }
            assert($(elem).children(".displayEntry").is(":visible"), "display entry should be visible");
            assert(!$(elem).children(".editEntry").is(":visible"), "edit entry should not be vis");
        });

        btns.children(".editEntryBtn").click();
        assert(btns.children(".editSaveBtn").css("display") !== "none", "save btn should visible");
        assert(btns.children(".editCancelBtn").css("display") !== "none", "cancel btn should be visible");

        let curValues = [];
        curRow.children(".dataEntry").each((index, elem) => {
            if (index === 0) {
                assert($(elem).children(".displayEntry").is(":visible"), "id is vis");
                return;
            }
            assert(!$(elem).children(".displayEntry").is(":visible"), "display entry is not visible");
            assert($(elem).children(".editEntry").is(":visible"), "edit entry is visible");
            assert($(elem).find(".addEntryInput").attr("placeholder") === $(elem).children(".displayEntry").text(), "placeholder is correct");
            assert($(elem).find(".addEntryInput").val() === $(elem).children(".displayEntry").text(), "initial value is correct");
            curValues[index] = $(elem).children(".displayEntry").text();
            $(elem).find(".addEntryInput").val(Math.ceil(Math.random() * 500));
        });

        btns.children(".editCancelBtn").click();
        assert(allCurrentChanges.length === changeCount, "Nothing is added to aCc");
        curRow.children(".dataEntry").each((index, elem) => {
            if (index === 0) {
                assert($(elem).children(".displayEntry").is(":visible"), "id is vis");
                return;
            }
            assert($(elem).children(".displayEntry").is(":visible"), "display entry should be visible");
            assert(!$(elem).children(".editEntry").is(":visible"), "edit entry should not be vis");
            assert($(elem).children(".displayEntry").text() === curValues[index], "canceled val is correct");
        });

        curRow.children(".dataEntry").each((index, elem) => {
            if (index === 0) {
                assert($(elem).children(".displayEntry").is(":visible"), "id is vis");
                return;
            }
            switch (index) {
                case 1:
                    $(elem).find(".addEntryInput").val(183);
                    break;
                case 2:
                    $(elem).find(".addEntryInput").val(5);
                    break;
            }
        });
        btns.children(".editSaveBtn").click();
        assert(curRow.find(".displayEntry").eq(1).text() === "183", "save in display ind 1");
        assert(curRow.find(".displayEntry").eq(2).text() === "5", "save in display ind 2");
        assert(allCurrentChanges.length === changeCount + 1);

        $.ajax("/databaseSubmitTesting",
            {
                data: JSON.stringify({command: "Write", data: [allCurrentChanges[allCurrentChanges.length - 1]]}),
                contentType: "application/json",
                type: "POST",
                success: res => {
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    throw jqXHR.status;
                }
            });
    });
    it("Edit new row", function() {
        let changeCount = allCurrentChanges.length;

        // Add new entry first
        let entryLsts = $("#addRegis").find(".addEntryEntry");
        entryLsts.each(function (i) {
            if (i === 0) {
                return;
            }
            let currentInput: JQuery = $(this).children(".addEntryInput");
            assert(currentInput.length !== 0, "addEntryEntry error");

            switch (i) {
                case 1:
                    currentInput.val(189);
                    break;
                case 2:
                    currentInput.val(5);
            }
        });
        $("#addRegis").find(".addConfirmBtn").click();
        changeCount++;
        assert(changeCount === allCurrentChanges.length, "changes should be increased by 1");
        let regisTable = $("#registrationinfo").find("tbody");
        let curRow = regisTable.children().last();
        let btns = curRow.children(".editBtnGroup").children().first();

        assert(btns.children(".editSaveBtn").css("display") === "none", "save btn should not be visible");
        assert(btns.children(".editCancelBtn").css("display") === "none", "cancel btn should not be visible");
        assert(btns.children(".editEntryBtn").css("display") !== "none", "edit btn should be visible");
        assert(btns.children(".cancelRegisBtn").css("display") !== "none", "cancel btn should be visible");
        curRow.children(".dataEntry").each((index, elem) => {
            if (index === 0) {
                assert($(elem).children(".displayEntry").is(":visible"), "id is vis");
                return;
            }
            assert($(elem).children(".displayEntry").is(":visible"), "display entry should be visible");
            assert(!$(elem).children(".editEntry").is(":visible"), "edit entry should not be vis");
        });

        btns.children(".editEntryBtn").click();
        assert(btns.children(".editSaveBtn").css("display") !== "none", "save btn should visible");
        assert(btns.children(".editCancelBtn").css("display") !== "none", "cancel btn should be visible");

        let curValues = [];
        curRow.children(".dataEntry").each((index, elem) => {
            if (index === 0) {
                assert($(elem).children(".displayEntry").is(":visible"), "id is vis");
                return;
            }
            assert(!$(elem).children(".displayEntry").is(":visible"), "display entry is not visible");
            assert($(elem).children(".editEntry").is(":visible"), "edit entry is visible");
            assert($(elem).find(".addEntryInput").attr("placeholder") === $(elem).children(".displayEntry").text(), "placeholder is correct");
            assert($(elem).find(".addEntryInput").val() === $(elem).children(".displayEntry").text(), "initial value is correct");
            curValues[index] = $(elem).children(".displayEntry").text();
            $(elem).find(".addEntryInput").val(Math.ceil(Math.random() * 500));
        });

        btns.children(".editCancelBtn").click();
        assert(allCurrentChanges.length === changeCount, "Nothing should be added to aCc");
        curRow.children(".dataEntry").each((index, elem) => {
            if (index === 0) {
                assert($(elem).children(".displayEntry").is(":visible"), "id is vis");
                return;
            }
            assert($(elem).children(".displayEntry").is(":visible"), "display entry should be visible");
            assert(!$(elem).children(".editEntry").is(":visible"), "edit entry should not be vis");
            assert($(elem).children(".displayEntry").text() === curValues[index], "canceled val is correct");
        });

        curRow.children(".dataEntry").each((index, elem) => {
            if (index === 0) {
                assert($(elem).children(".displayEntry").is(":visible"), "id is vis");
                return;
            }
            switch (index) {
                case 1:
                    $(elem).find(".addEntryInput").val(189);
                    break;
                case 2:
                    $(elem).find(".addEntryInput").val(2);
                    break;
            }
        });
        btns.children(".editSaveBtn").click();
        assert(curRow.find(".displayEntry").eq(1).text() === "189", "save in display ind 1");
        assert(curRow.find(".displayEntry").eq(2).text() === "2", "save in display ind 2");
        assert(allCurrentChanges.length === changeCount, "aCc should NOT be increased by 1");

        $.ajax("/databaseSubmitTesting",
            {
                data: JSON.stringify({command: "Write", data: allCurrentChanges.slice(-1)}),
                contentType: "application/json",
                type: "POST",
                success: res => {
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    throw jqXHR.status;
                }
            });
    });
    after(done => {
        $.ajax("/databaseSubmitTesting",
            {
                data: JSON.stringify({command: "Write", data: allCurrentChanges}),
                contentType: "application/json",
                type: "POST",
                success: res => {
                    done();
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    throw jqXHR.status;
                }
            });
    });
});

function assert(condition: Boolean, message?: string) {
    if (!condition) {
        message = message || "Assertion failed";
        if (typeof Error !== "undefined") {
            throw new Error(message);
        }
        throw message; // Fallback
    }
}