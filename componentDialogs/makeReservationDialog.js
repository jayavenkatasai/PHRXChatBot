const {WaterfallDialog , ComponentDialog} = require('botbuilder-dialogs');
const { ConfirmPrompt, ChoicePrompt,DateTimePrompt,NumberPrompt,TextPrompt,DialogSet,DialogTurnStatus } = require('botbuilder-dialogs');

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const TEXT_PROMPT = 'TEXT_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const DATETIME_PROMPT = 'DATETIME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
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
        this.addDialog(new NumberPrompt(NUMBER_PROMPT));

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

    return await step.prompt(CONFIRM_PROMPT, 'Do you like to know your Order Status?', ['yes', 'no']);
}
async  getName(step){
    if(step.result === true){
        console.log(step)
        return await step.prompt(TEXT_PROMPT,'What is your Name?')
      
    }
  
}

async  getEmail(step){
    console.log(step)
    steps.name= step.result
    
        return await step.prompt(TEXT_PROMPT,'What is your Email?')
  
}

async  getPhoneNumber(step){
    steps.email = step.result
        return await step.prompt(NUMBER_PROMPT,'What is your Phone Number?')
}

async  orderId(step){
    steps.phoneNumber = step.result
        return await step.prompt(NUMBER_PROMPT,'What is your order Id?')
}


async  summaryStep(step){

    steps.orderid = step.result
    if(steps.orderid){
     // Business

     await step.context.sendActivity(`Your order status is in process your orderid is ${steps.orderid} and your name is ${steps.name}`);
     endDialog = true;
     return await step.endDialog();
    }
}

   
async phoneNumberValidator(promptContext){
    const phoneNumber = promptContext.recognized.value;
    console.log("Validating phone number:", phoneNumber);
    if(phoneNumber.length === 10){
        return true;
    }
    return false;
 
}

async isDialogComplete(){
    return endDialog;
}
}
module.exports.KnowOrderStatusDialog = KnowOrderStatusDialog;