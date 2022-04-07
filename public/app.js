/*
 * Frontend logic for the Application
 */

// Container for the frontend application
const app = {};

// Config
app.config = {
  sessionToken: false,
};

// AJAX Client (for the resful API)
app.client = {};

// Interface for making API calls
app.client.request = (
  headers,
  path,
  method,
  queryStringObject,
  payload,
  callback
) => {
  // Set defaults
  headers = typeof headers == 'object' && headers !== null ? headers : {};
  path = typeof path == 'string' ? path : '/';
  method =
    typeof method == 'string' &&
    ['POST', 'GET', 'PUT', 'DELETE'].indexOf(method) > -1
      ? method.toUpperCase()
      : 'GET';
  queryStringObject =
    typeof queryStringObject == 'object' && queryStringObject != null
      ? queryStringObject
      : {};
  payload = typeof payload == 'object' && payload != null ? payload : {};
  callback = typeof callback == 'function' ? callback : false;

  // For each query string parameter sent, add it to the path
  const requestUrl = path + '?';
  const count = 0;
  for (const item in queryStringObject) {
    // this for loop only for the sake of counting the items in the queryStringObject
    if (queryStringObject.hasOwnProperty(item)) {
      count++;
      // If at least one query string parameter has already been added, prepend new ones with an ampersand
      if (counter > 1) {
        requestUrl += '&';
      }
      requestUrl += item + '=' + queryStringObject[item];
    }
  }

  // Form the http request as a JSON type
  const xhr = new XMLHttpRequest();
  xhr.open(method, requestUrl, true);
  xhr.setRequestHeader('Content-type', 'application/json');

  // For each header sent, add it to the request
  for (const item in headers) {
    if (headers.hasOwnProperty(item)) {
      xhr.setRequestHeader(item, headers[item]);
    }
  }

  // If there is a current session set, add that as a header
  if (app.config.sessionToken) {
    xhr.setRequestHeader('token', app.config.sessionToken.id);
  }

  // When the request comes back, handle the response
  xhr.onreadystatechange = () => {
    if (xhr.readyState == XMLHttpRequest.DONE) {
      const statusCode = xhr.status;
      const responseReturned = xhr.responseText;

      // Callback if requested
      if (callback) {
        try {
          const parsedResponse = JSON.parse(responseReturned);
          callback(statusCode, parsedResponse);
        } catch (e) {
          callback(statusCode, false);
        }
      }
    }
  };

  // Send the payload as JSON
  const payloadString = JSON.stringify(payload);
  xhr.send(payloadString);
};

// Bind the forms
app.bindForms = () => {
  if (document.querySelector('form')) {
    document.querySelector('form').addEventListener('submit', (e) => {
      const form = document.querySelector('form');
      // Stop it from submitting
      e.preventDefault();
      const formId = form.id;
      const path = form.action;
      const method = form.method.toUpperCase(); //this is very important because in the HTMLFormElement the method is !!!lowercase!!!

      // Hide the error message (if it's currently shown due to a previous error)
      document.querySelector('#' + formId + ' .formError').style.display =
        'hidden';

      // Turn the inputs into a payload
      const payload = {};
      const elements = form.elements;
      for (let i = 0; i < elements.length; i++) {
        if (elements[i].type !== 'submit') {
          const valueOfElement =
            elements[i].type == 'checkbox'
              ? elements[i].checked
              : elements[i].value;
          payload[elements[i].name] = valueOfElement;
        }
      }

      // Call the API
      app.client.request(
        undefined,
        path,
        method,
        undefined,
        payload,
        (statusCode, responsePayload) => {
          // Display an error on the form if needed
          if (statusCode !== 200) {
            // Try to get the error from the api, or set a default error message
            const error =
              typeof responsePayload.Error == 'string'
                ? responsePayload.Error
                : 'An error has occured, please try again';

            // Set the formError field with error text
            document.querySelector('#' + formId + ' .formError').innerHTML =
              error;

            // Show (unhide) the form error field on the form
            document.querySelector('#' + formId + ' .formError').style.display =
              'block';
          } else {
            // If successful, send to form response processor
            app.formResponseProcessor(formId, payload, responsePayload);
          }
        }
      );
    });
  }
};

// Form response processor
app.formResponseProcessor = (formId, requestPayload, responsePayload) => {
  const functionToCall = false;
  // If account creation was successful, try to immediately log the user in
  if (formId == 'accountCreate') {
    console.log('The acocuntCreate form was successfully submitted');
    // @TODO Do something here now that the account has been created successfully
    // Take the phone and password, and use it to log the user in
    const newPayload = {
      phone: requestPayload.phone,
      password: requestPayload.password,
    };

    // Call the API
    app.client.request(
      undefined,
      'api/tokens',
      'POST',
      undefined,
      newPayload,
      (newStatusCode, newResponsePayload) => {
        // Display an error on the form if needed
        if (newStatusCode !== 200) {
          // Set the formError field with the error text
          document.querySelector('#' + formId + ' .formError').innerHTML =
            'Sorry, an error occured. Please try again.';
          // Show (unhide) the form error field on the form
          document.querySelector('#' + formId + ' .formError').style.display =
            'block';
        } else {
          // If successful, set the token and redirect the user
          app.setSessionToken(newResponsePayload);
          window.location = '/checks/all';
        }
      }
    );
  }
  // If login was successful, set the token in localstorage and redirect the user
  if (formId == 'sessionCreate') {
    app.setSessionToken(responsePayload);
    window.location = '/checks/all';
  }
};

// Get the session token from localStorage and set it in the app.config object
app.getSessionToken = () => {
  const tokenString = localStorage.getItem('token');
  if (typeof tokenString == 'string') {
    try {
      const token = JSON.parse(tokenString); // this creates an object from the string
      app.config.sessionToken = token;
      if (typeof token == 'object') {
        app.setLoggedInClass(true);
      } else {
        app.setLoggedInClass(false);
      }
    } catch (error) {
      console.log(error.message);
      app.config.sessionToken = false;
      app.setLoggedInClass(false);
    }
  }
};

// Set or remove the loggedIn class from the body
app.setLoggedInClass = (add) => {
  const body = document.querySelector('body');
  if (add) {
    body.classList.add('loggedIn');
  } else {
    body.classList.remove('loggedIn');
  }
};

// Set the session token in the app.config object as well as localstorage
app.setSessionToken = (token) => {
  app.config.sessionToken = token;
  const tokenString = JSON.stringify(token);
  localStorage.setItem('token', tokenString);
  if (typeof token == 'object') {
    app.setLoggedInClass(true);
  } else {
    app.setLoggedInClass(false);
  }
};

// Renew the token
app.renewToken = (callback) => {
  const currentToken =
    typeof app.config.sessionToken == 'object'
      ? app.config.sessionToken
      : false;
  if (currentToken) {
    // Update the token with a new expiration
    const payload = {
      id: currentToken.id,
      extend: true,
    };
  }
};

// Init (bootstrapping)
app.init = () => {
  // Bind all form submission
  app.bindForms();
};

// Call this init processor after the window loads
window.onload = () => {
  app.init();
};
