const { ActivityHandler, MessageFactory } = require('botbuilder');
const { KnowOrderStatusDialog } = require('./componentDialogs/makeReservationDialog');

// Import or require your LUIS/CLU client (or custom module) and QnA Maker client.
// For this example we will assume you have created a helper file `luisRecognizer.js` and `qnaMakerClient.js`.
const { LuisRecognizer } = require('botbuilder-ai');

const { QnAMaker } = require('botbuilder-ai');
const {getCluPrediction} = require('./cluhelpers/cluhelper');
class EchoBot extends ActivityHandler {
    constructor(conversationState, userState, luisApplication, luisPredictionOptions, qnaMakerOptions) {
        super();

        this.conversationState = conversationState;
        this.userState = userState;
        this.dialogState = conversationState.createProperty('DialogState');

        // Instantiate your dialogs.
        this.KnowOrderStatusDialog = new KnowOrderStatusDialog(this.conversationState, this.userState);

        // Suggested actions state
        this.previousIntent = this.conversationState.createProperty('previousIntent');
        this.conversationData = this.conversationState.createProperty('conservationData');

        // Create a LUIS recognizer instance.
      //  this.luisRecognizer = new CLURecognizer(luisApplication, luisPredictionOptions, true);

        // Create a QnA Maker instance.
        this.qnaMaker = new QnAMaker(qnaMakerOptions);

        this.onMessage(async (context, next) => {
            await this.dispatchToIntentAsync(context);
            await next();
        });

        this.onDialog(async (context, next) => {
            await this.conversationState.saveChanges(context, false);
            await this.userState.saveChanges(context, false);
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            await this.sendWelcomeMessage(context);
            await next();
        });
    }

    async sendWelcomeMessage(turnContext) {
        const { activity } = turnContext;
        for (let cnt in activity.membersAdded) {
            if (activity.membersAdded[cnt].id !== activity.recipient.id) {
                const welcomeMessage = `Welcome to Phrx chat, ${activity.membersAdded[cnt].name}`;
                await turnContext.sendActivity(welcomeMessage);
                await this.sendSuggestedActions(turnContext);
            }
        }
    }

    async sendSuggestedActions(turnContext) {
        const reply = MessageFactory.suggestedActions(
            ['I want to know my order status', 'Ask a FAQ', 'Talk To Agent'],
            'What would you like to do today?'
        );
        await turnContext.sendActivity(reply);
    }

    // Call LUIS to get the top intent.
    async extractIntent(context) {
        const luisResult = await this.luisRecognizer.recognize(context);
        // The top intent property is a string e.g., "OrderStatus" or "FAQ"
        const topIntent = LuisRecognizer.topIntent(luisResult, 'None', 0.5);
        return { topIntent, luisResult };
    }

    async dispatchToIntentAsync(context) {
        // We call our LUIS recognizer to understand the intent.
        // Call the CLU prediction endpoint using our helper
        console.log(context)
        const cluResult = await getCluPrediction(context.activity.text);
        console.log("CLU Prediction Result:", JSON.stringify(cluResult, null, 2));

        // Extract the top intent from the prediction result
        const topIntent = cluResult?.result?.prediction?. topIntent || "None";
        console.log(`Top Intent: ${topIntent}`); //OrderStatus

        // Depending on the detected intent, call the appropriate flow.
        switch (topIntent) {
            case 'OrderStatus':
                console.log("Detected OrderStatus intent.");
                await this.conversationData.set(context, { endDialog: false });
                await this.KnowOrderStatusDialog.run(context, this.dialogState);
                // When the dialog finishes, re-show suggestions.
                if (await this.KnowOrderStatusDialog.isDialogComplete()) {
                    await this.sendSuggestedActions(context);
                }
                break;
            case 'FAQ':
                console.log("Detected FAQ intent.");
                // Forward the user’s question to QnA Maker
                const qnaResults = await this.qnaMaker.getAnswers(context);
                if (qnaResults && qnaResults.length > 0) {
                    await context.sendActivity(qnaResults[0].answer);
                } else {
                    await context.sendActivity("I'm sorry, I don't have an answer to that question.");
                }
                await this.sendSuggestedActions(context);
                break;
            case 'AgentRequest':
                console.log("Detected AgentRequest intent.");
                // Send a random agent info text.
                await this.sendAgentInfo(context);
                break;
            case 'None':
            default:
                // If no intent is recognized, or it is None, fallback to a default welcome message.
                await context.sendActivity("I'm sorry, I didn't understand that. Let me help you. Choose one of the options below.");
                await this.sendSuggestedActions(context);
                break;
        }
    }

    // Send a random phrx chat info text.
    async sendPhrxChatInfo(context) {
        const phrxTexts = [
            "Phrx chat is a smart assistant designed to help you with your queries.",
            "With Phrx chat, you can quickly get information about orders and services.",
            "Phrx chat connects you with live agents if you need personal assistance."
        ];
        const randomText = phrxTexts[Math.floor(Math.random() * phrxTexts.length)];
        await context.sendActivity(randomText);
        await this.sendSuggestedActions(context);
    }

    // Send a random agent info text.
    async sendAgentInfo(context) {
        const agentTexts = [
            "An agent will be with you shortly to assist with your needs.",
            "Connecting you to a live agent now. Please hold on.",
            "Our support agent is on the way to help you out!"
        ];
        const randomText = agentTexts[Math.floor(Math.random() * agentTexts.length)];
        await context.sendActivity(randomText);
        await this.sendSuggestedActions(context);
    }
}

module.exports.EchoBot = EchoBot;
