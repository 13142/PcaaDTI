"use strict";
/// <reference path="Scripts/typings/globals/mocha/index.d.ts" />
/// <reference path="Scripts/typings/modules/supertest/index.d.ts" />
/// <reference path="Scripts/typings/modules/mysql/index.d.ts" />
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const request = require("supertest");
const mysql = require("mysql");
const databaseCleaner = require("./databaseCleaner");
let localRequest = request.agent("http://localhost:13666");
describe("Auth Suite", () => {
    it("Test for login page redirection /", (done) => {
        localRequest.get("/").expect(302).expect("location", "/login").end(done);
    });
    it("Test for login page redirection /main", (done) => {
        localRequest.get("/main").expect(302).expect("location", "/login").end(done);
    });
    it("Test for login page redirection /logout", (done) => {
        localRequest.get("/logout").expect(302).expect("location", "/login").end(done);
    });
    it("Test for login page redirection /main/onlineMemberList", (done) => {
        localRequest.get("/main/onlineMemberList").expect(302).expect("location", "/login").end(done);
    });
    it("Test for login page redirection /accountManagement", (done) => {
        localRequest.get("/accountManagement").expect(302).expect("location", "/login").end(done);
    });
    it("Test for login page redirection /adminPanel", (done) => {
        localRequest.get("/adminPanel").expect(302).expect("location", "/login").end(done);
    });
    it("Login fails with the wrong credentials", (done) => {
        localRequest.post("/login").type("form").send({ username: "rerxx", pwd: "notmypassword" }).expect(401).end(done);
    });
    it("Change password without credentials", (done) => {
        localRequest.post("/passwordChange").type("json").send({ newPass: "123123", targetID: 2 }).expect(403).end(done);
    });
    it("Change username without credentials", (done) => {
        localRequest.post("/usernameChange").type("json").send({ newUsr: "hellooo", targetID: 2 }).expect(403).end(done);
    });
    it("Login redirects to /main with the correct credentials", (done) => {
        localRequest.post("/login").type("form").send({
            username: "testusr",
            pwd: "test"
        }).expect(302).expect("location", "/main").end(done);
    });
});
describe("Database Access", () => {
    let authenticatedSession;
    before("Login", done => {
        localRequest.post("/login").send({ username: "testusr", pwd: "test" })
            .expect(302).expect("Location", "/main")
            .end(err => {
            if (err)
                return done(err);
            authenticatedSession = localRequest;
            return done();
        });
    });
    let connection;
    before("Database snapshot", done => {
        connection = mysql.createConnection({
            host: "127.0.0.1",
            user: "13142",
            password: new Buffer((ors("74" + "7", "e^aNmNysS`C").concat("=")), "base64").toString("ascii"),
            database: "pcaa",
            port: 13667,
            multipleStatements: true
        });
        databaseCleaner.init(connection);
        databaseCleaner.takeSnapshot("registrationinfo", done);
    });
    let commandLines = [];
    before("Get required files", done => {
        fs.readFile("ClientSideTesting/latestSubmitCommands.testdata", "utf8", (err, data) => {
            if (err)
                return done(err);
            commandLines = data.split("\n").filter(Boolean);
            done();
        });
    });
    after("Clean up database", done => {
        databaseCleaner.restore(done);
    });
    it("Run normal lines", done => {
        // Run to second to last line.
        const allPromises = [];
        for (let i = 0; i < commandLines.length - 1; i++) {
            allPromises.push(authenticatedSession.post("/main/submitNewTable").type("json").send(commandLines[i]).expect(200).catch(done));
        }
        Promise.all(allPromises).then(value => {
            let returnCount = 2;
            connection.query("SELECT COUNT(*) FROM registrationinfo WHERE MemberID = 183 AND ActivityID = 3;", (err, result, fields) => {
                if (err)
                    return done(err);
                if (result[0]["COUNT(*)"] !== 1) {
                    return done(new Error("1 183 3 != 1"));
                }
                imDone();
            });
            connection.query("SELECT * FROM registrationinfo WHERE id = 1;", (err, result, fields) => {
                if (err)
                    return done(err);
                if (result[0]["MemberID"] !== 183 || result[0]["ActivityID"] !== 5) {
                    return done(new Error("2 183 5"));
                }
                imDone();
            });
            connection.query("SELECT COUNT(*) FROM registrationinfo WHERE MemberID = 189 AND ActivityID = 2;", (err, result, fields) => {
                if (err)
                    return done(err);
                console.log(result[0]["COUNT(*)"]);
                if (result[0]["COUNT(*)"] != 1) {
                    return done(new Error("3 189 2 != 1"));
                }
                imDone();
            });
            function imDone() {
                returnCount--;
                if (returnCount === 0) {
                    return done();
                }
            }
        }).catch(done);
    });
    // TODO: Fix this hack, then unhack code
    // it("Run final complete", done => {
    //     databaseCleaner.restore(f, false);
    //     authenticatedSession.post("/main/submitNewTable").type("json").send(commandLines[commandLines.length - 1]).expect(200).end(done);
    // });
});
describe("User Suite", () => {
    let authenticatedSession;
    ;
    before("Login", done => {
        localRequest.post("/login").send({ username: "testusr", pwd: "test" })
            .expect(302).expect("Location", "/main")
            .end(err => {
            if (err)
                return done(err);
            authenticatedSession = localRequest;
            return done();
        });
    });
    it("Access /main", done => {
        authenticatedSession.get("/main").expect(200).expect("content-type", "text/html; charset=utf-8").end(done);
    });
    it("Access /main/onlineMemberList", done => {
        authenticatedSession.get("/main/onlineMemberList").expect(200).expect("content-type", "text/html; charset=utf-8").end(done);
    });
    it("Access /accountManagement", done => {
        authenticatedSession.get("/accountManagement").expect(200).expect("content-type", "text/html; charset=utf-8").end(done);
    });
    it("Test for error /adminPanel", (done) => {
        authenticatedSession.get("/adminPanel").expect(403).end(done);
    });
    it("Change password without credentials", (done) => {
        authenticatedSession.post("/passwordChange").type("json").send({
            newPass: "123123",
            targetID: 2
        }).expect(401).expect("ERROR:oldPassIncorrect").end(done);
    });
    it("Change self password", (done) => {
        authenticatedSession.post("/passwordChange").type("json").send({
            oldPass: "test",
            newPass: "newTest"
        }).expect(200).catch(done).then(res => {
            authenticatedSession.post("/passwordChange").type("json").send({
                oldPass: "newTest",
                newPass: "test"
            }).expect(200).end(done);
        }).catch(done);
    });
    it("Change self username", (done) => {
        authenticatedSession.post("/usernameChange").type("json").send({ newUsr: "newTestAcc" }).expect(200).catch(done).then(res => {
            authenticatedSession.post("/usernameChange").type("json").send({ newUsr: "testusr" }).expect(200).end(done);
        }).catch(done);
    });
    it("Getting pdf files", (done) => {
        authenticatedSession.get("/main/requestPdf").query({ file: "attendenceRep" }).expect(200)
            .expect("Content-type", "application/pdf").expect("Content-Disposition", "attachment;filename=attendenceReport.pdf")
            .catch(done).then(() => {
            authenticatedSession.get("/main/requestPdf").query({ file: "nameBadge" }).expect(200)
                .expect("Content-type", "application/pdf")
                .expect("Content-Disposition", "attachment;filename=nameBadges.pdf").end(done);
        });
    })["timeout"](6000);
    it("Getting html file", (done) => {
        authenticatedSession.get("/main/onlineMemberList").expect(200).expect("Content-Type", "text/html; charset=utf-8").end(done);
    });
    after("Logout", done => {
        authenticatedSession.get("/logout").expect(200).catch(done).then(res => {
            authenticatedSession.get("/main").expect(302).expect("location", "/login").end(done);
        });
    });
});
function ors(key, input) {
    var output = "";
    for (var i = 0; i < input.length; i++) {
        output += String.fromCharCode(input.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return output;
}
describe("Admin Suite", () => {
    let authenticatedSession;
    let connection;
    before("Login", done => {
        localRequest.post("/login").send({ username: "rerxx", pwd: "qwerty" })
            .expect(302).expect("Location", "/main")
            .end(err => {
            if (err)
                return done(err);
            authenticatedSession = localRequest;
            done();
            return;
        });
    });
    before("Database snapshot", done => {
        connection = mysql.createConnection({
            host: "127.0.0.1",
            user: "13142",
            password: new Buffer((ors("74" + "7", "e^aNmNysS`C").concat("=")), "base64").toString("ascii"),
            database: "pcaa",
            port: 13667,
            multipleStatements: true
        });
        databaseCleaner.init(connection);
        databaseCleaner.takeSnapshot("userinfolist", done);
    });
    it("Add and remove account", (done) => {
        authenticatedSession.post("/newAccount").type("json").send([
            { name: "username", data: "testingUsr22" },
            { name: "password", data: "test22" },
            { name: "permissions", data: "Administrator" },
            { name: "email", data: "" }
        ]).expect(200).catch(done).then(res => {
            return authenticatedSession.post("/newAccount").type("json").send([
                { name: "username", data: "testingUsr22" },
                { name: "password", data: "test22" },
                { name: "permissions", data: "Administrator" },
                { name: "email", data: "" }
            ]).expect(400).expect("ERROR:duplicate").catch(done);
        }).then(res => {
            authenticatedSession.post("/newAccount").type("json").send([
                { name: "username", data: "" },
                { name: "password", data: "test22" },
                { name: "permissions", data: "Administrator" },
                { name: "email", data: "" }
            ]).expect(400).expect("ERROR:empty").end(done);
        });
    });
    // Here lies the pyramid of doom
    //it("Change account password", (done) => {
    //    authenticatedSession.post("/passwordChange").type("json").send({ newPass: "1234", targetID: 2 }).expect(200)
    //        .catch(done).then(res => {
    //            authenticatedSession.get("/logout").expect(200).catch(done).then(res => {
    //                authenticatedSession.post("/login").type("form").send({ username: "pcaasecretary", pwd: "1234" })
    //                    .expect(302).expect("Location", "/main").catch(done).then(res => {
    //                        authenticatedSession.post("/passwordChange").type("json")
    //                            .send({ oldPass: "1234", newPass: "test" })
    //                            .expect(200).end(done);
    //                    });
    //            });
    //        });
    //})["timeout"](500000);
    it("Change account password", (done) => {
        authenticatedSession.post("/passwordChange").type("json").send({ newPass: "1234", targetID: 2 }).expect(200)
            .catch(done).then(res => {
            return authenticatedSession.get("/logout").expect(200).catch(done);
        }).then(res => {
            return authenticatedSession.post("/login").type("form")
                .send({ username: "pcaasecretary", pwd: "1234" })
                .expect(302).expect("Location", "/main").catch(done);
        }).then(res => {
            authenticatedSession.post("/passwordChange").type("json")
                .send({ oldPass: "1234", newPass: "test" })
                .expect(200).end(done);
        });
    });
    after("Clean up database", done => {
        databaseCleaner.restore(done);
    });
});
//# sourceMappingURL=app.utest.js.map