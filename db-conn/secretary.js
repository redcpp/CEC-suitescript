const fs = require('fs');
const dbConn = require('./connectors/dbConn');
const nsFetch = require('./connectors/nsFetch');

const main = async () => {
    try {
        const conn = await dbConn.connectionFactory();
        // const processed = await conn.updateProcessed('220918500026');
        // console.log('#Processed:', processed);
        const json = await conn.getTicket();
        const tickets = await joinTickets(conn, json);
        console.log('Uploading:', JSON.stringify(tickets, null, 2));
        // const res = await nsFetch.post(tickets);
        // console.log('Uploaded:', res);
    } catch (err) {
        console.log(err);
    }
};

const joinTickets = async (conn, data) => {
    let trx_id_dict = {};
    for (let i = 0; i < data.length; ++i) {
        const d = data[i];
        // header
        const key = d.TRX_ID.trim();
        trx_id_dict[key] = trx_id_dict[key] || {
            info: extractGeneralInfo(d),
            payments: (await conn.getPayments(key)).map(extractPaymentInfo),
            products: {},
        };
        // products
        const productKey = d.FKItemID;
        if (!trx_id_dict[key].products.hasOwnProperty(productKey)) {
            trx_id_dict[key].products[productKey] = extractProductInfo(d);
        } else {
            trx_id_dict[key].products[productKey].Quantity += 1;
        }
    }
    // Dictionaries to arrays
    let tickets = Object.values(trx_id_dict);
    tickets.forEach((t) => {
        t.products = Object.values(t.products);
    });
    return tickets;
};

const extractGeneralInfo = (ticket) => ({
    TRX_ID: ticket.TRX_ID.trim(),
    Type: ticket.type,
    Processed: ticket.Processed.trim(),
    SalesType: ticket.SalesType.trim(),
    FKStoreID: ticket.FKStoreID,
    Subsidiary: ticket.Subsidiary,
    CheckNumber: ticket.CheckNumber,
    DateOfBusiness: ticket.DateOfBusiness,
    FullName: ticket.FullName.trim(),
    FKEmployeeNumber: ticket.FKEmployeeNumber,
});

const extractPaymentInfo = (ticket) => ({
    TRX_ID: ticket.TRX_ID.trim(),
    Type: ticket.Type,
    TypeId: ticket.TypeID,
    Processed: ticket.Processed.trim(),
    Auth: ticket.Auth.trim(),
    Ident: ticket.Ident.trim(),
    Amount: ticket.Amount,
    DateOfBusiness: ticket.DateOfBusiness,
});

const extractProductInfo = (ticket) => ({
    Price: ticket.Price / 1.16,
    Quantity: ticket.Quantity,
    FKItemID: ticket.FKItemID,
    LongName: ticket.LongName.trim(),
});

main();
