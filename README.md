![logo](https://github.com/hakkane84/Decentralizer-GUI/blob/master/full_logo.png)
# Decentralizer-GUI
Contracts micro-managing and unsafe hosts protection for Sia (GUI)

Website: https://keops.cc/decentralizer

A tool for Sia renters that allows:

* a) Micro-managing and data visualization about the formed contracts.
* b) Creating filters of hosts, according to geolocation, Sia version, pricing and/or manual selection.
* c) Detection of hosting farms and unsafe hosts, allowing cancelling contracts with them and/or filter them out. "Farms" represent multiple hosts sharing geolocation, most pprobably being controlled by the same opeprator. Centralization of hosts is problematic, as it implicates that redundant copies of the files are being stored in the same location (what defeats the purpose of the redundancy). It also exposes the renter to malicious hosts performing a sybil attack by denying acccess to files after controling a large enough number of hosts.

Ready-to-use binaries for Windows, MacOS and Linux can be downloaded here: https://github.com/hakkane84/Decentralizer-GUI/releases

Users of headless servers or preferring command line interfaces can use Decentralizer-CLI instead, which brings the same features: https://github.com/hakkane84/Decentralizer-CLI

## User guide

The "Quick tour" button on the side menu briefly explains all the functions of Decentralizer.

In first place, and each time you open Decentralizer, use the "Scan" button to retrieve your set of contracts and update the information about hosts. Some files, including a database of hosts geolocation and a database of farms and unsafe hosts, will be retrieved from SiaStats.info. If the connection fails, local copies of these files will be used instead.

### Contracts tab

A map with the geolocation of all the contracted hosts is shown, connected with green lines to the current position of the renter.

The list bellow shows details about each contract. Hover the mouse over the coin value of each contract to get more details about the financials. Use the checkboxes on each contract, and the button at the bottom of the list, to cancel the desired contracts. Sia will form contracts with replacement hosts afterwards. 

Keep in mind that the **cancelling contracts will incur Siacoin expenses**: new contracts will be formed, data will be uploaded to the replacement hosts and if you don't have the files locally anymore, the files will be downloaded first from the rest of available hosts (incurring in download expenses).

![screenshot](https://github.com/hakkane84/Decentralizer-GUI/blob/master/screenshot1.jpg)

### Farms tab

The first section shows your contracts with unsafe hosts. Unsafe hosts are identified and flagged by SiaStats.info (https://siastats.info/hosting_farms): hosts threatening with Sybil attacks and other dangers. It is highly recommended to cancel contracts with all of them.

The second section lists the rest of contracts formed with farms. While not inherently unsafe, multiple data copies controlled by the same operator defeat the purpose of file redundancy and compromises data availability if these farms go offline. It is recommended to remove redundant contracts with the same farm. Hosts unable to be geolocated will show up as another farm.

The "Recommended selection" button will automatically mark all the unsafe hosts, together with every host beyond the first one on each farm.

The "Cancel selected contracts" will immediately cancel the currently selected contracts.

![screenshot](https://github.com/hakkane84/Decentralizer-GUI/blob/master/screenshot2.jpg)

### Hosts filter tab

The toggle on the top allows to change the behavior of the filter:

* "Disable": no filtering of hosts. If applied to Sia, all the hosts will become available again.
* "Whitelist": only the selected hosts will be used by Sia to form contracts.
* "Blacklist: all the selected hosts will be excluded by Sia to form contracts.

In whitelist mode, unsafe hosts (labelled with a warning icon) are automatically excluded. In blacklist mode, these unsafe hosts are automatically added to the list. This behavior of the app can't be changed, due to safety reasons.

In whitelist mode, a checkbox allowing to exclude farms will be available. Marking this will still allow one host per farm. In blacklist mode, this checkbox will instead allow to include the farms. Again, one host per farm will be left out of the filter.

The "Order by" drop-down menu allows to re-arrange the list of hosts according to their country, used Sia version or different pricing parameters. In the case of showing by country, an additional checkbox allows to mark all the hosts in the European Economic Area (The EU, plus Iceland, Norway and Liechtenstein).

The "Show" drop-down menu allows to toggle between displaying all the hosts or just those already marked (facilitating additional filtering).

All your selections will be saved automatically, so you can navigate to other tabs, change the "Order by" option or close Decentralizer without losing your selections. **Selecting hosts does not include them to the Sia filter automatically: the selection becomes effective only after pressing the "Apply filter to Sia button**.

Keep in mind that **creating a restrictive filter can incur in higher expenses and/or limit the ability to reach the desired redundancy**: by limiting the pool of possible hosts, the chances that the remaining hosts have a pricing higher than a default contract set are bigger. If the list is too restrictive, it can limit the ability of Sia of reaching the default number of contracts, limiting the redundancy of files.

If the filter leaves out hosts you already have contracts with, **these contracts will be cancelled immediately by Sia**. As explained in the previous section, this can incur in Siacoin expenses.

![screenshot](https://github.com/hakkane84/Decentralizer-GUI/blob/master/screenshot3.jpg)

## Changes log
### v1.0
* Initial release

## Compiling from source

Install Node.js / NPM. Install `electron` in dev mode. The following scripts are available for easy compiling:

* `npm run packager-win`
* `npm run packager-mac`
* `npm run packager-linux`

The compiled apps will be saved on the `release-builds` folder.

## Donations

Siacoin: `bde3467039a6d9a563224330ff7578a027205f1f2738e1e0daf134d8ded1878cf5870c41927d`
