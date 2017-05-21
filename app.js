"use strict";
/// <reference path="Scripts/typings/globals/handlebars/index.d.ts" />
/// <reference path="Scripts/typings/modules/consolidate/index.d.ts" />
/// <reference path="Scripts/typings/modules/express/index.d.ts" />
/// <reference path="Scripts/typings/modules/mysql/index.d.ts" />
/// <reference path="Scripts/typings/modules/q/index.d.ts" />
/// <reference path="Scripts/typings/modules/body-parser/index.d.ts" />
/// <reference path="Scripts/typings/modules/multer/index.d.ts" />
/// <reference path="Scripts/typings/modules/xlsx/index.d.ts" />
/// <reference path="Scripts/typings/globals/html-pdf/index.d.ts" />
/// <reference path="Scripts/typings/globals/express-session/index.d.ts" />
/// <reference path="Scripts/typings/globals/moment/index.d.ts" />
/// <reference path="Scripts/typings/globals/node/index.d.ts" />
Object.defineProperty(exports, "__esModule", { value: true });
const handlebars = require("handlebars");
const cons = require("consolidate");
const express = require("express");
const fs = require("fs");
const htmlPdf = require("html-pdf");
const mysql = require("mysql");
const Q = require("q"); //Switch to bluebird
const moment = require("moment");
const bodyParser = require("body-parser");
const xlsx = require("xlsx");
//import * as crypto from "crypto";
const session = require("express-session");
const sodium = require("sodium").api;
const multer = require("multer");
let app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("Public"));
app.use(bodyParser.json());
app.use(session({
    secret: "icecream truck",
    resave: false,
    saveUninitialized: false
}));
let upload = multer({ storage: multer.memoryStorage() });
app.engine("hbs", cons.handlebars);
const typeConverter = { "varchar": "Text", "bool": "Yes/No", "mediumint": "Number" };
handlebars.registerHelper("math", (lvalue, operator, rvalue, options) => {
    lvalue = parseFloat(lvalue);
    rvalue = parseFloat(rvalue);
    return {
        "+": lvalue + rvalue,
        "-": lvalue - rvalue,
        "*": lvalue * rvalue,
        "/": lvalue / rvalue,
        "%": lvalue % rvalue
    }[operator];
});
app.set("view engine", "hbs");
let latestQuery;
app.get("/login", (req, res) => {
    if (req.session && req.session.user) {
        res.redirect(302, "/main");
        return;
    }
    res.render("loginPage");
});
app.post("/login", (req, res) => {
    const defered = Q.defer();
    connection.query("SELECT * FROM userinfolist WHERE username = " + connection.escape(req.body.username) + ";", defered.makeNodeResolver());
    defered.promise.done(result => {
        if (result[0].length === 0) {
            res.render("loginPage", { errorType: "usernameErr" });
            return;
        }
        if (sodium.crypto_pwhash_str_verify(Buffer.from(result[0][0].password, "utf8"), Buffer.from(req.body.pwd, "utf8"))) {
            req.session.user = {
                id: result[0][0].id,
                username: result[0][0].username,
                email: result[0][0].email,
                permissions: result[0][0].permissions
            };
            res.redirect("/main");
        }
        else {
            res.status(401);
            res.render("loginPage", { errorType: "passwordErr" });
        }
    });
});
app.get("/logout", (req, res) => {
    if (!(req.session && req.session.user)) {
        res.redirect(302, "/login"); //403 doesnt work properly :\
        return;
    }
    req.session.destroy(() => {
        res.set({
            "REFRESH": "2;URL=/login"
        });
        res.end("Successfully logged out. Redirecting you to the login page.");
    });
});
app.get("/", (req, res) => {
    if (req.session && req.session.user) {
        res.redirect(302, "/main");
        return;
    }
    res.redirect(302, "/login");
});
const tILp = {
    "members": 1,
    "venuelocations": 3,
    "registrationinfo": 5,
    "cancelledregistrations": 7,
    "committee": 9,
    "jubileeactivities": 11
};
function renderMainPage(res, username, isAdmin, testingMode) {
    Q.all([
        membersQuery(), memberDescQuery(), venuesQuery(), venueDescQuery(), registrationsQuery(),
        registrationsTypeQuery(), canceledQuery(), canceledTypeQuery(), committeeQuery(), committeeTypeQuery(),
        activityQuery(), activityDescQuery()
    ]).then(res1 => {
        const memberDetails = res1[0][0];
        const venueDetails = res1[2][0];
        const regisDetails = res1[4][0];
        const canceledDetails = res1[6][0];
        const committeeDetails = res1[8][0];
        const activityDetails = res1[10][0];
        const canceledNames = createNames(canceledDetails);
        const memberNames = createNames(memberDetails);
        const venueNames = createNames(venueDetails);
        const regisNames = createNames(regisDetails);
        const committeeNames = createNames(committeeDetails);
        const activityNames = createNames(activityDetails);
        const memberTypeDetails = fixEnumTypes(res1[1][0]);
        const venueTypeDetails = fixEnumTypes(res1[3][0]);
        const registraionTypeDetails = fixEnumTypes(res1[5][0]);
        const canceledTypeDetails = fixEnumTypes(res1[7][0]);
        const committeeTypeDetails = fixEnumTypes(res1[9][0]);
        const activityTypeDetails = fixEnumTypes(res1[11][0]);
        //Member specific stuff
        for (let i = 0; i < memberDetails.length; i++) {
            //This to prevent handlebar rendering errors
            for (let key in memberDetails[i]) {
                if (memberDetails[i].hasOwnProperty(key)) {
                    if (!(memberDetails[i][key] || memberDetails[i][key] === 0)) {
                        memberDetails[i][key] = "";
                    }
                }
            }
            if (memberDetails[i].PostAddressSame == "1")
                memberDetails[i].PostAddressSame = "Yes";
            else
                memberDetails[i].PostAddressSame = "No";
            if (memberDetails[i].AllowInternetName == "1")
                memberDetails[i].AllowInternetName = "Yes";
            else
                memberDetails[i].AllowInternetName = "No";
            const doB = moment(JSON.stringify(memberDetails[i].DoB).split("T")[0], "YYYY-MM-DD");
            memberDetails[i].DoB = doB.format("DD / MM / YYYY");
        }
        for (let i = 0; i < activityDetails.length; i++) {
            const doB = moment(JSON.stringify(activityDetails[i].eventDate).split("T")[0], "YYYY-MM-DD");
            activityDetails[i].eventDate = doB.format("DD / MM / YYYY");
        }
        latestQuery = res1;
        res.set({
            "Cache-Control": "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0"
        });
        res.render("index", {
            MemberDetails: memberDetails,
            MemberDesc: memberNames,
            MemberType: memberTypeDetails,
            VenueDesc: venueNames,
            VenueDetails: venueDetails,
            VenueType: venueTypeDetails,
            RegisDetails: regisDetails,
            RegisDesc: regisNames,
            RegisType: registraionTypeDetails,
            CanceledDetails: canceledDetails,
            CanceledDesc: canceledNames,
            CanceledType: canceledTypeDetails,
            CommitteeDetails: committeeDetails,
            CommitteeDesc: committeeNames,
            CommitteeType: committeeTypeDetails,
            ActivityDetails: activityDetails,
            ActivityDesc: activityNames,
            ActivityType: activityTypeDetails,
            AllTablesInfo: { tables: tILp },
            GeneralData: JSON.stringify(res1),
            tableIndexLookup: JSON.stringify(tILp),
            username: username,
            isAdmin: isAdmin,
            testingMode: testingMode,
            testingScript: testingMode ? fs.readFileSync("ClientSideTesting/index.utest.js", "utf8") : null
        });
    }).catch(e => {
        console.log(e);
    });
}
app.post("/databaseSubmitTesting", (req, res) => {
    if (!(req.session && req.session.user && req.session.user.permissions === "Administrator")) {
        res.status(403);
        res.end();
        return;
    }
    const command = req.body.command;
    try {
        switch (command) {
            case "Clear":
                fs.truncateSync("ClientSideTesting/latestSubmitCommands.testdata");
                break;
            case "Write":
                if (!req.body.data) {
                    res.status(400);
                    res.end();
                    return;
                }
                fs.appendFileSync("ClientSideTesting/latestSubmitCommands.testdata", /*req.body.isOneLine ? */ "\n" + JSON.stringify(req.body.data) /* : "\n\n\n -- Last Line -- \n\n")*/);
                break;
            default:
                res.status(400);
                res.end();
                return;
        }
    }
    catch (err) {
        console.log(err);
        res.status(500);
        res.end();
        return;
    }
    res.end("Done");
});
app.get("/testingMain", (req, res) => {
    if (!(req.session && req.session.user && req.session.user.permissions === "Administrator")) {
        res.redirect(302, "/login"); //403 doesn't work properly :(
        return;
    }
    renderMainPage(res, req.session.user.username, req.session.user.permissions === "Administrator", true);
});
app.get("/main", (req, res) => {
    if (!(req.session && req.session.user)) {
        res.redirect(302, "/login"); //403 doesnt work properly :\
        return;
    }
    renderMainPage(res, req.session.user.username, req.session.user.permissions === "Administrator", false);
});
app.get("/accountManagement", (req, res) => {
    if (!(req.session && req.session.user)) {
        res.redirect(302, "/login"); //403 doesnt work properly :\
        return;
    }
    if (!req.session.user.permissions) {
        return;
    }
    res.set({ "Cache-Control": "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0" });
    res.render("accountManagement", {
        username: req.session.user.username,
        email: req.session.user.email,
        permission: req.session.user.permissions
    });
});
function getUserInfo() {
    const defered = Q.defer();
    //                                                                              Maybe add this later if we have a superadmin
    connection.query("SELECT id, username, email, permissions FROM userinfolist" /*+ " WHERE permissions != 'Administrator'"*/, defered.makeNodeResolver());
    return defered.promise;
}
function getUserInfoType() {
    const defered = Q.defer();
    connection.query("DESC userinfolist", defered.makeNodeResolver());
    return defered.promise;
}
app.get("/adminPanel", (req, res) => {
    if (!(req.session && req.session.user)) {
        res.redirect(302, "/login"); //403 doesnt work properly :\
        return;
    }
    if (req.session.user.permissions !== "Administrator") {
        res.status(403);
        res.end("You are not allowed here.");
        return;
    }
    Q.all([getUserInfo(), getUserInfoType()]).then(result => {
        result[0][0].splice(result[0][0].findIndex(elem => elem.id === req.session.user.id), 1);
        res.set({ "Cache-Control": "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0" });
        res.render("adminPanel", {
            accountLst: result[0][0],
            UsrType: fixEnumTypes(result[1][0])
        });
    }).catch(function (e) {
        console.log(e);
    });
});
app.post("/newAccount", (req, res) => {
    if (!(req.session && req.session.user && req.session.user.permissions === "Administrator")) {
        res.status(403);
        res.end("ERROR");
        return;
    }
    let myQuery = "INSERT INTO userinfolist VALUES(NULL";
    for (let i = 0; i < req.body.length; i++) {
        if (req.body[i].name.toLowerCase() === "password") {
            if (req.body[i].data.length === 0) {
                res.status(500);
                res.end("ERROR:empty");
            }
            const passwordBuffer = Buffer.from(req.body[i].data, "utf8");
            const hash = sodium.crypto_pwhash_str(passwordBuffer, sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE, sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE);
            myQuery += "," + connection.escape(hash.toString());
        }
        else {
            const data = req.body[i].data.trim();
            myQuery += "," + connection.escape(data.length > 0 ? data : null);
        }
    }
    myQuery += ");";
    connection.query(myQuery, (err, result, fields) => {
        if (err) {
            res.status(400);
            if (err.errno === 1062) {
                res.end("ERROR:duplicate");
                return;
            }
            else if (err.errno === 1048) {
                res.end("ERROR:empty");
            }
            res.status(500);
            res.end("ERROR");
        }
        res.end("Done");
    });
});
app.post("/removeAccount", (req, res) => {
    if (!(req.session && req.session.user && req.session.user.permissions === "Administrator")) {
        res.status(403);
        res.end("ERROR");
        return;
    }
    let myQuery = "DELETE FROM userinfolist WHERE id=" + connection.escape(req.body.userIndex) + ";";
    connection.query(myQuery, (err, result, fields) => {
        if (err) {
            console.log(err);
            res.status(500);
            res.end("ERROR");
            return;
        }
        res.end("Done");
    });
});
app.get("/accountManagement", (req, res) => {
    if (!(req.session && req.session.user)) {
        res.redirect(302, "/login"); //403 doesnt work properly :\
        return;
    }
    if (!req.session.user.permissions) {
        return;
    }
    res.render("accountManagement", {
        username: req.session.user.username,
        email: req.session.user.email
    });
});
function changeUserDetails(session, body, specilizedFunc, callback) {
    const defered = Q.defer();
    connection.query("SELECT * FROM userinfolist WHERE id = " + connection.escape(session.user.id) + ";", defered.makeNodeResolver());
    defered.promise.catch(function (err) {
        console.log(err);
    }).done(result => {
        //Do some callback stuff here later
        if (result[0].length === 0) {
            return { status: 500, message: "User has been removed" };
        }
        return specilizedFunc(session, body, result[0][0], callback);
    });
}
app.post("/permissionChange", (req, res) => {
    if (!(req.session && req.session.user && req.session.user.permissions === "Administrator")) {
        res.status(403);
        res.end("ERROR");
        return;
    }
    changeUserDetails(req.session, req.body, (session, body, result, callback) => {
        const myQuery = "UPDATE userinfolist SET permissions=" +
            connection.escape(body.newPerm) +
            " WHERE id = " +
            connection.escape(req.body.targetID);
        connection.query(myQuery, (err, res2) => {
            if (err) {
                console.log(err);
                callback({ status: 500, message: "Server error" });
                return;
            }
            callback({ status: 200, message: "Done" });
        });
    }, returnAnswer => {
        res.status(returnAnswer.status);
        res.end(returnAnswer.message);
    });
});
app.post("/usernameChange", (req, res) => {
    if (!(req.session && req.session.user)) {
        res.status(403);
        res.end("ERROR");
        return;
    }
    changeUserDetails(req.session, req.body, (session, body, result, callback) => {
        const myQuery = "UPDATE userinfolist SET username=" + connection.escape(body.newUsr) + " WHERE id = " + connection.escape((body.targetID && req.session.user.permissions === "Administrator") ? body.targetID : session.user.id);
        connection.query(myQuery, (err, res2) => {
            if (err) {
                console.log(err);
                callback({ status: 500, message: "Server error" });
                return;
            }
            callback({ status: 200, message: "Done" });
        });
    }, returnAnswer => {
        res.status(returnAnswer.status);
        res.end(returnAnswer.message);
    });
    res.end();
});
app.post("/passwordChange", (req, res) => {
    if (!(req.session && req.session.user)) {
        res.status(403);
        res.end("ERROR");
        return;
    }
    changeUserDetails(req.session, req.body, (session, body, result, callback) => {
        //This enter old password thing is kinda useless for admins when you can just create another admin account if you are already on a admin account, helps if I add a superadmin later though
        if ((req.session.user.permissions === "Administrator" && body.targetID) || ((body.oldPass || body.oldPass === 0) && sodium.crypto_pwhash_str_verify(Buffer.from(result.password, "utf8"), Buffer.from(body.oldPass, "utf8")))) {
            const passwordBuffer = Buffer.from(body.newPass, "utf8");
            const hash = sodium.crypto_pwhash_str(passwordBuffer, sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE, sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE);
            const myQuery = "UPDATE userinfolist SET password=" +
                connection.escape(hash.toString()) +
                "WHERE id = " +
                connection.escape((body.targetID && req.session.user.permissions === "Administrator") ? body.targetID : session.user.id);
            connection.query(myQuery, (err, res2) => {
                if (err) {
                    console.log(err);
                    callback({ status: 500, message: "Server error" });
                }
                callback({ status: 200, message: "Done" });
            });
        }
        else {
            callback({ status: 401, message: "ERROR:oldPassIncorrect" });
        }
    }, returnAnswer => {
        res.status(returnAnswer.status);
        res.end(returnAnswer.message);
    });
});
app.get("/main/onlineMemberList", (req, res) => {
    if (!(req.session && req.session.user)) {
        res.redirect(302, "/login"); //403 doesnt work properly :\
        return;
    }
    membersQuery().then(result => {
        res.render("onlineMemberList", {
            Members: result[0]
        });
    });
});
//Placed inside the Get call to seperate out different clients.
app.post("/main/submitNewTable", (req, res) => {
    if (!(req.session && req.session.user)) {
        res.redirect(302, "/login"); //403 doesnt work properly :\
        return;
    }
    const allPromises = [];
    for (let i = 0; i < req.body.length; i++) {
        const insertIntoTable = req.body[i].table;
        const updateId = req.body[i].rowID;
        if (req.body[i].operation === "UPDATE") {
            if (updateId.length === 0) {
                continue;
            }
            let myQuery = "UPDATE " + connection.escapeId(insertIntoTable) + " SET ";
            const typeArray = latestQuery[tILp[insertIntoTable]][0];
            for (let ii = 1; ii < req.body[i].data.length; ii++) {
                myQuery += connection.escapeId(typeArray[req.body[i].data[ii].colInd].Field) + " = ";
                let addition;
                if (req.body[i].data[ii].data.match(/^(0?[1-9]|[12][0-9]|3[01])\ *[\/\-]\ *(0?[1-9]|1[012])\ *[\/\-]\ *\d{4}$/)) {
                    req.body[i].data[ii].data = req.body[i].data[ii].data.replace(/\//g, "-");
                    addition = "STR_TO_DATE('" + req.body[i].data[ii].data + "', '%d-%c-%Y')";
                }
                else if (req.body[i].data[ii].data === "No" || req.body[i].data[ii].data === "false") {
                    addition = "0";
                }
                else if (req.body[i].data[ii].data === "Yes" || req.body[i].data[ii].data === "true") {
                    addition = "1";
                }
                else {
                    addition = "" + connection.escape(req.body[i].data[ii].data) + "";
                }
                myQuery += (addition === "''" ? "NULL" : addition);
                myQuery += ",";
                // Ancient code
                // if (typeArray[req.body[i].data[ii].colInd].type === 1) {
                //     myQuery += "`" +
                //         typeArray[req.body[i].data[ii].colInd].name +
                //         "` = " +
                //         req.body[i].data[ii].data +
                //         ",";
                // } else {
                //     myQuery += "`" +
                //         typeArray[req.body[i].data[ii].colInd].name +
                //         "` = '" +
                //         req.body[i].data[ii].data +
                //         "',";
                // }
            }
            myQuery.trim();
            myQuery = myQuery.replace(/,$/, "");
            myQuery += generateWhereIdLst(updateId);
            const defered = Q.defer();
            connection.query(myQuery, defered.makeNodeResolver());
            allPromises.push(defered.promise);
        }
        else if (req.body[i].operation === "DELETE") {
            if (updateId.length === 0) {
                continue;
            }
            const myQuery = "DELETE FROM " + insertIntoTable + generateWhereIdLst(updateId);
            const defered = Q.defer();
            connection.query(myQuery, defered.makeNodeResolver());
            allPromises.push(defered.promise);
        }
        else if (req.body[i].operation === "INSERT") {
            let myQuery = "INSERT INTO " + connection.escapeId(insertIntoTable) + " VALUES (NULL";
            for (let ii = 1; ii < req.body[i].data.length; ii++) {
                let addition;
                if (req.body[i].data[ii].data) {
                    if (req.body[i].data[ii].data.match(/^(0?[1-9]|[12][0-9]|3[01])\ *[\/\-]\ *(0?[1-9]|1[012])\ *[\/\-]\ *\d{4}$/)) {
                        req.body[i].data[ii].data = req.body[i].data[ii].data.replace(/\//g, "-");
                        addition = ",STR_TO_DATE('" + req.body[i].data[ii].data + "', '%d-%c-%Y')";
                    }
                    else if (req.body[i].data[ii].data === "No") {
                        addition = ",0";
                    }
                    else if (req.body[i].data[ii].data === "Yes") {
                        addition = ",1";
                    }
                    else {
                        addition = "," + connection.escape(req.body[i].data[ii].data) + "";
                    }
                }
                myQuery += (addition || ",NULL");
            }
            myQuery += ");";
            const defered = Q.defer();
            connection.query(myQuery, defered.makeNodeResolver());
            allPromises.push(defered.promise);
        }
        else if (req.body[i].operation === "CANCEL") {
            if (updateId.length === 0) {
                continue;
            }
            let myQuery = "INSERT INTO cancelledregistrations VALUES (" + req.body[i].rowID + ");";
            const defered = Q.defer();
            connection.query(myQuery, defered.makeNodeResolver());
            allPromises.push(defered.promise);
        }
        else {
            console.log("operation messup");
            res.status(500);
        }
    }
    Q.all(allPromises).catch(e => {
        res.status(400);
        res.end("ERROR:" + e.errno);
        console.log(e);
    }).then(() => {
        res.end("Success");
    });
    //{(err2, res2) =>
    //    if (err2) console.log(err2);
    //    resP.end("Success");
    //}
});
app.post("/main/uploadExcel", upload.single("excelVenue"), (req, res) => {
    if (!(req.session && req.session.user)) {
        res.redirect(302, "/login"); //403 doesnt work properly :\
        return;
    }
    const data = new Uint8Array(req.file.buffer);
    const binArr = [];
    for (let i = 0; i < data.length; i++) {
        binArr[i] = String.fromCharCode(data[i]);
    }
    var byteString = binArr.join("");
    const newVenueData = xlsx.read(byteString, { type: "binary" });
    const jsonView = xlsx.utils.sheet_to_json(newVenueData.Sheets[newVenueData.SheetNames[0]]);
    let nameToId = {};
    let hugeListOfPromises = [];
    const deferer = Q.defer();
    connection.query("SELECT * FROM venuelocations", deferer.makeNodeResolver());
    deferer.promise.then(info => {
        for (let i = 0; i < info[0].length; i++) {
            nameToId[info[0][i].VenueName] = info[0][i].ID;
        }
        for (let i = 0; i < jsonView.length; i++) {
            let isAllNull = true;
            for (let key in jsonView[i]) {
                if (jsonView[i].hasOwnProperty(key)) {
                    //        keyNames.push(key);
                    if (jsonView[i][key] === "") {
                        jsonView[i][key] = "NULL";
                        continue;
                    }
                    else {
                        isAllNull = false;
                    }
                    if (key === "ContactPh" || key === "Fax Number") {
                        jsonView[i][key] = jsonView[i][key].replace(/[\(\) ]/g, "");
                    }
                    else if (key === "PostCode") {
                        // Don't need this because xlsx parses with formatting
                        //    jsonView[i][key] = ("0000" + jsonView[i][key]).slice(-4);
                    }
                    else if (key === "Capacity") {
                        jsonView[i][key] = jsonView[i][key].replace(",", "");
                    }
                    //Have to use name as index since the excel file doesn't have any index
                    if (key === "VenueName") {
                        if (nameToId.hasOwnProperty(jsonView[i][key])) {
                            jsonView[i]["rowID"] = nameToId[jsonView[i][key]];
                        }
                    }
                    jsonView[i][key] = "'" + jsonView[i][key] + "'";
                }
            }
            if (isAllNull) {
                jsonView.splice(i, 1);
                i--;
                continue;
            }
            Object.defineProperty(jsonView[i], "ContactFax", Object.getOwnPropertyDescriptor(jsonView[i], "Fax Number"));
            delete jsonView[i]["Fax Number"];
            const deferedAgain = Q.defer();
            let queryString = "";
            if (jsonView[i].hasOwnProperty("rowID")) {
                queryString = "UPDATE venuelocations SET ";
                for (let key in jsonView[i]) {
                    if (jsonView[i].hasOwnProperty(key)) {
                        if (key === "rowID") {
                            continue;
                        }
                        queryString += "`" + key + "` = " + jsonView[i][key] + ",";
                    }
                }
                queryString = queryString.replace(/,$/g, "");
                queryString += " WHERE ID=" + jsonView[i]["rowID"] + ";";
            }
            else {
                queryString = "INSERT INTO venuelocations VALUES (NULL";
                for (let key in jsonView[i]) {
                    if (jsonView[i].hasOwnProperty(key)) {
                        queryString += ", " + jsonView[i][key];
                    }
                }
                queryString += ");";
            }
            connection.query(queryString, deferedAgain.makeNodeResolver());
            hugeListOfPromises.push(deferer.promise);
        }
    }).catch(function (e) {
        console.log(e);
    });
    Q.all(hugeListOfPromises).then(function () {
        res.end("Success");
    }).catch(function (e) {
        console.log(e);
    });
});
app.get("/main/requestPdf", (req, res) => {
    if (!(req.session && req.session.user)) {
        res.redirect(302, "/login"); //403 doesnt work properly :\
        return;
    }
    if (req.query["file"] === "attendenceRep") {
        venueCapOutput(res1 => {
            res.writeHead(200, {
                "Content-Disposition": "attachment;filename=attendenceReport.pdf",
                "Content-Type": "application/pdf"
            });
            res.write(res1);
            res.end();
        });
    }
    else if (req.query["file"] === "activityRegis") {
        activityRegister(res1 => {
            res.writeHead(200, {
                "Content-Disposition": "attachment;filename=activityRegistration.pdf",
                "Content-Type": "application/pdf"
            });
            res.write(res1);
            res.end();
        });
    }
    else if (req.query["file"] === "nameBadge") {
        nameBadgeOutput(res1 => {
            res.writeHead(200, {
                "Content-Disposition": "attachment;filename=nameBadges.pdf",
                "Content-Type": "application/pdf"
            });
            res.write(res1);
            res.end();
        });
    }
    else {
        res.writeHead(404);
        res.end("Error, file not found");
    }
});
function createNames(detailsArray) {
    const names = [];
    for (let key in detailsArray[0]) {
        if (detailsArray[0].hasOwnProperty(key)) {
            names.push(key);
        }
    }
    return names;
}
function fixEnumTypes(descArray) {
    const typeDetails = [];
    for (let i = 1; i < descArray.length; i++) {
        const newType = descArray[i].Type.match(/[a-zA-Z]+/)[0];
        const maxSize = descArray[i].Type.match(/\(\d+\)/);
        let enumArray = false;
        let year = false;
        let isBool = false;
        let isPassword = false;
        let placeholder = "";
        if (newType === "enum") {
            enumArray = descArray[i].Type.match(/\(.*\)/)[0].substr(1).slice(0, -1).split(",");
            for (let ii = 0; ii < enumArray["length"]; ii++) {
                enumArray[ii] = enumArray[ii].substr(1).slice(0, -1);
            }
        }
        else if (newType === "year" || newType === "mediumint") {
            year = true;
        }
        else if (newType === "tinyint") {
            isBool = true;
        }
        else if (newType === "date") {
            placeholder = "DD-MM-YYYY";
        }
        else if (newType === "time") {
            placeholder = "HH:MM:SS (24 hour time)";
        }
        if (descArray[i].Field.toLowerCase().includes("password")) {
            isPassword = true;
        }
        typeDetails.push({
            title: descArray[i].Field,
            maxSize: maxSize ? maxSize[0].substr(1).slice(0, -1) : "--",
            type: (typeConverter.hasOwnProperty(newType) ? typeConverter[newType] : newType),
            enumArray: enumArray,
            year: year,
            isBool: isBool,
            placeholder: placeholder,
            isPassword: isPassword
        });
    }
    return typeDetails;
}
function generateWhereIdLst(allIDs) {
    let whereQuery = " WHERE id IN (";
    for (let ii = 0; ii < allIDs.length; ii++) {
        whereQuery += allIDs[ii] + ",";
    }
    whereQuery = whereQuery.replace(/,$/, "");
    whereQuery += ");";
    return whereQuery;
}
function nameBadgeOutput(callback) {
    function sqlQuery() {
        const defered = Q.defer();
        connection
            .query("SELECT * FROM namebadgeinfo", defered.makeNodeResolver());
        return defered.promise;
    }
    function readImage() {
        const defered = Q.defer();
        fs.readFile("./Views/images/BadgeFramePrintQuality.png", "base64", defered.makeNodeResolver());
        return defered.promise;
    }
    function readHbs() {
        const defered = Q.defer();
        fs.readFile("./Views/NameBadge.hbs", "utf8", defered.makeNodeResolver());
        return defered.promise;
    }
    const imagePromise = readImage();
    const hbsPage = readHbs();
    const sqlPromise = sqlQuery();
    Q.all([imagePromise, hbsPage, sqlPromise]).then(res1 => {
        let template = handlebars.compile(res1[1]);
        fs.writeFileSync("badges.html", template({ bgImage: res1[0].toString(), sqlData: res1[2][0] }));
        htmlPdf.create(template({
            bgImage: res1[0].toString(),
            sqlData: res1[2][0]
        }), {
            "base": "file:///F:/Documents/Visual Studio 2015/Projects/PCAAProject/PCAAProject/Public/",
            width: "8cm",
            height: "11cm"
        }).toBuffer((err2, res2) => {
            if (err2) {
                throw err2;
            }
            callback(res2);
        });
    }).catch(e => {
        console.log(e);
    });
}
function venueCapOutput(callback) {
    const findingIdQuery = "SELECT * FROM venuelist";
    connection.query(findingIdQuery, (err, res) => {
        const names = [];
        for (let key in res[0]) {
            if (res[0].hasOwnProperty(key)) {
                names.push(key);
            }
        }
        fs.readFile("./Views/VenueCapacityOutput.hbs", "utf8", (err2, data) => {
            if (err2) {
                throw err2;
            }
            let template = handlebars.compile(data);
            htmlPdf.create(template({
                QueryData: res,
                QueryHeaderRow: names
            }), { "base": "file:///F:/Documents/Visual Studio 2015/Projects/PCAAProject/PCAAProject/Public/" }).toBuffer((err2, res2) => {
                if (err2) {
                    throw err2;
                }
                callback(res2);
            });
        });
    });
}
function activityRegister(callback) {
    const findingIdQuery = "SELECT * FROM activitylist";
    connection.query(findingIdQuery, (err, res) => {
        const megaArray = [];
        for (let i = 1; i < res.length; i++) {
            //Add null check (nvm)
            if (res[i].ActivityName !== res[i - 1].ActivityName) {
                megaArray.push({
                    title: res[i - 1].ActivityName,
                    data: res.splice(0, i)
                });
                i = 0;
            }
        }
        megaArray.push({
            title: res[0].ActivityName,
            data: res
        });
        let names = [];
        for (let key in res[0]) {
            if (res[0].hasOwnProperty(key)) {
                names.push(key);
            }
        }
        fs.readFile("./Views/ActivityRegister.hbs", "utf8", (err2, data) => {
            if (err2) {
                throw err2;
            }
            let template = handlebars.compile(data);
            htmlPdf.create(template({
                QueryData: megaArray,
                QueryHeaderRow: names
            }), { "base": "file:///F:/Documents/Visual Studio 2015/Projects/PCAAProject/PCAAProject/Public/" }).toBuffer((err2, res2) => {
                if (err2) {
                    throw err2;
                }
                callback(res2);
            });
        });
    });
}
function ors(key, input) {
    let output = "";
    for (let i = 0; i < input.length; i++) {
        output += String.fromCharCode(input.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return output;
}
function membersQuery() {
    const defered = Q.defer();
    connection.query("SELECT * FROM members", defered.makeNodeResolver());
    return defered.promise;
}
function memberDescQuery() {
    const defered = Q.defer();
    connection.query("DESC members", defered.makeNodeResolver());
    return defered.promise;
}
function activityQuery() {
    const defered = Q.defer();
    connection.query("SELECT * FROM jubileeactivities", defered.makeNodeResolver());
    return defered.promise;
}
function activityDescQuery() {
    const defered = Q.defer();
    connection.query("DESC jubileeactivities", defered.makeNodeResolver());
    return defered.promise;
}
function registrationsQuery() {
    const defered = Q.defer();
    connection.query("SELECT * FROM registrationsnotcanceled", defered.makeNodeResolver());
    return defered.promise;
}
function registrationsTypeQuery() {
    const defered = Q.defer();
    connection.query("DESC registrationsnotcanceled", defered.makeNodeResolver());
    return defered.promise;
}
function venueDescQuery() {
    const defered = Q.defer();
    connection.query("DESC venuelocations", defered.makeNodeResolver());
    return defered.promise;
}
function venuesQuery() {
    const defered = Q.defer();
    connection.query("SELECT * FROM venuelocations", defered.makeNodeResolver());
    return defered.promise;
}
function canceledQuery() {
    const defered = Q.defer();
    connection.query("SELECT * FROM selectcancelled", defered.makeNodeResolver());
    return defered.promise;
}
function canceledTypeQuery() {
    const defered = Q.defer();
    connection.query("DESC selectcancelled", defered.makeNodeResolver());
    return defered.promise;
}
function committeeQuery() {
    const defered = Q.defer();
    connection.query("SELECT * FROM committee", defered.makeNodeResolver());
    return defered.promise;
}
function committeeTypeQuery() {
    const defered = Q.defer();
    connection.query("DESC committee", defered.makeNodeResolver());
    return defered.promise;
}
var connection = mysql.createConnection({
    host: "127.0.0.1",
    user: "13142",
    password: new Buffer((ors("74" + "7", "e^aNmNysS`C").concat("=")), "base64").toString("ascii"),
    database: "pcaa",
    port: 13667
});
connection.connect(err => {
    if (err) {
        console.error("error connecting: " + err.stack);
        return;
    }
    //console.log(connection);
    console.log("connected as id " + connection.threadId);
    app.listen(13666);
    console.log("Listening");
});
//export var expServer = app; 
//# sourceMappingURL=app.js.map