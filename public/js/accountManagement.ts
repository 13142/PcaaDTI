/// <reference path="../../Scripts/typings/globals/jquery/index.d.ts" />

$("#passChange").click(e => {
    const newPass = $("#newPass").val();
    if (newPass !== $("#newPassConf").val()) {
        $("#newPass").addClass("has-error");
        $("#newPassConf").addClass("has-error");
        $("#newPass").val("");
        $("#newPassConf").val("");
        //     $(e.target).addClass("btn-danger").removeClass("btn-primary");
        $("#passErr").text("Passwords don't match");
        $("#passErr")["collapse"]("show");
        return;
    } else if ($("#oldPass").val() === "" || $("#newPass").val() === "") {
        $("#passErr").text("Fields can not be empty");
        $("#passErr")["collapse"]("show");
        return;
    }

    $.ajax("/passwordChange",
        {
            data: JSON.stringify({ oldPass: $("#oldPass").val(), newPass: newPass }),
            contentType: "application/json",
            type: "POST",
            success: res => {
                $("#passErr")["collapse"]("hide");
                $("#passSuc")["collapse"]("show");
                $("#newPass").val("");
                $("#newPassConf").val("");
                $("#oldPass").val("");
            },
            error: (res, textStatus, errorThrown) => {
                if (res.responseText.includes("ERROR")) {
                    if (res.responseText.split(":")[1] === "oldPassIncorrect") {
                        $("#passErr").text("Old password incorrect");
                        $("#passErr")["collapse"]("show");
                        $("#newPass").val("");
                        $("#newPassConf").val("");
                        $("#oldPass").val("");
                    }
                }
            }
        });
});

$("#usrChange").click(e => {
    if ($("#newUser").val().trim().length === 0) {
        $("#usrErr")["collapse"]("show");
        return;
    }

    $.ajax("/usernameChange",
        {
            data: JSON.stringify({ newUsr: $("#newUser").val().trim() }),
            contentType: "application/json",
            type: "POST",
            success: res => {
                $("#usrErr")["collapse"]("hide");
                $("#usrSuc")["collapse"]("show");
            }
        });
});
