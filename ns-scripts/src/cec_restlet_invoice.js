const CHUNK_SIZE = 1000;
const CEC_FOLDER = 1864;
const CUSTOMER_ID = 1588;
const TAX_CODE_ID = 5;
const ITEM_COLUMN_SKU = 'itemid';

/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/error', 'N/file', 'N/search', 'N/http'], (record, error, file, search, http) => { // eslint-disable-line max-len
  const processDataReception = (ticketsMap) => {
    const processedList = ticketsMap.map(t => processTicket(t));
    logGeneral('Processed list', JSON.stringify(processedList));

    // const response = http.post({
    //   url: 'http://085c9c07.ngrok.io/update-db',
    //   body: JSON.stringify(processedList),
    //   headers: {'Content-Type': 'application/json'},
    // });

    // log.audit({
    //   title: 'Post response',
    //   details: response
    // });
  };

  const processTicket = (jsonContents) => {
    try {
      logReception(jsonContents);
      // const customRecordId = createCustomRecord(jsonContents);

      const items = obtainProducts(jsonContents.products);
      logGeneral('ITEMS', JSON.stringify(items));
      const invoiceId = createInvoiceRecord(items, jsonContents);

      // updateCustomRecord(customRecordId, invoiceId);
      return extractName(jsonContents);
    } catch (error) {
      logError(error);
    }
  };

  /*
  **********************************************************************************
  * Invoice
  **********************************************************************************
  */

  const obtainProducts = (products) => {
    const skuList = products.map(function(product) {
      return product.FKItemID;
    });
    const localInfoOfSku = searchProducts(skuList);
    const productsWithAllInfo = products
      .map((product) => Object.assign({}, product, localInfoOfSku[product.sku]))
      .filter((product) => product.id);
    return productsWithAllInfo;
  };

  const searchProducts = (skuList) => {
    logSkuList(skuList);

    const filters = [
    ];
    const columns = [
      {name: 'type'},
      {name: ITEM_COLUMN_SKU},
    ];
    const searchOperation = search.create({
      type: search.Type.ITEM,
      filters: filters,
      columns: columns,
    });

    const productDict = traverseSearchData(searchOperation);
    return productDict;
  };

  const traverseSearchData = (searchOperation) => {
    let dict = {};
    let startIndex = 0;
    let endIndex = CHUNK_SIZE;
    let count = CHUNK_SIZE;
    let resultSet = searchOperation.run();

    while (count == CHUNK_SIZE) {
        var results = resultSet.getRange(startIndex, endIndex);
        // process products
        results
          .map(extractProduct)
          .forEach((product) => {
            logGeneral('Product', JSON.stringify(product));
            if (!dict[product.sku]) {
              dict[product.sku] = product;
            }
          })
        // continue loop
        startIndex = endIndex;
        endIndex += CHUNK_SIZE;
        count = results.length;
    }

    return dict;
  };

  const extractProduct = (product) => {
    return {
      id: parseInt(product.id),
      type: product.getValue({name: 'type'}),
      sku: product.getValue({name: ITEM_COLUMN_SKU}),
    };
  };

  const createInvoiceRecord = (items, payload) => {
    try {
      const creator = invoiceFactory({record, log});
      creator.setInfo({
        subsidiary: payload.Subsidiary,
        location: payload.FKStoreID,
        externalid: payload.TRX_ID,
      });
      items.forEach((item) => {
        creator.addItem({
          item: item.id,
          quantity: item.quantity,
        });
      });
      const invoiceId = creator.save();
      logInvoiceSuccess(invoiceId);
      return invoiceId;
    } catch (error) {
      logInvoiceError(error);
    }
  };

  /*
  **********************************************************************************
  * Custom Record
  **********************************************************************************
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

      logCustomRecordSuccess(customRecordId);
      return customRecordId;
    } catch (error) {
      logCustomRecordError(error);
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
  const extractName = (contents) => {
    return contents.info.TRX_ID;
  };

  const updateCustomRecord = (customRecordId, invoiceId) => {
    const editedRecordId = record.submitFields({
      type: 'customrecord_cec_custom_record',
      id: customRecordId,
      values: {
        custrecord_cec_invoice_id: invoiceId,
      },
      options: {
        enableSourcing: true,
        ignoreMandatoryFields: false,
      },
    });
    logUpdateSuccess(editedRecordId);
  };

  /*
  **********************************************************************************
  * Loggers
  **********************************************************************************
  */

  const logReception = (contents) => {
    log.audit({
      title: 'Restlet - received contents',
      details: contents,
    });
  };
  const logError = (error) => {
    log.audit({
      title: 'Restlet - fail',
      details: error,
    });
  };
  const logCustomRecordSuccess = (customRecordId) => {
    log.audit({
      title: 'Custom record - success',
      details: 'Custom record id: ' + customRecordId,
    });
  };
  const logCustomRecordError = (error) => {
    log.audit({
      title: 'Custom record - fail',
      details: error,
    });
  };
  const logSkuList = (skuList) => {
    log.audit({
      title: 'Sku List',
      details: skuList,
    });
  };
  const logInvoiceSuccess = (invoiceId) => {
    log.audit({
      title: 'Invoice - success',
      details: 'Invoice id: ' + invoiceId,
    });
  };
  const logInvoiceError = (error) => {
    log.audit({
      title: 'Invoice - fail',
      details: error,
    });
  };
  const logUpdateSuccess = (customRecordId) => {
    log.audit({
      title: 'Update - success',
      details: 'Custom record id: ' + customRecordId,
    });
  };
  const logGeneral = (title, msg) => {
    log.audit({
      title: title,
      details: msg,
    });
  };

  return {
    post: processDataReception,
  };
});

/*
**********************************************************************************
* Utilities
**********************************************************************************
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
  const _log = function(text) {
    log.audit({title: 'Custom Record Factory', details: text});
  };
  return {
    setInfo: (newInfo) => {
      const info = Object.assign({}, defaultInfo, newInfo);
      _log(`setInfoOf: ${info.name}`);
      setInfoUtil(customRecord, info);
    },
    save: () => saveUtil(customRecord),
  };
};

const invoiceFactory = ({record, log}) => {
  const defaultInfo = {
    client: CUSTOMER_ID,
    custbody_efx_pos_origen: true,
    memo: 'go_cec_invoice_test',
    approvalstatus: 1,
  };
  const defaultItem = {
    tax_code: TAX_CODE_ID,
  };
  const invoice = record.create({
    type: record.Type.INVOICE,
    isDynamic: true,
    defaultValues: {
      entity: defaultInfo.client,
    },
  });
  const _log = function(text) {
    log.audit({title: 'Invoice Factory', details: text});
  };
  return {
    setInfo: (newInfo) => {
      const info = Object.assign({}, defaultInfo, newInfo);
      _log(`setInfo: ${JSON.stringify(info)}`);
      setInfoUtil(invoice, info);
    },
    addItem: (newItem) => {
      const item = Object.assign({}, defaultItem, newItem);
      _log(`addItem: ${JSON.stringify(item)}`);
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
