 /*jshint esversion: 6 */
 const pdfkit = require('pdfkit');
 const fs = require('fs');
 const mysql = require('mysql');

 var doc = new pdfkit();
 var orgReplaceCon;
 var venueReplaceCon;
 var countingCon;

 function GetInfo() {
     var findingIDQuery = "SELECT id,ActivityName,eventDate,Venue,AltVenue,Organiser FROM jubileeactivities;";
     connection.query(findingIDQuery, function(err, res) {
         if (err) {
             console.log(err);
         }
         for (let i = 0; i < res.length; i++) {
             var matchOrganiserQ = "SELECT FName,LName FROM members WHERE id=" + res[i].Organiser + ";";

             orgReplaceCon = connection.query(matchOrganiserQ, function(err2, res2) {
                 if (err2) {
                     console.log(err);
                 }
                 res[i].Organiser = res2[0].FName + " " + res2[0].LName;
                 AllFinished(res);
             });
             var replaceVenueQ = "SELECT VenueName,Capacity FROM venuelocations WHERE id=" + res[i].Venue;
             venueReplaceCon = connection.query(replaceVenueQ, function(err2, res2) {
                 if (err2) {
                     console.log(err);
                 }
                 res[i].Venue = res2[0].VenueName;
                 res[i].Capacity = res2[0].Capacity;
                 AllFinished(res);
             });
             var countingQ = "SELECT COUNT(*) FROM registrationInfo WHERE ActivityID=" + res[i].id + ";";
             countingCon = connection.query(countingQ, function(err2, res2) {
                 if (err2) {
                     console.log(err);
                 }
                 res[i].AttendingNum = res2[0]["COUNT(*)"];
                 AllFinished(res);
             });
         }
     });
     setTimeout(function() {
         connection.end();
     }, 1000);
 }

 function AllFinished(res) {
     if (orgReplaceCon._ended && venueReplaceCon._ended && countingCon._ended) {
         console.log(res);
         for (var i = 0; i < res.length; i++) {
           doc.text(res[i].Venue, 50, 100 * i);
         }
          doc.end();
     }
 }

 function ors(key, input) {
     var output = '';
     for (var i = 0; i < input.length; i++) {
         output += String.fromCharCode(input.charCodeAt(i) ^ key.charCodeAt(i % key.length));
     }
     return output;
 }
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

     console.log('connected as id ' + connection.threadId);
     GetInfo();
 });


 doc.pipe(fs.createWriteStream('output.pdf'));

 doc.font("PCAA/ABOVE.ttf").fontSize(25);