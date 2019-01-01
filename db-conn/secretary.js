const fs = require('fs');
const dbConn = require('./connectors/dbConn');
const nsFetch = require('./connectors/nsFetch');
const {joinTickets} = require('./handlers/secretary_utility');

const CHUNK_SIZE = 20;

const main = async () => {
    try {
        const conn = await dbConn.connectionFactory();
        const json = await conn.getSales();
        let tickets = await joinTickets(conn, json);
        tickets = tickets.splice(0, 50);
        console.log('Number of tickets:', tickets.length);
        while (tickets.length > 0) {
            let chunk = tickets.splice(0, CHUNK_SIZE);
            const res = await nsFetch.post(chunk);
            console.log(`Uploaded ${chunk.length} tickets: ${res}`);
        }
    } catch (err) {
        console.log(err);
    }
};

const testing = async () => {
    try {
        const conn = await dbConn.connectionFactory();
        const json = await conn.getTicket('3112184000210');
        console.log('JSON:', json);
    } catch (err) {
        console.log(err);
    }
};

const missing = (tickets) => {
    const notFound = [ '201004', '201009', '501040', '501086', '501087' ];
    let l = tickets[0].products
        .filter(p => notFound.some(f => p.FKItemID === f))
    const total = l
        .map(p => p.PriceTaxed * p.Quantity)
        .reduce((a,c) => a+c, 0);
    console.log(l, total);
};

main();
