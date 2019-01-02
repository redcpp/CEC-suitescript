"use strict";

/**
 * @NApiVersion 2.0
 * @NScriptType MassUpdateScript
 * @NModuleScope SameAccount
 */
define(["N/record"], function (r) {
  var deleteRecord = function deleteRecord(ctx) {
    r.delete({
      type: ctx.type,
      id: ctx.id
    });
  };

  return {
    each: deleteRecord
  };
});