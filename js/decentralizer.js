// Decentralizer-UI start script
// Licensed under GNU GPLv3
// By Salvador Herrera / Keops.cc, 2019

'use strict';

var $ = require('jquery')
var axios = require('axios')
var Highcharts = require('highcharts/highmaps')
var fs = require('fs')
var path = require('path')

initialLoad()

function initialLoad() {
    // Hiding by default the message invitating to scan
    $("#no-databases").fadeOut();
    $("#tab-hosts").fadeOut();
    $("#tab-farms").fadeOut();
    $("#tab-about").fadeOut();
    $("#tab-contracts").fadeIn();
    
    // Default navigation tabs
    document.getElementById("nav2").style.borderRight = "5px solid #ddd";
    document.getElementById("nav3").style.borderRight = "5px solid #ddd";
    document.getElementById("nav4").style.borderRight = "5px solid #ddd";
    document.getElementById("nav1").style.borderRight = "15px solid #1bc859";

    $.getJSON(path.join(__dirname, "../databases/settings.json"), function (settings) {
        $.getJSON(path.join(__dirname, "../databases/contracts.json"), function (contracts) {
            $.getJSON(path.join(__dirname, "../databases/hosts.json"), function (hosts) {
                $.getJSON(path.join(__dirname, "../databases/farms.json"), function (farms) {
                    $.getJSON(path.join(__dirname, "../databases/farms_definition.json"), function (farmsDefinition) {

                        // Show an alert if farms are found
                        for (var i = 0; i < farms.length; i++) {
                            if (farms[i].alert == true) {
                                document.getElementById("alertIcon").innerHTML = '<i class="fas fa-exclamation-triangle"></i>'
                            }
                        }

                        // Display list of farms
                        displayFarms(farms, contracts)
                
                        // Elements to show data
                        document.getElementById("contractsNum").innerHTML = contracts.length
                        document.getElementById("hostsNum").innerHTML = hosts.length
                        document.getElementById("lastScan").innerHTML = timeConverter(settings.lastsync/1000)

                        // Summary footer for the filter settings
                        document.getElementById("summaryMode").innerHTML = settings.listMode
                        updateFilterCount(hosts)

                        // Post processing host coordinates for the map rendering
                        var processed_json = [{ // Starts with the renter geolocation
                            id: "Renter",
                            lon: settings.userLon,
                            lat: settings.userLat
                        }]
                        for (var i = 0; i < contracts.length; i++) {
                            if (contracts[i].lon != null && contracts[i].lat != null) { // Only if we have its geolocation
                                processed_json.push({
                                    id: contracts[i].netaddress,
                                    lon: contracts[i].lon,
                                    lat: contracts[i].lat,
                                    value: (contracts[i].totalcost/1000000000000000000000000).toFixed(2),
                                    data: (contracts[i].size/1000000000).toFixed(2)
                                })
                            }
                        }
                        
                        // Initialize the chart
                        var chart = Highcharts.mapChart('container-map', {

                            title: {
                                text: 'Contracted storage providers',
                                style: {
                                    color:"#555",
                                    fontSize:'20px',
                                    fontWeight: '900'
                                }
                            },

                            chart: {
                                backgroundColor: "#ccc",
                            },

                            credits: {
                                enabled: false,
                            },

                            mapNavigation: {
                                enabled: true,
                                buttonOptions: {
                                    verticalAlign: 'bottom'
                                }
                            },

                            tooltip: {
                                headerFormat: '',
                                pointFormat: '<b>{point.id}</b><br>Data:{point.data} GB<br>Value:{point.value} SC',
                                backgroundColor: '#445555',
                                borderRadius: 10,
                                style: {
                                    color: '#ffffff',
                                }
                            },

                            legend: {
                                enabled: false
                            },

                            plotOptions: {
                                series: {
                                    marker: {
                                        fillColor: '#FFFFFF',
                                        lineWidth: 2,
                                        lineColor: Highcharts.getOptions().colors[1]
                                    }
                                }
                            },

                            series: [{
                                mapData: Highcharts.maps['custom/world-highres3'],
                                name: 'Basemap',
                                borderColor: '#a8a8a8',
                                nullColor: '#fff',
                                showInLegend: false
                            }, {
                                name: 'Separators',
                                type: 'mapline',
                                data: Highcharts.geojson(Highcharts.maps['custom/world-highres3'], 'mapline'),
                                showInLegend: false,
                                enableMouseTracking: false
                            }, {
                                type: 'mappoint',
                                name: 'Hosts',
                                color: "#1ed660",
                                borderColor: "4a4a4a",
                                data: processed_json
                            }]
                        });

                        // Function to return an SVG path between two points, with an arc
                        function pointsToPath(from, to, invertArc) {
                            var arcPointX = (from.x + to.x) / (invertArc ? 2.4 : 1.6),
                                arcPointY = (from.y + to.y) / (invertArc ? 2.4 : 1.6);
                            return 'M' + from.x + ',' + from.y + 'Q' + arcPointX + ' ' + arcPointY +
                                    ',' + to.x + ' ' + to.y;
                        }
                        var renterPoint = chart.get('Renter');
                        var paths = []
                        for (var i = 1; i < processed_json.length; i++) {
                            paths.push({
                                id: processed_json[i].id + " -> Renter",
                                path: pointsToPath(renterPoint, chart.get(processed_json[i].id))
                            })
                        }

                        // Add a series of lines for the renter
                        chart.addSeries({
                            name: 'Host-Renter connections',
                            type: 'mapline',
                            lineWidth: 2,
                            color: '#1bc859',
                            data: paths
                        });


                        function timeConverter(UNIX_timestamp){
                            var a = new Date(UNIX_timestamp * 1000);
                            var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                            var year = a.getFullYear();
                            var month = months[a.getMonth()];
                            var date = a.getDate();
                            var hour = a.getHours();
                            if (hour < 10) {hour = "0" + hour}
                            var min = a.getMinutes();
                            if (min < 10) {min = "0" + min}
                            var sec = a.getSeconds();
                            if (sec < 10) {sec = "0" + sec}
                            var time = date + ' ' + month + ' ' + year + ' - ' + hour + ':' + min + ':' + sec ;
                            return time;
                        }


                        // CONTRACTS TABLE
                        // Checking farms for alerts
                        for (var i = 0; i < farms.length; i++) {
                            if (farms[i].alert == true) {
                                for (var j = 0; j < farms[i].hosts.length; j++) { // Each host on the alerted farm
                                    for (var k = 0; k < contracts.length; k++) {
                                        if (farms[i].hosts[j].contract == contracts[k].id) {
                                            contracts[k].alert = farms[i].alert
                                            contracts[k].message = farms[i].message
                                        }
                                    }
                                }
                            }
                        }

                        // Checking if the host is online
                        for (var i = 0; i < contracts.length; i++) {
                            for (var j = 0; j < hosts.length; j++) {
                                if (contracts[i].hostpublickey.key == hosts[j].publickey.key) {
                                    // If the contract is in the host list, it is online
                                    contracts[i].online = true
                                }
                            }
                        }

                        // Building the table
                        var tableContracts = '<table class="table" style="margin: auto">'
                            + '<thead>'
                                + '<tr>'
                                    + '<th></th>'
                                    + '<th><span>Country</span></th>'
                                    + '<th><span>Host</span></th>'
                                    + '<th><span>Data stored</span></th>'
                                    + '<th><span>Value</span></th>'
                                    + '<th><span>Renewing</span></th>'
                                    + '<th><span>Online</span></th>'
                                + '</tr>'

                        for (var i = 0; i < contracts.length; i++) {
                            // Adding xx for unknown locations
                            if (contracts[i].countryCode == null) {contracts[i].countryCode = "XX"}

                            tableContracts = tableContracts
                                + '<tr>'
                                    + '<td>'
                                        + '<input type="checkbox" id="checkContract' + i + '">'
                                    + '</td>'
                                    + '<td>'
                                        + '<span class="f32"><span class="flag ' + (contracts[i].countryCode).toLowerCase() + '"></span>'
                                            + '<span style="vertical-align: middle;"> '
                                                + '<div class="tooltip"> ' + contracts[i].countryCode
                                                    + '<span class="tooltiptext">' + contracts[i].countryName + '</span>'			
                                                + '</div>'
                                            + '</span>'
                                        + '</span>'
                                    + '</td>'
                                    + '<td>'
                                        + contracts[i].netaddress

                            // Adding alerts
                            if (contracts[i].alert == true) {
                                tableContracts = tableContracts
                                        + '<div class="tooltip" style="margin: 0px 0px 0px 5px"><i class="fas fa-exclamation-triangle" style="color: #cc4444;"></i>'
                                            + '<span class="tooltiptext">'
                                                + 'SiaStats alert: ' + contracts[i].message
                                            + '</span>'							
                                        + '</div>'
                            }

                            tableContracts = tableContracts
                                    + '</td>'
                                    + '<td>'
                                        + (contracts[i].size/1000000000).toFixed(2) +' GB'
                                    + '</td>'
                                    + '<td>'
                                        + '<div class="tooltip"> ' + (contracts[i].totalcost/1000000000000000000000000).toFixed(2) + ' SC'
                                            + '<span class="tooltiptext">'
                                                + 'Storage spent: ' + (contracts[i].storagespending/1000000000000000000000000).toFixed(2) + ' SC<br>'
                                                + 'Upload spent: ' + (contracts[i].uploadspending/1000000000000000000000000).toFixed(2) + ' SC<br>'
                                                + 'Download spent: ' + (contracts[i].downloadspending/1000000000000000000000000).toFixed(2) + ' SC<br>'
                                                + 'Fees: ' + (contracts[i].fees/1000000000000000000000000).toFixed(2) + ' SC<br>'
                                                + 'Remaining: ' + (contracts[i].renterfunds/1000000000000000000000000).toFixed(2) + ' SC'
                                            + '</span>'			
                                        + '</div>'
                                    + '</td>'

                            // Good for renew?
                            if (contracts[i].goodforrenew == true) {
                                tableContracts = tableContracts + '<td><i class="fas fa-check-circle" style="color: #44cc44"></i></td>'
                            } else {
                                tableContracts = tableContracts + '<td><i class="fas fa-times-circle" style="color: #cc4444"></i></td>'
                            }

                            // Online?
                            if (contracts[i].online == true) {
                                tableContracts = tableContracts + '<td><i class="fas fa-check-circle" style="color: #44cc44"></i></td>'
                            } else {
                                tableContracts = tableContracts + '<td><i class="fas fa-times-circle" style="color: #cc4444"></i></td>'
                            }
                            
                            // Finishing table line
                            tableContracts = tableContracts + '</tr>'
                        }

                        tableContracts = tableContracts + '</thead></table>' // Finish table

                        document.getElementById("table-contracts").innerHTML = tableContracts

                        // Default tab
                        $("#tab-contracts").fadeIn();
                        
                        // Default table ordering
                        hostsOrderByCountry(settings, hosts, farmsDefinition)

                        // Filter mode radio button
                        if (settings.listMode == "disable") {
                            document.getElementById("r1").checked = true
                            $("#farmsToggle").hide();
                        } else if (settings.listMode == "whitelist") {
                            document.getElementById("r2").checked = true
                            document.getElementById("farmsText").innerHTML = "Remove farms from the whitelist"
                            document.getElementById("farmsTooltip").innerHTML = "All the hosts beyond the first one of each hosting farm will be removed from the blacklist"
                            $("#farmsToggle").show();
                            //checkAlertedHosts("whitelist")
                        } else if (settings.listMode == "blacklist") {
                            document.getElementById("r3").checked = true
                            document.getElementById("farmsText").innerHTML = "Add farms to the blacklist"
                            document.getElementById("farmsTooltip").innerHTML = "All the hosts beyond the first one of each hosting farm will be added to the blacklist"
                            $("#farmsToggle").show();
                            //checkAlertedHosts("blacklist")
                        }

                        // Reloads the Farms Toggle
                        deployListToggle(settings)
                    
                    })
                    .fail(function() { missingFiles() })
                })
                .fail(function() { missingFiles() })
            })
            .fail(function() { missingFiles() })
        })
        .fail(function() { missingFiles() })
    })
    .fail(function() { missingFiles() })
}


function hostsOrderByCountry(settings, hosts, farmsDefinition) {

    // Determining the show mode
    var showMode = $('#showDropdown').find(":selected").val();

    // Adding alerts
    hosts = addAlertsToHosts(hosts, farmsDefinition)

    // Adding a hostID number and rank to identify the hosts, as we are going to rearrange the list
    for (var i = 0; i < hosts.length; i++) {
        hosts[i].hostIdNumber = i
        hosts[i].rank = hosts.length - i
    }
   
    // Initializing, with European Union empty
    var countries = [ 
        {
            countryName: "European Union",
            countryCode: "EU",
            hosts: 0
        }
    ]

    // Iterating hosts
    for (var i = 0; i < hosts.length; i++) {
        var countryMatch = false
        for (var j = 0; j < countries.length; j++) {
            if (hosts[i].countryCode == countries[j].countryCode) {
                countryMatch = true
                countries[j].hosts++
                countries[j].hostsList.push(hosts[i])
            }
        }
        if (countryMatch == false) {
            // Create new entry on array
            countries.push({
                countryName: hosts[i].countryName,
                countryCode: hosts[i].countryCode,
                hosts: 1,
                hostsList: [hosts[i]]
            })
        }
        // Adding to the EU
        var c = hosts[i].countryCode
        if (c == "BE" || c == "BG" || c == "CZ" || c == "DK" || c == "DE" || c == "EE" || c == "IE" || c == "EL" || c == "ES" || c == "FR" ||
            c == "HR" || c == "IT" || c == "CY" || c == "LV" || c == "LT" || c == "LU" || c == "HU" || c == "MT" || c == "NL" || c == "AT" ||
            c == "PL" || c == "PT" || c == "RO" || c == "SI" || c == "SK" || c == "FI" || c == "SE" || c == "GB" || c == "LI" || c == "IS" ||
            c == "NO") {
                countries[0].hosts++
        }
    }

    // Unknown location
    for (var i = 0; i < countries.length; i++) {
        if (countries[i].countryName == null) {
            countries[i].countryName = "Unknown location"
            countries[i].countryCode = "XX"
        }
    }

    // Saving euro hosts number
    var euroHosts = countries[0].hosts

    // Sorting by number of hosts
    function compare(a,b) {
        if (a.countryName > b.countryName)
            return 1;
        if (a.countryName < b.countryName)
            return -1;
        return 0;
    }
    countries.sort(compare);

    // Show EU host count first
    if (showMode == "all") {
        var content = '<div class="table-content" style="margin: 25px 25px; background-color: #fff">'
            + '<table class="table" style="margin: auto; margin: 0px 0px 25px 0px"><thead>'
                + '<tr>'
                    + '<th style="width: 10px">'
                        + '<input type="checkbox" id="checkCountryEU"  onchange="clickCountry(this)">'
                    + '</th>'
                    + '<th colspan="7">'
                        + '<span class="f32">'
                            + '<span class="flag eu"></span>'
                            + '<span style="vertical-align: middle;"> European Economic Area - ' + euroHosts + ' hosts</span>'
                        + '</span>'
                    + '</th>'
                + '</tr>'
                + '<tr>'
                    + '<td style="font-size: 14px; height: 25px"></td>'
                    + '<td colspan="7" style="font-size: 14px; height: 25px">'
                        + "<i>Check hosts on each country's table</i>"
                    + '</td>'
                + '</tr>'
            + '</thead></table></div>'
    
    } else {
        // In "only selected" show mode, skip
        var content = ""
    }

    // Rest of countries
    for (var i = 0; i < countries.length; i++) {
        if (countries[i].countryCode != "EU") {

            // Determining first if there are hosts selected on this country, we might not need to show this country
            var countryWithSelectedHosts = false
            for (var j = 0; j < countries[i].hostsList.length; j++) {
                if (countries[i].hostsList[j].onList == true) {
                    countryWithSelectedHosts = true
                }
            }

            if (showMode == "all" || (showMode == "onlySelected" && countryWithSelectedHosts == true)) {
                content = content + '<div class="table-content" style="margin: 25px 25px; background-color: #fff">'
                    + '<table class="table" style="margin: auto; margin: 0px 0px 25px 0px">'
                        + '<thead>'
                            + '<tr>'
                                + '<th style="width: 10px">'
                                    + '<input type="checkbox" id="checkCountry' + countries[i].countryCode + '" onchange="clickCountry(this)">'
                                + '</th>'
                                + '<th colspan="7">'
                                    + '<span class="f32">'
                                        + '<span class="flag ' + (countries[i].countryCode).toLowerCase() + '"></span>'
                                        + '<span style="vertical-align: middle;"> ' + countries[i].countryName + ' - ' + countries[i].hosts + ' hosts</span>'
                                    + '</span>'
                                + '</th>'
                            + '</tr>'
            }

            // Iterating hosts
            for (var j = 0; j < countries[i].hostsList.length; j++) {
                if (showMode == "all" || (showMode == "onlySelected" && countries[i].hostsList[j].onList == true)) { // In "onlySelected" mode, only show if selected
                    // Uptime calculation
                    var uptime = (countries[i].hostsList[j].recentsuccessfulinteractions/(countries[i].hostsList[j].recentsuccessfulinteractions + countries[i].hostsList[j].recentfailedinteractions)*100).toFixed(1)
                    if (uptime == Infinity) {uptime = 0}

                    content = content + '<tr>'
                            + '<td style="font-size: 14px; height: 25px"></td>'
                            + '<td style="font-size: 14px; height: 25px">'
                                + '<input type="checkbox" id="checkHost' + countries[i].hostsList[j].hostIdNumber + '"'
                    // Checking box
                    if (countries[i].hostsList[j].onList == true) {
                        content = content + " checked"
                    }
                                
                    content = content + ' onchange="clickHost(this)">'
                            + '</td>'
                            + '<td style="font-size: 14px; height: 25px">'
                                + '<div class="tooltip">' + countries[i].hostsList[j].netaddress
                                    + '<span class="tooltiptext">'
                                        + 'Country: ' + countries[i].hostsList[j].countryName + '<br>'
                                        + 'Accepts contracts: ' + countries[i].hostsList[j].acceptingcontracts + '<br>'
                                        + 'Recent uptime: ' + uptime + '%<br>'
                                        + 'Version: ' + countries[i].hostsList[j].version + '<br>'
                                        + 'Total storage: ' + (countries[i].hostsList[j].totalstorage/1000000000000).toFixed(2) + ' TB<br>'
                                        + 'Remaining storage: ' + (countries[i].hostsList[j].remainingstorage/1000000000000).toFixed(2) + ' TB'
                                    + '</span>'							
                                + '</div>'
                    // Showing alert
                    if (countries[i].hostsList[j].alert == true) {
                        content = content + '<div class="tooltip"><i class="fas fa-exclamation-triangle" style="color: #cc4444"></i>'
                                    + '<span class="tooltiptext">'
                                        + 'SiaStats alert: ' + countries[i].hostsList[j].message
                                    + '</span>'
                                + '</div>'
                    }
                    content = content + '</td>'
                            + '<td style="font-size: 14px; height: 25px"><span>' + parseInt(countries[i].hostsList[j].storageprice * 400 / 92592592592)+ ' SC/TB/mo</span></td>'
                            + '<td style="font-size: 14px; height: 25px"><span>Up:' + parseInt(countries[i].hostsList[j].uploadbandwidthprice/1000000000000) + ' SC/TB</span></td>'
                            + '<td style="font-size: 14px; height: 25px"><span>Down: ' + parseInt(countries[i].hostsList[j].downloadbandwidthprice/1000000000000) + ' SC/TB</span></td>'
                            + '<td style="font-size: 14px; height: 25px"><span>Collateral: ' + (countries[i].hostsList[j].collateral / countries[i].hostsList[j].storageprice).toFixed(1) + 'x </span></td>'
                            + '<td style="font-size: 14px; height: 25px"><span>Rank #' + countries[i].hostsList[j].rank + '</span></td>'
                        + '</tr>'
                }
            }
            content = content + '</thead></table></div>'
        }
    }
    // Final spacer
    content = content + '<div style="height: 100px"></div>'

    document.getElementById("hosts-table-content").innerHTML = content

    // Updating alerts
    for (var i = 0; i < hosts.length; i++) {
        // Disable checkbox on alert
        var checkId = "checkHost" + i
        if (settings.listMode == "whitelist" && hosts[i].alert == true) {
            document.getElementById(checkId).checked = false;
            document.getElementById(checkId).disabled = true;
        } else if (settings.listMode == "blacklist" && hosts[i].alert == true) {
            document.getElementById(checkId).checked = true;
            document.getElementById(checkId).disabled = true;
        }
    }
}


function addAlertsToHosts(hosts, farms) {
    // Adding alerts
    for (var i = 0; i < hosts.length; i++) { // Each host
        for (var j = 0; j < farms.length; j++) { // Each farm
            if (farms[j].alert == true) {
                for (var k = 0; k < farms[j].hosts.length; k++) { // Each host in a farm
                    if (farms[j].hosts[k].pubkey == hosts[i].publickey.key) {
                        hosts[i].alert = true
                        hosts[i].message = farms[j].message
                    }
                }
            }
        }
    }
    return hosts
}


// Order by mode
function hostsOrderBy(value) {
    $.getJSON(path.join(__dirname, "../databases/hosts.json"), function (hosts) {
        $.getJSON(path.join(__dirname, "../databases/settings.json"), function (settings) {
            $.getJSON(path.join(__dirname, "../databases/farms_definition.json"), function (farmsDefinition) {
                if (value == "country") {
                    hostsOrderByCountry(settings, hosts, farmsDefinition)
                } else if (value == "version") {
                    hostsOrderByVersion(settings, hosts, farmsDefinition)
                } else {
                    hostsOrderBySetting(settings, hosts, farmsDefinition, value)
                }
            })
        })
    })
}


// Show list of hosts, ordered by a setting
function hostsOrderBySetting(settings, hosts, farmsDefinition, orderBy) {

    // Determining the show mode
    var showMode = $('#showDropdown').find(":selected").val();
    
    // Adding alerts
    var hosts = addAlertsToHosts(hosts, farmsDefinition)
    var hostsOriginal = hosts

    // Adding a hostID number and rank to identify the hosts, as we are going to rearrange the list
    for (var i = 0; i < hosts.length; i++) {
        hosts[i].hostIdNumber = i
        hosts[i].rank = hosts.length - i
    }

    // Adjusting parameters in the hostdb for the sorting
    for (var i = 0; i < hosts.length; i++) {
        hosts[i].storageprice = parseInt(hosts[i].storageprice)
        hosts[i].uploadbandwidthprice = parseInt(hosts[i].uploadbandwidthprice)
        hosts[i].downloadbandwidthprice = parseInt(hosts[i].downloadbandwidthprice)
        hosts[i].collateralRatio = parseFloat((hosts[i].collateral / hosts[i].storageprice).toFixed(2))
        if (hosts[i].countryName == null) {
            hosts[i].countryName = "Unknown location"
            hosts[i].countryCode = "XX"
        }
    }

    // Sorting by parameter
    if (orderBy == "rank") {
        function compare(a,b) {
            if (a.rank > b.rank)
                return 1;
            if (a.rank < b.rank)
                return -1;
            return 0;
        }
        hosts.sort(compare);
    } else if (orderBy == "storage") {
        function compare(a,b) {
            if (a.storageprice > b.storageprice)
                return 1;
            if (a.storageprice < b.storageprice)
                return -1;
            return 0;
        }
        hosts.sort(compare);
    } else if (orderBy == "upload") {
        function compare(a,b) {
            if (a.uploadbandwidthprice > b.uploadbandwidthprice)
                return 1;
            if (a.uploadbandwidthprice < b.uploadbandwidthprice)
                return -1;
            return 0;
        }
        hosts.sort(compare);
    } else if (orderBy == "download") {
        function compare(a,b) {
            if (a.downloadbandwidthprice > b.downloadbandwidthprice)
                return 1;
            if (a.downloadbandwidthprice < b.downloadbandwidthprice)
                return -1;
            return 0;
        }
        hosts.sort(compare);
    } else {
        function compare(a,b) {
            if (a.collateralRatio > b.collateralRatio)
                return 1;
            if (a.collateralRatio < b.collateralRatio)
                return -1;
            return 0;
        }
        hosts.sort(compare);
    }

    var boxesToDisable = []

    // Initializing table
    var content = '<div class="table-content" style="margin: 25px 25px; background-color: #fff">'
        + '<table class="table" style="margin: auto; margin: 0px 0px 25px 0px"><thead>'
            + '<tr>'
                + '<th style="width: 10px"></th>'
                + '<th>Country</th>'
                + '<th>Host</th>'
                + '<th>Storage</th>'
                + '<th>Upload</th>'
                + '<th>Download</th>'
                + '<th>Collateral</th>'
                + '<th>Rank</th>'
            + '</tr>'

    // Iterating hosts
    for (var j = 0; j < hosts.length; j++) {
        if (showMode == "all" || (showMode="onlySelected" && hosts[j].onList == true)) {
        
            // Uptime calculation
            var uptime = (hosts[j].recentsuccessfulinteractions/(hosts[j].recentsuccessfulinteractions + hosts[j].recentfailedinteractions)*100).toFixed(1)
            if (uptime == Infinity) {uptime = 0}

            content = content + '<tr>'
                    + '<td style="font-size: 14px; height: 25px">'
                        + '<input type="checkbox" id="checkHost' + hosts[j].hostIdNumber + '"'
            // Checking box
            if (hosts[j].onList == true) {
                content = content + " checked"
            }

            // Adding it to a list to disable the box if alerted
            if (hosts[j].alert == true) {
                boxesToDisable.push(hosts[j].hostIdNumber)
            }
                        
            content = content + ' onchange="clickHost(this)">'
                    + '</td>'
                    + '<td style="font-size: 14px; height: 25px">' + hosts[j].countryCode + '</td>'
                    + '<td style="font-size: 14px; height: 25px">'
                        + '<div class="tooltip">' + hosts[j].netaddress
                            + '<span class="tooltiptext">'
                                + 'Country: ' + hosts[j].countryName + '<br>'
                                + 'Accepts contracts: ' + hosts[j].acceptingcontracts + '<br>'
                                + 'Recent uptime: ' + uptime + '%<br>'
                                + 'Version: ' + hosts[j].version + '<br>'
                                + 'Total storage: ' + (hosts[j].totalstorage/1000000000000).toFixed(2) + ' TB<br>'
                                + 'Remaining storage: ' + (hosts[j].remainingstorage/1000000000000).toFixed(2) + ' TB'
                            + '</span>'							
                        + '</div>'
            // Showing alert
            if (hosts[j].alert == true) {
                content = content + '<div class="tooltip"><i class="fas fa-exclamation-triangle" style="color: #cc4444"></i>'
                            + '<span class="tooltiptext">'
                                + 'SiaStats alert: ' + hosts[j].message
                            + '</span>'
                        + '</div>'
            }
            content = content + '</td>'
                    + '<td style="font-size: 14px; height: 25px"><span>' + parseInt(hosts[j].storageprice * 400 / 92592592592)+ ' SC/TB/mo</span></td>'
                    + '<td style="font-size: 14px; height: 25px"><span>' + parseInt(hosts[j].uploadbandwidthprice/1000000000000) + ' SC/TB</span></td>'
                    + '<td style="font-size: 14px; height: 25px"><span>' + parseInt(hosts[j].downloadbandwidthprice/1000000000000) + ' SC/TB</span></td>'
                    + '<td style="font-size: 14px; height: 25px"><span>' + (hosts[j].collateral / hosts[j].storageprice).toFixed(1) + 'x </span></td>'
                    + '<td style="font-size: 14px; height: 25px"><span>#' + hosts[j].rank + '</span></td>'
                + '</tr>'
        }
    }
    content = content + '</thead></table></div>'

    // Final spacer
    content = content + '<div style="height: 100px"></div>'

    document.getElementById("hosts-table-content").innerHTML = content

    // Disabling boxes
    for (var i = 0; i < boxesToDisable.length; i++) {
        var checkId = "checkHost" + boxesToDisable[i]
        if (settings.listMode == "whitelist" || settings.listMode == "blacklist") {
            document.getElementById(checkId).disabled = true;
        }
    }
}


// Groups hosts by version
function hostsOrderByVersion(settings, hosts, farmsDefinition) {
    
    // Determining the show mode
    var showMode = $('#showDropdown').find(":selected").val();

    // Adding alerts
    hosts = addAlertsToHosts(hosts, farmsDefinition)

    // Adding a hostID number and rank to identify the hosts, as we are going to rearrange the list
    for (var i = 0; i < hosts.length; i++) {
        hosts[i].hostIdNumber = i
        hosts[i].rank = hosts.length - i
    }

    // Grouping by version
    var versions = []
    for (var i = 0; i < hosts.length; i++) {
        var versionMatch = false
        for (var j = 0; j < versions.length; j++) {
            if (hosts[i].version == versions[j].version) {
                versionMatch = true
                versions[j].hosts++
                versions[j].hostsList.push(hosts[i])
            }
        }
        if (versionMatch == false) {
            // Create new entry on array
            versions.push({
                version: hosts[i].version,
                hosts: 1,
                hostsList: [hosts[i]]
            })
        }
    }
    
    // Sorting
    function compare(a,b) {
        if (a.version < b.version)
            return 1;
        if (a.version > b.version)
            return -1;
        return 0;
    }
    versions.sort(compare);

    // Displaying
    var content = ""
    for (var i = 0; i < versions.length; i++) {
        // Checking if there is at least one selected host on this version
        var versionWithSelectedHosts = false
        for (var j = 0; j < versions[i].hostsList.length; j++) {
            if (versions[i].hostsList[j].onList == true) {
                versionWithSelectedHosts = true
            }
        }

        if (showMode == "all" || (showMode == "onlySelected" && versionWithSelectedHosts == true)) {
        
            content = content + '<div class="table-content" style="margin: 25px 25px; background-color: #fff">'
                + '<table class="table" style="margin: auto; margin: 0px 0px 25px 0px">'
                    + '<thead>'
                        + '<tr>'
                            + '<th style="width: 10px">'
                                + '<input type="checkbox" id="checkVersion' + versions[i].version + '" onchange="clickVersion(this)">'
                            + '</th>'
                            + '<th colspan="7">'
                                + versions[i].version + ' - ' + versions[i].hosts + " hosts"
                            + '</th>'
                        + '</tr>'
        }

        // Iterating hosts
        for (var j = 0; j < versions[i].hostsList.length; j++) {
            if (showMode == "all" || (showMode == "onlySelected" && versions[i].hostsList[j].onList == true)) { // In "onlySelected" mode, only show if selected
            
                // Uptime calculation
                var uptime = (versions[i].hostsList[j].recentsuccessfulinteractions/(versions[i].hostsList[j].recentsuccessfulinteractions + versions[i].hostsList[j].recentfailedinteractions)*100).toFixed(1)
                if (uptime == Infinity) {uptime = 0}

                content = content + '<tr>'
                        + '<td style="font-size: 14px; height: 25px"></td>'
                        + '<td style="font-size: 14px; height: 25px">'
                            + '<input type="checkbox" id="checkHost' + versions[i].hostsList[j].hostIdNumber + '"'
                // Checking box
                if (versions[i].hostsList[j].onList == true) {
                    content = content + " checked"
                }
                            
                content = content + ' onchange="clickHost(this)">'
                        + '</td>'
                        + '<td style="font-size: 14px; height: 25px">'
                            + '<div class="tooltip">' + versions[i].hostsList[j].netaddress
                                + '<span class="tooltiptext">'
                                    + 'Country: ' + versions[i].hostsList[j].countryName + '<br>'
                                    + 'Accepts contracts: ' + versions[i].hostsList[j].acceptingcontracts + '<br>'
                                    + 'Recent uptime: ' + uptime + '%<br>'
                                    + 'Version: ' + versions[i].hostsList[j].version + '<br>'
                                    + 'Total storage: ' + (versions[i].hostsList[j].totalstorage/1000000000000).toFixed(2) + ' TB<br>'
                                    + 'Remaining storage: ' + (versions[i].hostsList[j].remainingstorage/1000000000000).toFixed(2) + ' TB'
                                + '</span>'							
                            + '</div>'
                // Showing alert
                if (versions[i].hostsList[j].alert == true) {
                    content = content + '<div class="tooltip"><i class="fas fa-exclamation-triangle" style="color: #cc4444"></i>'
                                + '<span class="tooltiptext">'
                                    + 'SiaStats alert: ' + versions[i].hostsList[j].message
                                + '</span>'
                            + '</div>'
                }
                content = content + '</td>'
                        + '<td style="font-size: 14px; height: 25px"><span>' + parseInt(versions[i].hostsList[j].storageprice * 400 / 92592592592)+ ' SC/TB/mo</span></td>'
                        + '<td style="font-size: 14px; height: 25px"><span>Up:' + parseInt(versions[i].hostsList[j].uploadbandwidthprice/1000000000000) + ' SC/TB</span></td>'
                        + '<td style="font-size: 14px; height: 25px"><span>Down: ' + parseInt(versions[i].hostsList[j].downloadbandwidthprice/1000000000000) + ' SC/TB</span></td>'
                        + '<td style="font-size: 14px; height: 25px"><span>Collateral: ' + (versions[i].hostsList[j].collateral / versions[i].hostsList[j].storageprice).toFixed(1) + 'x </span></td>'
                        + '<td style="font-size: 14px; height: 25px"><span>Rank #' + versions[i].hostsList[j].rank + '</span></td>'
                    + '</tr>'
            }
            
        }
        content = content + '</thead></table></div>'
    }

    // Final spacer
    content = content + '<div style="height: 100px"></div>'

    document.getElementById("hosts-table-content").innerHTML = content

    // Updating alerts
    for (var i = 0; i < hosts.length; i++) {
        // Disable checkbox on alert
        var checkId = "checkHost" + i
        if (settings.listMode == "whitelist" && hosts[i].alert == true) {
            document.getElementById(checkId).checked = false;
            document.getElementById(checkId).disabled = true;
        } else if (settings.listMode == "blacklist" && hosts[i].alert == true) {
            document.getElementById(checkId).checked = true;
            document.getElementById(checkId).disabled = true;
        }
    }
}


// Events on clicking the checkbox of a host
function clickHost(checkboxElem) {
    $.getJSON(path.join(__dirname, "../databases/hosts.json"), function (hosts) {
        var hostID = parseInt(checkboxElem.id.slice(9))
        if (checkboxElem.checked) {
            hosts[hostID].onList = true
        } else {
            hosts[hostID].onList = false
        }
        // Saving file
        try { fs.writeFileSync(path.join(__dirname, "../databases/hosts.json"), JSON.stringify(hosts), 'utf-8'); }
        catch(e) { alert('Failed to save the file hosts.json\n' + e);}

        updateFilterCount(hosts)
    })
}


// Updates the count of hosts selected for the filter
function updateFilterCount(hosts) {
    var filterCount = 0
    for (var i = 0; i < hosts.length; i++) {
        if (hosts[i].onList == true) {
            filterCount++
        }
    }
    document.getElementById("summaryHosts").innerHTML = filterCount
}


// Events on clicking the checkbox of a country
function clickCountry(checkboxElem) {
    $.getJSON(path.join(__dirname, "../databases/hosts.json"), function (hosts) {
        $.getJSON(path.join(__dirname, "../databases/settings.json"), function (settings) {
            $.getJSON(path.join(__dirname, "../databases/farms_definition.json"), function (farmsDefinition) {

                // Adding alerts
                hosts = addAlertsToHosts(hosts, farmsDefinition)
            
                // Adding a hostID number and rank to identify the hosts, as we are going to rearrange the list
                for (var i = 0; i < hosts.length; i++) {
                    hosts[i].hostIdNumber = i
                    hosts[i].rank = hosts.length - i
                }

                var countryID = checkboxElem.id.slice(12)
                
                if (checkboxElem.checked) {
                    for (var i = 0; i < hosts.length; i++) {
                        if (countryID == "EU") {
                            var c = hosts[i].countryCode
                            if (c == "BE" || c == "BG" || c == "CZ" || c == "DK" || c == "DE" || c == "EE" || c == "IE" || c == "EL" || c == "ES" || c == "FR" ||
                                c == "HR" || c == "IT" || c == "CY" || c == "LV" || c == "LT" || c == "LU" || c == "HU" || c == "MT" || c == "NL" || c == "AT" ||
                                c == "PL" || c == "PT" || c == "RO" || c == "SI" || c == "SK" || c == "FI" || c == "SE" || c == "GB" || c == "LI" || c == "IS" ||
                                c == "NO") {
                                    var checkHost = "checkHost" + hosts[i].hostIdNumber
                                    if (settings.listMode != "whitelist" || hosts[i].alert != true) { // Avoids adding an unsafe host
                                        document.getElementById(checkHost).checked = true;
                                        hosts[i].onList = true
                                    }
                                    document.getElementById("checkCountry" + c).checked = true;
                            }
                        } else {
                            if (hosts[i].countryCode == countryID) {
                                var checkHost = "checkHost" + hosts[i].hostIdNumber
                                if (settings.listMode != "whitelist" || hosts[i].alert != true) { // Avoids adding an unsafe host
                                    document.getElementById(checkHost).checked = true;
                                    hosts[i].onList = true
                                }
                            }
                        }
                    }
                } else {
                    for (var i = 0; i < hosts.length; i++) {
                        if (countryID == "EU") {
                            var c = hosts[i].countryCode
                            if (c == "BE" || c == "BG" || c == "CZ" || c == "DK" || c == "DE" || c == "EE" || c == "IE" || c == "EL" || c == "ES" || c == "FR" ||
                                c == "HR" || c == "IT" || c == "CY" || c == "LV" || c == "LT" || c == "LU" || c == "HU" || c == "MT" || c == "NL" || c == "AT" ||
                                c == "PL" || c == "PT" || c == "RO" || c == "SI" || c == "SK" || c == "FI" || c == "SE" || c == "GB" || c == "LI" || c == "IS" ||
                                c == "NO") {
                                    var checkHost = "checkHost" + hosts[i].hostIdNumber
                                    if (settings.listMode != "blacklist" || hosts[i].alert != true) { // Avoids adding an unsafe host
                                        document.getElementById(checkHost).checked = false;
                                        hosts[i].onList = false
                                    }
                                    document.getElementById("checkCountry" + c).checked = false;
                            }
                        } else {
                            if (hosts[i].countryCode == countryID) {
                                var checkHost = "checkHost" + hosts[i].hostIdNumber
                                if (settings.listMode != "blacklist" || hosts[i].alert != true) { // Avoids adding an unsafe host
                                    document.getElementById(checkHost).checked = false;
                                    hosts[i].onList = false
                                }
                            }
                        }
                    }
                }
                // Saving file
                try { fs.writeFileSync(path.join(__dirname, "../databases/hosts.json"), JSON.stringify(hosts), 'utf-8'); }
                catch(e) { alert('Failed to save the file hosts.json\n' + e);}

                updateFilterCount(hosts)
            })
        })
    })
}


// Events on clicking the checkbox of a Sia version number
function clickVersion(checkboxElem) {
    $.getJSON(path.join(__dirname, "../databases/hosts.json"), function (hosts) {
        $.getJSON(path.join(__dirname, "../databases/settings.json"), function (settings) {
            $.getJSON(path.join(__dirname, "../databases/farms_definition.json"), function (farmsDefinition) {

                // Adding alerts
                hosts = addAlertsToHosts(hosts, farmsDefinition)
        
                // Adding a hostID number and rank to identify the hosts, as we are going to rearrange the list
                for (var i = 0; i < hosts.length; i++) {
                    hosts[i].hostIdNumber = i
                    hosts[i].rank = hosts.length - i
                }

                var versionID = checkboxElem.id.slice(12)
                if (checkboxElem.checked) {
                    for (var i = 0; i < hosts.length; i++) {
                        if (hosts[i].version == versionID) {
                            var checkHost = "checkHost" + hosts[i].hostIdNumber
                            if (settings.listMode != "whitelist" || hosts[i].alert != true) { // Avoids adding an unsafe host
                                document.getElementById(checkHost).checked = true;
                                hosts[i].onList = true
                            }
                        }
                    }
                } else {
                    for (var i = 0; i < hosts.length; i++) {
                        if (hosts[i].version == versionID) {
                            var checkHost = "checkHost" + hosts[i].hostIdNumber
                            if (settings.listMode != "blacklist" || hosts[i].alert != true) { // Avoids adding an unsafe host
                                document.getElementById(checkHost).checked = false;
                                hosts[i].onList = false
                            }
                        }
                    }
                }
                // Saving file
                try { fs.writeFileSync(path.join(__dirname, "../databases/hosts.json"), JSON.stringify(hosts), 'utf-8'); }
                catch(e) { alert('Failed to save the file hosts.json\n' + e);}

                updateFilterCount(hosts)
            })
        })
    })
}


// Clears the list of hosts and sets filter as Disabled
function clearFilter() {
    $.getJSON(path.join(__dirname, "../databases/hosts.json"), function (hosts) {
        $.getJSON(path.join(__dirname, "../databases/settings.json"), function (settings) {
            
            // Removes each host
            for (var i = 0; i < hosts.length; i++) {
                if (hosts[i].onList == true) {
                    var checkHost = "checkHost" + i
                    document.getElementById(checkHost).checked = false;
                }
                hosts[i].onList = false
            }
            try { fs.writeFileSync(path.join(__dirname, "../databases/hosts.json"), JSON.stringify(hosts), 'utf-8'); }
            catch(e) { alert('Failed to save the file hosts.json\n' + e);}
            updateFilterCount(hosts)

            // Filter set to disabled
            settings.listMode = "disable"
            try { fs.writeFileSync(path.join(__dirname, "../databases/settings.json"), JSON.stringify(settings), 'utf-8'); }
            catch(e) { alert('Failed to save the file settings.json\n' + e);}
            document.getElementById("summaryMode").innerHTML = "disable"
            
            document.getElementById("r1").checked = true
            $("#farmsToggle").hide();
        })
    })
}


// Deals with the dropdown menu "show all hosts/show selected". It just directs to the Show functions
function changeShownHosts(value) {
    var listMode = $('#orderByDropdown').find(":selected").val();
    hostsOrderBy(listMode)
}


// Filter mode toggle
$(document).ready(function() {
    $.getJSON(path.join(__dirname, "../databases/settings.json"), function (settings) {
        deployListToggle(settings)
    })
});

function deployListToggle(settings) {
    $('input:radio[name=radio]').change(function() {
        if (this.value == 'r1') {
            $("#farmsToggle").hide();
            settings.listMode = "disable"
            document.getElementById("summaryMode").innerHTML = "disable"
            checkAlertedHosts("disable")
        } else if (this.value == 'r2') {
            document.getElementById("farmsText").innerHTML = "Remove farms from the whitelist"
            document.getElementById("farmsTooltip").innerHTML = "The hosts on each farm beyond the first one will be removed from the whitelist"
            document.getElementById("clickFarms").checked = false
            $("#farmsToggle").show();
            settings.listMode = "whitelist"
            document.getElementById("summaryMode").innerHTML = "whitelist"
            checkAlertedHosts("whitelist")
        } else if (this.value == 'r3') {
            document.getElementById("farmsText").innerHTML = "Add farms to the blacklist"
            document.getElementById("farmsTooltip").innerHTML = "The hosts on each farm beyond the first one will be added to the blacklist"
            document.getElementById("clickFarms").checked = false
            $("#farmsToggle").show();
            settings.listMode = "blacklist"
            document.getElementById("summaryMode").innerHTML = "blacklist"
            checkAlertedHosts("blacklist")
        }

        // Saving file
        try { fs.writeFileSync(path.join(__dirname, "../databases/settings.json"), JSON.stringify(settings), 'utf-8'); }
        catch(e) { alert('Failed to save the file settingss.json\n' + e);}
    });
}


// Depending on the list mode, the alerted hosts get disabled or not
function checkAlertedHosts(mode) {
    $.getJSON(path.join(__dirname, "../databases/hosts.json"), function (hosts) {
        $.getJSON(path.join(__dirname, "../databases/farms_definition.json"), function (farms) {

            // Adding alerts
            var hostsWithAlert = addAlertsToHosts(hosts, farms)
            
            for (var i = 0; i < hostsWithAlert.length; i++) {
                if (hostsWithAlert[i].alert == true) {
                    // Depending on the filter mode
                    var checkId = "checkHost" + i
                    if (mode == "disable") {
                        document.getElementById(checkId).disabled = false;
                    } else if (mode == "whitelist") {
                        document.getElementById(checkId).checked = false;
                        hosts[i].onList = false
                        document.getElementById(checkId).disabled = true;
                    } else if (mode == "blacklist") {
                        document.getElementById(checkId).checked = true;
                        hosts[i].onList = true
                        document.getElementById(checkId).disabled = true;
                    }
                }
            }

            updateFilterCount(hosts)
            
            // Saving file
            try { fs.writeFileSync(path.join(__dirname, "../databases/hosts.json"), JSON.stringify(hosts), 'utf-8'); }
            catch(e) { alert('Failed to save the file hosts.json\n' + e);}
        })
    })
}


// Farms checkbox actions
function clickFarms() {
    if (document.getElementById("clickFarms").checked == true) {
        if (document.getElementById("r2").checked == true) {
            // Whitelist
            var mode = "whitelist"
        } else if (document.getElementById("r3").checked == true) {
            // Blacklist
            var mode = "blacklist"
        } else {
            var mode = "disable"
        }

        if (mode != "disable") {
            $.getJSON(path.join(__dirname, "../databases/hosts.json"), function (hosts) {
                $.getJSON(path.join(__dirname, "../databases/farms_definition.json"), function (farmsDefinition) {
                    // Determining the show mode
                    var showMode = $('#showDropdown').find(":selected").val();

                    // Check on each farm and marks the host if it is not the first one found on the farms definition list
                    for (var i = 0; i < farmsDefinition.length; i++) {
                        var firstHostFound = false
                        for (var j = 0; j < farmsDefinition[i].hosts.length; j++) {
                            for (var k = 0; k < hosts.length; k++) {
                                if (farmsDefinition[i].hosts[j].pubkey == hosts[k].publickey.key) {
                                    if (firstHostFound == false) {
                                        // Do nothing with the first host of the farm identified, just update the boolean
                                        firstHostFound = true
                                    } else {
                                        if (mode == "whitelist") {
                                            hosts[k].onList = false

                                            //Only check boxes if they are visible
                                            var checkHost = "checkHost" + hosts[k].hostIdNumber
                                            var elementExists = document.getElementById(checkHost)
                                            if (elementExists != null) {
                                                document.getElementById(checkHost).checked = false
                                            }

                                        } else {
                                            hosts[k].onList = true
                                            
                                            //Only check boxes if they are visible
                                            var checkHost = "checkHost" + hosts[k].hostIdNumber
                                            var elementExists = document.getElementById(checkHost)
                                            if (elementExists != null) {
                                                document.getElementById(checkHost).checked = true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Save and update stats
                    try { fs.writeFileSync(path.join(__dirname, "../databases/hosts.json"), JSON.stringify(hosts), 'utf-8'); }
                    catch(e) { alert('Failed to save the file hosts.json\n' + e);}
                    updateFilterCount(hosts)
                })
            })
        }        
    }
}


// FARMS
// Shows the list of farms
function displayFarms(farms, contracts) {
    var tableAlert = ""
    var tableFarms = ""
    if (farms.length >= 3 || (farms.length == 2 && farms[1].hosts.length > 0)) {
        for (var i = 1; i < farms.length; i++) {
            if (farms[i].hosts.length > 0) {
                // Building a table, later we decide if we add it to one list or the other
                var tableContracts = '<div class="table-content" style="margin: 25px 25px; background-color: #fff">'
                    + '<table class="table" style="margin: auto; margin: 0px 0px 25px 0px">'
                    + '<thead>'
                        + '<tr>'
                            + '<th style="width:30px"></th>'
                            + '<th colspan=3><span>' + farms[i].farm + '</span></th>'
                        + '</tr>'
                
                // Alert line
                if (farms[i].alert == true) {
                    tableContracts = tableContracts
                        + '<tr style="background-color: #ffcccc">'
                            + '<td></td>'
                            + '<td colspan=3><strong><i class="fas fa-exclamation-triangle" style="font-size: 100%"></i> SiaStats alert: ' + farms[i].message + '</strong></td>'
                }

                for (var j = 0; j < farms[i].hosts.length; j++) {
                    // For each member of the farm
                    
                    // First, we need to identify the position on the contract list, to assign a correct checkbox ID
                    var checkBoxNum = ""
                    for (var k = 0; k < contracts.length; k++) {
                        if (farms[i].hosts[j].contract == contracts[k].id) {
                            checkBoxNum = k
                        }
                    }

                    tableContracts = tableContracts
                        + '<tr>'
                            + '<td>'
                                + '<input type="checkbox" id="checkFarm' + checkBoxNum + '">'
                            + '</td>'
                            + '<td>'
                                + farms[i].hosts[j].ip
                            + '</td>'
                            + '<td>'
                                + farms[i].hosts[j].data + ' GB'
                            + '</td>'
                            + '<td>'
                                + farms[i].hosts[j].cost + ' SC'
                            + '</td>'
                        + '</tr>'
                }

                tableContracts = tableContracts + '</thead></table></div>' // Finish table

                // Choosing where to display
                if (farms[i].alert == true) {
                    tableAlert = tableAlert + tableContracts
                } else {
                    tableFarms = tableFarms + tableContracts
                }
            }
        }
    }

    // Message if group is empty
    if (tableAlert == '') {
        tableAlert = '<div style="padding: 25px; font-size: 16px; color: #728081;"><i>No unsafe hosts found among your contracts</i></div>'
    }
    if (tableFarms == '') {
        tableFarms = '<div style="padding: 25px; font-size: 16px; color: #728081;"><i>No additional farms found among your contracts</i></div>'
    }

    // Final spacer
    tableFarms = tableFarms + '<div style="height: 100px"></div>'

    document.getElementById("dangerousFarms").innerHTML = tableAlert
    document.getElementById("otherFarms").innerHTML = tableFarms
}


function autoFarms() {
    // Marks the recommeded action on farms
    $.getJSON(path.join(__dirname, "../databases/contracts.json"), function (contracts) {
        $.getJSON(path.join(__dirname, "../databases/farms.json"), function (farms) {

            // Iterate on farms. If alerted, select all, if regular farm, select all except the first host on list
            for (var i = 1; i < farms.length; i++) {
                for (var j = 0; j < farms[i].hosts.length; j++) {
                    if (farms[i].alert == true) { 
                        findAndMarkFarm(farms[i].hosts[j].contract, contracts, false)
                    } else if (farms[i].alert != true && j >= 1) {
                        findAndMarkFarm(farms[i].hosts[j].contract, contracts, false)
                    } else if (farms[i].alert != true && j == 0) {
                        findAndMarkFarm(farms[i].hosts[j].contract, contracts, true)
                    }
                }
            }

        })
        .fail(function() { missingFiles() })
    })
    .fail(function() { missingFiles() })
}

function findAndMarkFarm(farmContract, contracts, unmark) {
    // First, we need to identify the position on the contract list, to assign a correct checkbox ID. Then marks the box
    var checkBoxNum = ""
    for (var k = 0; k < contracts.length; k++) {
        if (farmContract == contracts[k].id) {
            checkBoxNum = k
        }
    }
    var checkHost = "checkFarm" + checkBoxNum
    // Mark or unmark checkbox, depending on the unmark boolean
    if (unmark == false) {
        document.getElementById(checkHost).checked = true;
    } else {
        document.getElementById(checkHost).checked = false;
    }
}



// QUICK TOUR
function quickTour1() {
    document.getElementById("overlay").style.height = "100%";
    document.getElementById("overlay").style.backgroundColor = "rgba(255,255,255, 0.75)";
    $("#tourNextButton").show();
    $("#overlayBox").hide();
    setTimeout(function(){
        $("#tour1").fadeIn();
    }, 300);
    
    document.getElementById("tourNextButton").innerHTML = '<button type="button" onclick="quickTour2()" class="button-next">Next</button>'
}

function quickTour2() {
    $("#tour1").fadeOut();

    $("#tab-contracts").fadeIn();
    $("#tab-hosts").fadeOut();
    $("#tab-farms").fadeOut();
    $("#tab-about").fadeOut();
                
    setTimeout(function(){
        $("#tour2").fadeIn();
    }, 400);
    
    document.getElementById("tourNextButton").innerHTML = '<button type="button" onclick="quickTour3()" class="button-next">Next</button>'
}

function quickTour3() {
    $("#tour2").fadeOut();

    $("#tab-contracts").fadeOut();
    $("#tab-hosts").fadeOut();
    $("#tab-farms").fadeIn();
    $("#tab-about").fadeOut();
                
    setTimeout(function(){
        $("#tour3").fadeIn();
    }, 400);
    
    document.getElementById("tourNextButton").innerHTML = '<button type="button" onclick="quickTour4()" class="button-next">Next</button>'
}

function quickTour4() {
    $("#tour3").fadeOut();
                
    setTimeout(function(){
        $("#tour4").fadeIn();
    }, 400);
    
    document.getElementById("tourNextButton").innerHTML = '<button type="button" onclick="quickTour5()" class="button-next">Next</button>'
}

function quickTour5() {
    $("#tour4").fadeOut();
                
    setTimeout(function(){
        $("#tour5").fadeIn();
    }, 400);
    
    document.getElementById("tourNextButton").innerHTML = '<button type="button" onclick="quickTour6()" class="button-next">Next</button>'
}


function quickTour6() {
    $("#tour5").fadeOut();

    $("#tab-contracts").fadeOut();
    $("#tab-hosts").fadeIn();
    $("#tab-farms").fadeOut();
    $("#tab-about").fadeOut();
                
    setTimeout(function(){
        $("#tour6").fadeIn();
    }, 400);
    
    document.getElementById("tourNextButton").innerHTML = '<button type="button" onclick="quickTour7()" class="button-next">Next</button>'
}

function quickTour7() {
    $("#tour6").fadeOut();
                
    setTimeout(function(){
        $("#tour7").fadeIn();
    }, 400);
    
    document.getElementById("tourNextButton").innerHTML = '<button type="button" onclick="quickTour8()" class="button-next">Next</button>'
}

function quickTour8() {
    $("#tour7").fadeOut();
                
    setTimeout(function(){
        $("#tour8").fadeIn();
    }, 400);
    
    document.getElementById("tourNextButton").innerHTML = '<button type="button" onclick="endTour()" class="button-next">Finish</button>'
}

function endTour() {
    document.getElementById("overlay").style.height = "0%";
    $("#tourNextButton").hide();
    initialLoad()
    setTimeout(function(){
        $("#overlayBox").show();
        document.getElementById("overlay").style.backgroundColor = "rgba(255,255,255, 0.8)";
    }, 500);

    $("#tour8").hide()
}