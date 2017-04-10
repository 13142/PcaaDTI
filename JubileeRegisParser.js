const convertExcel = require('excel-as-json').processFile;
var fullData;
var connected;
var ValueReplacement = {};
ValueReplacement["No"] = "FALSE";
ValueReplacement["Yes"] = "TRUE";
ValueReplacement["M"] = "MALE";
ValueReplacement["F"] = "FEMALE";
convertExcel("./PCAA/JubileeRegistration.xlsx", null, null, function(err, data) {
    if (err) {
        console.log(err);
    }
    //console.log(data);
    fullData = data;
    //    console.log(fullData);
    SendInfo();
});

function ors(key, input) {
    var output = '';
    for (var i = 0; i < input.length; i++) {
        output += String.fromCharCode(input.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return output;
}

function SendInfo() {
    if (fullData && connection.state == "authenticated") {
        var needToRegister = [];

        for (var i = 0; i < fullData.length; i++) {
            var isAllNull = true;
            for (var key in fullData[i]) {
                if (fullData[i].hasOwnProperty(key)) {
                    if (fullData[i][key] == "") {
                        fullData[i][key] = "NULL";
                        continue;
                    } else {
                        isAllNull = false;
                    }
                    if (key == "Already PCAA member?" && fullData[i][key] == "No") {
                        isAllNull = true;
                        break;
                    }
                    if (key == "Permission for name on web") {
                        fullData[i][key] = ValueReplacement[fullData[i][key]];
                        continue;
                    }
                    fullData[i][key] = "'" + fullData[i][key] + "'";
                }
            }
            if (isAllNull) {
                console.log("DELETED");
                fullData.splice(i, 1);
                i--;
                continue;
            }
        }

        for (let i = 0; i < fullData.length; i++) {
            var findingIDQuery = "SELECT ID FROM members WHERE FName = " + fullData[i]["FName"] + " AND LName = " + fullData[i]["LName"] + ";";
            //        console.log(findingIDQuery);
            connection.query(findingIDQuery, function(err, res) {
                if (err) {
                    console.log(err);
                }
                var activityList = fullData[i]["JubileeActivities"].split(", ");

                for (let ii = 0; ii < activityList.length; ii++) {
                    // if (!activityList[ii]) {
                    //   continue;
                    // }
                    var secondQuery = "SELECT ID FROM jubileeActivities WHERE ActivityName = '" + activityList[ii].replace(/\'/g, "") + "';";
                    console.log(secondQuery);
                    connection.query(secondQuery, function(err2, res2) {
                        if (err2) {
                            console.log(err2);
                        }

                        var insertIntoQuery = "INSERT INTO registrationInfo VALUES (" + res[0].ID + "," + res2[0].ID + ");";
                        connection.query(insertIntoQuery, function(err3, res3) {
                          if (err3) {
                            console.log(err3);
                          }
                        });
                        console.log(insertIntoQuery);
                    });

                }


                // for (var item in activityList) {
                //     if (activityList.hasOwnProperty(item)) {
                //         insertQuery += activityList[item].replace(/\'/g, "") + ",";
                //     }
                // }
                // insertQuery = insertQuery.slice(0, -1);
                // insertQuery += "'), " + fullData[i]["Permission for name on web"];
                // insertQuery += ");";
                //    console.log(insertQuery);
                // connection.query(insertQuery, function(err, res) {
                //     if (err) {
                //         console.log(err);
                //     }
                // });
            });
        }
        setTimeout(function() {
            connection.end();
        }, 1000);

    } else {
        console.log("notconnected");
    }
}
const mysql = require('mysql');
var connection = mysql.createConnection({
    host: "222.152.14.174",
    user: "13142",
    password: new Buffer((ors("74" + "7", "e^aNmNysS`C").concat("=")), "base64").toString("ascii"),
    database: "pcaa",
    port: "13667"
});
connection.connect(function(err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }

    //console.log(connection);
    console.log('connected as id ' + connection.threadId);
    SendInfo();
});