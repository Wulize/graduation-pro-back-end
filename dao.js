//进行数据库操作，增删改查
let MongoClient = require('mongodb').MongoClient;
let url = "mongodb://localhost:27017/touristInfo";
let data, dbo;

//查找数据
async function getdata(tableName, condition = {}) {
    return new Promise(
        (resolve, reject) => {
            MongoClient.connect(url, { useUnifiedTopology: true }, function(err, db) {
                if (err) throw err;
                dbo = db.db("touristInfo");
                //查找数据
                dbo.collection(tableName).find(condition).toArray(function(err, result) {
                    if (err) throw err;
                    data = result;
                    db.close();
                    resolve(data);
                })
            })
        })
}

//插入数据
async function insert(collectionName, data) {
    return new Promise(
        (resolve, reject) => {
            MongoClient.connect(url, { useUnifiedTopology: true }, function(err, db) {
                if (err) throw err;
                dbo = db.db("touristInfo");
                dbo.collection(collectionName).insertOne(data, (err, result) => {
                    if (err) {
                        reject(err);
                        return;
                    } else {
                        db.close();
                        resolve(result);
                    }
                });

            })
        })
}

//删除数据
async function deleteData(collectionName, condition) {
    return new Promise(
        (resolve, reject) => {
            MongoClient.connect(url, { useUnifiedTopology: true }, function(err, db) {
                if (err) throw err;
                dbo = db.db("touristInfo");
                dbo.collection(collectionName).deleteOne(condition, (err, result) => {
                    if (err) {
                        reject(err);
                        return;
                    } else {
                        db.close();
                        resolve(result);
                    }
                });

            })
        })
}

module.exports = {
    getdata,
    insert,
    deleteData
}