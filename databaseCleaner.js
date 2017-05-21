"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let connection;
let restoreQuery;
function init(connectionIn) {
    connection = connectionIn;
}
exports.init = init;
function takeSnapshot(tableToTake, done) {
    connection.connect(err => {
        if (err) {
            done(err);
            return;
        }
        restoreQuery = "/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;\r\n/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;\r\n/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;\r\n/*!40101 SET NAMES utf8 */;\r\n/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;\r\n/*!40103 SET TIME_ZONE='+00:00' */;\r\n/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;\r\n/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;\r\n/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;\r\n/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;\r\nLOCK TABLES `" + tableToTake + "` WRITE;\r\n/*!40000 ALTER TABLE `" + tableToTake + "` DISABLE KEYS */;\r\n";
        connection.query("SELECT * FROM `" + tableToTake + "`;", (err2, res) => {
            if (err2) {
                done(err2);
                return;
            }
            if (res.length === 0) {
                restoreQuery = "TRUNCATE `" + tableToTake + "`;";
                done();
                return;
            }
            restoreQuery += "TRUNCATE `" + tableToTake + "`;\r\n";
            restoreQuery += "INSERT INTO `" + tableToTake + "` (";
            for (let key in res[0]) {
                if (res[0].hasOwnProperty(key)) {
                    restoreQuery += connection.escapeId(key) + ",";
                }
            }
            restoreQuery = restoreQuery.replace(/,$/, "");
            restoreQuery += ") VALUES ";
            for (let i = 0; i < res.length; i++) {
                restoreQuery += "(";
                for (let key in res[i]) {
                    if (res[0].hasOwnProperty(key)) {
                        restoreQuery += connection.escape(res[i][key]) + ",";
                    }
                }
                restoreQuery = restoreQuery.replace(/,$/, "");
                restoreQuery += "),";
            }
            restoreQuery = restoreQuery.replace(/,$/, "");
            restoreQuery += ";\r\n";
            restoreQuery +=
                "/*!40000 ALTER TABLE `" + tableToTake + "` ENABLE KEYS */;\r\nUNLOCK TABLES;\r\n/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;\r\n\r\n/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;\r\n/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;\n/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;\r\n/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;\r\n/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;\n/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;\n/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;";
            done();
        });
    });
}
exports.takeSnapshot = takeSnapshot;
function restore(done, endConnection = true) {
    connection.query(restoreQuery, function (err) {
        if (err) {
            done(err);
            return;
        }
        if (endConnection) {
            connection.end(done);
        }
        else {
            done();
        }
    });
}
exports.restore = restore;
//# sourceMappingURL=databaseCleaner.js.map