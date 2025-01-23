// qnaMakerHelper.js
const axios = require('axios');

async function getQnAAnswer(question) {
   
    const endpointKey = process.env.QNA_ENDPOINT_KEY; // Your QnA Maker Endpoint Key


    const url = `https://chatbot-phrx-ai-services.cognitiveservices.azure.com/language/:query-knowledgebases?projectName=chatbot-phrx-question-answers&api-version=2021-10-01&deploymentName=production`;

    const requestBody = {
        question: question,
        top: 3, // Number of top answers to retrieve
        scoreThreshold: 0.3, // Minimum confidence score
        includeUnstructuredSources: true,
        answerSpanRequest: {
            enable: true,
            topAnswersWithSpan: 1,
            confidenceScoreThreshold: 0.3
        },
        filters: {
            metadataFilter: {
                logicalOperation: "AND",
                metadata: [
                    // Add metadata filters if necessary
                    // Example:
                    // { key: "category", value: "billing" }
                ]
            }
        }
    };

    try {
        const response = await axios.post(url, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                "Ocp-Apim-Subscription-Key": "BPPd3f0sSCmrK6IhhriIQ3fybagjsYdbWLfPmIAfuKiQzDWJan5gJQQJ99BAACYeBjFXJ3w3AAAaACOGsEAy",
            }
        });

        if (response.data && response.data.answers) {
            console.log(response.data);
            return response.data.answers;
        } else {
            console.error('Unexpected QnA Maker response structure:', response.data);
            return [];
        }
    } catch (error) {
        console.error('Error querying QnA Maker:', error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = { getQnAAnswer };
