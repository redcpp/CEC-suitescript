const sql = require('mssql');

const config = {
    user: 'sa',
    password: '%2pWnqqY3dN1X',
    server: "189.212.124.246", // You can use 'localhost\\instance' to connect to named instance
    database: 'CECReportes',
    options: {
        encrypt: false // Use this if you're on Windows Azure
    },
};

const GERARDO_TRX_ID = '220918500026';
const ticket = (trx_id=GERARDO_TRX_ID) => (
    `select *
    from dbo.XXCEC_SALES
    where TRX_ID='${trx_id}'`
);
const sales = () => (
    `select *
    from dbo.XXCEC_SALES
    where Processed!='Y'`
);
const payments = (trx_id) => (
    `select *
    from dbo.XXCEC_PAYMENTS
    where TRX_ID='${trx_id}'`
);
const tableColumns = () => (
    `select *
    from INFORMATION_SCHEMA.COLUMNS
    where TABLE_NAME = N'XXCEC_SALES'`
);
const updateSales = (trx_id, value='Y') => (
    `update T
    set T.Processed = '${value}'
    from dbo.XXCEC_SALES as T
    where TRX_ID='${trx_id}'`
);
const updatePayments = (trx_id, value='Y') => (
    `update T
    set T.Processed = '${value}'
    from dbo.XXCEC_PAYMENTS as T
    where TRX_ID='${trx_id}'`
);

const processQuery = async (conn, queryString, isAction=false) => {
    try {
        const req = new sql.Request(conn);
        const queries = await req.query(queryString);
        let result;
        if (isAction) {
            result = queries.rowsAffected[0];
        } else {
            result = await Promise.all(queries.recordsets[0]);
        }
        return result;
    } catch (error) {
        console.error(error);
    }
};

const connectionFactory = async () => {
    const pool = new sql.ConnectionPool(config);
    const poolPromise = new sql.ConnectionPool(config)
        .connect()
        .then(pool => {
            console.log('Connected to MSSQL')
            return pool
        })
        .catch(err =>
            console.log('Database Connection Failed! Bad Config: ', err)
        )
    const conn = await poolPromise;
    return {
        getSales: () => processQuery(conn, sales()),
        getTicket: (trx_id) => processQuery(conn, ticket(trx_id)),
        getPayments: (trx_id) => processQuery(conn, payments(trx_id)),
        updateProcessed: async (trx_id, processed) => {
            const value = (processed ? 'Y' : 'N');
            let cnt = 0;
            cnt += await processQuery(conn, updateSales(trx_id,value), true);
            cnt += await processQuery(conn, updatePayments(trx_id,value), true);
            return cnt;
        },
    };
};

module.exports = {
    connectionFactory: connectionFactory,
};
