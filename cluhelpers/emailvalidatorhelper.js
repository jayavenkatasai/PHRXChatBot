// emailValidatorHelper.js
const axios = require('axios');


async function isEmailRegistered(email) {
    // Replace with your actual API endpoint and any required headers or parameters
    const apiUrl = `https://phrx-api.azurewebsites.net/api/User/CheckUserExists`; // Example API endpoint

    try {
        const response = await axios.post(apiUrl, { email });

        // Assuming the API returns a JSON object with a boolean 'exists' field
        // Adjust according to your API's actual response structure
        if (response.data && typeof response.data.exists === 'boolean') {
            return response.data.exists;
        }

        // If the response structure is different, handle accordingly
        console.error('Unexpected API response structure:', response.data);
        return false;
    } catch (error) {
        console.error('Error verifying email existence:', error.response ? error.response.data : error.message);
        // Depending on your requirements, you might want to treat API errors as non-existent emails or handle them differently
        throw new Error('Unable to verify email at this time. Please try again later.');
    }
}

module.exports = { isEmailRegistered };
