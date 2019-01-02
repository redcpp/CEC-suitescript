const nsrestlet = require('nsrestlet');

// For OAuth (we can do NLAuth too, see documentation):
// https://github.com/MichaelEPope/nsrestlet/blob/HEAD/tutorial.md
const accountSettings = {
  accountId: '4996504',
  tokenKey: 'c006559637ce91675768fe2a57873fbfd26ecb03373fd1cbbdc6711a457fe913',
  tokenSecret: 'f4ef17b7dcf654aefd19abf0eb033da8a0af1e70d1dbde735c6128d07d780d0a',
  consumerKey: 'cb211f7208d3d3466b3d6d7ae08a752f3d1e3f03478417b91a1ea6ed30385f35',
  consumerSecret: '98d7cd914c7a5352066f1faa706f2e101a1919509b9015d64554fe006492e9b3',
};
const urlSettings = {
  url: 'https://4996504.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=856&deploy=1',
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
