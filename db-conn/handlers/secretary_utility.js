const joinTickets = async (conn, data) => {
    // Tickets container
    let trx_id_dict = {};
    for (let i = 0; i < data.length; ++i) {
        const d = data[i];
        // HEADER
        // Get Ticket if it exists
        // Otherwise create Ticket object
        const key = d.TRX_ID.trim();
        trx_id_dict[key] = trx_id_dict[key] || {
            info: extractGeneralInfo(d),
            payment: biggestAmountPayment(await conn.getPayments(key)),
            products: {},
        };
        // PRODUCTS
        // Check if the product in this row is not in the Ticket yet
        // Otherwise just increment Quantity
        const productKey = d.FKItemID;
        if (!trx_id_dict[key].products.hasOwnProperty(productKey)) {
            trx_id_dict[key].products[productKey] = extractProductInfo(d);
        } else {
            trx_id_dict[key].products[productKey].Quantity += 1;
        }
    }
    // Convert Ticket dictionary container to array
    let tickets = Object.values(trx_id_dict);
    tickets.forEach((t) => {
        t.products = Object.values(t.products);
    });
    return tickets;
};

const biggestAmountPayment = (payments) => {
    payments.sort((a, b) => (b.Amount - a.Amount));
    return extractPaymentInfo(payments[0] || {});
};

const extractGeneralInfo = (ticket) => ({
    TRX_ID: trim(ticket.TRX_ID),
    Type: ticket.type,
    Processed: trim(ticket.Processed),
    SalesType: trim(ticket.SalesType),
    FKStoreID: ticket.FKStoreID,
    Subsidiary: ticket.Subsidiary,
    CheckNumber: ticket.CheckNumber,
    DateOfBusiness: ticket.DateOfBusiness,
    FullName: trim(ticket.FullName),
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
    LongName: trim(ticket.LongName),
});

const trim = (str) => (
    str ? str.trim() : ''
);

module.exports = {
    joinTickets: joinTickets
}