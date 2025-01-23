// cluHelper.js
const axios = require('axios');
//BPPd3f0sSCmrK6IhhriIQ3fybagjsYdbWLfPmIAfuKiQzDWJan5gJQQJ99BAACYeBjFXJ3w3AAAaACOGsEAy
async function getCluPrediction(query) {
    // Values from your environment (or your configuration)
    const predictionUrl ="https://chatbot-phrx-ai-services.cognitiveservices.azure.com/language/:analyze-conversations?api-version=2022-10-01-preview" //process.env.CLU_PREDICTION_URL; // e.g., "https://chatbot-phrx-ai-services.cognitiveservices.azure.com/language/:analyze-conversations?api-version=2022-10-01-preview"
    const subscriptionKey ="BPPd3f0sSCmrK6IhhriIQ3fybagjsYdbWLfPmIAfuKiQzDWJan5gJQQJ99BAACYeBjFXJ3w3AAAaACOGsEAy"; // Your Ocp-Apim-Subscription-Key
    const projectName = "phrx-chatbot-luis";         // e.g., "phrx-chatbot-luis"
    const deploymentName ="testdeployement" ;     // e.g., "testdeployement"
    const language = process.env.CLU_LANGUAGE || "en";          // language of the query

    // Prepare the request body according to the CLU API specification
    const requestBody = {
        kind: "Conversation",
        analysisInput: {
            conversationItem: {
                id: "USER1",           // Unique identifier for this conversation or participant
                text: query,
                modality: "text",
                language: language,
                participantId: "USER1"   // You can use the same id as the conversation item if no other identifier is available
            }
        },
        parameters: {
            projectName: projectName,
            verbose: true,
            deploymentName: deploymentName,
            stringIndexType: "TextElement_V8"
        }
    };

    try {
        const response = await axios.post(predictionUrl, requestBody, {
            headers: {
                "Ocp-Apim-Subscription-Key": subscriptionKey,
                "Apim-Request-Id": "4ffcac1c-b2fc-48ba-bd6d-b69d9942995a",
                "Content-Type": "application/json"
            }
        });
        return response.data; // Return the JSON prediction
    } catch (error) {
        console.error("Error calling CLU prediction endpoint:", error.response ? error.response.data : error);
        throw error;
    }
}

module.exports = { getCluPrediction };
