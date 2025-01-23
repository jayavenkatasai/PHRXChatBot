// componentDialogs/KnowOrderStatusDialog.js

const { WaterfallDialog, ComponentDialog } = require('botbuilder-dialogs');
const { ConfirmPrompt, TextPrompt, DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');
const validator = require('validator');
const { isEmailRegistered } = require('../cluhelpers/emailvalidatorhelper'); 
const { getorderStatus } = require('../cluhelpers/getOrderStatus'); 
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const TEXT_PROMPT = 'TEXT_PROMPT';
const EMAIL_PROMPT = 'EMAIL_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const FALLBACK_PROMPT = 'FALLBACK_PROMPT';

const SWITCH_INTENT_COMMANDS = ['cancel', 'help', 'switch to faq', 'talk to agent'];

class KnowOrderStatusDialog extends ComponentDialog {
    constructor(conversationState, userState) {
        super('knowOrderStatusDialog');

        this.conversationState = conversationState;
        this.userState = userState;

        // Add prompts with validators
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new TextPrompt(NAME_PROMPT, this.nameValidator.bind(this)));
        this.addDialog(new TextPrompt(EMAIL_PROMPT, this.emailValidator.bind(this)));
      //  this.addDialog(new FallbackPrompt(FALLBACK_PROMPT, 'I\'m sorry, I didn\'t understand that. Could you please rephrase?'));

        // Define the waterfall steps
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.firstStep.bind(this),
            this.getName.bind(this),
            this.getEmail.bind(this),
            this.summaryStep.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    async run(turnContext, accessor) { 
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);
        const dialogContext = await dialogSet.createContext(turnContext);
        console.log("Running KnowOrderStatusDialog: Checking current dialog status");
        const results = await dialogContext.continueDialog();
        console.log("Dialog status:", results.status);
        if (results.status === DialogTurnStatus.empty) {
            console.log("No existing dialog, beginning KnowOrderStatusDialog with id:", this.id);
            await dialogContext.beginDialog(this.id);
        }
    }

    async firstStep(step) {
        console.log("firstStep called");
        step.values.attempts = step.values.attempts || 0;
        step.values.attempts++;

        return await step.prompt(CONFIRM_PROMPT, 'Do you like to know your Order Status?', ['yes', 'no']);
    }

    async getName(step) {
        // Handle special commands
        const command = step.context.activity.text.toLowerCase();
        if (SWITCH_INTENT_COMMANDS.includes(command)) {
            switch (command) {
                case 'cancel':
                    await step.context.sendActivity("Order status tracking has been canceled.");
                    return await step.endDialog();
                case 'help':
                    await step.context.sendActivity("You can track your order by providing your name and email.");
                    return await step.replaceDialog(this.initialDialogId);
                case 'switch to faq':
                case 'talk to agent':
                    await step.context.sendActivity(`Switching to ${command === 'switch to faq' ? 'FAQ' : 'Agent'}.`);
                    return await step.endDialog();
                default:
                    break;
            }
        }

        if (step.result === true) {
            console.log("get name step");
            return await step.prompt(NAME_PROMPT, 'What is your Name? Please provide your full name.');
        } else {
            await step.context.sendActivity("Okay, if you need anything else, let me know!");
            return await step.endDialog();
        }
    }

    async getEmail(step) {
        console.log("get email step");
        step.values.name = step.result;
        return await step.prompt(EMAIL_PROMPT, 'What is your Email? (e.g., user@example.com)');
    }

    async summaryStep(step) {
        step.values.email = step.result;

        // Check for special commands
        const command = step.context.activity.text.toLowerCase();
        if (SWITCH_INTENT_COMMANDS.includes(command)) {
            switch (command) {
                case 'cancel':
                    await step.context.sendActivity("Order status tracking has been canceled.");
                    return await step.endDialog();
                case 'help':
                    await step.context.sendActivity("You can track your order by providing your name and email.");
                    return await step.replaceDialog(this.initialDialogId);
                case 'switch to faq':
                case 'talk to agent':
                    await step.context.sendActivity(`Switching to ${command === 'switch to faq' ? 'FAQ' : 'Agent'}.`);
                    return await step.endDialog();
                default:
                    break;
            }
        }

        // Call getorderStatus to check for orders
        try {
            const email = step.values.email;
            const orderStatus = await getorderStatus(email);

            if (orderStatus && orderStatus.length > 0) {
                // Assuming you want to display all orders
                let ordersInfo = "I found the following orders:\n";
                orderStatus.forEach(order => {
                    ordersInfo += `- Order ID: ${order.orderId}, Status: ${order.status}\n`;
                });
                await step.context.sendActivity(ordersInfo);
            } else {
                await step.context.sendActivity("Currently, you don't have any orders placed.");
            }
        } catch (error) {
            await step.context.sendActivity("We're experiencing technical issues retrieving your order status. Please try again later.");
        }

        // End the dialog after displaying order status or informing no orders
        return await step.endDialog();
    }

    async emailValidator(promptContext) {
        const email = promptContext.recognized.value;
        console.log("Validating email:", email);
        // Check for cancellation
        if (email.toLowerCase() === 'cancel') {
            await promptContext.context.sendActivity("Order status tracking has been canceled.");
            return false; // End dialog
        }

        // First, validate the email format
        if (!validator.isEmail(email)) {
            await promptContext.context.sendActivity("Please enter a valid email address (e.g., user@example.com) or type 'Cancel' to exit.");
            return false;
        }

        try {
            // Call the API to check if the email is registered
            const exists = await isEmailRegistered(email);

            if (exists) {
                return true; // Email is valid and registered
            } else {
                await promptContext.context.sendActivity("The email you entered is not registered. Please enter a registered email address or type 'Cancel' to exit.");
                return false; // Email format is valid but not registered
            }
        } catch (error) {
            // Handle API call failures gracefully
            await promptContext.context.sendActivity("We're experiencing technical issues verifying your email. Please try again later.");
            return false; // Depending on requirements, you might want to treat this differently
        }
    }

    async nameValidator(promptContext) {
        const nameInput = promptContext.recognized.value;
        console.log("Validating name:", nameInput);

        // Check for cancellation
        if (nameInput.toLowerCase() === 'cancel') {
            await promptContext.context.sendActivity("Order status tracking has been canceled.");
            return false; // End dialog
        }

        // Extract entities using CLU/LUIS if available
        let name = nameInput;

        // Try to extract name using regex
        const nameRegex = /(?:my name is\s+)(?<name>[A-Za-z\s]+)/i;
        const match = nameInput.match(nameRegex);

        if (match && match.groups && match.groups.name) {
            name = match.groups.name.trim();
        }

        // Validate that the extracted name is not empty and contains alphabetic characters
        if (name && /^[A-Za-z\s]+$/.test(name)) {
            // Replace the recognized value with the extracted name
            promptContext.recognized.value = name;
            return true;
        }

        // If validation fails, prompt the user again
        await promptContext.context.sendActivity("Please enter your full name (e.g., John Doe) or type 'Cancel' to exit.");
        return false;
    }
}

module.exports.KnowOrderStatusDialog = KnowOrderStatusDialog;
