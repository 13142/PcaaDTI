const convertExcel = require('excel-as-json').processFile;
var fullData;
var connected;
var ValueReplacement = {};
ValueReplacement["No"] = "FALSE";
ValueReplacement["Yes"] = "TRUE";
ValueReplacement["M"] = "MALE";
ValueReplacement["F"] = "FEMALE";
convertExcel("./PCAA/PCAACommittee.xlsx", null, null, function(err, data) {
    if (err) {
        console.log(err);
    }
    //console.log(data);
    fullData = data;
    console.log(fullData);
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
        for (var i = 0; i < fullData.length; i++) {
            //  console.log(fullData[i]);
            var isAllNull = true;
            for (var key in fullData[i]) {
                if (fullData[i].hasOwnProperty(key)) {
                    if (fullData[i][key] == "") {
                        fullData[i][key] = "NULL";
                        continue;
                    } else {
                        isAllNull = false;
                    }
                  //  fullData[i][key] = fullData[i][key].toString().replace(/\'/g, "\\'");
                    //fullData[i][key] = "'" + fullData[i][key] + "'";
                }
            }
            if (isAllNull) {
                fullData.splice(i, 1);
                i--;
                continue;
            }

        }
        for (let i = 0; i < fullData.length; i++) {
            var splitNames = fullData[i]["Member Name"].split(" ").filter(String);
            console.log(splitNames);
            var findingIDQuery = "SELECT ID FROM members WHERE FName = '" + splitNames[0] + "' AND LName = '" + splitNames[1] + "';";
            console.log(findingIDQuery);
            connection.query(findingIDQuery, function(err, res) {
                if (err) {
                    console.log(err);
                }
                var insertQuery = "INSERT INTO committee VALUES (" + res[0].ID + ",'" + fullData[i]["Position"] + "');";
                console.log(insertQuery);
                connection.query(insertQuery, function(err, res) {
                    if (err) {
                        console.log(err);
                    }
                });
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
// connection.query("DELETE FROM jubileedetails;", function(err, res) {
//     if (err) {
//         console.log(err);
//     }
//     //    console.log(res);
// });

//connection.end();
var cannon = 5;