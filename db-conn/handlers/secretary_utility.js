const joinTickets = async (conn, data) => {
    let trx_id_dict = {};
    for (let i = 0; i < data.length; ++i) {
        const d = data[i];
        // header
        const key = d.TRX_ID.trim();
        trx_id_dict[key] = trx_id_dict[key] || {
            info: extractGeneralInfo(d),
            payment: biggestAmountPayment(await conn.getPayments(key), key),
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

const biggestAmountPayment = (payments, key) => {
    payments.sort((a, b) => (b.Amount - a.Amount));
    return extractPaymentInfo(payments[0] || {});
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
    TRX_ID: trim(ticket.TRX_ID),
    Type: ticket.Type,
    TypeId: trim(ticket.TypeID),
    Processed: trim(ticket.Processed),
    Auth: trim(ticket.Auth),
    Ident: trim(ticket.Ident),
    Amount: ticket.Amount,
    DateOfBusiness: ticket.DateOfBusiness,
});

const extractProductInfo = (ticket) => ({
    Price: ticket.Price / 1.16,
    PriceTaxed: ticket.Price,
    Quantity: ticket.Quantity,
    FKItemID: ticket.FKItemID.toString(),
    LongName: ticket.LongName.trim(),
});

const trim = (str) => (
    str ? str.trim() : ''
);

module.exports = {
    joinTickets: joinTickets
}