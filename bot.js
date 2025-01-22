

const { ActivityHandler, MessageFactory } = require('botbuilder');
const { KnowOrderStatusDialog } = require('./componentDialogs/makeReservationDialog');

class EchoBot extends ActivityHandler {
    constructor(conversationState, userState) {
        super();

        this.conversationState = conversationState;
        this.userState = userState;
        this.dialogState = conversationState.createProperty('DialogState');
        this.KnowOrderStatusDialog = new KnowOrderStatusDialog(this.conversationState, this.userState);
        this.previousIntent = this.conversationState.createProperty('previousIntent');
        this.conversationData = this.conversationState.createProperty('conservationData');

        // On each message, decide the intent and act accordingly.
        this.onMessage(async (context, next) => {
            await this.dispatchToIntentAsync(context);
            await next();
        });

        // Save state changes on each turn.
        this.onDialog(async (context, next) => {
            await this.conversationState.saveChanges(context, false);
            await this.userState.saveChanges(context, false);
            await next();
        });

        // Welcome message and suggestions for new members.
        this.onMembersAdded(async (context, next) => {
            await this.sendWelcomeMessage(context);
            await next();
        });
    }

    async sendWelcomeMessage(turnContext) {
        const { activity } = turnContext;
        for (let cnt in activity.membersAdded) {
            if (activity.membersAdded[cnt].id !== activity.recipient.id) {
                const WelcomeMessage = `Welcome to Phrx chat, ${activity.membersAdded[cnt].name}`;
                await turnContext.sendActivity(WelcomeMessage);
                await this.sendSuggestedActions(turnContext);
            }
        }
    }

    // This sends suggested action buttons to the user.
    async sendSuggestedActions(turnContext) {
        const reply = MessageFactory.suggestedActions(
            ['Know about Phrx chat', 'Know about my order', 'Talk To Agent'],
            'What would you like to do today?'
        );
        await turnContext.sendActivity(reply);
    }

    // Dispatch the incoming message to appropriate functionality.
    async dispatchToIntentAsync(context) {
        const previousIntent = await this.previousIntent.get(context, {});
        const conversationData = await this.conversationData.get(context, {});

        let currentIntent;
        if (previousIntent.intentName && conversationData.endDialog === false) {
            // Continuing a dialog
            currentIntent = previousIntent.intentName;
        } else if (previousIntent.intentName && conversationData.endDialog === true) {
            // Start of a new conversation after finishing a dialog
            currentIntent = context.activity.text;
            // Reset the conversationData flag for next round.
            await this.conversationData.set(context, { endDialog: false });
        } else {
            // First time message. Save the intent.
            currentIntent = context.activity.text;
            await this.previousIntent.set(context, { intentName: context.activity.text });
        }

        // Get the text to decide action
        switch (currentIntent) {
            case 'Know about my order':
                console.log("Inside 'Know about my order'");
                await this.conversationData.set(context, { endDialog: false });
                await this.KnowOrderStatusDialog.run(context, this.dialogState);
                // When the dialog finishes, update our flag.
                const isComplete = await this.KnowOrderStatusDialog.isDialogComplete();
                await this.conversationData.set(context, { endDialog: isComplete });
                if (isComplete) {
                    // Once the dialog is complete, show suggestions again.
                    await this.sendSuggestedActions(context);
                }
                break;
            case 'Know about Phrx chat':
                await this.sendPhrxChatInfo(context);
                break;
            case 'Talk To Agent':
                await this.sendAgentInfo(context);
                break;
            default:
                await this.sendWelcomeMessage(context);
                break;
        }
    }

    // This function returns a random informational text about Phrx chat and then shows suggestions.
    async sendPhrxChatInfo(context) {
        const phrxTexts = [
            "Phrx chat is a smart assistant designed to help you with your queries.",
            "With Phrx chat, you can quickly get information about orders and services.",
            "Phrx chat connects you with live agents if you need personal assistance."
        ];
        const randomText = phrxTexts[Math.floor(Math.random() * phrxTexts.length)];
        await context.sendActivity(randomText);
        // Ask for further suggestions.
        await this.sendSuggestedActions(context);
    }

    // This function returns a random agent information text and then shows suggestions.
    async sendAgentInfo(context) {
        const agentTexts = [
            "An agent will be with you shortly to assist with your needs.",
            "Connecting you to a live agent now. Please hold on.",
            "Our support agent is on the way to help you out!"
        ];
        const randomText = agentTexts[Math.floor(Math.random() * agentTexts.length)];
        await context.sendActivity(randomText);
        // Ask for further suggestions.
        await this.sendSuggestedActions(context);
    }
}

module.exports.EchoBot = EchoBot;
