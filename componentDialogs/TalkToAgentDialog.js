const {
  WaterfallDialog,
  ComponentDialog,
  TextPrompt,
  DialogTurnStatus,
} = require("botbuilder-dialogs");

const WATERFALL_DIALOG = "WATERFALL_DIALOG";
const ISSUE_PROMPT = "ISSUE_PROMPT";
const isWithinOperatingHours = () => {
  const now = new Date();

  // Log local time (user's timezone)
  const localTime = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  console.log(`Local Time: ${localTime}`);

  // Get EST time for calculations (24-hour format)
  const estCalcOptions = {
    timeZone: "America/New_York", // Eastern Time Zone
    hour12: false, // 24-hour format for easier calculations
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit", // Include seconds for more precise logging
  };

  // Format the current EST time for logging
  const estLogOptions = { ...estCalcOptions, hour12: true }; // 12-hour format for logging
  const estLogFormatter = new Intl.DateTimeFormat([], estLogOptions);
  const estLogTime = estLogFormatter.format(now);

  // Log the EST time in a readable 12-hour format
  console.log(`EST Time (Log): ${estLogTime}`);

  // Format the current EST time for calculations
  const estCalcFormatter = new Intl.DateTimeFormat([], estCalcOptions);
  const estParts = estCalcFormatter.formatToParts(now);

  // Extract hour and minute parts for calculations
  const hour = parseInt(
    estParts.find((part) => part.type === "hour").value,
    10
  );
  const minute = parseInt(
    estParts.find((part) => part.type === "minute").value,
    10
  );

  // Calculate the current time in minutes since midnight
  const currentMinutes = hour * 60 + minute;

  // Define operating hours in minutes since midnight
  const startMinutes = 8 * 60; // 8:00 AM = 480 minutes
  const endMinutes = 17 * 60; // 8:00 PM = 1200 minutes

  // Check if current EST time is within operating hours
  const withinOperatingHours =
    currentMinutes >= startMinutes && currentMinutes <= endMinutes;

  return withinOperatingHours;
};

// Example usage
if (isWithinOperatingHours()) {
  console.log(
    "The current EST time is within operating hours (8:00 AM - 8:00 PM)."
  );
} else {
  console.log("The current EST time is outside operating hours.");
}

class TalkToAgentDialog extends ComponentDialog {
  constructor(conversationState, userState) {
    super("talkToAgentDialog");

    // Add a simple text prompt to capture the user's issue description.
    this.addDialog(new TextPrompt(ISSUE_PROMPT));

    // Define a waterfall with two steps.
    this.addDialog(
      new WaterfallDialog(WATERFALL_DIALOG, [
        this.askIssueStep.bind(this),
        this.confirmIssueStep.bind(this),
      ])
    );

    this.initialDialogId = WATERFALL_DIALOG;
  }

  // // Step 1: Ask the user for the issue.
  // async askIssueStep(step) {
  //     return await step.prompt(ISSUE_PROMPT, 'What is the issue you want to talk about with an agent?');
  // }
  async askIssueStep(step) {
    // Retrieve the passed agent status from step.options (if available)
    const agentStatus = step.options && step.options.agentStatus;
    let promptMessage = "";
    // let promptMessage = 'What is the issue you want to talk about with an agent?';

    // // Modify the prompt text based on agent status
    // if (agentStatus === "unavailable") {
    //   promptMessage =
    //     "Due to higher than normal chat volume all agents are currently unavailable. Please leave a message here and we will provide a replay as soon as possible.";
    // } else {
    //   promptMessage = "What is the issue you want to talk about with an agent?";
    // }

    // Check if it's within operating hours
    const isOperatingHours = isWithinOperatingHours(); // This will check if the current time is within operating hours.

    // If it's within operating hours, check agent status
    if (isOperatingHours) {
      // If the agent is unavailable, show a specific prompt
      if (agentStatus === "unavailable") {
        promptMessage =
          "Due to higher than normal chat volume, all dietitians are currently unavailable. Please leave a message here, and we will respond as soon as possible.";
      } else if (agentStatus === "away") {
        promptMessage =
          "Our dietitians are currently assisting other customers. Please leave a message, and we will contact you as soon as possible.";
      } else {
        // Otherwise, ask about the user's issue
        promptMessage =
          "I’m connecting you with a dietitian to assist you. To make sure you get the best support, please briefly describe what’s going on? Whether it’s nutrition, account questions, or something else, we’re here to assist!";
      }
    } else {
      // If it's outside operating hours, show the offline message
      promptMessage =
        "Our dietitians are currently offline. Our business hours are from 8 AM to 5 PM Eastern Time, Monday through Friday. Please leave a message, and we will contact you as soon as possible.";
    }

    // Prompt the user with the adjusted message
    return await step.prompt(ISSUE_PROMPT, promptMessage);
  }

  // Step 2: Confirm the issue and end the dialog.
  async confirmIssueStep(step) {
    const userIssue = step.result;

    // Send a message that echoes the user's issue.
    await step.context.sendActivity(`Your issue is: ${userIssue}`);
    // Inform the user that a live agent is being connected.
    await step.context.sendActivity(
      "We are connecting you to a live agent now."
    );

    // Optionally, you can pass the user's issue back to the parent or trigger any backend actions here.
    return await step.endDialog(userIssue);
  }

  // Run method to allow the dialog to be called from your bot.
  async run(turnContext, accessor, options) {
    const { DialogSet } = require("botbuilder-dialogs");
    const dialogSet = new DialogSet(accessor);
    dialogSet.add(this);
    const dialogContext = await dialogSet.createContext(turnContext);
    const results = await dialogContext.continueDialog();
    if (results.status === DialogTurnStatus.empty) {
      await dialogContext.beginDialog(this.id, options);
    }
  }
}

module.exports.TalkToAgentDialog = TalkToAgentDialog;
