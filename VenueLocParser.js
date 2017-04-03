const convertExcel = require('excel-as-json').processFile;
var fullData;
var connected;
var ValueReplacement = {};
ValueReplacement["No"] = "FALSE";
ValueReplacement["Yes"] = "TRUE";
ValueReplacement["M"] = "MALE";
ValueReplacement["F"] = "FEMALE";
convertExcel("./JubileeActivityVenues.xlsx", null, null, function(err, data) {
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
                    if (key == "ContactPh" || key == "Fax Number") {
                        fullData[i][key] = fullData[i][key].replace(/[\(\) ]/g, "");
                      }
                    // } else if (key == "PostPostCode" || key == "PostCode") {
                    //     fullData[i][key] = ("0000" + fullData[i][key]).slice(-4);
                    // } else if (key == "DoB") {
                    //     var oldDate = new Date(1900, 1, 1);
                    //     oldDate.setDate(oldDate.getDate() + parseInt(fullData[i][key]) - 2);
                    //     fullData[i][key] = oldDate.getFullYear() + "-" + (oldDate.getMonth() + 1) + "-" + oldDate.getDate();
                    //     console.log(fullData[i][key]);
                    //     //  fullData[i][key] = String(fullData[i][key]).replace(/\//g, "-")
                    // }
                    fullData[i][key] = "'" + fullData[i][key] + "'";
                }
            }
            if (isAllNull) {
                fullData.splice(i, 1);
                i--;
                continue;
            }
            var queryString = "INSERT INTO venuelocations VALUES (NULL";

            for (var key in fullData[i]) {
                if (fullData[i].hasOwnProperty(key)) {
                    queryString += ", " + fullData[i][key];
                }
            }
            queryString += ");";
            console.log(queryString);
            connection.query(queryString, function(err, res) {
                if (err) {
                    console.log(err);
                }
            });
        }
        connection.end();
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
