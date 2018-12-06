const fs = require('fs');
const dbConn = require('./connectors/dbConn');
const nsFetch = require('./connectors/nsFetch');

const dummyJson = require('./json/small_test');

const main = async () => {
  try {
      const json = await dbConn.getSales(5);
      const tickets = joinTickets(json);
      console.log('Uploading:', JSON.stringify(tickets, null, 2));
      const res = await nsFetch.post(tickets);
      console.log('Uploaded:', res);
  } catch (err) {
    console.log(err);
  }
};

const joinTickets = (data) => {
    let trx_id_dict = {};
    data.forEach(d => {
        const key = d.TRX_ID.trim();
        trx_id_dict[key] = trx_id_dict[key] || {
            info: extractGeneralInfo(d),
            products: [],
        };
        trx_id_dict[key].products.push(extractProductInfo(d));
    });
    return Object.values(trx_id_dict);
};

const extractGeneralInfo = (ticket) => ({
    TRX_ID: ticket.TRX_ID.trim(),
    type: ticket.type,
    SalesType: ticket.SalesType.trim(),
    FKStoreID: ticket.FKStoreID,
    Subsidiary: ticket.Subsidiary,
    CheckNumber: ticket.CheckNumber,
    DateOfBusiness: ticket.DateOfBusiness,
    FullName: ticket.FullName.trim(),
    FKEmployeeNumber: ticket.FKEmployeeNumber,
});

const extractProductInfo = (ticket) => ({
    Price: ticket.Price,
    Quantity: ticket.Quantity,
    UniqueID: ticket.UniqueID, // table id
    FKItemID: ticket.FKItemID,
    LongName: ticket.LongName.trim(),
});

main();
