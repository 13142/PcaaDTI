/// <reference path="Scripts/typings/globals/handlebars/index.d.ts" />
/// <reference path="Scripts/typings/modules/consolidate/index.d.ts" />
/// <reference path="Scripts/typings/modules/express/index.d.ts" />
/// <reference path="Scripts/typings/modules/mysql/index.d.ts" />
/// <reference path="Scripts/typings/modules/q/index.d.ts" />
/// <reference path="Scripts/typings/modules/body-parser/index.d.ts" />
/// <reference path="Scripts/typings/modules/multer/index.d.ts" />
/// <reference path="Scripts/typings/modules/xlsx/index.d.ts" />
/// <reference path="Scripts/typings/globals/html-pdf/index.d.ts" />


import * as handlebars from "handlebars";
import * as cons from "consolidate";
import * as express from "express";
import * as fs from "fs";
import * as htmlPdf from "html-pdf";
import * as mysql from "mysql";
import * as Q from "q";
import * as moment from "moment";
import * as bodyParser from "body-parser";
import * as xlsx from "xlsx"

//import * as Mysqlindex from "~mysql/index";
import * as multer from "multer"

var upload = multer({ storage: multer.memoryStorage() });
var app = express();
app.use(express.static("Public"));
app.use(bodyParser.json());
app.use(bodyParser.raw());
//app.use(bodyParser.urlencoded());
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

handlebars.registerPartial("membersItem", fs.readFileSync(__dirname + "/Views/Partials/MembersItem.hbs", "utf8"));
app.get("/", (req: express.Request, res: express.Response) => {

    function membersQuery() {
        const defered = Q.defer();
        connection.query("SELECT * FROM members", defered.makeNodeResolver());
        return defered.promise;
    }
    function registrationsQuery() {
        const defered = Q.defer();
        connection.query("SELECT * FROM registrationinfo", defered.makeNodeResolver());
        return defered.promise;
    }

    function registrationsTypeQuery() {
        const defered = Q.defer();
        connection.query("DESC registrationinfo", defered.makeNodeResolver());
        return defered.promise;

    }

    function memberDescQuery() {
        const defered = Q.defer();
        connection.query("DESC members", defered.makeNodeResolver());
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
        connection.query("SELECT * FROM cancelledregistrations", defered.makeNodeResolver());
        return defered.promise;
    }
    //Using the database format from the latest get request to avoid unexpected results when posting
    var latestQuery;

    const tableToIndexRep = {
        "members": 0,
        "registrationinfo": 1,
        "venuelocation": 2
    };
    Q.all([membersQuery(), memberDescQuery(), venuesQuery(), venueDescQuery(), registrationsQuery(), registrationsTypeQuery(), canceledQuery()]).then(res1 => {
        const memberDetails: Array<any> = res1[0][0];
        const venueDetails: Array<any> = res1[2][0];
        const regisDetails: Array<any> = res1[4][0];
        const canceledDetails: Array<any> = res1[6][0];
        const memberNames = createNames(memberDetails);
        const venueNames = createNames(venueDetails);
        const regisNames = createNames(regisDetails);

        //Member specific stuff
        for (let i = 0; i < memberDetails.length; i++) {
            //This to prevent handlebar rendering errors
            for (let key in memberDetails[i]) {
                if (memberDetails[i].hasOwnProperty(key)) {
                    if (!memberDetails[i][key]) {
                        memberDetails[i][key] = "";
                    }
                }
            }
            if (memberDetails[i].PostAddressSame == "1") //Keep fuzzy equal
                memberDetails[i].PostAddressSame = "Yes";
            else
                memberDetails[i].PostAddressSame = "No";

            var doB = moment(JSON.stringify(memberDetails[i].DoB).split("T")[0], "YYYY-MM-DD");

            memberDetails[i].DoB = doB.format("DD / MM / YYYY");
        }

        for (let i = 0; i < regisDetails.length; i++) {
            let contains = false;
            for (let ii = 0; ii < canceledDetails.length; ii++) {
                if (regisDetails[i].id === canceledDetails[ii].id) {
                    contains = true;
                    break;
                }
            }
            if (contains) {
                regisDetails.splice(i, 1);
                i--;
                continue;
            }
        }

        const memberTypeDetails = fixEnumTypes(res1[1][0], memberNames);
        const venueTypeDetails = fixEnumTypes(res1[3][0], venueNames);
        const registraionTypeDetails = fixEnumTypes(res1[5][0], regisNames);

        latestQuery = res1;

        const tILp = { "members": 1, "venuelocations": 3, "registrationinfo": 5 };

        res.render("index",
            {
                MemberDetails: memberDetails,
                MemberDesc: memberNames,
                MemberType: memberTypeDetails,
                VenueDesc: venueNames,
                VenueDetails: venueDetails,
                VenueType: venueTypeDetails,
                RegisDetails: regisDetails,
                RegisDesc: regisNames,
                RegisType: registraionTypeDetails,
                GeneralData: JSON.stringify(res1),
                typeIndexLookup: JSON.stringify(tILp)
            });

    }).catch(e => {
        console.log(e);
    });

    //Placed inside the Get call to seperate out different clients.
    app.post("/submitNewTable",
        (reqP: bodyParser.ParsedAsJson & express.Request, resP: express.Response) => {
            var allPromises = [];
            for (let i = 0; i < reqP.body.length; i++) {
                const insertIntoTable = reqP.body[i].table;
                const updateId = reqP.body[i].rowID;
                if (reqP.body[i].operation === "UPDATE") {
                    let myQuery = "UPDATE " + insertIntoTable + " SET ";

                    const typeArray = latestQuery[tableToIndexRep[insertIntoTable]][1];
                    for (let ii = 1; ii < reqP.body[i].data.length; ii++) {
                        myQuery += "`" +
                            typeArray[reqP.body[i].data[ii].colInd].name +
                            "` = '" +
                            reqP.body[i].data[ii].data +
                            "',";
                    }
                    myQuery.trim();
                    myQuery = myQuery.replace(/,$/, "");

                    myQuery += generateWhereIdLst(updateId);
                    const defered = Q.defer();
                    connection.query(myQuery, defered.makeNodeResolver());
                    allPromises.push(defered.promise);
                } else if (reqP.body[i].operation === "DELETE") {
                    const myQuery = "DELETE FROM " + insertIntoTable + generateWhereIdLst(updateId);

                    const defered = Q.defer();
                    connection.query(myQuery, defered.makeNodeResolver());
                    allPromises.push(defered.promise);
                } else if (reqP.body[i].operation === "INSERT") {
                    let myQuery = "INSERT INTO " + insertIntoTable + " VALUES (NULL";

                    for (let ii = 1; ii < reqP.body[i].data.length; ii++) {
                        let addition;
                        if (reqP.body[i].data[ii].data) {
                            addition = ",'" + reqP.body[i].data[ii].data + "'";
                        }
                        myQuery += (addition || "NULL");
                    }
                    myQuery += ");";

                    const defered = Q.defer();
                    connection.query(myQuery, defered.makeNodeResolver());
                    allPromises.push(defered.promise);
                } else if (reqP.body[i].operation === "CANCEL") {
                    let myQuery = "INSERT INTO cancelledregistrations VALUES (" + reqP.body[i].rowID + ");";
                    const defered = Q.defer();
                    connection.query(myQuery, defered.makeNodeResolver());
                    allPromises.push(defered.promise);
                } else {
                    console.log("operation messup");
                }
            }

            Q.all(allPromises).catch(e => {
                resP.end("ERROR:" + e.errno);
                console.log(e);
            }).then(() => {
                resP.end("Success");
            });
            //{(err2, res2) =>
            //    if (err2) console.log(err2);
            //    resP.end("Success");
            //}
        });
    const deferer = Q.defer();
    connection.query("SELECT * FROM venuelocations", deferer.makeNodeResolver());

    app.post("/uploadExcel", upload.single("excelVenue"), (reqP: multer.Request & express.Request, resP: express.Response) => {
        // reqP.file.e
        const data = new Uint8Array(reqP.file.buffer);
        const binArr = [];
        for (let i = 0; i < data.length; i++) {
            binArr[i] = String.fromCharCode(data[i]);
        }
        var byteString = binArr.join("");
        const newVenueData = xlsx.read(byteString, { type: "binary" });
        const jsonView = xlsx.utils.sheet_to_json(newVenueData.Sheets[newVenueData.SheetNames[0]]);

        let nameToId = {};
        let hugeListOfPromises = [];
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
                        } else {
                            isAllNull = false;
                        }
                        if (key === "ContactPh" || key === "Fax Number") {
                            jsonView[i][key] = jsonView[i][key].replace(/[\(\) ]/g, "");
                        } else if (key === "PostCode") {
                            // Don't need this because xlsx parses with formatting
                            //    jsonView[i][key] = ("0000" + jsonView[i][key]).slice(-4);
                        } else if (key === "Capacity") {
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

                Object.defineProperty(jsonView[i], "ContactFax",
                    Object.getOwnPropertyDescriptor(jsonView[i], "Fax Number"));
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
                } else {
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
            resP.end("Success");
        }).catch(function (e) {
            console.log(e);
        });
    });
    app.get("/requestPdf", (reqP: express.Request, resP: express.Response) => {
        if (reqP.query["file"] === "attendenceRep") {
            venueCapOutput(res1 => {
                resP.writeHead(200,
                    {
                        "Content-Disposition": "attachment;filename=attendenceReport.pdf",
                        "Content-Type": "application/pdf"
                    });
                resP.write(res1);
                resP.end();
            });
        } else if (reqP.query["file"] === "activityRegis") {
            activityRegister(res1 => {
                resP.writeHead(200,
                    {
                        "Content-Disposition": "attachment;filename=activityRegistration.pdf",
                        "Content-Type": "application/pdf"
                    });
                resP.write(res1);
                resP.end();
            });
        } else if (reqP.query["file"] === "nameBadge") {
            nameBadgeOutput(res1 => {
                resP.writeHead(200,
                    {
                        "Content-Disposition": "attachment;filename=nameBadges.pdf",
                        "Content-Type": "application/pdf"
                    });
                resP.write(res1);
                resP.end();
            });
        }
        else {
            resP.writeHead(404);
            resP.end("Error, file not found");
        }
    });
});

function createNames(detailsArray: Array<any>) {
    const names = [];

    for (let key in detailsArray[0]) {
        if (detailsArray[0].hasOwnProperty(key)) {
            names.push(key);
        }
    }
    return names;
}

function fixEnumTypes(descArray: Array<any>, namesArray: Array<any>) {
    if (namesArray.length !== descArray.length) {
        throw "Names and desc not matching";
    }
    const typeDetails = [];
    for (let i = 1; i < namesArray.length; i++) {
        const newType = descArray[i].Type.match(/[a-zA-Z]+/)[0];
        const maxSize = descArray[i].Type.match(/\(\d+\)/);
        let enumArray = false;
        let year = false;
        let isBool = false;
        let placeholder = "";
        if (newType === "enum") {
            enumArray = descArray[i].Type.match(/\(.*\)/)[0].substr(1).slice(0, -1).split(",");
            for (let ii = 0; ii < enumArray["length"]; ii++) {
                enumArray[ii] = enumArray[ii].substr(1).slice(0, -1);
            }
        } else if (newType === "year" || newType === "mediumint") {
            year = true;
        } else if (newType === "tinyint") {
            isBool = true;
        } else if (newType === "date") {
            placeholder = "DD-MM-YYYY";
        }
        typeDetails.push({
            title: namesArray[i],
            maxSize: maxSize ? maxSize[0].substr(1).slice(0, -1) : "--",
            type: (typeConverter.hasOwnProperty(newType) ? typeConverter[newType] : newType),
            enumArray: enumArray,
            year: year,
            isBool: isBool,
            placeholder: placeholder
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

function nameBadgeOutput(callback: Function) {
    function sqlQuery() {
        const defered = Q.defer();
        connection
            .query("SELECT members.id, members.FName, members.LName, members.Involvement, members.YearStartPCollege, members.YearEndPCollege FROM registrationinfo JOIN members GROUP BY members.id", defered.makeNodeResolver());
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
        var template = handlebars.compile(res1[1]);
        fs.writeFileSync("badges.html", template({ bgImage: res1[0].toString(), sqlData: res1[2][0] }));

        htmlPdf.create(template({
            bgImage: res1[0].toString(),
            sqlData: res1[2][0]
        }),
            { "base": "file:///F:/Documents/Visual Studio 2015/Projects/PCAAProject/PCAAProject/Public/", width: "8cm", height: "11cm" }).toBuffer(
            (err2, res2) => {
                if (err2) {
                    throw err2;
                }
                callback(res2);
            });
    }).catch(e => {
        console.log(e);
    });
}
function venueCapOutput(callback: Function) {

    const findingIdQuery = "SELECT venuelocations.VenueName, jubileeactivities.ActivityName, venuelocations.Capacity, COUNT(registrationinfo.MemberID) AS 'Number of people attending'  FROM venuelocations \n\tJOIN jubileeactivities \n\t\tON jubileeactivities.Venue = venuelocations.ID\n\tJOIN registrationinfo\n\t\tON jubileeactivities.id = registrationinfo.ActivityID\n\tGROUP BY jubileeactivities.ID";
    connection.query(findingIdQuery, (err, res) => {
        let names = [];
        for (let key in res[0]) {
            if (res[0].hasOwnProperty(key)) {
                names.push(key);
            }
        }
        fs.readFile("./Views/VenueCapacityOutput.hbs", "utf8",
            (err2, data) => {
                if (err2) {
                    throw err2;
                }

                var template = handlebars.compile(data);
                htmlPdf.create(template({
                    QueryData: res,
                    QueryHeaderRow: names
                }), { "base": "file:///F:/Documents/Visual Studio 2015/Projects/PCAAProject/PCAAProject/Public/" }).toBuffer(
                    (err2, res2) => {
                        if (err2) {
                            throw err2;
                        }
                        callback(res2);
                    });
            });
    });
}

function activityRegister(callback: Function) {

    const findingIdQuery = "SELECT jubileeactivities.ActivityName,members.FName, members.MName, members.LName FROM registrationinfo \n\tJOIN members\n\t\tON registrationinfo.MemberID = members.ID\n\tJOIN jubileeactivities\n\t\tON jubileeactivities.id = registrationinfo.ActivityID";
    connection.query(findingIdQuery, (err, res: any) => {
        const megaArray = [];

        for (let i = 1; i < res.length; i++) {
            //Add null check (nvm)
            if (res[i].ActivityName !== res[i - 1].ActivityName) {
                megaArray.push({
                    title: res[i - 1].ActivityName,
                    data: res.splice(0, i)
                });
                i = 0;
            };
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
        fs.readFile("./Views/ActivityRegister.hbs", "utf8",
            (err2, data) => {
                if (err2) {
                    throw err2;
                }
                var template = handlebars.compile(data);
                htmlPdf.create(template({
                    QueryData: megaArray,
                    QueryHeaderRow: names
                }), { "base": "file:///F:/Documents/Visual Studio 2015/Projects/PCAAProject/PCAAProject/Public/" }).toBuffer(
                    (err2, res2) => {
                        if (err2) {
                            throw err2;
                        }
                        callback(res2);
                    });
            });
    });
}

function ors(key, input) {
    var output = "";
    for (var i = 0; i < input.length; i++) {
        output += String.fromCharCode(input.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return output;
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

