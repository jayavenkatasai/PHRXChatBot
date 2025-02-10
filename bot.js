// bot.js
const { ActivityHandler, MessageFactory } = require('botbuilder');
const { KnowOrderStatusDialog } = require('./componentDialogs/makeReservationDialog');
const { TalkToAgentDialog } = require('./componentDialogs/TalkToAgentDialog'); // Import the new dialog
const { LuisRecognizer } = require('botbuilder-ai');
const { getCluPrediction } = require('./cluhelpers/cluhelper');
const { getQnAAnswer } = require('./cluhelpers/qnamakerhelper'); 
const { ConfirmPrompt, ChoicePrompt,DateTimePrompt,NumberPrompt,TextPrompt,DialogSet,DialogTurnStatus } = require('botbuilder-dialogs');

class EchoBot extends ActivityHandler {
    constructor(conversationState, userState, luisApplication, luisPredictionOptions, qnaMakerOptions) {
        super();

        this.conversationState = conversationState;
        this.userState = userState;
        this.dialogState = conversationState.createProperty('DialogState');

        // Instantiate your dialogs.s
        this.KnowOrderStatusDialog = new KnowOrderStatusDialog(this.conversationState, this.userState);
       this.TalkToAgentDialog = new TalkToAgentDialog(this.conversationState, this.userState); // Instantiate the new dialog
        // Suggested actions state
        this.previousIntent = this.conversationState.createProperty('previousIntent');
        this.conversationData = this.conversationState.createProperty('conservationData');

        // Create a CLU recognizer instance.
       // this.cluRecognizer = new LuisRecognizer(luisApplication, luisPredictionOptions, true);

        // Create a QnA Maker instance.
        // Assuming you're using direct API calls via helper, you may not need this.
        // If using QnA Maker SDK, initialize it here.

        this.onMessage(async (context, next) => {
            // Create a DialogSet and add the dialog.
            const dialogSet = new DialogSet(this.dialogState);
            dialogSet.add(this.KnowOrderStatusDialog);
            dialogSet.add(this.TalkToAgentDialog);
            const dialogContext = await dialogSet.createContext(context);
            const results = await dialogContext.continueDialog();

            if (results.status === DialogTurnStatus.empty) {
                // No active dialog, proceed with intent recognition
                await this.dispatchToIntentAsync(context);
            }
            // else, the dialog is handling the response

            await next();
        });
        this.onConversationUpdate(async (context, next) => {
            await this.sendWelcomeMessage(context);
            await next();
        });

        this.onDialog(async (context, next) => {
            await this.conversationState.saveChanges(context, false);
            await this.userState.saveChanges(context, false);
            await next();
        });

        // this.onMembersAdded(async (context, next) => {
        //     await this.sendWelcomeMessage(context);
        //     await next();
        // });
    }

    async sendWelcomeMessage(turnContext) {
        const { activity } = turnContext;
        for (let cnt in activity.membersAdded) {
            if (activity.membersAdded[cnt].id !== activity.recipient.id) {
                // const welcomeMessage = `Welcome to Phrx chat, ${activity.membersAdded[cnt].name}`;
                // await turnContext.sendActivity(welcomeMessage);
              //  await this.sendSuggestedActions(turnContext);
              console.log("activity.membersAdded")
            }
        }
    }

    async sendSuggestedActions(turnContext) {
        const reply = MessageFactory.suggestedActions(
            ['I want to know my order status', 'Live chat'],
            'What would you like to do today?'
        );
        await turnContext.sendActivity(reply);
    }

    async sendSuggestedAfterGetActions(turnContext) {
        const reply = MessageFactory.suggestedActions(
            ['I want to know my order status', 'Live chat'],
            'Is there anything I can help you with'
        );
        await turnContext.sendActivity(reply);
    }


    // Call CLU to get the top intent.
    // async extractIntent(context) {
    //     const cluResult = await this.cluRecognizer.recognize(context);
    //     // The top intent property is a string e.g., "OrderStatus" or "FAQ"
    //     const topIntent = LuisRecognizer.topIntent(cluResult, 'None', 0.5);
    //     return { topIntent, cluResult };
    // }

    async dispatchToIntentAsync(context) {
        // We call our CLU recognizer to understand the intent.
        const cluResult = await getCluPrediction(context.activity.text);
        console.log("CLU Prediction Result:", JSON.stringify(cluResult, null, 2));
            
        // Extract the top intent from the prediction result
        const topIntent = cluResult?.result?.prediction?. topIntent || "None";
        console.log(`Top Intent: ${topIntent}`); //OrderStatus
        console.log(`CLU Top Intent: ${topIntent}`);

        // Depending on the detected intent, call the appropriate flow.
        switch (topIntent) {
            case 'OrderStatus':
                console.log("Detected OrderStatus intent.");
                // Start the dialog
                await this.KnowOrderStatusDialog.run(context, this.dialogState);
               
                break;

            case 'FAQ':
                console.log("Detected FAQ intent.");
                // Extract the original question from the user input
                const userQuestion = context.activity.text;
                console.log("userQuestion: " + userQuestion);
                try {
                    const qnaAnswers = await getQnAAnswer(userQuestion);
                    console.log("QnA Answers:", JSON.stringify(qnaAnswers, null, 2));
                    if (qnaAnswers.length > 0 && qnaAnswers[0].confidenceScore > 0.3) { // Adjust threshold as needed
                        await context.sendActivity(qnaAnswers[0].answer);

                    } else {
                        await context.sendActivity("I'm sorry, I couldn't find an answer to your question. Could you please rephrase?");
                    }
                } catch (error) {
                    await context.sendActivity("I'm experiencing some technical difficulties while trying to answer your question. Please try again later.");
                }
                if(userQuestion == "Start my weight loss program"){
                    const weightLossMsg = "Click [here](https://www.personalizedhealthrx.com/questionnaires) to get started on your weight loss program.";
                    await context.sendActivity(weightLossMsg);
                    await this.sendSuggestedAfterGetActions(context)
                }else{
                    await this.sendSuggestedActions(context);
                }
                break;

            case 'AgentRequest':
                console.log("Detected AgentRequest intent.");
                // Send a random agent info text.
              //  await this.sendAgentInfo(context);
              //  await context.sendActivity("we are connecting to agent Please wait...");
                console.log("Detected AgentRequest intent.");
                await context.sendActivity("We are connecting you to an agent. Please provide a brief description of your query.");
                // Begin the TalkToAgentDialog
                await this.TalkToAgentDialog.run(context, this.dialogState);

               // await this.TalkToAgentDialog.run(context, this.dialogState);
                break;
            case 'ChitChat':
                await context.sendActivity("Hey there welcome to PersonalizedHealthRx! i am a virtual assistant, how can i help you today?");
                await this.sendSuggestedActions(context);
                break;
            case 'Thanks':
                await context.sendActivity("You're welcome! If you have any other questions, feel free to ask.");
              await this.sendSuggestedActions(context);
                break;
            case 'Farewell':
                await context.sendActivity("Hope i helped You today,Goodbye! Have a great day!");
                await context.sendActivity("If anything there please come back to me");
                break;

            case 'None':
                await context.sendActivity("I'm sorry, I didn't understand that. Let me help you. Choose one of the options below.");
                await this.sendSuggestedActions(context);
                break;
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
