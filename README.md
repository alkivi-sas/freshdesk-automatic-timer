# freshdesk-automatic-timer
Freshdesk App that automatically increase timer for open tickets when working on them.

## what does it do
the app once loaded checks for timers
creates one of 1 minute if none have been created
updates it every x minutes by adding x minutes (x is the step given in the iparams)
keeps going until the page is closed

## how to install and test it
https://developers.freshdesk.com/v2/docs/quick-start/

## how does it works / how to modify it
every operation is done with promises
every exchange of information is done with GET? PUT and POST requests : 
 - GET are using feshworks Data API (client.data.get or client.iparam.get) that you can check here https://developer.freshdesk.com/v2/docs/data-api/
 - PUT and POST are using API requests that you can check here https://developer.freshdesk.com/api/#tickets

## what can be improved
 - if the ticket status is changed but the page is kept open the app should stop updating the timer
 - the timer could be assigned to the agent looking at the ticket
 - there could be a button to manually stop and start it
 - if the agent looking at the ticket is not the same as the responder_id the time should not be undated
 - the error message is not easy to spot when it appears
