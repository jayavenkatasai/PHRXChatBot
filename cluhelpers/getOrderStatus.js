// emailValidatorHelper.js
const axios = require('axios');

/**
 * Retrieves the order status for the given email.
 * @param {string} email - The user's email address.
 * @returns {Promise<Array|boolean>} - Returns an array of orders if present, false otherwise.
 */
async function getorderStatus(email) {
    // Replace with your actual API endpoint and any required headers or parameters
    const apiUrl = `https://phrx-api.azurewebsites.net/api/shipmentdetails/GetOrderStatuesChat?Email=${email}`; // Example API endpoint
    console.log("getting order status url")
    try {
        const response = await axios.post(apiUrl); // Changed from POST to GET as per the API URL
        console.log("getting order status response: " + JSON.stringify(response.data))
        // Assuming the API returns an array of orders
        if (Array.isArray(response.data) && response.data.length > 0) {
            return response.data;
        }

        // If no orders are found
        return false;
    } catch (error) {
        console.error('Error retrieving order status:', error.response ? error.response.data : error.message);
        throw new Error('Unable to retrieve order status at this time. Please try again later.');
    }
}
module.exports = { getorderStatus };