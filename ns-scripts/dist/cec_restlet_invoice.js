'use strict';

var CHUNK_SIZE = 1000;
var CEC_FOLDER = 1864;
var CUSTOMER_ID = 1588;
var TAX_CODE_ID = 5;
var ITEM_COLUMN_SKU = 'itemid';

/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/error', 'N/file', 'N/search', 'N/http'], function (record, error, file, search, http) {
  // eslint-disable-line max-len
  var processDataReception = function processDataReception(ticketsMap) {
    var processedList = ticketsMap.map(function (t) {
      return processTicket(t);
    });
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

  var processTicket = function processTicket(jsonContents) {
    try {
      logReception(jsonContents);
      // const customRecordId = createCustomRecord(jsonContents);

      var items = obtainProducts(jsonContents.products);
      logGeneral('ITEMS', JSON.stringify(items));
      var invoiceId = createInvoiceRecord(items, jsonContents);

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

  var obtainProducts = function obtainProducts(products) {
    var skuList = products.map(function (product) {
      return product.FKItemID;
    });
    var localInfoOfSku = searchProducts(skuList);
    var productsWithAllInfo = products.map(function (product) {
      return Object.assign({}, product, localInfoOfSku[product.sku]);
    }).filter(function (product) {
      return product.id;
    });
    return productsWithAllInfo;
  };

  var searchProducts = function searchProducts(skuList) {
    logSkuList(skuList);

    var filters = [];
    var columns = [{ name: 'type' }, { name: ITEM_COLUMN_SKU }];
    var searchOperation = search.create({
      type: search.Type.ITEM,
      filters: filters,
      columns: columns
    });

    var productDict = traverseSearchData(searchOperation);
    return productDict;
  };

  var traverseSearchData = function traverseSearchData(searchOperation) {
    var dict = {};
    var startIndex = 0;
    var endIndex = CHUNK_SIZE;
    var count = CHUNK_SIZE;
    var resultSet = searchOperation.run();

    while (count == CHUNK_SIZE) {
      var results = resultSet.getRange(startIndex, endIndex);
      // process products
      results.map(extractProduct).forEach(function (product) {
        logGeneral('Product', JSON.stringify(product));
        if (!dict[product.sku]) {
          dict[product.sku] = product;
        }
      });
      // continue loop
      startIndex = endIndex;
      endIndex += CHUNK_SIZE;
      count = results.length;
    }

    return dict;
  };

  var extractProduct = function extractProduct(product) {
    return {
      id: parseInt(product.id),
      type: product.getValue({ name: 'type' }),
      sku: product.getValue({ name: ITEM_COLUMN_SKU })
    };
  };

  var createInvoiceRecord = function createInvoiceRecord(items, payload) {
    try {
      var creator = invoiceFactory({ record: record, log: log });
      creator.setInfo({
        subsidiary: payload.Subsidiary,
        location: payload.FKStoreID,
        externalid: payload.TRX_ID
      });
      items.forEach(function (item) {
        creator.addItem({
          item: item.id,
          quantity: item.quantity
        });
      });
      var invoiceId = creator.save();
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

  var createCustomRecord = function createCustomRecord(jsonContents) {
    try {
      var fileId = createFile(jsonContents);

      var creator = customRecordFactory({ record: record, log: log });
      creator.setInfo({
        name: extractName(jsonContents),
        custrecord_cec_json: JSON.stringify(jsonContents),
        custrecord_cec_file: fileId
      });
      var customRecordId = creator.save();

      logCustomRecordSuccess(customRecordId);
      return customRecordId;
    } catch (error) {
      logCustomRecordError(error);
    }
  };

  var createFile = function createFile(fileContents) {
    var newFile = file.create({
      name: extractName(fileContents) + '.json',
      fileType: file.Type.JSON,
      contents: JSON.stringify(fileContents)
    });
    newFile.folder = CEC_FOLDER;
    return newFile.save();
  };
  var extractName = function extractName(contents) {
    return contents.info.TRX_ID;
  };

  var updateCustomRecord = function updateCustomRecord(customRecordId, invoiceId) {
    var editedRecordId = record.submitFields({
      type: 'customrecord_cec_custom_record',
      id: customRecordId,
      values: {
        custrecord_cec_invoice_id: invoiceId
      },
      options: {
        enableSourcing: true,
        ignoreMandatoryFields: false
      }
    });
    logUpdateSuccess(editedRecordId);
  };

  /*
  **********************************************************************************
  * Loggers
  **********************************************************************************
  */

  var logReception = function logReception(contents) {
    log.audit({
      title: 'Restlet - received contents',
      details: contents
    });
  };
  var logError = function logError(error) {
    log.audit({
      title: 'Restlet - fail',
      details: error
    });
  };
  var logCustomRecordSuccess = function logCustomRecordSuccess(customRecordId) {
    log.audit({
      title: 'Custom record - success',
      details: 'Custom record id: ' + customRecordId
    });
  };
  var logCustomRecordError = function logCustomRecordError(error) {
    log.audit({
      title: 'Custom record - fail',
      details: error
    });
  };
  var logSkuList = function logSkuList(skuList) {
    log.audit({
      title: 'Sku List',
      details: skuList
    });
  };
  var logInvoiceSuccess = function logInvoiceSuccess(invoiceId) {
    log.audit({
      title: 'Invoice - success',
      details: 'Invoice id: ' + invoiceId
    });
  };
  var logInvoiceError = function logInvoiceError(error) {
    log.audit({
      title: 'Invoice - fail',
      details: error
    });
  };
  var logUpdateSuccess = function logUpdateSuccess(customRecordId) {
    log.audit({
      title: 'Update - success',
      details: 'Custom record id: ' + customRecordId
    });
  };
  var logGeneral = function logGeneral(title, msg) {
    log.audit({
      title: title,
      details: msg
    });
  };

  return {
    post: processDataReception
  };
});

/*
**********************************************************************************
* Utilities
**********************************************************************************
*/
var setInfoUtil = function setInfoUtil(createdRecord, info) {
  for (var field in info) {
    if (info.hasOwnProperty(field)) {
      createdRecord.setValue({
        fieldId: field,
        value: info[field],
        ignoreFieldChange: true
      });
    }
  }
};

var addItemUtil = function addItemUtil(createdRecord, item) {
  createdRecord.selectNewLine({ sublistId: 'item' });
  for (var field in item) {
    if (item.hasOwnProperty(field)) {
      createdRecord.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: field,
        value: item[field]
      });
    }
  }
  createdRecord.commitLine({ sublistId: 'item' });
};

var saveUtil = function saveUtil(createdRecord) {
  return createdRecord.save({
    enableSourcing: true,
    ignoreMandatoryFields: true
  });
};

var customRecordFactory = function customRecordFactory(_ref) {
  var record = _ref.record,
      log = _ref.log;

  var defaultInfo = {};
  var customRecord = record.create({
    type: 'customrecord_cec_custom_record'
  });
  var _log = function _log(text) {
    log.audit({ title: 'Custom Record Factory', details: text });
  };
  return {
    setInfo: function setInfo(newInfo) {
      var info = Object.assign({}, defaultInfo, newInfo);
      _log('setInfoOf: ' + info.name);
      setInfoUtil(customRecord, info);
    },
    save: function save() {
      return saveUtil(customRecord);
    }
  };
};

var invoiceFactory = function invoiceFactory(_ref2) {
  var record = _ref2.record,
      log = _ref2.log;

  var defaultInfo = {
    client: CUSTOMER_ID,
    custbody_efx_pos_origen: true,
    memo: 'go_cec_invoice_test',
    approvalstatus: 1
  };
  var defaultItem = {
    tax_code: TAX_CODE_ID
  };
  var invoice = record.create({
    type: record.Type.INVOICE,
    isDynamic: true,
    defaultValues: {
      entity: defaultInfo.client
    }
  });
  var _log = function _log(text) {
    log.audit({ title: 'Invoice Factory', details: text });
  };
  return {
    setInfo: function setInfo(newInfo) {
      var info = Object.assign({}, defaultInfo, newInfo);
      _log('setInfo: ' + JSON.stringify(info));
      setInfoUtil(invoice, info);
    },
    addItem: function addItem(newItem) {
      var item = Object.assign({}, defaultItem, newItem);
      _log('addItem: ' + JSON.stringify(item));
      addItemUtil(invoice, item);
    },
    save: function save() {
      return saveUtil(invoice);
    }
  };
};

if (typeof Object.assign != 'function') {
  Object.defineProperty(Object, 'assign', {
    value: function assign(target, constArgs) {
      'use strict';

      if (target == null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }
      var to = Object(target);
      for (var index = 1; index < arguments.length; index++) {
        // eslint-disable-line
        var nextSource = arguments[index]; // eslint-disable-line
        if (nextSource != null) {
          for (var nextKey in nextSource) {
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true
  });
}