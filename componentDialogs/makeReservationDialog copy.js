const {WaterfallDialog , ComponentDialog} = require('botbuilder-dialogs');
const { ConfirmPrompt, ChoicePrompt,DateTimePrompt,NumberPrompt,TextPrompt,DialogSet,DialogTurnStatus } = require('botbuilder-dialogs');
const { isValidPhoneNumber, parsePhoneNumber } = require('libphonenumber-js');
const validator = require('validator');
const { isEmailRegistered } = require('../cluhelpers/emailvalidatorhelper'); 

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const TEXT_PROMPT = 'TEXT_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const DATETIME_PROMPT = 'DATETIME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const PHONE_NUMBER_PROMPT = 'PHONE_NUMBER_PROMPT';
const EMAIL_PROMPT = 'EMAIL_PROMPT'; // Define a constant for the email prompt

var endDialog ;
var steps ={};
class KnowOrderStatusDialog extends ComponentDialog{
    constructor(conversationState,userState){
        super('knowOrderStatusDialog');
        this.conversationState = conversationState;
        this.userState = userState;
        this.addDialog(new TextPrompt(TEXT_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));
     //   this.addDialog(new NumberPrompt(NUMBER_PROMPT,this.phoneNumberValidator.bind(this)));
        this.addDialog(new TextPrompt(PHONE_NUMBER_PROMPT, this.phoneNumberValidator.bind(this)));
        this.addDialog(new TextPrompt(EMAIL_PROMPT, this.emailValidator.bind(this)));
        this.addDialog(new WaterfallDialog (WATERFALL_DIALOG,[
            this.firstStep.bind(this),
            this.getName.bind(this),
            this.getEmail.bind(this),
            this.getPhoneNumber.bind(this),
            this.orderId.bind(this),
            this.summaryStep.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG;
        // this.firstStep.bind(this);
        // this.getName.bind(this);
        // this.getEmail.bind(this);
        // this.getPhoneNumber.bind(this);
        // this.orderId.bind(this);
        // this.summaryStep.bind(this);   

    }

    async run(turnContext, accessor){ // accessor is a state
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

    
async  firstStep(step){
   // step.values = {};
    console.log("firstStep called");
    endDialog = false;
    step.values.endDialog = false;

    return await step.prompt(CONFIRM_PROMPT, 'Do you like to know your Order Status?', ['yes', 'no']);
}
async  getName(step){
    if(step.result === true){
        console.log("get name step")
        return await step.prompt(TEXT_PROMPT,'What is your Name?')
      
    }else {
        step.values.endDialog = true;
        await step.context.sendActivity("Okay, if you need anything else, let me know!");
        return await step.endDialog();
    }
  
}

async  getEmail(step){
    console.log("get email step")
    console.log("step value is")
    step.values.name = step.result;
    steps.name= step.result
    return await step.prompt(EMAIL_PROMPT,'What’s your email address?')
  
}

async  getPhoneNumber(step){
    console.log("get phone step")
    step.values.email = step.result;
    steps.email = step.result
        return await step.prompt(PHONE_NUMBER_PROMPT,'What is your Phone Number?')
}

async  orderId(step){
    step.values.phoneNumber = step.result;
    steps.phoneNumber = step.result
        return await step.prompt(TEXT_PROMPT,'What is your order Id?')
}


async  summaryStep(step){
    step.values.orderid = step.result;
    steps.orderid = step.result
    // if(steps.orderid){
    //  // Business

    //  await step.context.sendActivity(`Your order status is in process your orderid is ${steps.orderid} and your name is ${steps.name}`);
    //  endDialog = true;
    //  return await step.endDialog();
    // }

    if (step.values.orderid) {
        // Business logic can be added here
        const formattedPhone = step.values.phoneNumber;
        const email = step.values.email;
        await step.context.sendActivity(`Your order status is in process. Your Order ID is ${step.values.orderid}, your name is ${step.values.name}, your email is ${email}, and your phone number is ${formattedPhone}.`);
        step.values.endDialog = true;
        endDialog = true;
        return await step.endDialog();
    }

}


async emailValidator(promptContext) {
    const email = promptContext.recognized.value;
    console.log("Validating email:", email);
       // First, validate the email format
       if (!validator.isEmail(email)) {
        await promptContext.context.sendActivity("Please enter a valid email address (e.g., user@example.com).");
        return false;
    }

    try {
        // Call the API to check if the email is registered
        const exists = await isEmailRegistered(email);

        if (exists) {
            return true; // Email is valid and registered
        } else {
            await promptContext.context.sendActivity("The email you entered is not registered. Please enter a registered email address.");
            return false; // Email format is valid but not registered
        }
    } catch (error) {
        // Handle API call failures gracefully
        await promptContext.context.sendActivity("We're experiencing technical issues verifying your email. Please try again later.");
        return false; // Depending on requirements, you might want to end the dialog or retry
    }
}



async phoneNumberValidator(promptContext) {
    const phoneNumberInput = promptContext.recognized.value;
    console.log("Validating phone number:", phoneNumberInput);

    // Attempt to parse the phone number with known country codes
    const possibleCountries = ['IN', 'US']; // Extend this array with more country codes as needed

    let phoneNumber = null;
    let isValid = false;
    let formattedNumber = '';

    for (const country of possibleCountries) {
        try {
            phoneNumber = parsePhoneNumber(phoneNumberInput, country);
            if (phoneNumber && phoneNumber.isValid()) {
                isValid = true;
                formattedNumber = phoneNumber.formatInternational(); // Format as per international standard
                break;
            }
        } catch (error) {
            // Parsing failed for this country, continue to next
            continue;
        }
    }

    if (isValid) {
        // Replace the user's input with the formatted number
        promptContext.recognized.value = formattedNumber;
        return true;
    }

    // If validation fails, prompt the user again
    await promptContext.context.sendActivity("Please enter a valid phone number in a recognized format (e.g., +1 123-456-7890 for US or +91 1234567890 for India).");
    return false;
}


async isDialogComplete(){
     return endDialog;

  //  return this.values?.endDialog || false;
}
}
module.exports.KnowOrderStatusDialog = KnowOrderStatusDialog;