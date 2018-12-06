const nsrestlet = require('nsrestlet');

// For OAuth (we can do NLAuth too, see documentation):
const accountSettings = {
  accountId: '4996504_SB1',
  tokenKey: '49f0e3701569711429fcbc36005b30ad8a7f4a6a9a19326af92314e5c6cfc1bb',
  tokenSecret: 'a3fb153e4a37b317cad6f6e4393cccc16708f8f5f7493f87b0d44d80dc3e4480',
  consumerKey: 'edbdfa4048614a7ec9a6fc542f13d1c87093cc8bc4e8bdc773cc04b65f622351',
  consumerSecret: '4226973f9f51d83217a64f0d24189578706949aedf81ca758556d8f81bf8308d',
};
const urlSettings = {
  url: 'https://4996504-sb1.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=716&deploy=1',
};

// create a link
const connection = nsrestlet.createLink(accountSettings, urlSettings);

const post = (data) => {
  return new Promise((resolve, reject) => {
    connection
      .post(data)
      .then((body) => {
        resolve(body);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

module.exports = {
  post: post,
};
