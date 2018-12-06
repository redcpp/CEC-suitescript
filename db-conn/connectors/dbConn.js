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

sql.on('error', err => {
	console.error(err);
});

const sales = (n) => `select top ${n || 1} * from dbo.XXCEC_SALES`;
const gerardo = (n) => `select * from dbo.XXCEC_SALES where CheckNumber='50002' and FKStoreID=144 and DateOfBusiness = '2018-09-22'`;
const table_columns = () => (
    "select * from INFORMATION_SCHEMA.COLUMNS where TABLE_NAME = N'XXCEC_SALES'");

const getSales = async (n) => {
	try	{
		let pool = await sql.connect(config);
	    let result = await pool.request()
	        .input('input_parameter', sql.Int, 1)
	        .query(gerardo(n));

	    return await Promise.all(result.recordsets[0]);
	} catch (error) {
		console.error(error);
	}
}

module.exports = {
	getSales: getSales,
};
