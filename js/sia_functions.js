// Decentralizer-UI script for interactions with the Sia daemon
// Licensed under GNU GPLv3
// By Salvador Herrera / Keops.cc, 2019

'use strict';

var sia = require('sia.js');
var Path = require('path')
var fs = require('fs');
var axios = require('axios')
var https = require('https');
var path = require('path')
var os = require('os')


// Getting the API authentication key to use in the rest of the program
function apiPassword() {
    // Gets the Sia API Password from disk
    let configPath
    switch (process.platform) {
        case 'win32':
            configPath = Path.join(process.env.LOCALAPPDATA, 'Sia')
            break
        case 'darwin':
            configPath = Path.join(
                os.homedir(),
                'Library',
                'Application Support',
                'Sia'
            )
            break
        default:
            configPath = Path.join(os.homedir(), '.sia')
    }
    const pass = fs.readFileSync(Path.join(configPath, 'apipassword')).toString().trim()
    return pass || ''
}
var apiPassword = apiPassword()
const basicAuth = `:${apiPassword}@${'localhost:9980'}`


// SCANNING
function openScan() {
    document.getElementById("overlay").style.height = "100%";
    document.getElementById("overlayIcon").innerHTML = '<i class="fas fa-sync-alt fa-spin"></i>'
    document.getElementById("overlayMessage").innerHTML = "Initiating sync"
    
    var button = ''
    document.getElementById("overlayButtons").innerHTML = button

    setTimeout(function(){
        siastatsGeolocFile()
    }, 1000);
}



// Close overlay
function closeOverlay() {
    document.getElementById("overlay").style.height = "0%";
}

// Error overlay: show an icon and an OK button
function errorOverlay(error) {
    document.getElementById("overlayIcon").innerHTML = '<i class="fas fa-times-circle"></i>'
    var button = '<button type="button" class="button-scan" id="detailButton" style="width: 150px; height: 35px; vertical-align: middle; cursor: pointer; margin: 25px 10px 0px 0px" onclick="alert(error)">'
        + 'Details</button>'
        + '<button type="button" class="button-scan" style="width: 150px; height: 35px; vertical-align: middle; cursor: pointer; margin: 25px 0px 0px 10px" onclick="closeOverlay()">'
        + 'OK</button>'
    document.getElementById("overlayButtons").innerHTML = button

    // Prompts an alert window with the error details
    document.getElementById("detailButton").onclick = function() { alert(error) }
}

// Succeded overlay: show an icon and an OK button
function succededOverlay() {
    initialLoad()
    document.getElementById("overlayIcon").innerHTML = '<i class="fas fa-check-circle"></i>'
    var button = '<button type="button" class="button-scan" style="width: 150px; height: 35px; vertical-align: middle; cursor: pointer; margin: 25px 0px 0px 0px" onclick="closeOverlay()">'
        + 'OK</button>'
    document.getElementById("overlayButtons").innerHTML = button
    $("#no-databases").fadeOut();
}


function siastatsGeolocFile() {
    // SiaStats JSON geolocation. If the file can't be downloaded, the local copy is used instead

    // Removing SSL authorization for this specific API call
    var agent = new https.Agent({  
        rejectUnauthorized: false
    });

    axios.get('https://siastats.info:3510/hosts-api/decentralizer/sia', { httpsAgent: agent }).then(response => {
        var siastatsGeoloc = response.data
        document.getElementById("overlayMessage").innerHTML = "Downloaded " + siastatsGeoloc.length + " hosts geolocations from SiaStats.info"
        // Saving the file
        try { fs.writeFileSync(path.join(__dirname, "../databases/hosts_geoloc.json"), JSON.stringify(siastatsGeoloc), 'utf-8'); }
        catch(e) { alert('Failed to save the file hosts_geoloc.json\n' + e);}

        siastatsFarmsFile(siastatsGeoloc)

    }).catch(error => {
        fs.readFile(path.join(__dirname, "../databases/hosts_geoloc.json"), 'utf8', function (err, data) { if (!err) { 
            var siastatsGeoloc = JSON.parse(data);
            document.getElementById("overlayMessage").innerHTML = "The hosts geolocation file could not be fetched from SiaStats.info. Using a local copy instead"
            siastatsFarmsFile(siastatsGeoloc)
        } else {
            document.getElementById("overlayMessage").innerHTML = "ERROR - The software can't find locally or download necessary databases. Try re-installing Decentralizer or connecting to the Internet"
            errorOverlay(error)
        }});
    })
}


function siastatsFarmsFile(siastatsGeoloc) {
    // SiaStats JSON geolocation. If the file can't be downloaded, the local copy is used instead
    axios.get('https://siastats.info/dbs/farms_api.json').then(response => {
        var siastatsFarms = response.data
        document.getElementById("overlayMessage").innerHTML = "Downloaded data from " + siastatsFarms.length + " farms from SiaStats.info"

        // Saving the file
        try { fs.writeFileSync(path.join(__dirname, "../databases/farms_definition.json"), JSON.stringify(siastatsFarms), 'utf-8'); }
        catch(e) { alert('Failed to save the file farms_definition.json\n' + e);}

        siaHosts(siastatsGeoloc, siastatsFarms)
    }).catch(error => {
        
        fs.readFile(path.join(__dirname, "../databases/farms_definition.json"), 'utf8', function (err, data) { if (!err) { 
            var siastatsFarms = JSON.parse(data);
            document.getElementById("overlayMessage").innerHTML = "The farms definition file could not be fetched from SiaStats.info. Using a local copy instead"
            siaHosts(siastatsGeoloc, siastatsFarms)
        } else {
            document.getElementById("overlayMessage").innerHTML = "ERROR - The software can't find locally, or download, necessary databases. Try re-installing Decentralizer or connecting to the Internet"
            errorOverlay(err)
        }});
    });
}


function siaHosts(siastatsGeoloc, siastatsFarms) {
    // Requesting active hosts with an API call:
    document.getElementById("overlayMessage").innerHTML = "Retreiving your hosts list from Sia"
    sia.connect('localhost:9980')
    .then((siad) => {siad.call('/hostdb/all')
        .then((hosts) => {
            var allHosts = hosts.hosts
            // Filtering only the active and accepting contracts. If I was using the /hostdb/active, it would show less hosts after applying a filter
            var active = []
            for (let i = 0; i < allHosts.length; i++) {
                if (allHosts[i].scanhistory != null) { // It has already one scan
                    if (allHosts[i].scanhistory[allHosts[i].scanhistory.length-1].success == true
                        && allHosts[i].acceptingcontracts == true) {
                        active.push(allHosts[i])
                    }
                }
            }
            var hostdb = active
            
            document.getElementById("overlayMessage").innerHTML = "Retrieving " + hostdb.length + " hosts data from Sia"
            var hostNum = 0
            hostsScore(siastatsGeoloc, siastatsFarms, hostdb, hostNum)
        })
        .catch((err) => {
            document.getElementById("overlayMessage").innerHTML = "Error retrieving hosts data from Sia. Is Sia working, synced and connected to internet? Try again after restarting Sia."
            errorOverlay(err)
        })
    })
    .catch((err) => {
        document.getElementById("overlayMessage").innerHTML = "Error connecting to Sia. Start the Sia app (either daemon or UI) and try again"
        errorOverlay(err)
    })
}


function hostsScore(siastatsGeoloc, siastatsFarms, active, hostNum) {
    // Iterates on each host to collect from Sia the score of the host
    document.getElementById("overlayMessage").innerHTML = "Retrieving " + active.length + " hosts data from Sia"
        + "<br>(" + hostNum + "/" + active.length + ")"
    if (hostNum < active.length) {
        sia.connect('localhost:9980')
        .then((siad) => {siad.call('/hostdb/hosts/' + active[hostNum].publickeystring)
            .then((host) => {
                var score = host.scorebreakdown.conversionrate
                active[hostNum].score = score
                hostNum++
                hostsScore(siastatsGeoloc, siastatsFarms, active, hostNum)
            })
            .catch((err) => {
                document.getElementById("overlayMessage").innerHTML = "Error retrieving individual hosts data from Sia. Is Sia working, synced and connected to internet? Try again after restarting Sia."
                errorOverlay(err)
            })
        })
        .catch((err) => {
            document.getElementById("overlayMessage").innerHTML = "Error connecting to Sia. Start the Sia app (either daemon or UI) and try again"
            errorOverlay(err)
        })

    } else {
        // We are done. Move to the next step
        
        // Arranges the hosts array by score
        function compare(a,b) {
            if (a.score < b.score)
                return -1;
            if (a.score > b.score)
                return 1;
            return 0;
        }
        active.sort(compare);

        hostsProcessing(siastatsGeoloc, siastatsFarms, active)
    }
}


function hostsProcessing(siastatsGeoloc, siastatsFarms, hostdb) {
    // Assigns IPs to the hostdb and determines the hosts that need additional geolocation
    var hostsToGeoloc = [] // Entries numbers that need to be geolocated locally by Decentralizer
    for (let i = 0; i < hostdb.length; i++) { // For each host
        var matchBool = false
        for (let j = 0; j < siastatsGeoloc.length; j++) { // For each geolocation in list
            if (hostdb[i].publickeystring == siastatsGeoloc[j].pubkey) {
                // Match, update hostdb entry
                matchBool = true
                hostdb[i].lon = siastatsGeoloc[j].lon
                hostdb[i].lat = siastatsGeoloc[j].lat
                hostdb[i].countryName = siastatsGeoloc[j].countryName
                hostdb[i].countryCode = siastatsGeoloc[j].countryCode
                hostdb[i].siastatsScore = siastatsGeoloc[j].siastatsScore
                
                // We update the geoloc file with the pubkey in the non-hex format, as it will be lated needed for the contracts identification
                siastatsGeoloc[j].pubkey2 = hostdb[i].publickey.key
            }
        }
        if (matchBool == false) {
            // If no match, add to the list
            hostsToGeoloc.push(i)

            hostdb[i].siastatsScore = 0 // Adding a 0 in the score
        }
    }

    document.getElementById("overlayMessage").innerHTML = "Number of additional hosts to be geolocated: " + hostsToGeoloc.length
    if (hostsToGeoloc.length > 0) {
        requestIP(siastatsFarms, hostdb, hostsToGeoloc, 0, siastatsGeoloc)
    } else {
        // No additional host to geolocate, save and proceed to next step
        compareOldDb(hostdb, siastatsFarms, siastatsGeoloc)
    }
}


function requestIP(siastatsFarms, hostdb, hostsToGeoloc, i, siastatsGeoloc) {
    
    // Triming the ":port" from the host IP
    var hostip = hostdb[hostsToGeoloc[i]].netaddress
    var s = hostip.search(":")
    var totrim = hostip.length - s
    var trimedip = hostip.slice(0, -totrim)
        
    // Requesting the geolocation of the host
    var ipquery = "http://ip-api.com/json/" + trimedip
    axios.get(ipquery).then(response => {
        var ipAPI = response.data
        var lat = parseFloat(ipAPI.lat)
        var lon = parseFloat(ipAPI.lon)
        document.getElementById("overlayMessage").innerHTML = "Geolocating: (" + (i+1) + "/" + hostsToGeoloc.length + ") <br>" + hostip

        hostdb[hostsToGeoloc[i]].lon = lon
        hostdb[hostsToGeoloc[i]].lat = lat
        hostdb[hostsToGeoloc[i]].as = ipAPI.as // Also adding the ISP
        hostdb[hostsToGeoloc[i]].countryName = ipAPI.country // Also adding the ISP
        hostdb[hostsToGeoloc[i]].countryCode = ipAPI.countryCode // Also adding the ISP
        nextIP(siastatsFarms, hostdb, hostsToGeoloc, i, siastatsGeoloc)

    }).catch(error => {
        // On failed IP request, move to the next IP
        document.getElementById("overlayMessage").innerHTML = hostip + " - Failed"
        nextIP(siastatsFarms, hostdb, hostsToGeoloc, i, siastatsGeoloc)
    })
}

function nextIP(siastatsFarms, hostdb, hostsToGeoloc, i, siastatsGeoloc) {
    setTimeout(function(){ // 500ms cooldown, to avoid being banned by ip-api.com
        i++
        if (i < hostsToGeoloc.length) {
            requestIP(siastatsFarms, hostdb, hostsToGeoloc, i, siastatsGeoloc)
        } else {
            document.getElementById("overlayMessage").innerHTML = "Geolocation done"

            compareOldDb(hostdb, siastatsFarms, siastatsGeoloc)
        }
    }, 500);
}


function compareOldDb(hostdb, siastatsFarms, siastatsGeoloc) {
    // Opening the hosts file to re-add the "onlist" value (hosts added to the Filter)
    fs.readFile(path.join(__dirname, "../databases/hosts.json"), 'utf8', function (err, data) { if (!err) { 
        var oldHosts = JSON.parse(data);

        for (let i = 0; i < hostdb.length; i++) {
            for (let j = 0; j < oldHosts.length; j++) {
                if (hostdb[i].publickey.key == oldHosts[j].publickey.key) { // Match of hosts
                    if (oldHosts[j].onList == true) {
                        // Add the boolean to the new hostdb
                        hostdb[i].onList = true
                    }
                }
            }
        }
        
        // Saving the file
        try { fs.writeFileSync(path.join(__dirname, "../databases/hosts.json"), JSON.stringify(hostdb), 'utf-8'); }
        catch(e) { alert('Failed to save the file hosts.json\n' + e);}

        // Next
        siaContracts(siastatsFarms, siastatsGeoloc)
        
    } else {
        // If no file was found, it is the first scanning: just proceed
        try { fs.writeFileSync(path.join(__dirname, "../databases/hosts.json"), JSON.stringify(hostdb), 'utf-8'); }
        catch(e) { alert('Failed to save the file hosts.json\n' + e);}
        siaContracts(siastatsFarms, siastatsGeoloc)
    }});
}


function siaContracts(siastatsFarms, siastatsGeoloc) {
    // Requesting the contracts list with an API call:
    document.getElementById("overlayMessage").innerHTML = "Retreiving contracts list from Sia"
    sia.connect('localhost:9980')
    .then((siad) => {siad.call('/renter/contracts')
        .then((contractsAPI) => {
            var contracts = contractsAPI.contracts

            if (contracts.length == 0) {
                // Empty files
                contracts = []
                try { fs.writeFileSync(path.join(__dirname, "../databases/contracts.json"), JSON.stringify(contracts), 'utf-8'); }
                catch(e) { alert('Failed to save the file contracts.json\n' + e);}

                var farms = []
                try { fs.writeFileSync(path.join(__dirname, "../databases/farms.json"), JSON.stringify(farms), 'utf-8'); }
                catch(e) { alert('Failed to save the file farms.json\n' + e);}
                openSettingsFile(false)
                
            } else {
                // Considering only the contracts good for upload and good for renew, this is, active
                // (sia returns active and inactive all together)
                var activeContracts = []
                for (let i = 0; i < contracts.length; i++) {
                    if (contracts[i].goodforupload == false && contracts[i].goodforrenew == false) {
                        // Inactive contract, do not consider further
                    } else {
                        activeContracts.push(contracts[i])
                    }
                }

                document.getElementById("overlayMessage").innerHTML = "Checking IPs of " + activeContracts.length + " active contracts"
                contractsIpAssign(siastatsFarms, activeContracts, siastatsGeoloc)
            }

        })
        .catch((err) => {
            // In some circumstances, abscense of contracts can make this call to fail
            // Empty files
            var contracts = []
            try { fs.writeFileSync(path.join(__dirname, "../databases/contracts.json"), JSON.stringify(contracts), 'utf-8'); }
            catch(e) { alert('Failed to save the file contracts.json\n' + e);}

            var farms = []
            try { fs.writeFileSync(path.join(__dirname, "../databases/farms.json"), JSON.stringify(farms), 'utf-8'); }
            catch(e) { alert('Failed to save the file farms.json\n' + e);}
            openSettingsFile(false)
        })
    })
    .catch((err) => {
        document.getElementById("overlayMessage").innerHTML = "Error connecting to Sia. Start the Sia app (either daemon or UI) and try again"
        errorOverlay(err)
    })
}


function contractsIpAssign(siastatsFarms, contracts, siastatsGeoloc) {

    // Assigns IPs to the contracts and determines the hosts that need additional geolocation
    var contractsToGeoloc = [] // Entries numbers that need to be geolocated locally by Decentralizer
    for (let i = 0; i < contracts.length; i++) { // For each contract
        var matchBool = false
        for (let j = 0; j < siastatsGeoloc.length; j++) { // For each geolocation in list
            if (contracts[i].hostpublickey.key == siastatsGeoloc[j].pubkey2) {
                // Match, update hostdb entry
                matchBool = true
                contracts[i].lon = siastatsGeoloc[j].lon
                contracts[i].lat = siastatsGeoloc[j].lat
                contracts[i].as = siastatsGeoloc[j].as
                contracts[i].countryName = siastatsGeoloc[j].countryName
                contracts[i].countryCode = siastatsGeoloc[j].countryCode
                contracts[i].siastatsScore = siastatsGeoloc[j].siastatsScore
            }
        }
        if (matchBool == false) {
            // If no match, add to the list
            contractsToGeoloc.push(i)

            contracts[i].siastatsScore = 0 // 0 score, as it is not on the database
        }
    }

    document.getElementById("overlayMessage").innerHTML = "Number of additional contracts to be geolocated: " + contractsToGeoloc.length
    if (contractsToGeoloc.length > 0) {
        requestContractIP(siastatsFarms, contracts, contractsToGeoloc, 0)
    } else {
        // No additional host to geolocate, save and proceed to next step
        try { fs.writeFileSync(path.join(__dirname, "../databases/contracts.json"), JSON.stringify(contracts), 'utf-8'); }
        catch(e) { alert('Failed to save the file contracts.json\n' + e);}
        processHosts(siastatsFarms, contracts)
    }
}


function requestContractIP(siastatsFarms, contracts, contractsToGeoloc, i) {
    
    // Triming the ":port" from the host IP
    var hostip = contracts[contractsToGeoloc[i]].netaddress
    var s = hostip.search(":")
    var totrim = hostip.length - s
    var trimedip = hostip.slice(0, -totrim)
        
    // Requesting the geolocation of the host
    var ipquery = "http://ip-api.com/json/" + trimedip
    axios.get(ipquery).then(response => {
        var ipAPI = response.data

        var lat = parseFloat(ipAPI.lat)
        var lon = parseFloat(ipAPI.lon)
        document.getElementById("overlayMessage").innerHTML = "Geolocating: (" + (i+1) + "/" + contractsToGeoloc.length + ") <br>" + hostip

        contracts[contractsToGeoloc[i]].lon = lon
        contracts[contractsToGeoloc[i]].lat = lat
        contracts[contractsToGeoloc[i]].as = ipAPI.as // Also adding the ISP
        contracts[contractsToGeoloc[i]].countryName = ipAPI.country // Also adding the ISP
        contracts[contractsToGeoloc[i]].countryCode = ipAPI.countryCode // Also adding the ISP
        nextContractIP(siastatsFarms, contracts, contractsToGeoloc, i)

    }).catch(error => {
        // On failed IP request, move to the next IP
        document.getElementById("overlayMessage").innerHTML = hostip + " - Failed"
        nextContractIP(siastatsFarms, contracts, contractsToGeoloc, i)
    })
}

function nextContractIP(siastatsFarms, contracts, contractsToGeoloc, i) {
    setTimeout(function(){ // 500ms cooldown, to avoid being banned by ip-api.com
        i++
        if (i < contractsToGeoloc.length) {
            requestContractIP(siastatsFarms, contracts, contractsToGeoloc, i)
        } else {
            document.getElementById("overlayMessage").innerHTML = "Geolocation done"

            // Saving the file
            try { fs.writeFileSync(path.join(__dirname, "../databases/contracts.json"), JSON.stringify(contracts), 'utf-8'); }
            catch(e) { alert('Failed to save the file contracts.json\n' + e);}

            // Next
            processHosts(siastatsFarms, contracts)
        }
    }, 500);
}


function processHosts(siastatsFarms, contracts) {
    document.getElementById("overlayMessage").innerHTML = "Processing data"

    // Finding centralized farms
    var hostsGroups = []
    for (let i = 0; i < contracts.length; i++) { // For each contract
        var hostInGroupBool = false
        for (let j = 0; j < hostsGroups.length; j++) {
            if (contracts[i].lat == hostsGroups[j][0].lat && contracts[i].lon == hostsGroups[j][0].lon && contracts[i].as == hostsGroups[j][0].as) { // Checking if geolocation is the same as the first element in a group. Has to match the ISP too
                hostsGroups[j].push(contracts[i]) // Add host to the group
                hostInGroupBool = true
                //console.log("New farm member identified")
                contracts[i].assigned = true // Flag that the contract has been already included in a farm
            }
        }
        if (hostInGroupBool == false) {
            contracts[i].assigned = true // Flag that the contract has been already included in a farm
            var newGroup = [contracts[i]]
            hostsGroups.push(newGroup) // Add a new group
        }
    }


    // Rearranging the array
    var farmNumber = 1
    var farmList = [{ // Initializing array
        farm: "Other hosts",
        hosts: []
    },{
        farm: "Geolocation unavailable",
        hosts: []
    }]
    for (let j = 0; j < hostsGroups.length; j++) {
        if (hostsGroups[j].length > 1) { // Only groups with more than one member: hosting farms
            var farmEntry = {
                farm: "User-identified farm #U-" + (farmNumber),
                hosts: []
            }
            for (let k = 0; k < hostsGroups[j].length; k++) {
                let hostEntry = {
                    ip: hostsGroups[j][k].netaddress,
                    contract: hostsGroups[j][k].id,
                    cost: parseFloat((hostsGroups[j][k].totalcost/1000000000000000000000000).toFixed(2)),
                    data: parseFloat((hostsGroups[j][k].size/1000000000).toFixed(2)), // In GB
                    pubkey: hostsGroups[j][k].hostpublickey.key,
                    siastatsScore: hostsGroups[j][k].siastatsScore
                }
                farmEntry.hosts.push(hostEntry)
            }
            // Arrange the hosts by stored data
            function compare(a,b) {
                if (a.data < b.data)
                    return 1;
                if (a.data > b.data)
                    return -1;
                return 0;
            }
            farmEntry.hosts.sort(compare);
            
            // Push data
            if (hostsGroups[j][0].lat > 0 || hostsGroups[j][0].lat < 0) { // Geolocation is a number
                farmList.push(farmEntry)
                farmNumber++
            } else { // Geolocation unavailable host group
                // consider these hosts unassigned, as we may have better chances of assigning them later checking with SiaStats
                for (var p = 0; p < farmEntry.hosts.length; p++) {
                    farmEntry.hosts[p].assigned = false
                }
                
                // Replace element 1 by this
                farmList[1].hosts = farmEntry.hosts
            }
            
        
        } else { // Individual hosts
            let hostEntry = {
                ip: hostsGroups[j][0].netaddress,
                contract: hostsGroups[j][0].id,
                cost: parseFloat((hostsGroups[j][0].totalcost/1000000000000000000000000).toFixed(2)),
                data: parseFloat((hostsGroups[j][0].size/1000000000).toFixed(2)), // In GB
                pubkey: hostsGroups[j][0].hostpublickey.key,
                siastatsScore: hostsGroups[j][0].siastatsScore
            }
            // Pushing it to the element 0 of farmList, the "Other hosts"
            farmList[0].hosts.push(hostEntry)
        }
    }
    //document.getElementById("overlayMessage").innerHTML = "Done"
    siastatsProcess(farmList, contracts, siastatsFarms)
}


function siastatsProcess(farmList, contracts, siastatsFarms) {
    // This function compares our farmList with the list of siastats farms, to add the remaining farm-positive contracts to farmList

    // A - Create a temporal array where we add contracts not yet assigned, and belonging to farms, to groups
    // Iterate on the list of farms, on each host of it
    var extraGroups = []
    for (let j = 0; j < siastatsFarms.length; j++) {
        extraGroups.push({ // Adding an empty sub-array. We will fill it with contracts if positive for a farm
            farm: siastatsFarms[j].farm,
            hosts: []
        })

        // Adding the Alert flag if the farms is dangerous
        if (siastatsFarms[j].alert == true) {
            extraGroups[extraGroups.length-1].alert = true
            extraGroups[extraGroups.length-1].message = siastatsFarms[j].message
        }

        for (let k = 0; k < siastatsFarms[j].hosts.length; k++) {
            // Iterate on the list of contracts not yet assigned to a farm
            for (let i = 0; i< contracts.length; i++) {
                if (contracts[i].assigned != true && siastatsFarms[j].hosts[k].pubkey == contracts[i].hostpublickey.key){ // Match of public keys: the host is in a farm!
                    extraGroups[j].hosts.push(contracts[i])
                }
            }
        }
    }
    
    // B - Assign these groups to farms already identified (farmsList). Add a flag about SiaStats
    // Iterate on the farmList to find matches with the siaStats database. If a match, we will iterate on extraGroups and add hosts if they match the farm ID
    for (let i = 0; i < farmList.length; i++) {
        for (let j = 0; j < farmList[i].hosts.length; j++) {

            // Iterating on siastatsFarms
            for (let k = 0; k < siastatsFarms.length; k++) {
                for (var l = 0; l < siastatsFarms[k].hosts.length; l++) {
                    if (farmList[i].hosts[j].pubkey == siastatsFarms[k].hosts[l].pubkey) { // Matched farm
                        
                        // Now we iterate on our newGroups array, to find the one carrying the .farm property that matches
                        for (var m = 0; m < extraGroups.length; m++) {
                            if (extraGroups[m].farm == siastatsFarms[k].farm) { // Match!
                                
                                // B1 - Assign the hosts of the group to the farm list
                                for (var n = 0; n < extraGroups[m].hosts.length; n++) {
                                    farmList[i].hosts.push({
                                        ip: extraGroups[m].hosts[n].netaddress,
                                        contract: extraGroups[m].hosts[n].id,
                                        cost: parseFloat((extraGroups[m].hosts[n].totalcost/1000000000000000000000000).toFixed(2)),
                                        data: parseFloat((extraGroups[m].hosts[n].size/1000000000).toFixed(2)), // In GB
                                        siastatsFlag: true, // Add the flag to the latest host of that farm (the one we just pushed)
                                        siastatsScore: extraGroups[m].hosts[n].siastatsScore
                                    })
                                }

                                // Adding an alert if the group carries it
                                if (extraGroups[m].alert == true) {
                                    farmList[farmList.length-1].alert = true
                                    farmList[farmList.length-1].message = extraGroups[m].message
                                }

                                // B2 - Remove the group from extraGroups
                                extraGroups.splice(m, 1)

                                // B3 - Renaming the farm name to keep consistency with SiaStats
                                farmList[i].farm = "SiaStats ID-" + siastatsFarms[k].farm
                            }
                        }
                    }
                }
            }
        }
    }

    // C - Push unassigned groupd with 2+ contracts to a new farm
    for (let i = 0; i < extraGroups.length; i++) {
        if (extraGroups[i].hosts.length >= 2) {
            // Initializing new entry
            let newEntry = {
                farm: "SiaStats ID-" + extraGroups[i].farm,
                hosts: []
            }
            for (let j = 0; j < extraGroups[i].hosts.length; j++) { // For each host in the group
                newEntry.hosts.push({
                    ip: extraGroups[i].hosts[j].netaddress,
                    contract: extraGroups[i].hosts[j].id,
                    cost: parseFloat((extraGroups[i].hosts[j].totalcost/1000000000000000000000000).toFixed(2)),
                    data: parseFloat((extraGroups[i].hosts[j].size/1000000000).toFixed(2)), // In GB
                    siastatsScore: extraGroups[m].hosts[n].siastatsScore
                })

                // Adding an alert if the groups carries it
                if (extraGroups[i].alert == true) {
                    newEntry[newEntry.length-1].alert = true
                    newEntry[newEntry.length-1].message = extraGroups[i].message
                }
            }

            farmList.push(newEntry)
        }
    }

    // D - Correcting group names
    farmList[0].farm = "Non-farms"
    farmList[1].farm = "Geolocation unavailable"


    // Saving the farms file
    try { fs.writeFileSync(path.join(__dirname, "../databases/farms.json"), JSON.stringify(farmList), 'utf-8'); }
    catch(e) { alert('Failed to save the file farms.json\n' + e);}

    openSettingsFile(true)
}


function openSettingsFile(foundContractsBool) {
    // Timestamp
    var timestamp = Date.now()

    // Opening settings file
    fs.readFile(path.join(__dirname, "../databases/settings.json"), 'utf8', function (err, data) { if (!err) { 
        let settings = JSON.parse(data)
        settings.lastsync = timestamp
        getConsensusHeight(settings, foundContractsBool)
    } else {
        // Initialize a settings file here
        let settings = {
            userLon: null,
            userLat: null,
            lastsync: timestamp,
            listMode: "disable",
            consensusHeight: null,
            renewWindow: null
        }
        getConsensusHeight(settings, foundContractsBool)
    }});
}

function getConsensusHeight(settings, foundContractsBool) {
    // Gets the current consensus height
    document.getElementById("overlayMessage").innerHTML = "Getting current block height"
    sia.connect('localhost:9980')
    .then((siad) => {siad.call('/consensus')
        .then((api) => {
            if (api.synced == true) {
                // Update only if the client is fully synced, otherwise keep it null, to avoid issues on contracts timeline representation
                settings.consensusHeight = api.height
            } else {
                settings.consensusHeight = null
            }
            getAllowanceInfo(settings, foundContractsBool)
        })
        .catch((err) => {
            document.getElementById("overlayMessage").innerHTML = "Error retrieving consensus data from Sia. Is Sia working, synced and connected to internet? Try again after restarting Sia."
            errorOverlay(err)
        })
    })
    .catch((err) => {
        document.getElementById("overlayMessage").innerHTML = "Error connecting to Sia. Start the Sia app (either daemon or UI) and try again"
        errorOverlay(err)
    })
}


function getAllowanceInfo(settings, foundContractsBool) {
    // Gets the renewal window of the contracts from Sia
    document.getElementById("overlayMessage").innerHTML = "Getting some info from your allowance"
    sia.connect('localhost:9980')
    .then((siad) => {siad.call('/renter')
        .then((api) => {
            try {
                settings.renewWindow = api.settings.allowance.renewwindow
                userGeolocation(settings, foundContractsBool)
            } catch (e) {
                document.getElementById("overlayMessage").innerHTML = "No allowance information was found. Have you formed an allowance yet?"
                errorOverlay(e)
            }
        })
        .catch((err) => {
            document.getElementById("overlayMessage").innerHTML = "Error retrieving renter data from Sia. Is Sia working, synced and connected to internet? Try again after restarting Sia."
            errorOverlay(err)
        })
    })
    .catch((err) => {
        document.getElementById("overlayMessage").innerHTML = "Error connecting to Sia. Start the Sia app (either daemon or UI) and try again"
        errorOverlay(err)
    })
}


function userGeolocation(settings, foundContractsBool) {
    document.getElementById("overlayMessage").innerHTML = "Finishing details"
    var ipquery = "http://ip-api.com/json/"

    axios.get(ipquery).then(response => {
        var ipAPI = response.data
        settings.userLon = parseFloat(ipAPI.lon)
        settings.userLat = parseFloat(ipAPI.lat)

        try { fs.writeFileSync(path.join(__dirname, "../databases/settings.json"), JSON.stringify(settings), 'utf-8'); }
        catch(e) { alert('Failed to save the file settings.json\n' + e);}

        // SYNC DONE!!!
        if (foundContractsBool == true) {
            document.getElementById("overlayMessage").innerHTML = "Done"
        } else if (foundContractsBool == false) {
            document.getElementById("overlayMessage").innerHTML = "Done. You currently have no active contracts. Re-sync again once you have formed a contracts set in Sia"
        }
        succededOverlay()

    }).catch(error => {
        // Failed user geolocation
        try { fs.writeFileSync(path.join(__dirname, "../databases/settings.json"), JSON.stringify(settings), 'utf-8'); }
        catch(e) { alert('Failed to save the file settings.json\n' + e);}

        // SYNC DONE!!!
        if (foundContractsBool == true) {
            document.getElementById("overlayMessage").innerHTML = "Done"
        } else {
            document.getElementById("overlayMessage").innerHTML = "Done. You currently have no active contracts. Re-sync again once you have formed a contracts set in Sia"
        }
        succededOverlay()
    })
}



// CANCEL CONTRACTS WITH FARMS
function cancelFarms() {
    document.getElementById("overlay").style.height = "100%";
    document.getElementById("overlayIcon").innerHTML = '<i class="fas fa-exclamation-triangle"></i>'
    var button = ''
    document.getElementById("overlayButtons").innerHTML = button
    fs.readFile(path.join(__dirname, "../databases/farms.json"), 'utf8', function (err, data) { if (!err) { 
        var farms = JSON.parse(data);
        fs.readFile(path.join(__dirname, "../databases/contracts.json"), 'utf8', function (err, data) { if (!err) { 
            var contracts = JSON.parse(data);

            // Finding the checkboxes number
            var checkBoxes = []
            for (let i = 1; i < farms.length; i++) {
                for (let j = 0; j < farms[i].hosts.length; j++) {
                    for (let k = 0; k < contracts.length; k++) {
                        if (farms[i].hosts[j].contract == contracts[k].id) {
                            var checkHost = "checkFarm" + k
                            if (document.getElementById(checkHost).checked == true) {
                                checkBoxes.push(k)
                            }
                        }
                    }
                }
            }

            // Messages of alert
            if (checkBoxes.length > 0) {
                document.getElementById("overlayIcon").innerHTML = '<i class="fas fa-exclamation-triangle"></i>'
                document.getElementById("overlayMessage").innerHTML = checkBoxes.length + " contracts will be cancelled. Proceed?"
    
                var button = '<button type="button" class="button-scan" style="width: 150px; height: 35px; vertical-align: middle; cursor: pointer; margin: 25px 10px 0px 0px" onclick="closeOverlay()">'
                    + 'No</button>'
                    + '<button type="button" class="button-scan" style="width: 150px; height: 35px; vertical-align: middle; cursor: pointer; margin: 25px 0px 0px 10px" onclick="preCancelFarm()">'
                    + 'Yes</button>'
                document.getElementById("overlayButtons").innerHTML = button
            } else {
                // If no contract was selected, show an error
                document.getElementById("overlayMessage").innerHTML = "ERROR - Select at least one contract"
                errorOverlay("No contract selected")
            }

        } else {
            document.getElementById("overlayMessage").innerHTML = "ERROR - The software can't find the necessary databases. Use the scan button"
            errorOverlay(err)
        }});
    } else {
        document.getElementById("overlayMessage").innerHTML = "ERROR - The software can't find the necessary databases. Use the scan button"
        errorOverlay(err)
    }});
}

function preCancelFarm() {
    // Starts the loop for cancelling
    document.getElementById("overlayIcon").innerHTML = '<i class="fas fa-cog fa-spin"></i>'
    var button = ''
    document.getElementById("overlayButtons").innerHTML = button
    document.getElementById("overlayMessage").innerHTML = ""
    fs.readFile(path.join(__dirname, "../databases/farms.json"), 'utf8', function (err, data) { if (!err) { 
        var farms = JSON.parse(data);
        fs.readFile(path.join(__dirname, "../databases/contracts.json"), 'utf8', function (err, data) { if (!err) { 
            var contracts = JSON.parse(data);

            // Finding the checkboxes number, and adding the contracts to an array
            var contractsToRemove = []
            for (let i = 1; i < farms.length; i++) {
                for (let j = 0; j < farms[i].hosts.length; j++) {
                    for (let k = 0; k < contracts.length; k++) {
                        if (farms[i].hosts[j].contract == contracts[k].id) {
                            var checkHost = "checkFarm" + k
                            if (document.getElementById(checkHost).checked == true) {
                                contractsToRemove.push({
                                    ip: contracts[k].netaddress,
                                    contract: contracts[k].id
                                })
                            }
                        }
                    }
                }
            }

            document.getElementById("overlayMessage").innerHTML = "Cancelling contracts"
            
            setTimeout(function(){
                var contractNum = 0
                var attempt = 0
                cancelContract(contractNum, contractsToRemove, attempt, contracts)
            }, 2000);

        } else {
            document.getElementById("overlayMessage").innerHTML = "ERROR - The software can't find the necessary databases. Use the scan button"
            errorOverlay(err)
        }});
    } else {
        document.getElementById("overlayMessage").innerHTML = "ERROR - The software can't find the necessary databases. Use the scan button"
        errorOverlay(err)
    }});
}



// CONTRACT CANCEL
function cancelContracts() {
    document.getElementById("overlay").style.height = "100%";
    document.getElementById("overlayIcon").innerHTML = '<i class="fas fa-exclamation-triangle"></i>'
    var button = ''
    document.getElementById("overlayButtons").innerHTML = button

    // Checking contracts selected
    var contractsNumToRemove = []
    fs.readFile(path.join(__dirname, "../databases/contracts.json"), 'utf8', function (err, data) { if (!err) { 
        var contracts = JSON.parse(data);
        for (let i = 0; i < contracts.length; i++) {
            if (document.getElementById("checkContract" + i).checked == true) {
                contractsNumToRemove.push(i)
            }
        }

        if (contractsNumToRemove.length > 0) {
            document.getElementById("overlayIcon").innerHTML = '<i class="fas fa-exclamation-triangle"></i>'
            document.getElementById("overlayMessage").innerHTML = contractsNumToRemove.length + " contracts will be cancelled. Proceed?"

            var button = '<button type="button" class="button-scan" style="width: 150px; height: 35px; vertical-align: middle; cursor: pointer; margin: 25px 10px 0px 0px" onclick="closeOverlay()">'
                + 'No</button>'
                + '<button type="button" class="button-scan" style="width: 150px; height: 35px; vertical-align: middle; cursor: pointer; margin: 25px 0px 0px 10px" onclick="preCancel()">'
                + 'Yes</button>'
            document.getElementById("overlayButtons").innerHTML = button
        } else {
            // If no contract was selected, show an error
            document.getElementById("overlayMessage").innerHTML = "ERROR - Select at least one contract"
            errorOverlay("No contract selected")
        }
        
    } else {
        document.getElementById("overlayMessage").innerHTML = "ERROR - The software can't find the necessary databases. Use the scan button"
        errorOverlay(err)
    }});

}

function preCancel() {
    // Starts the loop of canceling
    document.getElementById("overlayIcon").innerHTML = '<i class="fas fa-cog fa-spin"></i>'
    var button = ''
    document.getElementById("overlayButtons").innerHTML = button
    document.getElementById("overlayMessage").innerHTML = ""
    
    // The contract arrray to cancel needs to be bult again, as it could not be passed before in a button created on the go
    fs.readFile(path.join(__dirname, "../databases/contracts.json"), 'utf8', function (err, data) { if (!err) { 
        var contracts = JSON.parse(data);

        var contractsToRemove = []
        for (let i = 0; i < contracts.length; i++) {
            if (document.getElementById("checkContract" + i).checked == true) {
                contractsToRemove.push({
                    ip: contracts[i].netaddress,
                    contract: contracts[i].id
                })
            }
        }

        document.getElementById("overlayMessage").innerHTML = "Cancelling contracts"
        
        setTimeout(function(){
            var contractNum = 0
            var attempt = 0
            cancelContract(contractNum, contractsToRemove, attempt, contracts)
        }, 2000);
        
    } else {
        document.getElementById("overlayMessage").innerHTML = "ERROR - The software can't find the necessary databases. Use the scan button"
        errorOverlay(err)
    }});
    
}

function cancelContract(contractNum, contractsToRemove, attempt, contracts) {
    // Iterates on contractsToRemove canceling the contract
    if (attempt == 0) {
        document.getElementById("overlayMessage").innerHTML = "Cancelling:<br>" + contractsToRemove[contractNum].ip
    }

    // Sia call parameters
    var url = "/renter/contract/cancel"
    var qs = {
        id: contractsToRemove[contractNum].contract,
    }
    
    // Sia call
    sia.call(basicAuth, {
        url: url,
        method: "POST",
        qs: qs
    })
    .then((API) => {
        //document.getElementById("overlayMessage").innerHTML = "Test"
        var newAttempt = 0
        var newContractNum = contractNum + 1 
        document.getElementById("overlayMessage").innerHTML = "Contract removed:<br>" + contractsToRemove[contractNum].ip

        // Remove contract from list
        for (let j = 0; j < contracts.length; j++) {
            if (contracts[j].id == contractsToRemove[contractNum].contract) {
                contracts.splice(j,1) // Removes the contract from the array
                
                // Save file
                try { fs.writeFileSync(path.join(__dirname, "../databases/contracts.json"), JSON.stringify(contracts), 'utf-8'); }
                catch(e) { alert('Failed to save the file contracts.json\n' + e);}

                // Find and remove the contract from the farms list, too
                findAndRemoveContractFromFarm(contractsToRemove[contractNum].contract)
            }
        }
        
        if (newContractNum < contractsToRemove.length) {
            cancelContract(newContractNum, contractsToRemove, newAttempt, contracts)
        } else {
            // End routine
            document.getElementById("overlayMessage").innerHTML = "Done"
            succededOverlay()         
        }
    })
    .catch((err) => {
        attempt++
        document.getElementById("overlayMessage").innerHTML = "Retrying (" + attempt + "/3):<br>" + contractsToRemove[contractNum].ip
        if (attempt >= 4) {
            // Stop and report error if it could not be cancelled
            document.getElementById("overlayMessage").innerHTML = "ERROR cancelling:<br>" + contractsToRemove[contractNum].ip
                + "<br>Is Sia working and synced? Also Sia could be busy: try again after some minutes"
            errorOverlay("Is Sia working and synced? Also Sia could be busy: try again after some minutes")
            // Also, reload interface, as some contracts might have been eliminated successfully
            initialLoad()
        } else { // Retry up to 3 times, after a short delay
            setTimeout(function(){
                cancelContract(contractNum, contractsToRemove, attempt, contracts)
            }, 1000);
        }
    })
}


function findAndRemoveContractFromFarm(contractId) {
    // Finds the contract among the farms and deletes that entry if it was part of a farm
    fs.readFile(path.join(__dirname, "../databases/farms.json"), 'utf8', function (err, data) { if (!err) { 
        var farms = JSON.parse(data);

        for (let i = 0; i < farms.length; i++) {
            for (let j = 0; j < farms[i].hosts.length; j++) {
                if (contractId == farms[i].hosts[j].contract) {
                    farms[i].hosts.splice(j,1)
                    
                    // Save file
                    try { fs.writeFileSync(path.join(__dirname, "../databases/farms.json"), JSON.stringify(farms), 'utf-8'); }
                    catch(e) { alert('Failed to save the file contracts.json\n' + e);}
                }
            }
        }

    } else {
        document.getElementById("overlayMessage").innerHTML = "ERROR - The software can't find the necessary databases. Use the scan button"
        errorOverlay(err)
    }});
}



// HOST FILTER APPLYING
function preFilter() {
    // Initial message
    document.getElementById("overlay").style.height = "100%";
    document.getElementById("overlayIcon").innerHTML = '<i class="fas fa-exclamation-triangle"></i>'
    document.getElementById("overlayMessage").innerHTML = ""
    var button = ''
    document.getElementById("overlayButtons").innerHTML = button
    
    fs.readFile(path.join(__dirname, "../databases/hosts.json"), 'utf8', function (err, data) { if (!err) { 
        var hosts = JSON.parse(data)
        fs.readFile(path.join(__dirname, "../databases/farms_definition.json"), 'utf8', function (err, data) { if (!err) { 
            var farms = JSON.parse(data)
            fs.readFile(path.join(__dirname, "../databases/settings.json"), 'utf8', function (err, data) { if (!err) {
                var settings = JSON.parse(data)
                var newMode = settings.listMode
                fs.readFile(path.join(__dirname, "../databases/contracts.json"), 'utf8', function (err, data) { if (!err) { 
                    var contracts = JSON.parse(data)

                    // Checking and correcting list, to avoid tampering of alerts
                    
                    var farmsFlagged = 0
                    for (let i = 0; i < farms.length; i++) {
                        if (farms[i].alert == true) {farmsFlagged++}
                    }
                    // This will need to be changed for Hyperspace and Prime (farmsFlagged)
                    if ((newMode == "whitelist" || newMode == "blacklist") && farmsFlagged > 0) {

                        for (let i = 0; i < hosts.length; i++) { // Each host
                            for (let j = 0; j < farms.length; j++) { // Each farm
                                if (farms[j].alert == true) {
                                    for (let k = 0; k < farms[j].hosts.length; k++) { // Each host in a farm
                                        if (farms[j].hosts[k].pubkey == hosts[i].publickey.key) {
                                            hosts[i].alert = true
                                        }
                                    }
                                }
                            }
                        }

                        for (let i = 0; i < hosts.length; i++) {
                            if (newMode == "blacklist") {
                                if (hosts[i].onList != true && hosts[i].alert == true) {
                                    hosts[i].onList = true
                                }
                            } else if (newMode == "whitelist") {
                                if (hosts[i].onList == true && hosts[i].alert == true) {
                                    hosts[i].onList = false
                                }
                            }
                        }

                        // Save corrected file
                        try { fs.writeFileSync(path.join(__dirname, "../databases/hosts.json"), JSON.stringify(hosts), 'utf-8'); }
                        catch(e) { alert('Failed to save the file hosts.json\n' + e);}

                        // Preparing the array of the Filter
                        var list = []
                        for (let i = 0; i < hosts.length; i++) {
                            if (hosts[i].onList == true) {
                                list.push({
                                    ip: hosts[i].netaddress,
                                    pubkey: hosts[i].publickeystring,
                                    key: hosts[i].publickey.key
                                })
                            }
                        }
                        let availableHosts
                        if (newMode == "whitelist") {
                            availableHosts = list.length
                        } else if (newMode == "blacklist") {
                            availableHosts = hosts.length - list.length
                        }

                        // Checking how many contracts will be cancelled
                        var contractsToCancel = 0
                        for (let i = 0; i < contracts.length; i++) {
                            var matchContract = false
                            for (let j = 0; j < list.length; j++) {
                                // Depending on the mode
                                if (newMode == "blacklist") {
                                    if (contracts[i].hostpublickey.key == list[j].key) {
                                        contractsToCancel++ // Add to count
                                    }
                                } else if (newMode == "whitelist") {
                                    if (contracts[i].hostpublickey.key == list[j].key) {
                                        matchContract = true
                                    }
                                }
                            }
                            if (settings.listMode == "whitelist" && matchContract == false) {
                                // If we are in whitelist, and the contract was not found on it
                                contractsToCancel++
                            }
                        }

                        document.getElementById("overlayMessage").innerHTML = "After applying this Filter, " + availableHosts + " hosts will be available to form"
                            + "<br>contracts with. " + contractsToCancel + " current contracts will be cancelled. Proceed?"
                        let button = '<button type="button" class="button-scan" style="width: 150px; height: 35px; vertical-align: middle; cursor: pointer; margin: 25px 10px 0px 0px" onclick="closeOverlay()">'
                            + 'No</button>'
                            + '<button type="button" class="button-scan" style="width: 150px; height: 35px; vertical-align: middle; cursor: pointer; margin: 25px 0px 0px 10px" onclick="applyFilter()">'
                            + 'Yes</button>'
                        document.getElementById("overlayButtons").innerHTML = button


                    } else if (newMode == "disable") {
                        // Disable mode
                        document.getElementById("overlayMessage").innerHTML = "The hosts filter will be disabled. Proceed?"
                        let button = '<button type="button" class="button-scan" style="width: 150px; height: 35px; vertical-align: middle; cursor: pointer; margin: 25px 10px 0px 0px" onclick="closeOverlay()">'
                            + 'No</button>'
                            + '<button type="button" class="button-scan" style="width: 150px; height: 35px; vertical-align: middle; cursor: pointer; margin: 25px 0px 0px 10px" onclick="applyFilter()">'
                            + 'Yes</button>'
                        document.getElementById("overlayButtons").innerHTML = button
                    }

                } else {
                    document.getElementById("overlayMessage").innerHTML = "ERROR - The software can't find the necessary databases. Use the scan button"
                    errorOverlay(err)
                }});
            } else {
                document.getElementById("overlayMessage").innerHTML = "ERROR - The software can't find the necessary databases. Use the scan button"
                errorOverlay(err)
            }});
        } else {
            document.getElementById("overlayMessage").innerHTML = "ERROR - The software can't find the necessary databases. Use the scan button"
            errorOverlay(err)
        }});
    } else {
        document.getElementById("overlayMessage").innerHTML = "ERROR - The software can't find the necessary databases. Use the scan button"
        errorOverlay(err)
    }});

}


function applyFilter() {
    // Loads the filter data and prepares the filter execution
    document.getElementById("overlayIcon").innerHTML = '<i class="fas fa-cog fa-spin"></i>'
    var button = ''
    document.getElementById("overlayButtons").innerHTML = button
    document.getElementById("overlayMessage").innerHTML = "Applying filter to Sia"

    fs.readFile(path.join(__dirname, "../databases/hosts.json"), 'utf8', function (err, data) { if (!err) { 
        var hosts = JSON.parse(data)
        fs.readFile(path.join(__dirname, "../databases/settings.json"), 'utf8', function (err, data) { if (!err) {
            var settings = JSON.parse(data)
            var newMode = settings.listMode

            // Preparing the array of the Filter
            var list = []
            for (let i = 0; i < hosts.length; i++) {
                if (hosts[i].onList == true) {
                    list.push({
                        ip: hosts[i].netaddress,
                        pubkey: hosts[i].publickeystring
                    })
                }
            }
                
            siaFilter(list, newMode)

        } else {
            document.getElementById("overlayMessage").innerHTML = "ERROR - The software can't find the necessary databases. Use the scan button"
            errorOverlay(err)
        }});
    } else {
        document.getElementById("overlayMessage").innerHTML = "ERROR - The software can't find the necessary databases. Use the scan button"
        errorOverlay(err)
    }});
}


function siaFilter(list, newMode) {
    // Connects to Sia and executes the filter
    document.getElementById("overlayMessage").innerHTML = "Connecting to Sia"

    var hostsList = []
    for (let i = 0; i < list.length; i++) {
        hostsList.push(list[i].pubkey)
    }

    sia.call(basicAuth, {
        url: "/hostdb/filtermode",
        method: "POST",
        body: {
            filtermode: newMode,
            hosts: hostsList,
        },
    })
    .then((API) => {
        document.getElementById("overlayMessage").innerHTML = "Filter successfully applied"
        succededOverlay()
    })
    .catch((err) => {
        document.getElementById("overlayMessage").innerHTML = "ERROR - The filter could not be applied. Is the Sia software<br>running and updated to 1.4.0 or onwards?"
        errorOverlay(err)
    })
}


