/// <reference path="../../Scripts/typings/globals/jquery/index.d.ts" />

$(".passChange").click(e => {

    const newPass = $(e.target).parent().parent().find(".newPass");
    const confPass = $(e.target).parent().parent().find(".newPassConf");
    // const oldPass = $(e.target).parent().parent().find(".oldPass");

    const passErr = $(e.target).parent().parent().find(".passErr");
    const passSuc = $(e.target).parent().parent().find(".passSuc");

    if (newPass.val() !== confPass.val()) {
        ;
        newPass.addClass("has-error");
        confPass.addClass("has-error");
        newPass.val("");
        confPass.val("");
        //     $(e.target).addClass("btn-danger").removeClass("btn-primary");
        passErr.text("Passwords don't match");
        passErr["collapse"]("show");
        return;
    } else if (newPass.val().trim() === "") {
        passErr.text("Fields can not be empty");
        passErr["collapse"]("show");
        return;
    }

    $.ajax("/passwordChange",
        {
            data: JSON.stringify({ newPass: newPass.val(), targetID: $(e.target).attr("rowInd") }),
            contentType: "application/json",
            type: "POST",
            success: res => {
                passErr["collapse"]("hide");
                passSuc["collapse"]("show");
            }
        });
});

$(".usrChange").click(e => {
    const newUsr = $(e.target).parent().parent().find(".newUsr");
    const usrErr = $(e.target).parent().parent().find(".usrErr");
    const usrSuc = $(e.target).parent().parent().find(".usrSuc");

    if (newUsr.val().trim().length === 0) {
        newUsr.addClass("has-error");
        usrErr["collapse"]("show");
        return;
    }

    $.ajax("/usernameChange",
        {
            data: JSON.stringify({ newUsr: newUsr.val().trim(), targetID: $(e.target).attr("rowInd") }),
            contentType: "application/json",
            type: "POST",
            success: res => {
                usrErr["collapse"]("hide");
                usrSuc["collapse"]("show");
            }
        });
});

$(".permChange").click(e => {
    const newPerm = $(e.target).parent().parent().find(".newPerm");
    const permErr = $(e.target).parent().parent().find(".permErr");
    const permSuc = $(e.target).parent().parent().find(".permSuc");

    if (newPerm.val().toLowerCase() === newPerm.attr("placeholder").toLowerCase()) {
        permErr["collapse"]("show");
        return;
    }

    $.ajax("/permissionChange",
        {
            data: JSON.stringify({ newPerm: newPerm.val(), targetID: $(e.target).attr("rowInd") }),
            contentType: "application/json",
            type: "POST",
            success: res => {
                permErr["collapse"]("hide");
                permSuc["collapse"]("show");
            }
        });
});

let latestRemoveInfo = "";

$("#removeUsrModal").on("show.bs.modal", function (e) {
    latestRemoveInfo = $(e.relatedTarget).attr("rowInd");
    $("#removeTargetName").text($(e.relatedTarget).parent().find(".usernameDisplay").text());
});

$("#removeUsrConf").click(e => {
    $.ajax("/removeAccount",
        {
            data: JSON.stringify({ userIndex: latestRemoveInfo }),
            contentType: "application/json",
            type: "POST",
            success: res => {
                location.reload(true);
            }
        });
})

$("#addUsrConf").click(e => {
    const newInfoObj = [];
    $("#addUsr").find(".addEntryEntry").each(function (i) {
        if (i === 0) {
            return;
        }
        newInfoObj.push({ name: $(this).children(".addEntryLbl").text(), data: $(this).find(".addEntryInput").val() });
    });
    $.ajax("/newAccount",
        {
            data: JSON.stringify(newInfoObj),
            contentType: "application/json",
            type: "POST",
            success: res => {
                $("#accountErr")["collapse"]("hide");
                $("#accountSuc")["collapse"]("show");
            },
            error: (xhr, ajaxOptions, thrownError) => {
                if (xhr.responseText.includes("duplicate")) {
                    $("#accountErr").text("You cannot have duplicate usernames or emails.");
                    $("#accountErr")["collapse"]("show");
                    $("#accountSuc")["collapse"]("hide");
                }
                else if (xhr.responseText.includes("empty"))
                {
                    $("#accountErr").text("You cannot have empty username or password fields.");
                    $("#accountErr")["collapse"]("show");
                    $("#accountSuc")["collapse"]("hide");
                }
            }
        });
});