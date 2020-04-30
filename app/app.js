"use strict";

function alertFreshdesk(message) {
	console.error(message);
  return client.interface.trigger("showNotify", {
    type: "alert", title: "Try again",
    message
  });
}

$(document).ready( function() {
  app.initialized()
  .then(function(_client) {
    var client = _client;
    window.client = client;
    
    // First we need ticketData
    getTicketData()
    .then(function(ticketData) {

      // If ticket is not open, return
      if (parseInt(ticketData.ticket.status) !== 2) {
        console.debug("ticketData status is ", ticketData.ticket.status, ": rejecting");
        return;
      }

      // Then we need to :
      // 1 - get timer_step
      // 2 - createFirstTimeEntry before starting automatic update
      const timerStep = getTimerStep();
      const timeEntryID = checkTimeEntries(ticketData);

      // Once initial check is OK, start automatic update
      Promise.all([timerStep, timeEntryID])
      .then(function(values) {
        const step = values[0];
        const timeEntryID = values[1];
        if (!timeEntryID) {
          return alertFreshdesk('Error time entry not returned');
        }
        return timerUpdateLoop(step, timeEntryID);
      })
      .catch(function() {
        return alertFreshdesk('Error getting promiseAll');
      });
    })
    .catch(function() {
      return alertFreshdesk('Error getting ticketData');
    });
  })
  .catch(function() {
    return alertFreshdesk('Error app initialized');
  });
});

const getTicketData = function getTicketData() {
  return client.data.get("ticket")
  .then(function(ticketData) {
    return ticketData;
  })
  .catch(function(){
    return alertFreshdesk('Error getting ticket')
  })
}

const getTimerStep = function getTimerStep() {
  console.debug("getTimerStep");
  return client.iparams.get("timer_step")
  .then(function(data) {
    var timerStep = parseInt(data.timer_step);
    timerStep = timerStep * 60 * 1000;
    console.debug("Timer step is " + timerStep + " ms");
    return timerStep
  })
  .catch(function() {
    return alertFreshdesk('Error getting timer_step')
  });
}

const checkTimeEntries = function checkTimeEntries(ticketData) {
  console.debug("checkTimeEntries");
  return client.data.get("time_entry")
  .then(function(entriesData) {
    return client.data.get("loggedInUser").then(
      function(userData) {
        const numberOfTimeEntries = entriesData.time_entry.time_entries.length;
        const entries = entriesData.time_entry
        console.debug('We have ' + numberOfTimeEntries + ' time_entries');
        if (numberOfTimeEntries === 0)
          return createTimeEntry(ticketData, userData.loggedInUser.id);
        else {
	  var time_entry = entriesData.time_entry.time_entries.find(time_entry => time_entry.agent_id === userData.loggedInUser.id);
          if(time_entry == undefined)
            return createTimeEntry(ticketData, userData.loggedInUser.id);
          else
            return time_entry.id;
        }
      })
      .catch(function(){
        return alertFreshdesk('Error getting user_data');
      });
  })
  .catch(function(){
    return alertFreshdesk('Error getting time_entry')
  });
};

var createTimeEntry = function createTimeEntry(ticketData, userId) {
  console.debug('createTimeEntry');
  var baseUrl = "<%= iparam.freshdesk_domain %>/api/v2/tickets/";
  var url = baseUrl.concat(ticketData.ticket.id, "/time_entries");
  var body = {
    billable: false,
    timer_running: false,
    agent_id: userId,
    time_spent: "00:01"
  }

  var options = {
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic <%= encode(iparam.freshdesk_key + ':x') %>"
    },
    body: JSON.stringify(body)
  };
  return client.request.post(url, options)
  .then(function(data) {
    console.debug('time entry ', JSON.parse(data.response).id, ' created');
    return JSON.parse(data.response).id;
  })
  .catch(function(e) {
    console.error('Error while posting first time entry', e);
    return alertFreshdesk('Error posting first time entry');
  })
};

const timerUpdateLoop = function timerUpdateLoop(step, timeEntryID) {
  console.debug('timerUpdateLoop');
  Promise.resolve()
  .then(function resolver() {
    return timerUpdatePromiseWithTimeout(step, timeEntryID)
    .then(resolver)
    .catch(function(){
      return alertFreshdesk('Error timerUpdateLoop resolver');
    });
  })
  .catch(function(){
    return alertFreshdesk('Error timerUpdateLoop');
  });
};

var timerUpdatePromiseWithTimeout = function timerUpdatePromiseWithTimeout(step, timeEntryID) {
  console.debug('timerUpdatePromiseWithTimeout');
  const timerPromise = new Promise(function(resolve) {
    setTimeout(function() {
       resolve(timerUpdate(step, timeEntryID));
    }, step)
  });
  return timerPromise
}

var timerUpdate = function timerUpdate(step, timerEntryID) {
  return client.data.get("time_entry")
  .then(function(data) {
    var time_entry = data.time_entry.time_entries.find(time_entry => time_entry.id === timerEntryID);
    if (time_entry == undefined)
      return alertFreshdesk('Error cannot retreive timer');
    console.debug("Going to add time to entry", time_entry)
    var totalMinutes = Math.floor(time_entry.time_spent/60) + step/60000;
    var totalHours = Math.floor(totalMinutes/60);
    totalMinutes = totalMinutes - (totalHours*60);
    const timeSpent = String(totalHours).padStart(2, '0') + ":" + String(totalMinutes).padStart(2, '0');
    console.debug("time spent ", timeSpent);
    var baseUrl = "<%= iparam.freshdesk_domain %>/api/v2/time_entries/";
    var url = baseUrl.concat(time_entry.id);
    var body = {
      time_spent: timeSpent
    }
    var options = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic <%= encode(iparam.freshdesk_key + ':x') %>"
      },
      body: JSON.stringify(body)
    };
    return client.request.put(url, options)
    .then(function() {
      console.debug("Timer updated !");
      return true;
    })
    .catch(function(e){
      console.error('weird', e);
      return alertFreshdesk('Error putting time_entry')
    });
  })
  .catch(function(){
    return alertFreshdesk('Error increaseTimer');
  });
}
