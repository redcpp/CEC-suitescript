const dbConn = require('../connectors/dbConn');

const updateDb = (conn, list) => {
    let ok = [];
    list.forEach(async (sku) => {
        const processedLines = await conn.updateProcessed(sku, true);
        console.log('#Processed lines:', processedLines);
        ok.push(sku);
    })
    return ok;
};

module.exports = async (data) => {
  try {
    console.log(data);
    const conn = await dbConn.connectionFactory();
    let list = updateDb(conn, data);
    return {
        ok: 'Successful data reception',
        list: list,
    };
  } catch (err) {
    console.error(err);
    return err;
  }
};
