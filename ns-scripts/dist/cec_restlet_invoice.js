'use strict';

var CEC_FOLDER = 719;
var CHUNK_SIZE = 1000;
var SERVER_IP = '189.212.124.246';

var TAX_CODE_ID = '5';
var CUSTOMER_ID = '1588';
var DEPARTMENT_ID = '278';
var ITEM_COLUMN_SKU = 'itemid';

/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/error', 'N/file', 'N/search', 'N/http'], function (record, error, file, search, http) {
  // eslint-disable-line max-len

  var processDataReception = function processDataReception(ticketsMap) {
    logGeneral('Received list - length', ticketsMap.length);
    // const processedList = ticketsMap.map(t => processTicket(t)).filter(t => t);
    // logGeneral('Processed list', JSON.stringify(processedList));
    // sendListToApi(processedList);
  };

  var processTicket = function processTicket(jsonContents) {
    try {
      var customRecordId = createCustomRecord(jsonContents);

      // Invoice
      var items = obtainProducts(jsonContents.products);
      logGeneral('ITEMS', JSON.stringify(items.map(function (i) {
        return i.FKItemID;
      })));
      var invoiceId = createInvoiceRecord(items, jsonContents);
      var pid = createPaymentRecord(invoiceId, extractPayment(jsonContents));

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

  var obtainProducts = function obtainProducts(products) {
    var skuList = products.map(function (product) {
      return product.FKItemID;
    });

    var localInfoOfSku = productsDict(skuList);

    var productsWithAllInfo = products.map(function (product) {
      return Object.assign({}, product, localInfoOfSku[product.FKItemID]);
    }).filter(function (product) {
      return product.internal_id && product.Quantity;
    });

    return productsWithAllInfo;
  };

  var productsDict = function productsDict(skuList) {
    logGeneral('SKU List', skuList);

    // Search
    var searchOperation = search.create({
      type: search.Type.ITEM,
      filters: filtersFromSkuList(skuList),
      columns: ['itemid']
    });

    // Traverse search-data
    var itemDict = {};
    searchOperation.run().each(function (product) {
      var item = extractItem(product);
      if (!itemDict[item.sku]) {
        itemDict[item.sku] = item;
      }
      return true; // continue iterating data
    });

    return itemDict;
  };

  var filtersFromSkuList = function filtersFromSkuList(skuList) {
    var filters = [];
    for (var i = 0; i < skuList.length; ++i) {
      if (i !== 0) {
        filters.push('or');
      }
      filters.push(['itemid', search.Operator.IS, skuList[i]]);
    }
    return filters;
  };

  var extractItem = function extractItem(product) {
    return {
      internal_id: product.id,
      sku: product.getValue({ name: 'itemid' }),
      rate: product.getValue({ name: 'rate' })
    };
  };

  var extractPayment = function extractPayment(contents) {
    return contents.payment.TypeId;
  };

  /*
  ******************************************************************************
  * Custom Record
  ******************************************************************************
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

      logGeneral('Custom record - ok', customRecordId);
      return customRecordId;
    } catch (err) {
      logGeneral('Custom record - failed', err);
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

  var addInvoiceToCustomRecord = function addInvoiceToCustomRecord(customRecordId, invoiceId) {
    var editedRecordId = record.submitFields({
      type: 'customrecord_cec_custom_record',
      id: customRecordId,
      values: {
        custrecord_cec_invoice_id: invoiceId
      },
      options: {
        enableSourcing: true,
        ignoreMandatoryFields: true
      }
    });
    logGeneral('Update custom record - ok', editedRecordId);
  };

  /*
  ******************************************************************************
  * Invoice
  ******************************************************************************
  */

  var createPaymentRecord = function createPaymentRecord(invoiceId, paymentmethod) {
    try {
      var customerPayment = record.transform({
        fromType: record.Type.INVOICE,
        fromId: invoiceId,
        toType: record.Type.CUSTOMER_PAYMENT,
        isDynamic: true
      });
      customerPayment.setValue({
        fieldId: 'paymentmethod',
        value: paymentmethod,
        ignoreFieldChange: true
      });
      var customerPaymentId = customerPayment.save({
        enableSourcing: true,
        ignoreMandatoryFields: true
      });
      logGeneral('Create Payment - ok', customerPaymentId);
      return customerPaymentId;
    } catch (err) {
      logGeneral('Create Payment - fail', err);
    }
  };

  var createInvoiceRecord = function createInvoiceRecord(items, payload) {
    try {
      var calculateAmount = function calculateAmount(q, p) {
        return parseInt(q) * parseInt(p);
      };
      var creator = invoiceFactory({ record: record, log: log });
      creator.setInfo({
        memo: payload.info.TRX_ID,
        location: payload.info.FKStoreID.toString(), // 156
        department: DEPARTMENT_ID
      });
      logGeneral('Create Invoice', 'Adding items...');
      items.forEach(function (item) {
        creator.addItem({
          item: item.internal_id,
          quantity: item.Quantity,
          rate: item.Price
        });
      });
      logGeneral('Create Invoice', '... Finished');
      var invoiceId = creator.save();
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
  var _errMissingData = function _errMissingData(invoiceId, pid) {
    throw error.create({
      "name": "CEC_ERR_MISSING_DATA",
      "message": "Missing data: " + JSON.stringify({
        invoiceId: invoiceId,
        paymentId: pid
      }),
      "notifyOff": true
    });
  };

  var extractName = function extractName(contents) {
    return contents.info.TRX_ID;
  };

  var logGeneral = function logGeneral(title, msg) {
    log.audit({
      title: title,
      details: msg
    });
  };

  var sendListToApi = function sendListToApi(processedList) {
    var response = http.post({
      url: 'http://' + SERVER_IP + '/update-db',
      body: JSON.stringify(processedList),
      headers: { 'Content-Type': 'application/json' }
    });
    log.audit({
      title: 'Post response',
      details: response
    });
  };

  return {
    post: processDataReception
  };
});

/*
********************************************************************************
* Utilities
********************************************************************************
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
      // _log(`setInfoOf: ${info.name}`);
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
    custbody_efx_pos_origen: true
  };
  var defaultItem = {
    tax_code: TAX_CODE_ID
  };
  var invoice = record.create({
    type: record.Type.INVOICE,
    isDynamic: true,
    defaultValues: {
      customform: '134',
      entity: CUSTOMER_ID,
      subsidiary: '10'
    }
  });
  var _log = function _log(text) {
    log.audit({ title: 'Invoice Factory', details: text });
  };
  return {
    setInfo: function setInfo(newInfo) {
      var info = Object.assign({}, defaultInfo, newInfo);
      // _log(`setInfo: ${JSON.stringify(info)}`);
      setInfoUtil(invoice, info);
    },
    addItem: function addItem(newItem) {
      var item = Object.assign({}, defaultItem, newItem);
      // _log(`addItem: ${JSON.stringify(item)}`);
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