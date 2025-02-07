// utils/agentAvailability.js

/**
 * Checks if agents are currently available based on predefined working hours.
 * For simplicity, let's assume agents work from 9 AM to 5 PM local time.
 * Adjust the logic as per your requirements.
 * 
 * @returns {boolean} - Returns true if agents are available, false otherwise.
 */
function getAgentAvailability() {
    const now = new Date();
    const currentHour = now.getHours();

    const openingHour = 12; // 9 AM
    const closingHour = 17; // 5 PM

    return currentHour >= openingHour && currentHour < closingHour;
}

module.exports = { getAgentAvailability };
