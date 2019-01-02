const CEC_FOLDER = 719;
const CHUNK_SIZE = 1000;
const SERVER_IP = '189.212.124.246';

const TAX_CODE_ID = '5';
const CUSTOMER_ID = '1588';
const DEPARTMENT_ID = '278';
const ITEM_COLUMN_SKU = 'itemid';

/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/error', 'N/file', 'N/search', 'N/http'], (record, error, file, search, http) => { // eslint-disable-line max-len

  const processDataReception = (ticketsMap) => {
    logGeneral('Received list - length', ticketsMap.length);
    // const processedList = ticketsMap.map(t => processTicket(t)).filter(t => t);
    // logGeneral('Processed list', JSON.stringify(processedList));
    // sendListToApi(processedList);
  };

  const processTicket = (jsonContents) => {
    try {
      const customRecordId = createCustomRecord(jsonContents);

      // Invoice
      const items = obtainProducts(jsonContents.products);
      logGeneral('ITEMS', JSON.stringify(items.map(i=>i.FKItemID)));
      const invoiceId = createInvoiceRecord(items, jsonContents);
      const pid = createPaymentRecord(invoiceId, extractPayment(jsonContents));

      // Validate successfull creation
      if (!(invoiceId && pid)) {
        _errMissingData(invoiceId, pid);
      }

      // Everything went all-right
      addInvoiceToCustomRecord(customRecordId, invoiceId);
      return extractName(jsonContents);
    } catch (err) {
      logGeneral('Restlet - fail', err);
    }
  };

  /*
  ******************************************************************************
  * Products
  ******************************************************************************
  */

  const obtainProducts = (products) => {
    const skuList = products.map(function(product) {
      return product.FKItemID;
    });

    const localInfoOfSku = productsDict(skuList);

    const productsWithAllInfo = products
      .map((product) =>
        Object.assign({}, product, localInfoOfSku[product.FKItemID]))
      .filter((product) => product.internal_id && product.Quantity);

    return productsWithAllInfo;
  };

  const productsDict = (skuList) => {
    logGeneral('SKU List', skuList);

    // Search
    const searchOperation = search.create({
      type: search.Type.ITEM,
      filters: filtersFromSkuList(skuList),
      columns: ['itemid'],
    });

    // Traverse search-data
    let itemDict = {};
    searchOperation.run().each((product) => {
      const item = extractItem(product);
      if (!itemDict[item.sku]) {
        itemDict[item.sku] = item;
      }
      return true; // continue iterating data
    });

    return itemDict;
  };

  const filtersFromSkuList = (skuList) => {
    let filters = [];
    for (let i = 0; i < skuList.length; ++i) {
      if (i !== 0) {
        filters.push('or');
      }
      filters.push(['itemid', search.Operator.IS, skuList[i]]);
    }
    return filters;
  };

  const extractItem = (product) => ({
    internal_id: product.id,
    sku: product.getValue({name: 'itemid'}),
    rate: product.getValue({name: 'rate'}),
  });

  const extractPayment = (contents) => (
    contents.payment.TypeId
  );

  /*
  ******************************************************************************
  * Custom Record
  ******************************************************************************
  */

  const createCustomRecord = (jsonContents) => {
    try {
      const fileId = createFile(jsonContents);

      const creator = customRecordFactory({record, log});
      creator.setInfo({
        name: extractName(jsonContents),
        custrecord_cec_json: JSON.stringify(jsonContents),
        custrecord_cec_file: fileId,
      });
      const customRecordId = creator.save();

      logGeneral('Custom record - ok', customRecordId);
      return customRecordId;
    } catch (err) {
      logGeneral('Custom record - failed', err);
    }
  };

  const createFile = (fileContents) => {
    const newFile = file.create({
      name: extractName(fileContents) + '.json',
      fileType: file.Type.JSON,
      contents: JSON.stringify(fileContents),
    });
    newFile.folder = CEC_FOLDER;
    return newFile.save();
  };

  const addInvoiceToCustomRecord = (customRecordId, invoiceId) => {
    const editedRecordId = record.submitFields({
      type: 'customrecord_cec_custom_record',
      id: customRecordId,
      values: {
        custrecord_cec_invoice_id: invoiceId,
      },
      options: {
        enableSourcing: true,
        ignoreMandatoryFields: true,
      },
    });
    logGeneral('Update custom record - ok', editedRecordId);
  };

  /*
  ******************************************************************************
  * Invoice
  ******************************************************************************
  */

  const createPaymentRecord = (invoiceId, paymentmethod) => {
    try {
      const customerPayment = record.transform({
        fromType: record.Type.INVOICE,
        fromId: invoiceId,
        toType: record.Type.CUSTOMER_PAYMENT,
        isDynamic: true,
      });
      customerPayment.setValue({
        fieldId: 'paymentmethod',
        value: paymentmethod,
        ignoreFieldChange: true,
      });
      const customerPaymentId = customerPayment.save({
        enableSourcing: true,
        ignoreMandatoryFields: true,
      });
      logGeneral('Create Payment - ok', customerPaymentId);
      return customerPaymentId;
    } catch (err) {
      logGeneral('Create Payment - fail', err);
    }
  };

  const createInvoiceRecord = (items, payload) => {
    try {
      const calculateAmount = (q, p) => (parseInt(q) * parseInt(p));
      const creator = invoiceFactory({record, log});
      creator.setInfo({
        memo: payload.info.TRX_ID,
        location: payload.info.FKStoreID.toString(), // 156
        department: DEPARTMENT_ID,
      });
      logGeneral('Create Invoice', 'Adding items...');
      items.forEach((item) => {
        creator.addItem({
          item: item.internal_id,
          quantity: item.Quantity,
          rate: item.Price,
        });
      });
      logGeneral('Create Invoice', '... Finished');
      const invoiceId = creator.save();
      logGeneral('Create Invoice - ok', invoiceId);
      return invoiceId;
    } catch (err) {
      logGeneral('Create Invoice - fail', err);
    }
  };

  /*
  ******************************************************************************
  * General
  ******************************************************************************
  */
  const _errMissingData = (invoiceId, pid) => {
    throw error.create({
      "name": "CEC_ERR_MISSING_DATA",
      "message": "Missing data: " + JSON.stringify({
        invoiceId: invoiceId,
        paymentId: pid,
      }),
      "notifyOff": true
    });
  };

  const extractName = (contents) => {
    return contents.info.TRX_ID;
  };

  const logGeneral = (title, msg) => {
    log.audit({
      title: title,
      details: msg,
    });
  };

  const sendListToApi = (processedList) => {
    const response = http.post({
      url: `http://${SERVER_IP}:3000/update-db`,
      body: JSON.stringify(processedList),
      headers: {'Content-Type': 'application/json'},
    });
    log.audit({
      title: 'Post response',
      details: response
    });
  };

  return {
    post: processDataReception,
  };
});

/*
********************************************************************************
* Utilities
********************************************************************************
*/

const setInfoUtil = (createdRecord, info) => {
  for (const field in info) {
    if (info.hasOwnProperty(field)) {
      createdRecord.setValue({
        fieldId: field,
        value: info[field],
        ignoreFieldChange: true,
      });
    }
  }
};

const addItemUtil = (createdRecord, item) => {
  createdRecord.selectNewLine({sublistId: 'item'});
  for (const field in item) {
    if (item.hasOwnProperty(field)) {
      createdRecord.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: field,
        value: item[field],
      });
    }
  }
  createdRecord.commitLine({sublistId: 'item'});
};

const saveUtil = (createdRecord) => {
  return createdRecord.save({
    enableSourcing: true,
    ignoreMandatoryFields: true,
  });
};

const customRecordFactory = ({record, log}) => {
  const defaultInfo = {};
  const customRecord = record.create({
    type: 'customrecord_cec_custom_record',
  });
  const _log = (text) => {
    log.audit({title: 'Custom Record Factory', details: text});
  };
  return {
    setInfo: (newInfo) => {
      const info = Object.assign({}, defaultInfo, newInfo);
      // _log(`setInfoOf: ${info.name}`);
      setInfoUtil(customRecord, info);
    },
    save: () => saveUtil(customRecord),
  };
};

const invoiceFactory = ({record, log}) => {
  const defaultInfo = {
    custbody_efx_pos_origen: true,
  };
  const defaultItem = {
    tax_code: TAX_CODE_ID,
  };
  const invoice = record.create({
    type: record.Type.INVOICE,
    isDynamic: true,
    defaultValues: {
      customform: '134',
      entity: CUSTOMER_ID,
      subsidiary: '10',
    },
  });
  const _log = function(text) {
    log.audit({title: 'Invoice Factory', details: text});
  };
  return {
    setInfo: (newInfo) => {
      const info = Object.assign({}, defaultInfo, newInfo);
      // _log(`setInfo: ${JSON.stringify(info)}`);
      setInfoUtil(invoice, info);
    },
    addItem: (newItem) => {
      const item = Object.assign({}, defaultItem, newItem);
      // _log(`addItem: ${JSON.stringify(item)}`);
      addItemUtil(invoice, item);
    },
    save: () => saveUtil(invoice),
  };
};


if (typeof Object.assign != 'function') {
  Object.defineProperty(Object, 'assign', {
    value: function assign(target, constArgs) {
      'use strict';
      if (target == null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }
      const to = Object(target);
      for (let index = 1; index < arguments.length; index++) {
        // eslint-disable-line
        const nextSource = arguments[index]; // eslint-disable-line
        if (nextSource != null) {
          for (const nextKey in nextSource) {
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true,
  });
}
