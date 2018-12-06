module.exports = async (data) => {
  try {
    console.log(data);
    return {ok: 'Successful data reception'};
  } catch (err) {
    console.error(err);
    return err;
  }
};
