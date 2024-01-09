# ICUK Broadband Availability Checker

Integrate the ICUK broadband availability checker into your JS web application

## Usage

This library is general use (inputs through function parameters and outputs raw html so compatible with any web framework) and takes in data and includes a class for rendering html/js to the client side (BroadbandAvailabilityChecker) and a function for proxying requests towards
the ICUK API (ApiProxy).

To use this library an endpoint should be setup that points data towards ApiProxy through the parameter: 'apidata'
You can then layout the availability checker on the webpage using BroadbandAvailabilityChecker which will output javascript which will interact with the proxy
endpoint specified.

Be careful to take into account that this library does not integrate with CRSF protection of the web framework being used so protection may have to be disabled on proxy endpoint.

### ExpressJS Example Application

```js
const express = require('express')
const icuk = require('icuk-broadband-checker-js')
const app = express()
const port = 3000

app.use(express.json());
app.use(express.urlencoded());

/**
 * Proxys requests towards the ICUK API using your credentials
 */
app.post('/api', async function (req, res) {
    // Add user authentication here!
  res.send(JSON.stringify(await icuk.ApiProxy(req.body.apidata, "ExampleAPIUsername", "ExampleAPIPassword")))
})

/**
 * Render the different components in the form, 
 * these components can be put in seperate places on the same page.
 */
app.get("/", function(req, res) {
    // Replace /api with wherever you put your proxy endpoint
    const baChecker = new icuk.BroadbandAvailabilityChecker("/api");
    res.send(`
    ${baChecker.RenderSearch()}
    ${baChecker.RenderAddressSelect()}
    ${baChecker.RenderResults()}
    ${baChecker.RenderScripts()}`)
})

app.listen(port, () => {})
```

### Edit error message
To swap out the error message that occurs when an availability check fails you can use the error message as a parameter of render_search
```js
baChecker.RenderSearch("New Error Message!")
```

## Custom Styles
### Custom Stylesheet
You can develop your own stylesheet with relative ease as each module's elements are very simple to identify with their id's for example the button in the search
uses the id "broadband-availability-search-submit" and the input box uses "broadband-availability-search-input".
You can use this [style template](https://raw.githubusercontent.com/BoronBGP/icuk-broadband-checker-cs/master/Templates/Styles.sbn) as a reference on development
