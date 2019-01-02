/**
 * @NApiVersion 2.0
 * @NScriptType MassUpdateScript
 * @NModuleScope SameAccount
 */
define(["N/record"], (r) => {
  const deleteRecord = (ctx) => {
    r.delete({
      type: ctx.type,
      id: ctx.id
    });
  };

  return {
    each: deleteRecord
  }
});