const url = require('url');
const needle = require('needle');
const path = require('path');
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

const apiHost = "https://api.interdns.co.uk";
const oauthEndpoint = "/oauth/token";
const availabilityEndpoint = "/broadband/availability";
const addressEndpoint = "/broadband/address";

class BroadbandAvailabilityChecker {
    constructor(apiPath) {
        this.id = genRanHex(12);
        this.apiPath = apiPath;
    }

    RenderSearch(errorMessage = "Error") {
        return `
<div id="broadband-availability-search" broadband-availability-id="${ this.id }">
	<input id="broadband-availability-search-input"/>
	<button id="broadband-availability-search-submit" onclick="cli_or_postcode('${ this.id }', '${ this.apiPath }')">Check Availability</button>
	<br/>
	<a id="broadband-availability-search-error" style="display: none;">${ errorMessage }</a>
</div>`;
    }

    RenderAddressSelect() {
        return `
<table id="broadband-availability-address-list" broadband-availability-id="${ this.id }">
	<thead id="broadband-availability-address-head">
		<tr>
			<th style="width: 5%;">

			</th>
			<th>
				<input type="text" placeholder="Filter" id="broadband-availability-address-filter" onkeyup="filterAddressList('${ this.id }')">
			</th>
		</tr>
	</thead>
	<tbody id="broadband-availability-address-body">
	</tbody>
</table>`;
    }

    RenderResults() {
        return `
﻿<table id="broadband-availability-results" broadband-availability-id="${ this.id }">
<thead id="broadband-availability-results-head">
  <tr>
    <th></th>
    <th>Download Speeds<br>(Mbps)</th>
    <th>Upload Speeds<br>(Mbps)</th>
    <th>BT Wholesale</th>
    <th>TalkTalk Business</th>
  </tr>
</thead>
<tbody id="broadband-availability-results-body">
  <tr id="ADSL2">
    <td>ADSL 2+</td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
  <tr id="AnnexM">
    <td>ADSL 2+ Annex M</td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
  <tr id="FTTC">
    <td>FTTC</td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
  <tr id="SoGEA">
    <td>SoGEA</td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
  <tr id="GFast">
    <td>G.Fast</td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
  <tr id="FTTP">
    <td>FTTP</td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
   <tr id="SOADSL">
	<td>SOADSL</td>
	<td></td>
	<td></td>
	<td></td>
   <td></td>
   </tr>
</tbody>
</table>`;
    }

    RenderScripts() {
        return `
        <script>
        function populateTable(broadbandAvailabilityId, jsonData) {
            const table = document.querySelector(\`#broadband-availability-results[broadband-availability-id="${ this.id }"]\`);
            if (!table) {
                console.error('Table with specified broadband availability ID not found');
                return;
            }
    
            const tableBody = table.querySelector('tbody');
    
            // Clear the content of the table cells except headers and technology names
            tableBody.querySelectorAll('tr').forEach(row => {
                const cells = row.querySelectorAll('td:not(:first-child)'); // Exclude the first cell (technology name)
                cells.forEach(cell => {
                cell.textContent = ''; // Clear the content of the cell
                });
            });
    
            jsonData.forEach(entry => {
                if (entry.technology == "LLU") {
                    entry.technology = "ADSL2";
                }
    
                const rowId = entry.technology.replace(/[^\\w\\s]/gi, ''); // Remove special characters for ID
                const row = tableBody.querySelector(\`#\${rowId}\`); // Use tableBody here
                if (row) {
                    const downloadSpeedCell = row.querySelector('td:nth-child(2)');
                    const uploadSpeedCell = row.querySelector('td:nth-child(3)');
    
                    let downloadSpeed = entry.speed_range ? entry.speed_range : entry.likely_down_speed;
                    let uploadSpeed = entry.speed_range_up ? entry.speed_range_up : entry.likely_up_speed;
    
                    // Mark the download speed if it's higher than the current value
                    if (!downloadSpeedCell.textContent || parseFloat(downloadSpeed) > parseFloat(downloadSpeedCell.textContent)) {
                        downloadSpeedCell.textContent = downloadSpeed || '';
                    }
    
                    // Mark the upload speed if it's higher than the current value
                    if (!uploadSpeedCell.textContent || parseFloat(uploadSpeed) > parseFloat(uploadSpeedCell.textContent)) {
                        uploadSpeedCell.textContent = uploadSpeed || '';
                    }
    
                    const btWholesaleCell = row.querySelector('td:nth-child(4)');
                    const talkTalkCell = row.querySelector('td:nth-child(5)');
    
                    // Mark availability based on BT Wholesale provider
                    if (entry.provider.startsWith('WBC') && entry.availability) {
                        btWholesaleCell.innerHTML = '<span id="broadband-availability-available">Available</span>';
                    }
    
                    // Mark availability based on TalkTalk Business provider
                    if (entry.provider === 'TTB' && entry.availability) {
                        talkTalkCell.innerHTML = '<span id="broadband-availability-available">Available</span>';
                    }
                }
            });
    
            // Iterate over the table again to fill empty provider cells as "Not Available" and speeds as "-"
            tableBody.querySelectorAll('tr').forEach(row => {
                const downloadSpeedCell = row.querySelector('td:nth-child(2)');
                const uploadSpeedCell = row.querySelector('td:nth-child(3)');
                const btWholesaleCell = row.querySelector('td:nth-child(4)');
                const talkTalkCell = row.querySelector('td:nth-child(5)');
    
                if (!downloadSpeedCell.textContent) {
                    downloadSpeedCell.textContent = '-';
                }
                
                if (!uploadSpeedCell.textContent) {
                    uploadSpeedCell.textContent = '-';
                }
    
                if (!btWholesaleCell.textContent) {
                    btWholesaleCell.innerHTML = '<span id="broadband-availability-not-available">Not Available</span>';
                }
                
                if (!talkTalkCell.textContent) {
                    talkTalkCell.innerHTML = '<span id="broadband-availability-not-available">Not Available</span>';
        }
        });
        }
    
        function populateAddressList(id, jsonData, path) {
        // Get the table body element
        const addressList = document.querySelector('#broadband-availability-address-list[broadband-availability-id="' + id + '"]');
        const tableBody = addressList.querySelector("tbody");
    
        // Clear the table body first
        tableBody.innerHTML = '';
    
        // Loop through the addresses and populate the table
        jsonData.addresses.forEach((address, index) => {
        const row = document.createElement("tr");
    
        const radioCell = document.createElement("td");
        const radioInput = document.createElement("input");
        radioInput.type = "radio";
        radioInput.onclick = function() {
            sendAddressPos(id, JSON.stringify(address), path)
        };
        radioCell.appendChild(radioInput);
        row.appendChild(radioCell);
    
        const addressCell = document.createElement("td");
    
        // Convert from null to empty string to value from user
        if (address.nad_key == null)
        address.nad_key = "";
    
        addressCell.innerHTML = \`
        \${formatAddress(address)}
        <input id="broadband-availability-address-pos" style="display: none;">
            <span id="broadband-availability-address-nad"> \${address.nad_key}</span>
            \`;
                row.appendChild(addressCell);
    
                tableBody.appendChild(row);
            });
    
            // Add the "None of the above" row
            const noneRow = document.createElement("tr");
            const noneRadioCell = document.createElement("td");
            const noneRadioInput = document.createElement("input");
            noneRadioInput.type = "radio";
            noneRadioInput.onclick = function() {
                sendAddressPos(id, "$" + jsonData.addresses[0]["postcode"], path)
            };
            noneRadioCell.appendChild(noneRadioInput);
            noneRow.appendChild(noneRadioCell);
    
            const noneAddressCell = document.createElement("td");
            noneAddressCell.innerText = "None of the above";
            const noneAddressPosInput = document.createElement("input");
            noneAddressPosInput.id = "broadband-availability-address-pos";
            noneAddressPosInput.value = "-1";
            noneAddressPosInput.style.display = "none";
            noneAddressCell.appendChild(noneAddressPosInput);
            noneRow.appendChild(noneAddressCell);
    
            tableBody.appendChild(noneRow);
        }
    
        function filterAddressList(id) {
            const addressList = document.querySelector('#broadband-availability-address-list[broadband-availability-id="' + id + '"]');
            const filterInput = addressList.querySelector('#broadband-availability-address-filter');
            const filterText = filterInput.value.toLowerCase();
            const addressRows = document.querySelectorAll("#broadband-availability-address-body tr");
    
            addressRows.forEach(row => {
                const addressText = row.querySelector("td:nth-child(2)").textContent.toLowerCase();
                if (addressText.includes(filterText) || addressText == "none of the above") {
                    row.style.display = "table-row";
                } else {
                    row.style.display = "none";
                }
            });
        }
    
        function sendAddressPos(id, apidata, path) {
            hideAddressList(id);
            showResults(id);
    
            fetch(path, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: "apidata=" + encodeURIComponent(apidata)
            })
            .then(response => response.json())
            .then(data => {
                populateTable(id, data["products"]);
            })
            .catch(error => {
                console.error("Error:", error);
            });
        }
    
        function formatAddress(address) {
            let parts = [];
    
            if (address.premises_name) parts.push(address.premises_name);
    
            let thoroughfare_list = [];
            if (address.thoroughfare_number) thoroughfare_list.push(address.thoroughfare_number);
            if (address.thoroughfare_name) thoroughfare_list.push(address.thoroughfare_name);
            if (thoroughfare_list.length > 0) parts.push(thoroughfare_list.join(" "));
    
            if (address.locality) parts.push(address.locality);
            if (address.post_town) parts.push(address.post_town);
            if (address.county) parts.push(address.county);
            if (address.postcode) parts.push(address.postcode);
    
            return parts.join(', ');
        }
    
        function valid_postcode(postcode) {
            postcode = postcode.replace(/\\s/g, "");
            var regex = /^[A-Z]{1,2}[0-9]{1,2} ?[0-9][A-Z]{2}$/i;
            return regex.test(postcode);
        } 
    
        function showResults(id) {
            const table = document.querySelector(\`#broadband-availability-results[broadband-availability-id="\${id}"]\`);
            const tableBody = table.querySelector('tbody');
    
            table.style.display = 'inline-table';
    
            // Fill table with loading animations
            tableBody.querySelectorAll('tr').forEach(row => {
                const cells = row.querySelectorAll('td:not(:first-child)'); // Exclude the first cell (technology name)
                cells.forEach(cell => {
                cell.innerHTML = '<div class="broadband-availability-loader"></div>'; // Put loading animation into cell
                });
            });
        }
    
        function hideResults(id) {
            const table = document.querySelector(\`#broadband-availability-results[broadband-availability-id="\${id}"]\`);
            const tableBody = table.querySelector('tbody');
    
            table.style.display = '';
    
            // Remove all loading animations
            tableBody.querySelectorAll('tr').forEach(row => {
                const cells = row.querySelectorAll('td:not(:first-child)'); // Exclude the first cell (technology name)
                cells.forEach(cell => {
                cell.innerHTML = ''; // Clear the content of the cell
                });
            });
        }
    
        function showAddressList(id) {
            const addressList = document.querySelector('#broadband-availability-address-list[broadband-availability-id="' + id + '"]');
            addressList.style.display = 'inline-table';
        }
    
        function hideAddressList(id) {
            const addressList = document.querySelector('#broadband-availability-address-list[broadband-availability-id="' + id + '"]');
            addressList.style.display = 'none';
        }
    
        function cli_or_postcode(id, path) {
            let cli_postcode = document.querySelector("div[broadband-availability-id='" + id + "'] input").value;
            const errorMessage = document.querySelector('#broadband-availability-search-error');
            const table = document.querySelector(\`table[broadband-availability-id="\${id}"]\`);
            const tableBody = table.querySelector('tbody');
    
            errorMessage.style.display = 'none';
    
            // If not searching for postcode then show results module immediatly
            if (!valid_postcode(cli_postcode))
                showResults(id);
            else
                hideResults(id);
            
            // Make request to api endpoint
            fetch(path, {
                method: "post",
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: "apidata=" + encodeURIComponent(cli_postcode)
            })
            .then((response) => {
                if (response.ok) { 
                    return response.json();
                }
                return Promise.reject(response); 
            })
            .then((json) => {
                if (typeof json["products"] != 'undefined'){
                    populateTable(id, json["products"]);
                } else if (typeof json["addresses"] != 'undefined') {
                    populateAddressList(id, json, path);
                    showAddressList(id);
                } else {
                    hideResults(id);
                    errorMessage.style.display = 'inline';
                    console.log('Broadband Availability Checker API: A serverside error occured, this is most likely due to an invalid phone number or postcode.', error); 
                }
            })
            .catch((error) => {
                hideResults(id);
                errorMessage.style.display = 'inline';
                console.log('Broadband Availability Checker API: A serverside error occured, this is likely due to an error thrown from api.interdns.co.uk.', error); 
            });
        }
    </script>`;
    }
}

const genRanHex = size => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

/**
 * General API proxy endpoint that detects the input format 
 * and fowards it towards the ICUK API.
 * 
 * @param {String} data - Input data
 * @param {String} username - Username for the API
 * @param {String} password - Password for the API
 * @returns {Object} Availability Data
 */
async function ApiProxy(data, username, password) {
    if (isValidPostcode(data)) {
        return await GetAddressList(data, username, password);
    }
    
    let stripped = data.replace("$", "")
    if (isValidPostcode(stripped)) {
        return await GetAvailability(stripped, username, password);
    }

    if (isJsonString(data)) {
        return await GetAvailabilityPost(data, username, password);
    }

    if (phoneUtil.isValidNumber(phoneUtil.parse(data, 'GB'))) {
        return await GetAvailability(data, username, password);
    } 
}

/**
 * Checks if a given string is a valid UK postcode
 * 
 * @param {String} postcode - Input string
 * @returns {Boolean} true if string is a valid postcode
 */
function isValidPostcode(postcode) {
    postcode = postcode.replace(/\s/g, "");
    var regex = /^[A-Z]{1,2}[0-9]{1,2} ?[0-9][A-Z]{2}$/i;
    return regex.test(postcode);
}

/**
 * Checks if a given string is valid JSON
 * 
 * @param {String} postcode - Input string
 * @returns {Boolean} true if string is valid JSON
 */
function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

/**
 * Return availability data under a Postcode/Phone number
 * 
 * @param {String} cli_or_postcode - UK Postcode/Phone Number
 * @param {String} username - Username for the API
 * @param {String} password - Password for the API
 * @returns {Object} Availability Data
 */
async function GetAvailability(cli_or_postcode, username, password) {
    const oauthResponse = await GetOAuthToken(username, password);
    const token = oauthResponse.access_token;
    const availabilityUrl = new url.URL(apiHost);
    availabilityUrl.pathname = path.join(availabilityEndpoint, cli_or_postcode);

    var options = {
        headers: {
            "ApiPlatform": "LIVE",
            "Authorization": "Bearer " + token
        },
        accept: "application/json"
    }
    
    return needle('get',
        availabilityUrl.href, 
        options)
        .then(function(resp) { return resp.body })
        .catch(function(err) { return {error: err.message}})
}

/**
 * Return availability data under a specific address
 * 
 * @param {String} address - UK Address from /broadband/address/{postcode}
 * @param {String} username - Username for the API
 * @param {String} password - Password for the API
 * @returns {Object} Availability Data
 */
async function GetAvailabilityPost(address, username, password) {
    const oauthResponse = await GetOAuthToken(username, password);
    const token = oauthResponse.access_token;
    const availabilityUrl = new url.URL(apiHost);
    availabilityUrl.pathname = availabilityEndpoint;

    var options = {
        headers: {
            "ApiPlatform": "LIVE",
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        },
        accept: "application/json"
    }

    return needle('post',
        availabilityUrl.href, 
        address,
        options)
        .then(function(resp) { return resp.body })
        .catch(function(err) { return {error: err.message}});
}

/**
 * Returns a list of addreses under a postcode from the API
 * 
 * @param {String} postcode - UK Postcode
 * @param {String} username - Username for the API
 * @param {String} password - Password for the API
 * @returns {Object} List of addresses
 */
async function GetAddressList(postcode, username, password) {
    const oauthResponse = await GetOAuthToken(username, password);
    const token = oauthResponse.access_token;
    const addressUrl = new url.URL(apiHost);
    addressUrl.pathname = path.join(addressEndpoint, postcode);

    var options = {
        headers: {
            "ApiPlatform": "LIVE",
            "Authorization": "Bearer " + token
        },
        accept: "application/json"
    }
    
    return needle('get',
        addressUrl.href, 
        options)
        .then(function(resp) { return resp.body })
        .catch(function(err) { return {error: err.message}})
}

/**
 * Contacts the API to get an OAuth token using the provided credentials
 * 
 * @param {String} username - Username for the API
 * @param {String} password - Password for the API
 * @returns {Object} OAuth Token obtained from /oauth/token
 * 
 * @internal
 */
async function GetOAuthToken(username, password) {
    const oauthUrl = new url.URL(apiHost);
    oauthUrl.pathname = oauthEndpoint;
    
    const data = { grant_type: "client_credentials" }
    const options = {
        username: username, 
        password: password,
        headers: {
            "ApiPlatform": "LIVE"
        },
        accept: "application/json"
    }

    return needle('post',
        oauthUrl.href, 
        data,
        options)
        .then(function(resp) { return resp.body })
        .catch(function(err) { return {error: err.message}})
}

module.exports.ApiProxy = ApiProxy;
module.exports.BroadbandAvailabilityChecker = BroadbandAvailabilityChecker;
module.exports.GetAddressList = GetAddressList;
module.exports.GetAvailability = GetAvailability;
module.exports.GetAvailabilityPost = GetAvailabilityPost;
