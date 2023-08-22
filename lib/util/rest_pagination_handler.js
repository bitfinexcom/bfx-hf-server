/**
 *  The function abstracts away the complexities of handling paginated API responses,
 *  allowing you to easily retrieve and collect all the data from paginated endpoints.
 *
 * @param {Function} requestCallback -  A method provided by the RESTv2 class that takes a payload object
 *                                    and returns a Promise resolving to the results of a REST API request.
 * @param {Object} [params={}] - An optional object containing parameters to customize the API requests.

 * @returns {Array} An array containing all the fetched items from paginated API responses.
 */

const restPaginationHandler = async (requestCallback, params = {}) => {
  let page = 1
  let collection = []

  while (true) {
    const payload = { page, limit: 50, ...params }
    const result = await requestCallback(payload)
    if (!result || !result.items) break

    const { items } = result
    collection = collection.concat(items)

    if (items.length < 100) break

    page += 1
  }

  return collection
}

module.exports = restPaginationHandler
