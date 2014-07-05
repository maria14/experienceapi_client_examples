Experience API Client Examples
=============================

To test this example you need to have installed LRS, and change the config.json file and  tincan.xml file. The installation manual is located at the following address https://github.com/adlnet/ADL_LRS.

The xAPI client examples are built from the original Tin Can examples from Rustici Software that now implement ADL's [xAPIWrapper](https://github.com/adlnet/xAPIWrapper). 
The examples are split into two folders, .95 for data compliant to the .95 xAPI specification and 1.0 for data compliant to the current 1.0.1 spec. Read more about the Experience API Spec [here](https://github.com/adlnet/xAPI-Spec/blob/master/xAPI.md).

### 0.95/
Contains examples based on the 0.95 version of the Experience API Specification

### 1.0/
Contains examples based on the 1.0 version of the Experience API Specification

### *version*/original_prototypes/
Prototypes created for the original BAA effort, includes a Statement viewer, 
Reporting example, and two games.

NOTE: The index page (index.html) references JQuery from Google CDN. Hard coding the scheme to 'http' caused issues when hosting these examples on a server configured for https. The scheme was removed from this url, which allows for the scheme to be decided dynamically. However this causes an issue when the prototypes are not hosted. In this case the prepended scheme is 'file' and prevents JQuery from loading. If you plan to run these example from in an unhosted environment, add the scheme to this url.

```javascript
// change this line in <version>/original_prototypes/index.html
<script src="//ajax.googleapis.com/ajax/libs/jquery/1.6.2/jquery.min.js"></script>
// to the following if running the examples unhosted (not on a server)
<script src="http://ajax.googleapis.com/ajax/libs/jquery/1.6.2/jquery.min.js"></script>
```

### *version*/oauth/
Contains examples using [OAuth 1.0a](https://tools.ietf.org/html/rfc5849) to connect 
to the ADL LRS

## config.js
The 0.95 and 1.0 folders each contain a config.js.template. It is used to configure the LRS endpoint and user information. To use, rename the file to just config.js.

example:
```javascript
Config.endpoint = "https://lrs.adlnet.gov/xapi/";
Config.user = "username";
Config.password = "password";
Config.actor = { "mbox": "name@example.com", "name": "my name" };
```

Each folder contains Four examples, a Report Sample, Statement Viewer, and two games.

## Report Sample

The Statements tab displays all of the statements in the LRS in a human-readable form (I did this.). When each statement is clicked, it is expanded to show the full JSON representation of the statement that is stored inside of the LRS.

The Castle Defense Reporting tab and Memory Reporting tab contain some information about the students who have played the game.

There is a search user tab where you can search an user with his email.

## Statement Viewer

The Statement Viewer also displays all of the statements in the LRS in a collapsable human-readable format. This time however, you can query the statements based on the actor's email, verb ID, activity ID, since, until, registration, and actor JSON parameters.  When the query is made, the full query is also visible.

## Castle Defense

 This game belongs to, http://opengameart.org/content/castle-defense, and is adapted to send statements to LRS.
 
 ## Memory

 It is a game of chemestry and is adapted to send statements to LRS.

