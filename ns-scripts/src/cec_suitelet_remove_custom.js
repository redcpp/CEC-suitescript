/**
 * @NApiVersion 2.0
 * @NScriptType MassUpdateScript
 * @NModuleScope SameAccount
 */
define(["N/record"], function (r) {
    function deleteRecord(context) {
        r.delete({
            type: context.type,
            id: context.id
        });
    }

    return {
        each: deleteRecord
    }
});