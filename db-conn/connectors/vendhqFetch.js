const fetch = require('node-fetch');

const BASE_URL = 'https://nyscollection.vendhq.com/api/2.0';
const LEGACY_BASE_URL = 'https://nyscollection.vendhq.com/api';
const GET_OPTIONS = {
  method: 'GET',
  headers: {
    Authorization: 'Bearer 1WC27vkCG2kSKhPvlhszfE_DbQBH7A1iwaY3sLk4',
  },
};
const POST_OPTIONS = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer 1WC27vkCG2kSKhPvlhszfE_DbQBH7A1iwaY3sLk4',
  },
};

const getVend = (url) => {
  return new Promise((resolve, reject) => {
    fetch(url, GET_OPTIONS)
      .then((response) => response.json())
      .then((data) => resolve(data))
      .catch((error) => reject(error));
  });
};

const postVend = (url, postBody) => {
  return new Promise((resolve, reject) => {
    fetch(url, Object.assign(POST_OPTIONS, {body: JSON.stringify(postBody)}))
      .then((response) => response.json())
      .then((data) => resolve(data))
      .catch((error) => reject(error));
  });
};

const fetchProduct = async (productId) => {
  const url = `${BASE_URL}/products/${productId}`;
  const {data} = await getVend(url);
  return data;
};

const fetchSale = async (saleId) => {
  const url = `${BASE_URL}/sales/${saleId}`;
  const {data} = await getVend(url);
  return data;
};

const listProducts = async () => {
  const url = `${BASE_URL}/products`;
  const {data} = await getVend(url);
  return data;
};

const listConsignments = async () => {
  const url = `${BASE_URL}/consignments`;
  const {data} = await getVend(url);
  return data;
};

const singleConsignment = async (consignmentId) => {
  const url = `${BASE_URL}/consignments/${consignmentId}`;
  const {data} = await getVend(url);
  return data;
};

const adjustInventoryCount = async (outletId, productId) => {
  const url = `${LEGACY_BASE_URL}/products`;
  const body = {
    id: productId,
    inventory: [{
      outlet_id: outletId,
      count: 4,
    }],
  };
  const res = await postVend(url, body);
  console.log(res);
  return res.data;
};

const main = async () => {
  const almacenDefectuosos = '31eb0866-e7ad-11e5-e556-146009cea84f';
  const dummyProduct = '3e691360-9ba3-45ef-6a2e-308c868e773b'; // eslint-disable-line
  const data = await adjustInventoryCount(almacenDefectuosos, dummyProduct);
  console.log(data);
};
main();

module.exports = {
  fetchSale: fetchSale,
  fetchProduct: fetchProduct,
  listProducts: listProducts,
  listConsignments: listConsignments,
  singleConsignment: singleConsignment,
  adjustInventoryCount: adjustInventoryCount,
};
