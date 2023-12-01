import { saveTrialDataComplete, saveTrialDataPartial } from './utils'
import { getUserInfo, sandboxStatus } from './globals'

import { initJsPsych } from 'jspsych'
import jsPsychHtmlKeyboardResponse from '@jspsych/plugin-html-keyboard-response'
import jsPsychPreload from '@jspsych/plugin-preload'
import jsPsychHtmlButtonResponse from '@jspsych/plugin-html-button-response'
import jsPsychHtmlSliderResponse from '@jspsych/plugin-html-slider-response'
import jsPsychSurveyText from '@jspsych/plugin-survey-text'
import jsPsychSurveyMultiChoice from '@jspsych/plugin-survey-multi-choice'
import jsPsychSurveyHtmlForm from '@jspsych/plugin-survey-html-form'

import {contexts_table} from './contextsTable'

const sandy = sandboxStatus()

export async function runExperiment() {
  if (sandy) {
    console.log('--runExperiment--')
    console.log('UserInfo ::', getUserInfo())
  }

  /* initialize jsPsych */
  const jsPsych = initJsPsych({
    on_data_update: function (trialData) {
      if (sandy) {
        console.log('jsPsych-update :: trialData ::')
        console.log(trialData)
      }
      // if trialData contains a saveToFirestore property, and the property is true, then save the trialData to Firestore
      if (trialData?.saveToFirestore) {
        saveTrialDataPartial(trialData).then(
          (value) => {
            if (sandy) {
              console.log('saveTrialDataPartial: Success', value) // Success!
            }
          },
          (reason) => {
            console.error(reason) // Error!
          },
        )
      }
    },
    on_finish: async (data) => {
      await saveTrialDataComplete(data)
      if (sandy) {
        console.log('jsPsych-finish :: data ::')
        console.log(data)
        jsPsych.data.displayData()
      }
    },
  })

  // create the timeline
  const timeline = []
  
  // turn on or off answer requirements for debugging
  const requirements = true
  // number of contexts a participant sees
  const numberOfContexts = '6'

  // determines participants receive the force or the possibility generation question first
  const forceFirst = (Math.round(Math.random())==0)
  console.log("forceFirst:", forceFirst)

  // define consent trial
  const consent = {
      type: jsPsychHtmlButtonResponse,
      stimulus: "<div align='left'><div>&nbsp;</div><div>Please consider this information carefully before deciding whether to participate in this research.</div><div>&nbsp;\<div>The purpose of this research is to examine which factors influence social judgment and decision-making. You will be asked to make judgements about individuals and actions in social scenarios. We are simply interested in your judgement. The study will take less than 1 hour to complete, and you will receive less than $20 on Prolific. Your compensation and time commitment are specified in the study description. There are no anticipated risks associated with participating in this study. The effects of participating should be comparable to those you would ordinarily experience from viewing a computer monitor and using a mouse or keyboard for a similar amount of time. At the end of the study, we will provide an explanation of the questions that motivate this line of research and will describe the potential implications.</div><div>&nbsp;</div><div>Your participation in this study is completely voluntary and you may refuse to participate or you may choose to withdraw at any time without penalty or loss of benefits to you which are otherwise entitled. Your participation in this study will remain confidential. No personally identifiable information will be associated with your data. Also, all analyses of the data will be averaged across all the participants, so your individual responses will never be specifically analyzed.</div><div>&nbsp;</div><div>If you have questions or concerns about your participation or payment, or want to request a summary of research findings, please contact Dr. Jonathan Phillips at <a href=mailto:Jonathan.S.Phillips@dartmouth.edu>Jonathan.S.Phillips@dartmouth.edu</a>.</div><div>&nbsp;</div><div>Please save a copy of this form for your records.</div><div>&nbsp;</div></DIV><div>Agreement:</div><DIV align='left'><div>The nature and purpose of this research have been sufficiently explained and I agree to participate in this study. I understand that I am free to withdraw at any time without incurring any penalty. Please consent by clicking the button below to continue. Otherwise, please exit the study at any time.</div><div>&nbsp;</div></DIV>",
      choices: ['Submit'],
      //this specifies the way in which the data will be configured inside jspsych data variable...
      data:{
          internal_type: "consent",
          trial_name: 'consent'
      },
  };
  timeline.push(consent);

  // define demographics trial
  const participant_info = {
      type: jsPsychSurveyText,
      preamble: 'Please provide us with some demographic information.',
      questions: [
          {prompt: "How old are you?", placeholder: 'ex: 34',required: requirements, name: "age"},
          {prompt: "Which is your dominant hand (e.g.,Right, Left, Ambidextrous)?", required: requirements, name: "handedness"},
          {prompt: "What is your native language?", required: requirements, name: "language"},
          {prompt: "What is your nationality?", required: requirements, name: "nationality"},
          {prompt: "In which country do you live?", required: requirements, name: "residence"},
          {prompt: "What is your gender (e.g., Male, Female, Other)?", required: requirements, name: "gender"},
          {prompt: '<p style="width:500px;">What is your education level (e.g., Grade/elementary school, High school, Some college or university, College or university degree, Graduate degree, Masters, PhD)?', required: requirements, name: "education"}
      ],
      data:{
          trial_name: "participant_info"
      }
  };
  timeline.push(participant_info)

  // define commitment trial
  const commitment = {
      type: jsPsychSurveyMultiChoice,
      preamble: `<p>We care about the quality of our data. For us to get the most accurate measures of your responses, it is important that you provide thoughtful answers to each question in this study.</p>`,
      questions: [
          {
          prompt: "Do you commit to providing thoughtful answers to the questions in this study?",
          name: 'commitment',
          options: [`I can't promise either way`, `Yes, I will`, `No, I will not`],
          required: requirements
          }
      ],
      data: {
          trial_name: "commitment"
      }
  }
  timeline.push(commitment);
  
  // define instructions trial
  const instructions = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `<div align="left"; align-items="start"> <p>In this study, you\'ll read six short stories and then will be asked a few questions about each story. </p>
      <p> Please read carefully. In some questions you will be asked to answer about what naturally comes to mind in a given scenario.
      Please try to answer these questions as honestly as possible without censoring your responses. </p>
      <p> Press any key to continue. </p> </div>`,
      data: {
          trial_name: 'instructions'
      }
  }
  timeline.push(instructions)


  // initialize conext specific variables
  var action_numb:number // 1-6 number referring to one of the context-specific actions
  var action_text:string // the text of the action
  var agent:string // name of the agent

  var context_order:number = 0 // stores the order in which a given context was viewed

  // defines initial scenario presentation trial 
  const scenario = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: function(){
          
          // selects a random integer 1 to 6
          action_numb = Math.floor(Math.random() *6)+1

          // reads in agent from timeline
          agent = jsPsych.timelineVariable('agent')

          // selects random action from context
          action_text = contexts_table[jsPsych.timelineVariable('context')-1]['action_'+(action_numb)]

          // resets response list array on for generation pages
          i = 0
          response_list=[]

          // if participant was randomly assigned to forceFirst, action text is included in initial scenario
          if(forceFirst){
              return `<div style="font-size: 16px"; align="left"> Please read the following scenario:
              <div style= "border-style:solid; padding: 5px"> ${jsPsych.timelineVariable('text')}
              <p>${agent} decides to ${action_text}.</div>
              Press any key to continue.`	
          } else{
              return `<div style="font-size: 16px"; align="left"> Please read the following scenario:
              <div style= "border-style:solid; padding: 5px"> ${jsPsych.timelineVariable('text')}
              </div>
              Press any key to continue.`
          }
          
      },
      data: {
          trial_name: 'scenario',
          context: jsPsych.timelineVariable('context'),
          context_order: function(){
              context_order+=1
              return context_order
          },
          force_first: forceFirst
      }
  }

  // defines attention check trial
  const attention_check = {
      timeline: [{
          type: jsPsychSurveyMultiChoice,
          questions: [{
              prompt: function(){
              return `Please select which action ${agent} decided to do:`},
              options: function(){
                  var offset = Math.floor(Math.random()*3)*2 // chooses a random number 0, 2 or 4
                  
                  // returns three actions from the context, one of which is the actual action
                  return [contexts_table[jsPsych.timelineVariable('context')-1]['action_'+((action_numb+offset - 1)%6+1)], 
                          contexts_table[jsPsych.timelineVariable('context')-1]['action_'+((action_numb+offset + 1)%6+1)],
                          contexts_table[jsPsych.timelineVariable('context')-1]['action_'+((action_numb+offset + 3)%6+1)]]},
              required: true
          }
          ],
          data: {
              trial_name: 'attention_check',
              context: jsPsych.timelineVariable('context')
          },
          on_finish: function(data){
              // returns whether the participant selected the correct action
              data.attention_passed = action_text==data.response.Q0
              }
      }],
      // only displays attention check on third and sixth context
      conditional_function: function(){
          return (context_order == 3 || context_order == 6)
      }
  }

  // define Force judgment trial
  const force = {
      type: jsPsychHtmlSliderResponse,
      stimulus: function(){

          let text = `<div style="font-size: 16px"; align="left">
          <div style= "border-style:solid; padding: 5px"> ${jsPsych.timelineVariable('text')} `
          if (forceFirst){
              text += `<p>${agent} decides to ${action_text}.</div>`
          } else{
              // highlights decision if this is the first participants are seeing it
              text += `<p> <mark> ${agent} decides to ${action_text}.</mark> </div>`
          }
          
          text += `<div align = "left"> <p> <b> Please tell how much you agree with the following statement: </b> </p> </div>
          <div align="center"><div> "${agent} had to ${action_text}."</p></div>
          <div style="width:100%; float: center; font-size: small">
          <div style="width:90px; float: left;">
              <p>Completely disagree</p>
          </div>
          <div style="width:90px; float: right;">
              <p>Completely agree</p>
          </div>
          </div>`

          return text
      },

      // labels: ['0', '100'],
      
      require_movement: requirements,

      data: {
          trial_name: 'force',
          context: jsPsych.timelineVariable('context'),
          action_numb: function(){return action_numb},
          action: function(){return action_text}
      }
  }

  // list of participant-generated actions for each scenario
  var response_list = []        

  // possibility generation prompt. Press 'Space' to input a response
  const option_gen_prompt = {
      type: jsPsychHtmlKeyboardResponse,

      stimulus: function(){
          // text changes depending on whether participants have answered any responses yet for that scenario
          if(response_list.length == 0){
              var conditional_text = "Once you've thought of your first action press \'Space\' and enter <em> just that action </em> in the text box. Please wait until you already have an action in mind before you press \'Space.\'"
          } else{
              var conditional_text = "Once you've thought of another action press \'Space.\' If you can\'t think of any more actions press \'X.\' Please wait until you already have an action in mind before you press \'Space.\'"
          }
          
          
          let text = `<div style="font-size: 16px"; align="left">
              <div style= "border-style:solid; padding: 5px"> ${jsPsych.timelineVariable('text')}`
          
          if(forceFirst){
              text += `<p> ${agent}  decides to ${action_text}.</div>
              <p> <b> Please think of other actions ${agent} could have done. </b> </p>`
          } else{
              text += `</div>
              <p> <b> Please think of actions ${agent} could do. </b> </p>`
          }
          
          text += `<p>
              ${conditional_text }</p>
              <div align="center">`
          
          // adds participants previous actions to the text
          for (let i in response_list){
              text += (`<p>${response_list[i]}</p>`)
          }

          text += `</div>`
          return text
      },
      choices: function(){
          if (response_list.length == 0){
              return [' '] // participants have to enter at least one response
          } else{
              return ['x',' '] // once they've entered at least one response they can move on by pressing x
          }},
      data: {
          trial_name: "option_gen_prompt",
          context: jsPsych.timelineVariable('context')
      }, 
      
  }

  // possibility generation input
  const option_gen_response = {

      timeline: [{
          type: jsPsychSurveyText,

          preamble: function(){
              let text = `<div style="font-size: 16px"; align="left"> Please read the following scenario:
                  <div style= "border-style:solid; padding: 5px"> ${jsPsych.timelineVariable('text')}`
              if(forceFirst){
                  text += `<p>${agent} decides to ${action_text}.</div>
                  <p> What is another action ${agent} could have done? </p>
                  <p>Press \'Enter\' to  submit this response.</p>
                  <div align="center">`
              } else{
                  if (response_list.length==0){ // first response
                      text+= `</div>
                      <p> What is one action ${agent} could do? </p>
                      <p>Press \'Enter\' to  submit this response.</p>
                      <div align="center">`
                  } else{
                      text+= `</div>
                      <p> What is another action ${agent} could do? </p>
                      <p>Press \'Enter\' to  submit this response.</p>
                      <div align="center">`
                  }
                  
              }
              
              // includes participants' previous generations above their current response box
              for (let i in response_list){
                  text += (`<p>${response_list[i]}</p>`)
              }
              text += `</div>`
              return text
          },

          timeline: [
              {questions:[{
                  prompt: '',
                  name: 'answer',
                  required: function(){
                      if (requirements && response_list.length==0){
                          return true // requires participants to submit at least one response
                      } else{
                          return false
                      }
                  }
              }]
          }],

          data: {
              trial_name: 'option_gen_answer',
              context: jsPsych.timelineVariable('context')},

          on_timeline_finish: function(){
              let lastAnswer = jsPsych.data.get().last(1).values()[0].response.answer
              if(lastAnswer.trim().length!==0){ // avoids adding blank responses
                  response_list.push(lastAnswer) // adds most recently generated answer to response_list
              }

              // reformats response data for easier analysis
              jsPsych.data.get().last(1).values()[0].response = jsPsych.data.get().last(1).values()[0].response.answer
          }
      }],

      // this page is only shown if the participant entered 'space' on the prompting page. if they pressed x, it moves on
      conditional_function: function(){
          if(jsPsych.data.get().last(1).values()[0].response == ' ' ){
              return true
          } else{
              return false
          }
      }   
  }

  //loops through option generation until the participant presses x to move on
  const gen_loop ={
      timeline: [option_gen_prompt, option_gen_response],
      loop_function: function(data){
          if(jsPsych.data.get().last(1).values()[0].trial_name=="option_gen_answer"){
              return true
          } else{
              return false
          }
      },
      
      // on_timeline_finish: function(){
      // 	console.log(jsPsych.data.get().last(1).values()[0].response=={answer: 'a'})
      // 	response_list: response_list.push(jsPsych.data.get().last(1).values()[0].response.number1)
      // }
  }

  // probability, morality and normality questions
  const questions = ['probable or improbable', 'moral or immoral', 'normal or abnormal']

  // in this trial participants rate the options they generated
  const gen_rate = {
      type: jsPsychSurveyHtmlForm,
      preamble: function(){
          return "<div align='left'> <b> Consider one of the actions you believed "+ agent +" could do: </b> <p>"+
          response_list[i] + "</div>"
      },

      html: function () {
          let text = ""
          // creates three slider questions, one for each question
          for (var question of questions) {
              text += `<p>Do you think this is a ${question} thing for ${jsPsych.timelineVariable('agent')} to do?
                  <input name="${question}" type="range" class="jspsych-slider" value="v0" min="0" max="100" step="1" require_movement="true"
                  id="jspsych-html-slider-response"/></p>
                  <div style="display: flex; justify-content: space-between; width: 100%;">
              <div style="font-size: small">${question.split(" ")[2]}</div>
              <div style="font-size: small">${question.split(" ")[0]}</div>
          </div>`;
          }

          return text;
      },
      data: {
          trial_name: 'response_ratings',
          context: jsPsych.timelineVariable('context'),
          action: function(){
              return response_list[i]}   
      },
      // on_finish: function(data){
          // data.probability = jsPsych.data.getLastTrialData().trials[0].response['probable or improbable']
          // data.morality = jsPsych.data.getLastTrialData().trials[0].response['moral or immoral']
          // data.normality = jsPsych.data.getLastTrialData().trials[0].response['normal or abnormal']
          // data.response = ``+jsPsych.data.getLastTrialData().trials[0].response['probable or improbable']+'.'+
          // jsPsych.data.getLastTrialData().trials[0].response['moral or immoral']+'.'+
          // jsPsych.data.getLastTrialData().trials[0].response['normal or abnormal']
          // }
  }

  var i = 0
  // loops through all of the items in response_list, having participants rate each one
  const ratings_loop = {
      timeline: [
          gen_rate
      ],
      loop_function: function(){
          if (i < response_list.length-1){
              i += 1
              return true
          } else{
              return false
          }
      },
      on_start: function(){
          // console.log(response_list, i, response_list[i])
      }
  }

  // rating the actual action the agent did
  const action_rate = {
      type: jsPsychSurveyHtmlForm,
      preamble: function(){
          return "<div align='left'> <mark> <b> Consider "+ agent +"\'s actual action: </b> </mark> <p>"+
          action_text +"</div>"
      },
      html: function () {

          var text = ""

          for (var question of questions) {
              text += `<p>Do you think this is a ${question} thing for ${jsPsych.timelineVariable('agent')}  to do?
                  <input name="${question}" type="range" class="jspsych-slider" value="50" min="0" max="100" step="1"
                  id="jspsych-html-slider-response"  /></p>
                  <div style="display: flex; justify-content: space-between; width: 100%;">
              <div style="font-size: small">${question.split(" ")[2]}</div>
              <div style="font-size: small">${question.split(" ")[0]}</div>
          </div>`;
          }

          return text;
      },
      data: {
          trial_name: 'actual_action_ratings',
          context: jsPsych.timelineVariable('context'),
          action: function(){
              return action_text},
          action_numb: function(){
              return action_numb
          }
      },
      // on_finish: function(data){
          // data.probability = jsPsych.data.getLastTrialData().trials[0].response['probable or improbable']
          // data.morality = jsPsych.data.getLastTrialData().trials[0].response['moral or immoral']
          // data.normality = jsPsych.data.getLastTrialData().trials[0].response['normal or abnormal']
          // data.response = ``+jsPsych.data.getLastTrialData().trials[0].response['probable or improbable']+'.'+
          // jsPsych.data.getLastTrialData().trials[0].response['moral or immoral']+'.'+
          // jsPsych.data.getLastTrialData().trials[0].response['normal or abnormal']
          // }
  }

  let big_loop_timeline: Array<object>

  if(forceFirst){
    big_loop_timeline = [scenario, force, attention_check, gen_loop, ratings_loop, action_rate]
  } else{
    big_loop_timeline =  [scenario, gen_loop, force, attention_check, ratings_loop, action_rate]
  }
  

  // defines the big loop timeline
  // this is what gets looped through for each context
  const big_loop = {
      timeline: big_loop_timeline,
      
      timeline_variables: contexts_table, // reads in info from contexts_table as a timeline variable
      sample: {
          type: "without-replacement",
          size: numberOfContexts // number of contexts a participant sees
      }
  }
  timeline.push(big_loop)

  const debrief = {
      type: jsPsychHtmlButtonResponse,
      stimulus: ' <p style="font-size:16px; color:black;margin:20px; font-weight:bold"> Study Debriefing </p>\
      <p style="font-size:16px; color:black; margin:20px;">Judgement and decision making are important aspects of public and private life. Using surveys like the one you just completed, we are examining the factors that go into making social decisions. </p> \
      <p style="font-size:16px; color:black; margin:20px;font-weight: bold"> How is this being tested? </p>\
      <p style="font-size:16px; color:black; margin:20px"> We have asked you to respond to stories or videos that differ on several important factors. By isolating different variables that are involved in social thought, we can better understand how we arrive at complex decision-making. For example, some actions are seen as more worthy of blame if they are performed intentionally. Harming someone on purpose is generally worse than harming someone by accident, or even harming someone in a way that is foreseen but not intended. </p>\
      <p style="font-size:16px; color:black; margin:20px;font-weight: bold"> Main questions and hypotheses: </p>\
      <p style="font-size:16px; color:black; margin:20px"> A fundamental goal of our research is to understand the cognitive and emotional factors that influence social judgment and decision-making. We are studying these factors by presenting people with hypothetical questions that vary in specific ways and seeing which factors make a difference. Some people filled out the same survey that you just filled out. Others got slightly different surveys. </p>\
      <p style="font-size:16px; color:black; margin:20px; font-weight: bold"> Why is this important to study? </p>\
      <p style="font-size:16px; color:black; margin:20px"> By comparing answers on these important factors, we learn about what factors affect social judgment. This has crucial implications for many public domains, including the legal system. </p>\
      <p style="font-size:16px; color:black; margin:20px; font-weight: bold"> How to learn more: </p>\
      <p style="font-size:16px; color:black; margin:20px"> If you are interested in learning more, you may want to consult the following articles:\
      Phillips, J., & Cushman, F. (2017). Morality constrains the default representation of what is possible. Proceedings of the National Academy of Sciences of the United States of America, 114(18), 4649–4654. <a href=https://doi.org/10.1073/pnas.1619717114>doi.org/10.1073/pnas.1619717114.</a>\
      Phillips, J., Morris, A., & Cushman, F. (2019). How we know what not to think. Trends in Cognitive Sciences, 23(12), 1026–1040. <a href=https://doi.org/10.1016/j.tics.2019.09.007>doi.org/10.1016/j.tics.2019.09.007.</a>\
      Phillips, J., Buckwalter, W., Cushman, F., Friedman, O., Martin, A., Turri, J., Santos, L., & Knobe, J. (2020). Knowledge before Belief. Behavioral and Brain Sciences, 1-37. doi:10.1017/S0140525X20000618</p>\
      <p style="font-size:16px; color:black; margin:20px; font-weight: bold"> How to contact the researcher: </p>\
      <p style="font-size:16px; color:black; margin:20px"> If you have questions or concerns about your participation or payment or want to request a summary of research findings, please contact the Primary Investigator: Dr. Jonathan Phillips, </p> <a href=mailto:Jonathan.S.Phillips@dartmouth.edu>Jonathan.S.Phillips@dartmouth.edu.</a>\
      <p style="font-size:16px; color:black; margin:20px; font-weight: bold"> Whom to contact about your rights in this research: </p>\
      <p style="font-size:16px; color:black; margin:20px"> If you have questions, concerns, complaints, or suggestions about the present research, you may call the Office of the Committee for the Protection of Human Subjects at Dartmouth College (603) 646-6482 during normal business hours. </p>\
      <p style="font-size:16px; color:black; margin:20px; font-weight: bold"> Thank you for your participation! </p>'
      ,
      choices: ['Continue'],
      data: {
          trial_name: 'debrief'
      }
  }
  timeline.push(debrief)

  // start the experiment
  await jsPsych.run(timeline)
}
