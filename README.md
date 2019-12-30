![logo](https://github.com/hakkane84/Decentralizer-GUI/blob/master/full_logo.png)
# Decentralizer-GUI
Contracts micro-managing and unsafe hosts protection for Sia (GUI)

Website: https://keops.cc/decentralizer

A tool for Sia renters that allows:

* a) Micro-managing and data visualization about the formed contracts.
* b) Creating filters of hosts, according to geolocation, Sia version, SiaStats performance score, pricing and/or manual selection.
* c) Detection of hosting farms and unsafe hosts, allowing cancelling contracts with them and/or filter them out. "Farms" represent multiple hosts sharing geolocation, most pprobably being controlled by the same opeprator. Centralization of hosts is problematic, as it implicates that redundant copies of the files are being stored in the same location (what defeats the purpose of the redundancy). It also exposes the renter to malicious hosts performing a sybil attack by denying acccess to files after controling a large enough number of hosts.

Ready-to-use binaries for Windows, MacOS and Linux can be downloaded here: https://github.com/hakkane84/Decentralizer-GUI/releases

Users of headless servers or preferring command line interfaces can use Decentralizer-CLI instead, which brings the same features: https://github.com/hakkane84/Decentralizer-CLI

## User guide

The "Quick tour" button on the side menu briefly explains all the functions of Decentralizer.

In first place, and each time you open Decentralizer, use the "Scan" button to retrieve your set of contracts and update the information about hosts. Some files, including a database of hosts geolocation and a database of farms and unsafe hosts, will be retrieved from SiaStats.info. If the connection fails, local copies of these files will be used instead.

### Contracts tab

A map with the geolocation of all the contracted hosts is shown, connected with green lines to the current position of the renter.

The map is followed by a timeline representation of all the active contracts. For each contract, the billing period and the grace period (formerly known in Sia as the "renew window") are represented. Additional details are shown hovering the mouse over them. Over the billing period, in a dark gray percenrtage bar and an overlayed text, the percentage of coins already spent on the contract is shown.

The list bellow shows details about each contract. Hover the mouse over the coin value of each contract to get more details about the financials. Use the checkboxes on each contract, and the button at the bottom of the list, to cancel the desired contracts. Sia will form contracts with replacement hosts afterwards. 

Keep in mind that the **cancelling contracts will incur Siacoin expenses**: new contracts will be formed, data will be uploaded to the replacement hosts and if you don't have the files locally anymore, the files will be downloaded first from the rest of available hosts (incurring in download expenses).

![screenshot](https://github.com/hakkane84/Decentralizer-GUI/blob/master/screenshot1.jpg)

![screenshot](https://github.com/hakkane84/Decentralizer-GUI/blob/master/screenshot4.jpg)

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

The "Order by" drop-down menu allows to re-arrange the list of hosts according to their country, used Sia version, SiaStats performance score or different pricing parameters. In the case of showing by country, an additional checkbox allows to mark all the hosts in the European Economic Area (The EU, plus Iceland, Norway and Liechtenstein).

The "Show" drop-down menu allows to toggle between displaying all the hosts or just those already marked (facilitating additional filtering).

All your selections will be saved automatically, so you can navigate to other tabs, change the "Order by" option or close Decentralizer without losing your selections. **Selecting hosts does not include them to the Sia filter automatically: the selection becomes effective only after pressing the "Apply filter to Sia button**.

Keep in mind that **creating a restrictive filter can incur in higher expenses and/or limit the ability to reach the desired redundancy**: by limiting the pool of possible hosts, the chances that the remaining hosts have a pricing higher than a default contract set are bigger. If the list is too restrictive, it can limit the ability of Sia of reaching the default number of contracts, limiting the redundancy of files.

If the filter leaves out hosts you already have contracts with, **these contracts will be cancelled immediately by Sia**. As explained in the previous section, this can incur in Siacoin expenses.

![screenshot](https://github.com/hakkane84/Decentralizer-GUI/blob/master/screenshot3.jpg)

## Inter-operating Decentralizer-GUI and Decentralizer-CLI

The GUI and CLI versions of Decentralizer are inter-operable. This means that the data collected on one version and computer can be processed on a second one. This is specially useful for headless machines: the CLI can be installed on this computer, but the data can be exported to the main computer for its visualization using the GUI. Also, a filter of hosts can be created on the GUI and then exported to the headless machine to be applied by the CLI version.

### Exporting data from the CLI version to the GUI

* 1- On the remote machine, scan your contracts and hosts using the command `./decentralizer scan`
* 2- Copy the folder `/databases` of the remote machine into the folder `/resources/app/databases` of the GUI version of the local machine
* 3- Open Decentralizer-GUI on the local machine. The list of contracts, its timeline, its map, and the available hosts of the remote machine will be displayed

### Importing a filter of hosts from the GUI into the CLI of a remote machine

* 1- On the local machine, open Decentralizer-GUI and create the filter of hosts. You don't need to save it or apply it: it will be auto-saved as you add hosts
* 2- Move the local folder `/resources/app/databases` into the folder `/databases` of the remote machine
* 3- On the remote machine, use the command `./decentralizer filter apply`

## Changes log

### v1.1.3

* Fixed a bug on the main screen that prevented to show the contracts map, timeline and info for some users.

### v1.1.2

* Fixed a bug when scanning hosts and contracts but the user has not stablished an allowance yet

### v1.1

* Added SiaStats performance score to the tables of hosts and contracts. Hosts can be filtered according to this score
* Added a contracts timeline chart to represent graphically the % of coins spent on each contract, their expected termination date, the billing period and their grace period

### v1.0

* Initial release

## License

Decentralizer is an open source project offered under the GNU GPLv3 license. Briefly, it means that if you want to distribute a modified version of this software you need to 1) make your changes open source, 2) keep the GNU GPLv3 license, 3) respect and show the authorship of the code.

The easiest way to comply with this is simply using the cloning button of this repository into your own GitHub repository!

## Compiling from source

Install Node.js / NPM. 

Install `electron` in dev mode: `npm install electron --save-dev`. 

The following scripts are available for easy compiling:

* `npm run package-win`
* `npm run package-mac`
* `npm run package-linux`

The compiled apps will be saved on the `release-builds` folder.

## Donations

Siacoin: `bde3467039a6d9a563224330ff7578a027205f1f2738e1e0daf134d8ded1878cf5870c41927d`
