const { WaterfallDialog, ComponentDialog, TextPrompt, DialogTurnStatus } = require('botbuilder-dialogs');

const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const ISSUE_PROMPT = 'ISSUE_PROMPT';

class TalkToAgentDialog extends ComponentDialog {
    constructor(conversationState, userState) {
        super('talkToAgentDialog');

        // Add a simple text prompt to capture the user's issue description.
        this.addDialog(new TextPrompt(ISSUE_PROMPT));

        // Define a waterfall with two steps.
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.askIssueStep.bind(this),
            this.confirmIssueStep.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    // Step 1: Ask the user for the issue.
    async askIssueStep(step) {
        return await step.prompt(ISSUE_PROMPT, 'What is the issue you want to talk about with an agent?');
    }

    // Step 2: Confirm the issue and end the dialog.
    async confirmIssueStep(step) {
        const userIssue = step.result;

        // Send a message that echoes the user's issue.
        await step.context.sendActivity(`Your issue is: ${userIssue}`);
        // Inform the user that a live agent is being connected.
        await step.context.sendActivity('We are connecting you to a live agent now.');
        
        // Optionally, you can pass the user's issue back to the parent or trigger any backend actions here.
        return await step.endDialog(userIssue);
    }

    // Run method to allow the dialog to be called from your bot.
    async run(turnContext, accessor) {
        const { DialogSet } = require('botbuilder-dialogs');
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);
        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }
}

module.exports.TalkToAgentDialog = TalkToAgentDialog;
