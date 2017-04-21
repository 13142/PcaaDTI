/// <reference path="Scripts/typings/globals/handlebars/index.d.ts" />
/// <reference path="Scripts/typings/modules/consolidate/index.d.ts" />
/// <reference path="Scripts/typings/modules/express/index.d.ts" />
/// <reference path="Scripts/typings/modules/mysql/index.d.ts" />
/// <reference path="Scripts/typings/modules/q/index.d.ts" />
/// <reference path="Scripts/typings/modules/body-parser/index.d.ts" />
/// <reference path="Scripts/typings/globals/html-pdf/index.d.ts" />


import * as handlebars from "handlebars";
import * as cons from "consolidate";
import * as express from "express";
import * as fs from "fs";
import * as htmlPdf from "html-pdf";
import * as mysql from "mysql";
import * as Q from "q";
import * as moment from "moment";
import * as bodyParser from "body-parser"

var app = express();
app.use(express.static("Public"));
app.use(bodyParser.json());
//app.use(bodyParser.urlencoded());
app.engine("hbs", cons.handlebars);

app.set("view engine", "hbs");

handlebars.registerPartial("membersItem", fs.readFileSync(__dirname + "/Views/Partials/MembersItem.hbs", "utf8"));
app.get("/", (req: express.Request, res: express.Response) => {

    function membersQuery() {
        var defered = Q.defer();
        connection.query("SELECT * FROM members", defered.makeNodeResolver());
        return defered.promise;
    }
    function registrationsQuery() {
        var defered = Q.defer();
        connection.query("SELECT group_concat(tblC.ActivityName SEPARATOR ',') AS 'Activities',tblB.FName, tblB.LName FROM registrationinfo tblA \n\tJOIN members tblB \n\t\tON tblA.MemberID = tblB.ID \n\tJOIN jubileeactivities tblC \n\t\tON tblC.ID = tblA.ActivityID \n\tGROUP BY tblA.MemberID", defered.makeNodeResolver());
        return defered.promise;
    }

    function memberDescQuery() {
        var defered = Q.defer();
        connection.query("DESC members", defered.makeNodeResolver());
        return defered.promise;
    }

    //Using the database format from the latest get request to avoid unexpected results when posting
    var latestQuery;

    const tableToIndexRep = {
        "members": 0,
        "registrationinfo": 1,
        "venuelocation": 2
    }
    Q.all([membersQuery(), registrationsQuery()]).then(res1 => {
        var memberDetails = res1[0][0];
        var regisInfo = res1[1][0];
        var names = [];

        for (var key in memberDetails[0]) {
            if (memberDetails[0].hasOwnProperty(key)) {
                names.push(key);
            }
        }

        for (let i = 0; i < memberDetails.length; i++) {
            if (memberDetails[i].PostAddressSame == "1")
                memberDetails[i].PostAddressSame = "Yes";
            else
                memberDetails[i].PostAddressSame = "No";

            var doB = moment(JSON.stringify(memberDetails[i].DoB).split("T")[0], "YYYY-MM-DD");

            memberDetails[i].DoB = doB.format("DD / MM / YYYY");
        }
        latestQuery = res1;
        res.render("index",
            {
                MemberDetails: memberDetails,
                RegistrationDetails: regisInfo,
                MemberDesc: names,
                GeneralData: JSON.stringify(res1)
            });

    });

    //Placed inside the Get call to seperate out different clients..... Don't actually know if this works
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
                            reqP.body[i].data[ii].newData +
                            "',";
                    }
                    myQuery.trim();
                    myQuery = myQuery.replace(/,$/g, "");

                    myQuery += " WHERE id=" + updateId + ";";
                    const defered = Q.defer();
                    connection.query(myQuery, defered.makeNodeResolver());
                    allPromises.push(defered.promise);
                } else if (reqP.body[i].operation === "DELETE") {
                    const myQuery = "DELETE FROM " + insertIntoTable + " WHERE id=" + reqP.body[i].rowID + ";";

                    const defered = Q.defer();
                    connection.query(myQuery, defered.makeNodeResolver());
                    allPromises.push(defered.promise);
                }
            }
            Q.all(allPromises).then(() => {
                resP.end("Success");
            });
            //{(err2, res2) =>
            //    if (err2) console.log(err2);
            //    resP.end("Success");
            //}
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
        } else {
            resP.end();
        }
    });
});
function venueCapOutput(callback: Function) {

    const findingIdQuery = "SELECT venuelocations.VenueName, jubileeactivities.ActivityName, venuelocations.Capacity, COUNT(registrationinfo.MemberID) AS 'Number of people attending'  FROM venuelocations \n\tJOIN jubileeactivities \n\t\tON jubileeactivities.Venue = venuelocations.ID\n\tJOIN registrationinfo\n\t\tON jubileeactivities.id = registrationinfo.ActivityID\n\tGROUP BY jubileeactivities.ID";
    connection.query(findingIdQuery, (err, res) => {
        fs.readFile("./Views/VenueCapacityOutput.hbs", "utf8",
            (err2, data) => {
                if (err2) {
                    throw err2;
                }
                let names = [];
                for (let key in res[0]) {
                    if (res[0].hasOwnProperty(key)) {
                        names.push(key);
                    }
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
    connection.query(findingIdQuery, (err, res) => {
        fs.readFile("./Views/ActivityRegister.hbs", "utf8",
            (err2, data) => {
                if (err2) {
                    throw err2;
                }
                let names = [];
                for (let key in res[0]) {
                    if (res[0].hasOwnProperty(key)) {
                        names.push(key);
                    }
                }
                var template = handlebars.compile(data);
                htmlPdf.create(template({
                    QueryData: res,
                    QueryHeaderRow: names
                }), { "base": "file:///F:/Documents/Visual Studio 2015/Projects/PCAAProject/PCAAProject/Public/" }).toFile("./Hahaha.pdf",
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
    activityRegister(function(parameters)
    {
        
    });
});

