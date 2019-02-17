![logo](https://github.com/hakkane84/Decentralizer-GUI/blob/master/full_logo.png)
# Decentralizer-GUI
Contracts micro-managing and unsafe hosts protection for Sia (GUI)

Website: https://keops.cc/decentralizer

A tool for Sia renters that allows:

* a) Micro-managing and data visualization about the formed contracts.
* b) Creating filters of hosts, according to geolocation, Sia version, pricing and/or manual selection.
* c) Detection of hosting farms and unsafe hosts, allowing cancelling contracts with them and filter them out. "Farms" represent multiple hosts sharing geolocation, most pprobably being controlled by the same opeprator. Centralization of hosts is problematic, as it implicates that redundant copies of the files are being stored in the same location (what defeats the purpose of the redundancy). It also exposes the renter to malicious hosts performing a sybil attack by denying acccess to files after controling a large enough number of hosts.

Ready-to-use binaries for Windows, MacOS and Linux can be downloaded here: https://github.com/hakkane84/Decentralizer-GUI/releases

## User guide

The "Quick tour" button on the side menu briefly explains all the functions of Decentralizer.

In first place, and each time you open Decentralizer, use the "Scan" button to retrieve your set of contracts and update the information about hosts. Some files, including a database of hosts geolocation and a database of farms and unsafe hosts, will be retrieved from SiaStats.info. If the connection fails, local copies of these files will be used.

### Contracts tab

A map with the geolocation of all the contracted hosts is shown, connected with green lines to the current position of the renter.

The list bellow shows details about each contract. Hover the mouse over the value (in Siacoins) of each contract to get more details about the financials. Use the checkboxes on each contract, and the button at the bottom of the list, to cancel the desired contracts. Sia will form contracts with replacement hosts afterwards. 

Keep in mind that the **cancelling contracts will incur Siacoin expenses**: new contracts will be formed, data will be uploaded to the replacement hosts and if you don't have the files locally anymore, the files will be downloaded first from the rest of available hosts (incurring download expenses).

### Farms tab

The first section shows your contracts with unsafe hosts. Unsafe hosts are identified and flagged by SiaStats.info (https://siastats.info/hosting_farms): hosts threatening with Sybil attacks and other dangers. It is highly recommended to cancel contracts with all of them.

The second section lists the rest of contracts formed with farms. While not inherently unsafe, multiple data copies controlled by the same operator defeat the purpose of file redundancy and compromises data availability if these farms go offline. It is recommended to remove redundant contracts with the same farm.

The "Recommended selection" button will automatically mark all the unsafe hosts, together with every host beyond the first one on each farm.

The "Cancel selected contracts" will immediately cancel the currently selected contracts.

### Hosts filter tab

## Changes log
### v1.0
* Initial release

## Donations

Siacoin: `bde3467039a6d9a563224330ff7578a027205f1f2738e1e0daf134d8ded1878cf5870c41927d`
