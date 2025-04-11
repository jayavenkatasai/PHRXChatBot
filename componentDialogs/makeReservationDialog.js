// componentDialogs/KnowOrderStatusDialog.js

const { WaterfallDialog, ComponentDialog } = require("botbuilder-dialogs");
const {
  ConfirmPrompt,
  TextPrompt,
  DialogSet,
  DialogTurnStatus,
} = require("botbuilder-dialogs");
const validator = require("validator");
const { isEmailRegistered } = require("../cluhelpers/emailvalidatorhelper");
const { getorderStatus } = require("../cluhelpers/getOrderStatus");
const CONFIRM_PROMPT = "CONFIRM_PROMPT";
const TEXT_PROMPT = "TEXT_PROMPT";
const EMAIL_PROMPT = "EMAIL_PROMPT";
const NAME_PROMPT = "NAME_PROMPT";
const WATERFALL_DIALOG = "WATERFALL_DIALOG";
const FALLBACK_PROMPT = "FALLBACK_PROMPT";
const { MessageFactory } = require("botbuilder");

async function sendSuggestedActions(context) {
  const reply = MessageFactory.suggestedActions(
    ["I want to know my order status", "Live chat"],
    "What would you like to do today?"
  );
  await context.sendActivity(reply);
}

const MDISTATUS = [
  "The MDI assignment has not been started yet.",
  "case_cancelled",
  "voucher_expired",
  "patient_insurance_coverage_updated",
  "intro_video_requested",
  "case_approved",
  "case_processing",
  "voucher_created",
  "voucher_reminder_sent",
  "case_assigned_to_clinician",
  "case_completed",
  "voucher_used",
  "case_file_deleted",

  "file_lab_results_processed",
  "case_waiting",
  "file_upload_requested",
  "drivers_license_requested",
  "case_file_added",
  "prescription_submitted",
  "case_transferred_to_support",
  "message_created",
  "preferred_pharmacy_requested",
  "clinical_note_created",
  "patient_modified",
  "patient_created",
  "case_created",
];

async function TalktoagentSuggestedAction(context) {
  const reply = MessageFactory.suggestedActions(
    ["Chat with a dietitian"],
    "Would you like to speak with a dietitian for assistance? Click below to get started:"
  );
  await context.sendActivity(reply);
}
const SWITCH_INTENT_COMMANDS = [
  "cancel",
  "help",
  "switch to faq",
  "talk to agent",
];

class KnowOrderStatusDialog extends ComponentDialog {
  constructor(conversationState, userState) {
    super("knowOrderStatusDialog");

    this.conversationState = conversationState;
    this.userState = userState;

    // Add prompts with validators
    this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
    this.addDialog(new TextPrompt(NAME_PROMPT, this.nameValidator.bind(this)));
    this.addDialog(
      new TextPrompt(EMAIL_PROMPT, this.emailValidator.bind(this))
    );
    //  this.addDialog(new FallbackPrompt(FALLBACK_PROMPT, 'I\'m sorry, I didn\'t understand that. Could you please rephrase?'));

    // Define the waterfall steps
    this.addDialog(
      new WaterfallDialog(WATERFALL_DIALOG, [
        // this.firstStep.bind(this),
        // this.getName.bind(this),
        this.getEmail.bind(this),
        this.summaryStep.bind(this),
      ])
    );

    this.initialDialogId = WATERFALL_DIALOG;
  }

  async run(turnContext, accessor) {
    const dialogSet = new DialogSet(accessor);
    dialogSet.add(this);
    const dialogContext = await dialogSet.createContext(turnContext);
    console.log(
      "Running KnowOrderStatusDialog: Checking current dialog status"
    );
    const results = await dialogContext.continueDialog();
    console.log("Dialog status:", results.status);
    if (results.status === DialogTurnStatus.empty) {
      console.log(
        "No existing dialog, beginning KnowOrderStatusDialog with id:",
        this.id
      );
      await dialogContext.beginDialog(this.id);
    }
  }

  async firstStep(step) {
    console.log("firstStep called");
    step.values.attempts = step.values.attempts || 0;
    step.values.attempts++;

    return await step.prompt(
      CONFIRM_PROMPT,
      "Do you like to know your Order Status?",
      ["yes", "no"]
    );
  }

  async getName(step) {
    // Handle special commands
    const command = step.context.activity.text.toLowerCase();
    if (SWITCH_INTENT_COMMANDS.includes(command)) {
      switch (command) {
        case "cancel":
          await step.context.sendActivity(
            "Order status tracking has been canceled."
          );
          return await step.endDialog();
        case "help":
          await step.context.sendActivity(
            "You can track your order by providing your name and email."
          );
          return await step.replaceDialog(this.initialDialogId);
        case "switch to faq":
        case "talk to agent":
          await step.context.sendActivity(
            `Switching to ${command === "switch to faq" ? "FAQ" : "Agent"}.`
          );
          return await step.endDialog();
        default:
          break;
      }
    }

    if (step.result === true) {
      console.log("get name step");
      return await step.prompt(
        NAME_PROMPT,
        "What is your Name? Please provide your full name."
      );
    } else {
      await step.context.sendActivity(
        "Okay, if you need anything else, let me know!"
      );
      return await step.endDialog();
    }
  }

  async getEmail(step) {
    console.log("get email step");
    return await step.prompt(
      EMAIL_PROMPT,
      "What’s your email address? (For example: user@example.com)"
    );
  }

  async summaryStep(step) {
    const email = step.result;
    step.values.email = email;
    // step.values.email = step.result;

    // Check for special commands
    const command = step.context.activity.text.toLowerCase();
    if (SWITCH_INTENT_COMMANDS.includes(command)) {
      switch (command) {
        case "cancel":
          await step.context.sendActivity(
            "Order status tracking has been canceled."
          );
          await sendSuggestedActions(step.context);
          return await step.endDialog();
        case "help":
          await step.context.sendActivity(
            "You can track your order by providing your name and email."
          );
          return await step.replaceDialog(this.initialDialogId);
        case "switch to faq":
        case "talk to agent":
          await step.context.sendActivity(
            `Switching to ${command === "switch to faq" ? "FAQ" : "Agent"}.`
          );
          return await step.endDialog();
        default:
          break;
      }
    }

    // Call getorderStatus to check for orders
    try {
      // const email = step.values.email;
      const isRegistered = await isEmailRegistered(email);
      if (!isRegistered) {
        await step.context.sendActivity(
          "Currently, you don't have any orders placed."
        );
        // await sendSuggestedActions(step.context);
        await TalktoagentSuggestedAction(step.context);
        return await step.endDialog();
      }

      const orderStatus = await getorderStatus(email);
      let ordersInfo = "I found the following orders:\n";
      console.log("order status response is ");
      console.log(orderStatus);
      console.log(orderStatus[0].category);
      if (orderStatus && orderStatus.length > 0) {
        switch (orderStatus[0].category) {
          case "MDIStatues":
            console.log("inside case " + orderStatus[0].category);
            if (
              orderStatus[0].status ==
              "The MDI assignment has not been started yet."
            ) {
              console.log("inside case1 " + orderStatus[0].category);
              ordersInfo += `- Order ID: ${orderStatus[0].orderId}\n - Status: Looks like you have not started your medical assessment yet.`;
              await step.context.sendActivity(ordersInfo);
              console.log("after the statement");
              await TalktoagentSuggestedAction(step.context);
            } else {
              console.log("inside case2 " + orderStatus[0].category);
              if (orderStatus[0].status == "cancelled") {
                ordersInfo += `- Order ID: ${orderStatus[0].orderId}\n- Status: Your order has been cancelled by medical assignment Team. }`;
                await step.context.sendActivity(ordersInfo);
                await TalktoagentSuggestedAction(step.context);
              } else {
                console.log("inside case3 " + orderStatus[0].category);
                ordersInfo += `- Order ID: ${orderStatus[0].orderId}\n- Status: Your medical assesment is in progress and your order will be processed shortly.`;
                await step.context.sendActivity(ordersInfo);
                await TalktoagentSuggestedAction(step.context);
              }
            }
            break;
          case "Curexa":
            if (orderStatus[0].status == "cancelled") {
              console.log("inside case4 " + orderStatus[0].category);
              if (
                orderStatus[0].tracking_number == "" ||
                orderStatus[0].status == "cancelled" ||
                orderStatus[0].tracking_number == null
              ) {
                ordersInfo += `- Order ID: ${
                  orderStatus[0].orderId
                }\n- Status: ${
                  orderStatus[0].status == "out_for_delivery"
                    ? "Shipped"
                    : orderStatus[0].status
                }`;
                await step.context.sendActivity(ordersInfo);
                await TalktoagentSuggestedAction(step.context);
              }
            } else {
              console.log("inside case5" + orderStatus[0].category);
              ordersInfo += `- Order ID: ${
                orderStatus[0].orderId
              }\n - Status: ${
                orderStatus[0].status == "out_for_delivery"
                  ? "Shipped"
                  : orderStatus[0].status
              }\n - Tracking Number: ${
                orderStatus[0].tracking_number
              }\n - TrackingUrl : [Order Status](https://www.fedex.com/apps/fedextrack/?tracknumbers=${
                orderStatus[0].tracking_number
              })"`;
              await step.context.sendActivity(ordersInfo);
              await TalktoagentSuggestedAction(step.context);
            }
            break;
          default:
            break;
        }
      } else {
        await step.context.sendActivity(
          "Currently, you don't have any orders placed."
        );
      }
    } catch (error) {
      await step.context.sendActivity(
        "We're experiencing technical issues retrieving your order status. Please try again later."
      );
    }

    return await step.endDialog();
  }
  async emailValidator(promptContext) {
    const email = promptContext.recognized.value;
    console.log("Validating email:", email);

    // If the user types "cancel", accept it.
    if (email.toLowerCase() === "cancel") {
      return true;
    }

    // Validate the email format
    if (!validator.isEmail(email)) {
      await promptContext.context.sendActivity(
        "Please enter a valid email address (e.g., user@example.com) or type 'Cancel' to exit."
      );
      return false;
    }
    return true;
  }

  async nameValidator(promptContext) {
    const nameInput = promptContext.recognized.value;
    console.log("Validating name:", nameInput);

    // Check for cancellation
    if (nameInput.toLowerCase() === "cancel") {
      await promptContext.context.sendActivity(
        "Order status tracking has been canceled."
      );
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
    await promptContext.context.sendActivity(
      "Please enter your full name (e.g., John Doe) or type 'Cancel' to exit."
    );
    return false;
  }
}

module.exports.KnowOrderStatusDialog = KnowOrderStatusDialog;
